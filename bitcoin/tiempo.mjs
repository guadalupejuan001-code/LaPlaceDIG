/* Browser/Node kernel. All future values are conditional simulations, not
 * observations. This file deliberately imports neither prices nor the clock. */
export const TIME_VERSION='laplace-time-v1';
export const LAST_DATE='2030-12-31';
const DAY=86400000,need=(ok,message)=>{if(!ok)throw Error(message)};
export function dayNumber(raw){
  need(typeof raw==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(raw),'fecha invalida');
  const value=Date.parse(raw+'T00:00:00Z');
  need(Number.isFinite(value)&&new Date(value).toISOString().slice(0,10)===raw,'fecha invalida');
  return Math.floor(value/DAY);
}
export const dayString=value=>new Date(value*DAY).toISOString().slice(0,10);
export function scenarioCondition(profile,themes){
  need(profile?.schema===TIME_VERSION&&Array.isArray(themes),'perfil temporal invalido');
  need(themes.length<=profile.themes.length&&new Set(themes).size===themes.length&&
    themes.every(theme=>profile.themes.some(item=>item.id===theme)),'temas desconocidos o duplicados');
  const atoms=new Set(themes.flatMap(theme=>[theme,theme+'@GLOBAL']));
  const rule=profile.model.rules.find(rule=>rule.pattern.type!=='sequence'&&rule.pattern.terms.every(term=>atoms.has(term)));
  const global=profile.model.global,prior=(global.successes+1)/(global.count+2),strength=profile.model.prior_strength;
  const alpha=rule?rule.successes+strength*prior:global.successes+1;
  const beta=rule?rule.count-rule.successes+strength*(1-prior):global.count-global.successes+1;
  need(alpha>0&&beta>0&&Number.isFinite(alpha+beta),'conteos probabilisticos invalidos');
  return {probability:rule?alpha/(alpha+beta):null,reference_probability:prior,
    alpha,beta,simulation_daily_mean:alpha/(alpha+beta),pattern:rule?.pattern??null,
    source:rule?'narrative_pattern':'training_reference',support:rule?.count??global.count};
}
function generator(seed){
  let state=seed>>>0;
  return ()=>{state=(state+0x6D2B79F5)|0;let value=state;
    value=Math.imul(value^(value>>>15),value|1);value^=value+Math.imul(value^(value>>>7),value|61);
    return ((value^(value>>>14))>>>0)/4294967296};
}
function normal(rng){return Math.sqrt(-2*Math.log(Math.max(rng(),Number.EPSILON)))*Math.cos(2*Math.PI*rng())}
function gamma(shape,rng){
  if(shape<1)return gamma(shape+1,rng)*Math.max(rng(),Number.EPSILON)**(1/shape);
  const d=shape-1/3,c=1/Math.sqrt(9*d);
  for(let tries=0;tries<10000;tries++){
    const x=normal(rng),base=1+c*x;if(base<=0)continue;
    const v=base**3,u=Math.max(rng(),Number.EPSILON);
    if(u<1-0.0331*x**4||Math.log(u)<0.5*x*x+d*(1-v+Math.log(v)))return d*v;
  }
  throw Error('muestreador fuera de limites');
}
export function simulateTimeline(profile,{themes=profile.default_themes,paths=4096,seed=271828}={}){
  need(Number.isInteger(paths)&&paths>=256&&paths<=8192,'trayectorias: 256..8192');
  need(Number.isInteger(seed)&&seed>=0&&seed<=0xffffffff,'semilla invalida');
  const begin=dayNumber(profile.origin_date),last=dayNumber(profile.range_end);
  need(profile.range_end<=LAST_DATE&&last>begin&&last-begin<=2000,'horizonte temporal fuera de limites');
  const positive=profile.returns.positive,negative=profile.returns.negative;
  need(Array.isArray(positive)&&positive.length>0&&Array.isArray(negative)&&negative.length>0&&
    [...positive,...negative].every(value=>Number.isFinite(value)&&Math.abs(value)<=1),'retornos de entrenamiento invalidos');
  const condition=scenarioCondition(profile,themes),rng=generator(seed),days=last-begin;
  const counts=new Uint32Array(days+1),threshold=Math.log1p(profile.cost_bps/10000);
  need(Number.isFinite(threshold)&&threshold>=0,'umbral invalido');
  const traces=Array.from({length:24},()=>[]),stride=Math.max(1,Math.floor(days/120));
  for(let path=0;path<paths;path++){
    const a=gamma(condition.alpha,rng),b=gamma(condition.beta,rng),p=a/(a+b);let sum=0;
    for(let day=1;day<=days;day++){
      const pool=rng()<p?positive:negative;sum+=pool[Math.floor(rng()*pool.length)];
      if(sum>threshold)counts[day]++;
      if(path<traces.length&&(day%stride===0||day===1||day===days))traces[path].push([day,sum]);
    }
  }
  return {schema:TIME_VERSION,origin_date:profile.origin_date,range_end:profile.range_end,paths,seed,
    themes:[...themes].sort(),condition,positive_counts:Array.from(counts),sample_log_return_paths:traces,
    calculation:'classical_beta_empirical_bootstrap',future_observations:0,
    assumptions:['fixed narrative scenario','one beta probability draw per trajectory',
      'conditionally independent daily returns','return magnitudes sampled only from frozen training labels'],
    financial_accuracy_verified:false};
}
export function readTimeline(profile,simulation,date){
  const day=dayNumber(date);need(date>=profile.range_start&&date<=profile.range_end,'fecha fuera de la linea temporal');
  if(date<profile.origin_date){
    const row=profile.history.find(item=>item.decision_at.slice(0,10)===date);
    return row?{mode:'historical',date,...row}:{mode:'historical_unavailable',date,probability:null};
  }
  if(date===profile.origin_date)return {mode:'origin',date,probability:null};
  need(simulation?.schema===TIME_VERSION&&simulation.origin_date===profile.origin_date&&
    simulation.range_end===profile.range_end,'simulacion incompatible');
  const horizon=day-dayNumber(profile.origin_date),positives=simulation.positive_counts[horizon];
  need(Number.isInteger(positives)&&positives>=0&&positives<=simulation.paths,'resultado temporal ausente');
  return {mode:'scenario',date,horizon_days:horizon,probability:positives/simulation.paths,
    positives,negatives:simulation.paths-positives,paths:simulation.paths,seed:simulation.seed,
    daily_narrative_probability:simulation.condition.probability,condition:simulation.condition,
    future_observations:0,model_state_sha256:profile.model_state_sha256};
}

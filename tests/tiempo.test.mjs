import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {digest} from '../inteligencia/laplace.mjs';
import {dayNumber,dayString,scenarioCondition,simulateTimeline,readTimeline} from '../bitcoin/tiempo.mjs';
import {createTimeProfile} from '../bitcoin/perfil-tiempo.mjs';
import {restoreNarrative,inferNarrative} from '../narrativa/modelo.mjs';
const read=name=>JSON.parse(readFileSync(new URL('../evidencia/'+name,import.meta.url)));
const profile=read('BTC-TIEMPO.json'),history=read('BTC-HISTORICO.json'),report=read('BTC-CALIBRACION.json');
const binary=process.env.MUNDO_X_QUANTUM,native={skip:binary?false:'requires pinned original XI runtime'};
let simulated;
const simulation=()=>simulated??=simulateTimeline(profile,{paths:1024,seed:271828});
test('calendar control includes leap day and caps the last selectable date at 2030',()=>{
  assert.equal(dayString(dayNumber('2028-02-29')),'2028-02-29');
  assert.throws(()=>dayNumber('2027-02-29'),/invalida/);
  assert.throws(()=>readTimeline(profile,simulation(),'2031-01-01'),/fuera/);
  assert.throws(()=>simulateTimeline({...profile,range_end:'2031-01-01'}),/horizonte/);
});
test('portable profile conserves its native origin, hash and 28 training labels',()=>{
  const {profile_sha256,...body}=profile;assert.equal(digest(JSON.stringify(body)),profile_sha256);
  assert.equal(profile.native.exact_roundtrip,true);assert.equal(profile.training_samples,28);
  assert.equal(profile.returns.positive.length,12);assert.equal(profile.returns.negative.length,16);
  assert.equal(profile.live_prediction_validated,false);
  const prices=new Map(history.records.filter(row=>row.kind==='precio').map(row=>[row.id,row]));
  for(const ids of profile.return_price_ids)for(const id of ids)assert.ok(prices.get(id).observed_at<=profile.training_end);
});
test('date movement queries one precomputed trajectory set without rerandomizing or rewriting history',()=>{
  const sim=simulation(),before=JSON.stringify(sim),last=readTimeline(profile,sim,'2030-12-31');
  const first=readTimeline(profile,sim,'2026-10-29');
  assert.equal(last.positives+last.negatives,1024);assert.equal(first.positives+first.negatives,1024);
  assert.notEqual(first.probability,last.probability);assert.equal(JSON.stringify(sim),before);
  assert.deepEqual(readTimeline(profile,sim,'2030-12-31'),last);
  const old=readTimeline(profile,sim,'2026-10-10');
  assert.equal(old.mode,'historical');assert.equal(old.actual,1);assert.equal(old.raw_correct,false);
  assert.equal(old.probability,43.333333333333336/100);
  assert.equal(readTimeline(profile,sim,'2026-09-12').probability,null);
  assert.equal(readTimeline(profile,sim,'2026-10-25').mode,'historical_unavailable');
});
test('classical trajectory counts are reproducible, bounded and never identified as future observations',()=>{
  const first=simulation(),again=simulateTimeline(profile,{paths:1024,seed:271828});
  assert.deepEqual(first,again);assert.equal(first.future_observations,0);
  assert.equal(first.calculation,'classical_beta_empirical_bootstrap');
  assert.ok(first.positive_counts.every(n=>Number.isInteger(n)&&n>=0&&n<=1024));
  assert.equal(first.positive_counts.length,dayNumber('2030-12-31')-dayNumber(profile.origin_date)+1);
  const changed=simulateTimeline(profile,{paths:1024,seed:271829});
  assert.notDeepEqual(changed.positive_counts,first.positive_counts);
});
test('narrative controls change only supported conditions and preserve abstention when none apply',()=>{
  const selected=scenarioCondition(profile,['CONFLICT_ESCALATION','RELIEF_ACCESS']);
  assert.equal(selected.source,'narrative_pattern');assert.ok(Math.abs(selected.probability-0.396078431372549)<1e-14);
  const none=scenarioCondition(profile,[]);assert.equal(none.probability,null);assert.equal(none.source,'training_reference');
  assert.equal(scenarioCondition(profile,['SANCTIONS']).probability,null);
  assert.equal(scenarioCondition(profile,['CONFLICT_ESCALATION']).support,27);
  assert.throws(()=>scenarioCondition(profile,['BITCOIN_PRICE']),/desconocidos/);
  assert.throws(()=>simulateTimeline(profile,{paths:100000}),/trayectorias/);
});
test('native model export and portable conditions agree for every combination of narrative themes',native,()=>{
  const exported=createTimeProfile(binary,history,report);assert.equal(exported.profile_sha256,profile.profile_sha256);
  const {model}=restoreNarrative(binary,report.folds.at(-1).checkpoint),ids=profile.themes.map(theme=>theme.id);
  for(let mask=0;mask<2**ids.length;mask++){
    const themes=ids.filter((_,i)=>mask&(1<<i)),state={atoms:themes.flatMap(id=>[id,id+'@GLOBAL']),sequences:[],coverage:{classified:themes.length}};
    const nativeResult=inferNarrative(model,state),portable=scenarioCondition(profile,themes);
    assert.ok(nativeResult.probability===portable.probability||Math.abs(nativeResult.probability-portable.probability)<1e-14);
    assert.deepEqual(nativeResult.chosen_pattern,portable.pattern);
  }
});
test('future endpoint results in evidence are actual seeded calculations, with exact count reconciliation',()=>{
  const evidence=read('BTC-TIEMPO-RESULTADO.json');
  const sim=simulateTimeline(profile,{paths:evidence.paths,seed:evidence.seed});
  assert.equal(evidence.profile_sha256,profile.profile_sha256);
  for(const row of evidence.checkpoints){assert.deepEqual(readTimeline(profile,sim,row.date),row);assert.equal(row.positives+row.negatives,row.paths)}
});

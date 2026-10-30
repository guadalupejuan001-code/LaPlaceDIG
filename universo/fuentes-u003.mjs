/* U003 — colectores adicionales de mundo real.
 * Cada colector entrega observaciones con tiempo observado y tiempo conocido.
 * Fuentes con licencia/credenciales se consideran opcionales y nunca se
 * presentan como observadas cuando faltan credenciales.
 */
import {chartUrl,parseChart} from '../bolsa/mercado.mjs';
import {
  REGIONAL_MARKET_SYMBOLS,COMMODITY_FUTURES,POLICY_AREAS,BLS_SERIES,
  FRED_PUBLIC_SERIES,NEWS_TOPICS,PORTWATCH_FIELDS,NESO_FIELDS,OPEN_SKY_REGIONS
} from './catalogo-u003.mjs';

const need=(c,m)=>{if(!c)throw Error(m)};
const iso=x=>new Date(x).toISOString();
const safe=s=>String(s).toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,80)||'X';
const obs=(id,domain,variable,value,unit,observedAt,knownAt,sourceUrl)=>({
  id,domain,variable,value,unit,observed_at:iso(observedAt),known_at:iso(knownAt),source_url:sourceUrl
});
async function requestText(url,{fetchImpl=fetch,timeoutMs=15000,headers={},method='GET',body}={}){
  const r=await fetchImpl(url,{method,body,signal:AbortSignal.timeout(timeoutMs),cache:'no-store',
    headers:{'User-Agent':'LaPlaceDIG-U003/1.0',...headers}});
  need(r.ok,'HTTP '+r.status+' '+new URL(url).hostname);
  const text=await r.text();need(text.length<=8_000_000,'respuesta demasiado grande '+new URL(url).hostname);return text;
}
async function requestJson(url,options={}){
  return JSON.parse(await requestText(url,{...options,headers:{Accept:'application/json',...(options.headers??{})}}));
}
async function pool(items,limit,fn){
  const out=Array(items.length),cursor={i:0};
  async function worker(){for(;;){const i=cursor.i++;if(i>=items.length)return;try{out[i]={ok:true,value:await fn(items[i],i)}}catch(error){out[i]={ok:false,error}}}}
  await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));return out;
}
function marketSignals(parsed,capturedAt,url,domain){
  const cap=Date.parse(capturedAt)/1000,bars=parsed.bars.filter(b=>(b[0]+300)<=cap);
  need(bars.length>=7,'mercado sin 30 minutos cerrados '+parsed.symbol);
  const i=bars.length-1,last=bars[i],r5=Math.log(last[4]/bars[i-1][4]),r30=Math.log(last[4]/bars[i-6][4]);
  const meanVol=bars.slice(i-5,i+1).reduce((s,b)=>s+b[5],0)/6,rel=meanVol?last[5]/meanVol:1;
  const at=iso((last[0]+300)*1000),known=iso(capturedAt),key=safe(parsed.symbol),unit=safe(parsed.currency??'native');
  return [
    obs(domain+'-'+key+'-close-'+at,domain,key+'_close',last[4],unit,at,known,url),
    obs(domain+'-'+key+'-r5-'+at,domain,key+'_return_5m',r5,'ratio',at,known,url),
    obs(domain+'-'+key+'-r30-'+at,domain,key+'_return_30m',r30,'ratio',at,known,url),
    obs(domain+'-'+key+'-vol-'+at,domain,key+'_relative_volume_30m',rel,'ratio',at,known,url)
  ];
}
async function fetchMarketSet(symbols,domain,{fetchImpl=fetch,now=()=>new Date().toISOString(),timeoutMs=12000}={}){
  const captured=iso(now()),settled=await pool(symbols,4,async symbol=>{
    const url=chartUrl(symbol,{range:'5d',interval:'5m'}),raw=await requestJson(url,{fetchImpl,timeoutMs});
    return {symbol,url,parsed:parseChart(raw,symbol)};
  });
  const observations=[],sources=[];
  settled.forEach((r,i)=>{
    const name=symbols[i];
    if(!r.ok){sources.push({name,status:'unavailable',reason:String(r.error.message).slice(0,180)});return;}
    try{const rows=marketSignals(r.value.parsed,captured,r.value.url,domain);observations.push(...rows);sources.push({name,status:'observed',signals:rows.length,url:r.value.url});}
    catch(error){sources.push({name,status:'unavailable',reason:String(error.message).slice(0,180),url:r.value.url});}
  });
  return {captured_at:captured,observations,sources};
}
export const fetchRegionalMarkets=(options={})=>fetchMarketSet(REGIONAL_MARKET_SYMBOLS,'bolsas_regionales',options);
export const fetchCommodityFutures=(options={})=>fetchMarketSet(COMMODITY_FUTURES,'futuros_commodities',options);

function parseCsv(text){
  const rows=[];let row=[],cell='',quote=false;
  for(let i=0;i<=text.length;i++){
    const ch=text[i]??'\n';
    if(quote){
      if(ch==='"'&&text[i+1]==='"'){cell+='"';i++}
      else if(ch==='"')quote=false;
      else cell+=ch;
    }else if(ch==='"')quote=true;
    else if(ch===','){row.push(cell);cell=''}
    else if(ch==='\n'){row.push(cell.replace(/\r$/,''));if(row.some(x=>x!==''))rows.push(row);row=[];cell=''}
    else cell+=ch;
  }
  return rows;
}
export function parseBisPolicyCsv(text,{capturedAt,url,areas=POLICY_AREAS}={}){
  const rows=parseCsv(text);need(rows.length>=2,'BIS CSV vacío');
  const head=rows[0].map(x=>x.trim().toUpperCase()),idx=n=>head.indexOf(n);
  const fi=idx('FREQ'),ai=idx('REF_AREA'),ti=idx('TIME_PERIOD'),vi=idx('OBS_VALUE');
  need([fi,ai,ti,vi].every(x=>x>=0),'BIS CSV sin columnas esperadas');
  const latest=new Map();
  for(const r of rows.slice(1)){
    const area=r[ai],freq=r[fi],period=r[ti],value=Number(r[vi]);
    if(freq!=='M'||!areas.includes(area)||!Number.isFinite(value)||!/^\d{4}-\d{2}$/.test(period))continue;
    const old=latest.get(area);if(!old||period>old.period)latest.set(area,{period,value});
  }
  const known=iso(capturedAt),out=[];
  for(const area of areas){
    const x=latest.get(area);if(!x)continue;
    const observed=iso(x.period+'-01T00:00:00Z');
    out.push(obs('bis-policy-'+area+'-'+x.period,'tasas_bancos_centrales',area+'_policy_rate',x.value,'pct',observed,known,url));
  }
  return out;
}
export async function fetchPolicyRates({fetchImpl=fetch,now=()=>new Date().toISOString(),timeoutMs=15000,areas=POLICY_AREAS}={}){
  const captured=iso(now()),key='M.'+areas.join('+');
  const url='https://stats.bis.org/api/v1/data/WS_CBPOL/'+key+'/all?startPeriod=2025-01&format=csvfile';
  try{
    const text=await requestText(url,{fetchImpl,timeoutMs,headers:{Accept:'application/vnd.sdmx.data+csv;version=1.0.0'}});
    const observations=parseBisPolicyCsv(text,{capturedAt:captured,url,areas});
    need(observations.length>=Math.min(8,areas.length),'BIS devolvió cobertura de tasas insuficiente');
    return {captured_at:captured,observations,sources:[{name:'BIS-WS_CBPOL',status:'observed',signals:observations.length,url}]};
  }catch(error){return {captured_at:captured,observations:[],sources:[{name:'BIS-WS_CBPOL',status:'unavailable',reason:String(error.message).slice(0,180),url}]};}
}

export function parseBls(raw,{capturedAt,url}={}){
  need(raw?.status==='REQUEST_SUCCEEDED'&&Array.isArray(raw?.Results?.series),'BLS respuesta inválida');
  const known=iso(capturedAt),out=[];
  for(const s of raw.Results.series){
    const def=BLS_SERIES[s.seriesID];if(!def||!Array.isArray(s.data))continue;
    const rows=s.data.filter(x=>Number.isFinite(Number(x.value))&&/^\d{4}$/.test(x.year)&&/^M\d{2}$/.test(x.period));
    rows.sort((a,b)=>(b.year+b.period).localeCompare(a.year+a.period));const x=rows[0];if(!x)continue;
    const month=Number(x.period.slice(1));if(month<1||month>12)continue;
    const observed=iso(Date.UTC(Number(x.year),month-1,1));
    out.push(obs('bls-'+s.seriesID+'-'+x.year+'-'+x.period,'empleo_macro',def.name,Number(String(x.value).replace(/,/g,'')),def.unit,observed,known,url));
  }
  return out;
}
export async function fetchBlsEmployment({fetchImpl=fetch,now=()=>new Date().toISOString(),timeoutMs=12000}={}){
  const captured=iso(now()),url='https://api.bls.gov/publicAPI/v2/timeseries/data/';
  try{
    const year=new Date(captured).getUTCFullYear(),body=JSON.stringify({seriesid:Object.keys(BLS_SERIES),startyear:String(year-1),endyear:String(year)});
    const raw=await requestJson(url,{fetchImpl,timeoutMs,method:'POST',body,headers:{'Content-Type':'application/json'}});
    const observations=parseBls(raw,{capturedAt:captured,url});
    need(observations.length>=2,'BLS sin suficientes series');
    return {captured_at:captured,observations,sources:[{name:'BLS-public-api',status:'observed',signals:observations.length,url}]};
  }catch(error){return {captured_at:captured,observations:[],sources:[{name:'BLS-public-api',status:'unavailable',reason:String(error.message).slice(0,180),url}]};}
}
export function parseFredCsv(text,{series,capturedAt,url}={}){
  const def=FRED_PUBLIC_SERIES[series];need(def,'serie FRED no registrada');
  const rows=parseCsv(text);need(rows.length>=2,'FRED CSV vacío');
  let latest=null;
  for(const r of rows.slice(1)){
    const date=r[0],value=Number(r[1]);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(value))continue;
    if(!latest||date>latest.date)latest={date,value};
  }
  need(latest,'FRED sin observación numérica');
  return obs('fred-'+series+'-'+latest.date,'empleo_alta_frecuencia',def.name,latest.value,def.unit,
    latest.date+'T00:00:00.000Z',capturedAt,url);
}
export async function fetchHighFrequencyLabour({fetchImpl=fetch,now=()=>new Date().toISOString(),timeoutMs=12000}={}){
  const captured=iso(now()),observations=[],sources=[];
  const settled=await pool(Object.keys(FRED_PUBLIC_SERIES),2,async series=>{
    const url='https://fred.stlouisfed.org/graph/fredgraph.csv?id='+encodeURIComponent(series);
    const text=await requestText(url,{fetchImpl,timeoutMs,headers:{Accept:'text/csv'}});
    return {series,url,row:parseFredCsv(text,{series,capturedAt:captured,url})};
  });
  settled.forEach((r,i)=>{const name=Object.keys(FRED_PUBLIC_SERIES)[i];if(r.ok){observations.push(r.value.row);sources.push({name:'FRED-'+name,status:'observed',signals:1,url:r.value.url})}else sources.push({name:'FRED-'+name,status:'unavailable',reason:String(r.error.message).slice(0,180)})});
  return {captured_at:captured,observations,sources};
}

export const NESO_URL='https://api.neso.energy/api/3/action/datastore_search_sql';
export function parseNeso(raw,{capturedAt,url}={}){
  need(raw?.success===true&&Array.isArray(raw?.result?.records)&&raw.result.records.length,'NESO respuesta inválida');
  const r=raw.result.records[0],date=String(r.SETTLEMENT_DATE??''),period=Number(r.SETTLEMENT_PERIOD);
  need(/^\d{4}-\d{2}-\d{2}/.test(date)&&Number.isInteger(period)&&period>=1&&period<=50,'NESO fecha/periodo inválido');
  const observed=iso(Date.parse(date.slice(0,10)+'T00:00:00Z')+(period-1)*30*60*1000),known=iso(capturedAt),out=[];
  for(const [field,name,unit] of NESO_FIELDS){const value=Number(r[field]);if(Number.isFinite(value))out.push(obs('neso-'+field+'-'+observed,'energia_electrica',name,value,unit,observed,known,url));}
  return out;
}
export async function fetchElectricity({fetchImpl=fetch,now=()=>new Date().toISOString(),timeoutMs=12000}={}){
  const captured=iso(now()),resource='177f6fa4-ae49-4182-81ea-0c6b35f26ca6';
  const sql='SELECT * FROM "'+resource+'" WHERE "FORECAST_ACTUAL_INDICATOR" = \\'A\\' ORDER BY "SETTLEMENT_DATE" DESC, "SETTLEMENT_PERIOD" DESC LIMIT 1';
  const url=NESO_URL+'?sql='+encodeURIComponent(sql);
  try{
    const raw=await requestJson(url,{fetchImpl,timeoutMs}),observations=parseNeso(raw,{capturedAt:captured,url});
    need(observations.length>=4,'NESO devolvió pocas señales');
    return {captured_at:captured,observations,sources:[{name:'NESO-demand-update',status:'observed',signals:observations.length,url}]};
  }catch(error){return {captured_at:captured,observations:[],sources:[{name:'NESO-demand-update',status:'unavailable',reason:String(error.message).slice(0,180),url}]};}
}

export const PORTWATCH_URL='https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Ports_Data/FeatureServer/0/query';
export function parsePortWatch(raw,{capturedAt,url}={}){
  need(Array.isArray(raw?.features)&&raw.features.length>=1,'PortWatch respuesta inválida');
  const a=raw.features[0].attributes??{},time=Number(a.date),known=iso(capturedAt);
  need(Number.isFinite(time),'PortWatch sin fecha');
  const observed=iso(time),out=[];
  for(const [field,name,unit] of PORTWATCH_FIELDS){const value=Number(a[field+'_sum']??a[field]);if(Number.isFinite(value))out.push(obs('portwatch-'+field+'-'+observed,'transporte_maritimo',name,value,unit,observed,known,url));}
  return out;
}
export async function fetchMaritime({fetchImpl=fetch,now=()=>new Date().toISOString(),timeoutMs=15000}={}){
  const captured=iso(now()),stats=PORTWATCH_FIELDS.map(([field])=>({statisticType:'sum',onStatisticField:field,outStatisticFieldName:field+'_sum'}));
  const u=new URL(PORTWATCH_URL);u.searchParams.set('where','1=1');u.searchParams.set('outStatistics',JSON.stringify(stats));
  u.searchParams.set('groupByFieldsForStatistics','date');u.searchParams.set('orderByFields','date DESC');u.searchParams.set('resultRecordCount','1');u.searchParams.set('returnGeometry','false');u.searchParams.set('f','json');
  const url=u.toString();
  try{
    const raw=await requestJson(url,{fetchImpl,timeoutMs}),observations=parsePortWatch(raw,{capturedAt:captured,url});
    need(observations.length>=3,'PortWatch devolvió pocas señales');
    return {captured_at:captured,observations,sources:[{name:'IMF-PortWatch',status:'observed',signals:observations.length,url}]};
  }catch(error){return {captured_at:captured,observations:[],sources:[{name:'IMF-PortWatch',status:'unavailable',reason:String(error.message).slice(0,180),url}]};}
}

export function parseGdeltGeo(raw,{topic,capturedAt,url}={}){
  need(raw?.type==='FeatureCollection'&&Array.isArray(raw.features),'GDELT GeoJSON inválido');
  const points=raw.features.map(f=>f?.geometry?.coordinates).filter(c=>Array.isArray(c)&&Number.isFinite(Number(c[0]))&&Number.isFinite(Number(c[1]))).map(c=>({lon:Number(c[0]),lat:Number(c[1])}));
  const known=iso(capturedAt),base='gdelt_'+safe(topic),n=points.length;
  return [
    obs('gdelt-'+topic+'-count-'+known,'noticias_geolocalizadas',base+'_locations',n,'count',known,known,url),
    obs('gdelt-'+topic+'-north-'+known,'noticias_geolocalizadas',base+'_north_share',n?points.filter(p=>p.lat>=0).length/n:0,'ratio',known,known,url),
    obs('gdelt-'+topic+'-east-'+known,'noticias_geolocalizadas',base+'_east_share',n?points.filter(p=>p.lon>=0).length/n:0,'ratio',known,known,url)
  ];
}
export async function fetchGeoNews({fetchImpl=fetch,now=()=>new Date().toISOString(),timeoutMs=15000,topics=NEWS_TOPICS}={}){
  const captured=iso(now()),settled=await pool(topics,2,async topic=>{
    const u=new URL('https://api.gdeltproject.org/api/v2/geo/geo');u.searchParams.set('query',topic.query);u.searchParams.set('mode','pointdata');u.searchParams.set('format','geojson');u.searchParams.set('timespan','1h');u.searchParams.set('maxpoints','250');u.searchParams.set('geores','1');
    const url=u.toString(),raw=await requestJson(url,{fetchImpl,timeoutMs,maxBytes:4_000_000}),rows=parseGdeltGeo(raw,{topic:topic.id,capturedAt:captured,url});
    return {topic,url,rows};
  });
  const observations=[],sources=[];
  settled.forEach((r,i)=>{const name=topics[i].id;if(r.ok){observations.push(...r.value.rows);sources.push({name:'GDELT-'+name,status:'observed',signals:r.value.rows.length,url:r.value.url})}else sources.push({name:'GDELT-'+name,status:'unavailable',reason:String(r.error.message).slice(0,180)})});
  return {captured_at:captured,observations,sources};
}

export function parseOpenSky(raw,{capturedAt,url}={}){
  need(Number.isFinite(Number(raw?.time))&&Array.isArray(raw?.states),'OpenSky respuesta inválida');
  const known=iso(capturedAt),states=raw.states,valid=states.map(x=>({lon:Number(x?.[5]),lat:Number(x?.[6]),ground:Boolean(x?.[8]),velocity:Number(x?.[9])})).filter(x=>Number.isFinite(x.lon)&&Number.isFinite(x.lat));
  const observed=iso(Number(raw.time)*1000),out=[
    obs('opensky-count-'+observed,'transporte_aereo','global_aircraft_visible',valid.length,'count',observed,known,url),
    obs('opensky-airborne-'+observed,'transporte_aereo','global_aircraft_airborne',valid.filter(x=>!x.ground).length,'count',observed,known,url)
  ];
  for(const [name,lat0,lat1,lon0,lon1] of OPEN_SKY_REGIONS){
    const count=valid.filter(x=>x.lat>=lat0&&x.lat<lat1&&x.lon>=lon0&&x.lon<lon1).length;
    out.push(obs('opensky-'+name+'-'+observed,'transporte_aereo',name+'_aircraft_visible',count,'count',observed,known,url));
  }
  const speeds=valid.filter(x=>Number.isFinite(x.velocity)&&!x.ground).map(x=>x.velocity);
  if(speeds.length)out.push(obs('opensky-speed-'+observed,'transporte_aereo','global_airborne_mean_velocity',speeds.reduce((a,b)=>a+b,0)/speeds.length,'m_s',observed,known,url));
  return out;
}
async function openSkyToken(clientId,clientSecret,{fetchImpl,timeoutMs}){
  const url='https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';
  const body=new URLSearchParams({grant_type:'client_credentials',client_id:clientId,client_secret:clientSecret}).toString();
  const raw=await requestJson(url,{fetchImpl,timeoutMs,method:'POST',body,headers:{'Content-Type':'application/x-www-form-urlencoded'}});
  need(typeof raw.access_token==='string'&&raw.access_token.length>20,'OpenSky token inválido');return raw.access_token;
}
export async function fetchAirTraffic({fetchImpl=fetch,now=()=>new Date().toISOString(),timeoutMs=15000,clientId=process.env.OPENSKY_CLIENT_ID,clientSecret=process.env.OPENSKY_CLIENT_SECRET}={}){
  const captured=iso(now()),url='https://opensky-network.org/api/states/all';
  if(!clientId||!clientSecret)return {captured_at:captured,observations:[],sources:[{name:'OpenSky',status:'requires_credentials',signals:0,url,reason:'OAuth2 requerido; no se consulta sin autorización'}]};
  try{
    const token=await openSkyToken(clientId,clientSecret,{fetchImpl,timeoutMs}),raw=await requestJson(url,{fetchImpl,timeoutMs,headers:{Authorization:'Bearer '+token}});
    const observations=parseOpenSky(raw,{capturedAt:captured,url});
    return {captured_at:captured,observations,sources:[{name:'OpenSky',status:'observed',signals:observations.length,url,usage:'research_or_licensed'}]};
  }catch(error){return {captured_at:captured,observations:[],sources:[{name:'OpenSky',status:'unavailable',signals:0,url,reason:String(error.message).slice(0,180)}]};}
}

export function parseJQuantsTopix(raw,{capturedAt,url}={}){
  const data=Array.isArray(raw?.data)?raw.data:Array.isArray(raw?.topix)?raw.topix:[];need(data.length,'J-Quants TOPIX vacío');
  const rows=data.filter(x=>Number.isFinite(Number(x.C??x.Close))&&/^\d{4}-?\d{2}-?\d{2}$/.test(String(x.Date??x.date??'')));
  rows.sort((a,b)=>String(b.Date??b.date).localeCompare(String(a.Date??a.date)));const x=rows[0];
  need(x,'J-Quants TOPIX sin observación');const d=String(x.Date??x.date).replace(/(\d{4})(\d{2})(\d{2})/,'$1-$2-$3'),value=Number(x.C??x.Close);
  return [obs('jpx-topix-'+d,'bolsas_directas','JPX_TOPIX_close',value,'index',d+'T00:00:00.000Z',capturedAt,url)];
}
export async function fetchDirectExchanges({fetchImpl=fetch,now=()=>new Date().toISOString(),timeoutMs=12000,jquantsApiKey=process.env.JQUANTS_API_KEY}={}){
  const captured=iso(now()),observations=[],sources=[];
  const jpxUrl='https://api.jquants.com/v2/indices/bars/daily/topix';
  if(jquantsApiKey){
    try{const raw=await requestJson(jpxUrl,{fetchImpl,timeoutMs,headers:{'x-api-key':jquantsApiKey}}),rows=parseJQuantsTopix(raw,{capturedAt:captured,url:jpxUrl});observations.push(...rows);sources.push({name:'JPX-JQuants',status:'observed',signals:rows.length,url:jpxUrl,direct_exchange:true})}
    catch(error){sources.push({name:'JPX-JQuants',status:'unavailable',signals:0,url:jpxUrl,reason:String(error.message).slice(0,180),direct_exchange:true})}
  }else sources.push({name:'JPX-JQuants',status:'requires_credentials',signals:0,url:jpxUrl,reason:'x-api-key requerido por JPX',direct_exchange:true});
  // B3/Deutsche Börse direct APIs are licensed/contracted products. Keep them
  // explicit instead of silently replacing them with third-party quotes.
  sources.push({name:'B3-direct',status:'requires_license',signals:0,url:'https://developers.b3.com.br/',direct_exchange:true});
  sources.push({name:'Deutsche-Boerse-direct',status:'requires_license',signals:0,url:'https://www.deutsche-boerse.com/dbg-en/markets-services/ps-technology/ps-api-platform',direct_exchange:true});
  return {captured_at:captured,observations,sources};
}

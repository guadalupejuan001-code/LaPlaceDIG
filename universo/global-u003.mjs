/* U003 — segunda expansión mundial.
 * Parte de U002/369 y agrega dominios económicos y logísticos sin alterar
 * todavía los predictores. Todos los grupos son fail-soft por fuente.
 */
import {observeGlobalUniverse} from './global.mjs';
import {universeSnapshot,utcTime} from './estados.mjs';
import {sellarCaptura} from './integridad.mjs';
import {
  fetchRegionalMarkets,fetchCommodityFutures,fetchPolicyRates,fetchBlsEmployment,
  fetchHighFrequencyLabour,fetchExactMacroVintages,fetchElectricity,fetchMaritime,fetchGeoNews,
  fetchAirTraffic,fetchDirectExchanges
} from './fuentes-u003.mjs';
import {fetchOfficialCentralBanks,fetchPublicDirectExchanges,fetchDatedCommodityContracts} from './fuentes-oficiales.mjs';

export const U003_VERSION='laplace-universo-global-u003-v2';
const need=(c,m)=>{if(!c)throw Error(m)};
export async function observeWorldU003({
  fetchImpl=fetch,now=()=>new Date().toISOString(),timeoutMs=15000,
  includeAir=true,includeDirectExchanges=true,
  openSkyClientId=process.env.OPENSKY_CLIENT_ID,
  openSkyClientSecret=process.env.OPENSKY_CLIENT_SECRET,
  jquantsApiKey=process.env.JQUANTS_API_KEY
}={}){
  const jobs=[
    ['regional_markets',()=>fetchRegionalMarkets({fetchImpl,now,timeoutMs})],
    ['commodity_futures',()=>fetchCommodityFutures({fetchImpl,now,timeoutMs})],
    ['policy_rates',()=>fetchPolicyRates({fetchImpl,now,timeoutMs})],
    ['official_central_banks',()=>fetchOfficialCentralBanks({fetchImpl,now,timeoutMs})],
    ['employment_monthly',()=>fetchBlsEmployment({fetchImpl,now,timeoutMs})],
    ['employment_high_frequency',()=>fetchHighFrequencyLabour({fetchImpl,now,timeoutMs})],
    ['macro_exact_vintages',()=>fetchExactMacroVintages({fetchImpl,now,timeoutMs})],
    ['electricity',()=>fetchElectricity({fetchImpl,now,timeoutMs})],
    ['maritime',()=>fetchMaritime({fetchImpl,now,timeoutMs})],
    ['geo_news',()=>fetchGeoNews({fetchImpl,now,timeoutMs})],
    ['dated_commodity_contracts',()=>fetchDatedCommodityContracts({fetchImpl,now,timeoutMs})]
  ];
  if(includeAir)jobs.push(['air_traffic',()=>fetchAirTraffic({fetchImpl,now,timeoutMs,clientId:openSkyClientId,clientSecret:openSkyClientSecret})]);
  if(includeDirectExchanges){
    jobs.push(['direct_exchanges',()=>fetchDirectExchanges({fetchImpl,now,timeoutMs,jquantsApiKey})]);
    jobs.push(['public_direct_exchanges',()=>fetchPublicDirectExchanges({fetchImpl,now,timeoutMs})]);
  }
  const [base,settled]=await Promise.all([observeGlobalUniverse({fetchImpl,now,timeoutMs}),Promise.all(jobs.map(async ([name,fn])=>{
    try{return {name,status:'fulfilled',value:await fn()}}
    catch(error){return {name,status:'rejected',reason:String(error.message).slice(0,220)}}
  }))]);
  const captured=utcTime(now());
  const observations=[...base.universal_state.states],sources=[...base.source_status.map(x=>({...x,group:'u002_base'}))],groups=[],contracts=[],vintages=[];
  for(const g of settled){
    if(g.status==='fulfilled'){
      observations.push(...g.value.observations);
      contracts.push(...(g.value.contracts??[]));vintages.push(...(g.value.vintages??[]));
      sources.push(...g.value.sources.map(x=>({...x,group:g.name})));
      groups.push({group:g.name,status:g.value.observations.length?'observed':
        g.value.sources.some(x=>['requires_credentials','requires_license'].includes(x.status))?'requires_access':'unavailable',signals:g.value.observations.length,
        sources_ok:g.value.sources.filter(x=>x.status==='observed').length,
        sources_optional:g.value.sources.filter(x=>['requires_credentials','requires_license'].includes(x.status)).length,
        sources_failed:g.value.sources.filter(x=>x.status==='unavailable').length});
    }else groups.push({group:g.name,status:'unavailable',signals:0,sources_ok:0,sources_optional:0,sources_failed:1,reason:g.reason});
  }
  need(observations.length<=4096,'U003 excedió 4096 estados; requiere partición por dominio');
  const snapshot=universeSnapshot(observations,{cutoff:captured});
  const observed=sources.filter(x=>x.status==='observed'),failed=sources.filter(x=>x.status==='unavailable'),optional=sources.filter(x=>['requires_credentials','requires_license'].includes(x.status));
  return sellarCaptura({
    schema:U003_VERSION,at:captured,base_u002_capture_sha256:base.capture_sha256,
    universal_state:snapshot,
    coverage:{
      base_signals:base.coverage.known_signals,
      known_signals:snapshot.known_states,
      added_signals:snapshot.known_states-base.coverage.known_signals,
      domains:snapshot.domains.length,groups,
      observed_sources:observed.length,failed_sources:failed.length,optional_sources:optional.length
    },
    source_status:sources,
    contract_metadata:contracts,macro_vintages:vintages,
    availability_policy:{
      known_at:'momento_de_captura_o_primera_observacion_por_laplace',
      vintage_date:'ALFRED initial-release date when FRED_API_KEY is configured; day precision only',
      exact_historical_publication_time:false,
      archive_future_captures:true,
      note:'known_at es recepción real. Una fecha ALFRED no acredita una hora intradía; se conserva aparte y nunca se transforma en medianoche histórica.'
    },
    direct_exchange_policy:'TWSE diario, B3 muestra pública de mayores movimientos y MOEX índice diario son conexiones primarias públicas. JPX requiere JQUANTS_API_KEY. B3 completo y Deutsche Börse siguen pendientes de licencia.',
    prediction_inputs_enabled:false,causal_certification:false,full_universe_observed:false,automatic_trading:false
  });
}

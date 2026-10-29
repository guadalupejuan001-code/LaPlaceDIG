/* LAPLACE — contrato de datos del panel. No calcula precios ni causas. */
export const PANEL_SCHEMA='laplace-panel-v1';
export const MAX_CAPTURAS=144;
const debe=(condicion,mensaje)=>{if(!condicion)throw Error(mensaje)};
const fecha=(x)=>typeof x==='string'&&Number.isFinite(Date.parse(x));
const numero=x=>typeof x==='number'&&Number.isFinite(x);
export function validarCaptura(c){
  debe(c&&c.schema==='laplace-universo-btc-u001-v1','Captura universal incompatible');
  debe(fecha(c.at)&&c.instrument_15m?.schema==='laplace-btc-intradia-i015-v1','Falta el núcleo I015');
  debe(numero(c.instrument_15m.observed_price_usd)&&c.instrument_15m.observed_price_usd>0,
    'No existe cotización observada');
  debe(numero(c.instrument_15m.projected_price_usd)&&c.instrument_15m.projected_price_usd>0,
    'No existe referencia temporal');
  debe(c.universal_state?.schema==='laplace-universo-estados-u001-v1',
    'Falta la memoria universal');
  debe(Array.isArray(c.measured_market)&&c.measured_market.length===4,'Fuentes de mercado incompletas');
  return c;
}
export function resumenCaptura(raw){
  const c=validarCaptura(raw),m=c.instrument_15m;
  return Object.freeze({
    fecha:c.at,precio:m.observed_price_usd,precio_proyectado:m.projected_price_usd,
    intervalo:m.scenario_interval_usd??null,fuentes:c.source_count,
    validez:m.status,dominios:c.universal_state.domains,
    estados:c.universal_state.known_states,huella:c.universal_state.snapshot_sha256,
    cotizacion_en:m.observed_at,proyeccion_hasta:m.target_at,
    muestras:m.backtest?.scored??0,
    error_modelo:m.backtest?.model_mae_return_pct??null,
    error_referencia:m.backtest?.reference_mae_return_pct??null
  });
}
export function normalizarRegistro(raw){
  debe(raw&&raw.schema===PANEL_SCHEMA,'Registro del panel incompatible');
  debe(Array.isArray(raw.historial)&&raw.historial.length<=MAX_CAPTURAS,'Demasiadas capturas');
  const historial=raw.historial.map(row=>{
    debe(row&&fecha(row.fecha)&&numero(row.precio)&&row.precio>0,'Registro histórico inválido');
    return row;
  });
  const ultima=raw.ultima?validarCaptura(raw.ultima):null;
  return {schema:PANEL_SCHEMA,ultima,historial,actualizado_en:fecha(raw.actualizado_en)?raw.actualizado_en:null};
}
export function añadirCaptura(registro,captura){
  const c=validarCaptura(captura),anterior=normalizarRegistro(registro);
  // No fusionar el mismo instante ni reescribir precios sin evidencia.
  debe(!anterior.historial.some(x=>x.fecha===c.at),'La captura ya existe');
  const historial=[...anterior.historial,resumenCaptura(c)].slice(-MAX_CAPTURAS);
  return normalizarRegistro({schema:PANEL_SCHEMA,ultima:c,historial,actualizado_en:c.at});
}
export const registroVacio=()=>({schema:PANEL_SCHEMA,ultima:null,historial:[],actualizado_en:null});

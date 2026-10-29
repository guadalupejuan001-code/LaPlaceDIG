'use strict';
/* LAPLACE — interfaz de consulta. Sin datos ficticios ni predictor en el navegador. */
const $=id=>document.getElementById(id);
const formatoMoneda=new Intl.NumberFormat('es-MX',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2});
const formatoEuro=new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'});
const formatoNumero=new Intl.NumberFormat('es-MX',{maximumFractionDigits:4});
const formatoFecha=new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeStyle:'short'});
const dinero=n=>typeof n==='number'&&Number.isFinite(n)?formatoMoneda.format(n):'—';
const euros=n=>typeof n==='number'&&Number.isFinite(n)?formatoEuro.format(n):'—';
const numero=n=>typeof n==='number'&&Number.isFinite(n)?formatoNumero.format(n):'—';
const fecha=valor=>valor&&Number.isFinite(Date.parse(valor))?formatoFecha.format(new Date(valor)):'—';
const porcentaje=n=>typeof n==='number'&&Number.isFinite(n)?numero(n)+' %':'—';
const texto=(id,valor)=>{$(id).textContent=valor??'—'};
let estado=null,cargando=false;
function alerta(mensaje){
  const lugar=$('aviso');lugar.hidden=!mensaje;lugar.textContent=mensaje||'';
}
function irAVista(nombre){
  for(const boton of document.querySelectorAll('.pestana')){
    const activo=boton.dataset.vista===nombre;
    boton.classList.toggle('activo',activo);
    if(activo)boton.setAttribute('aria-current','page');else boton.removeAttribute('aria-current');
  }
  for(const panel of document.querySelectorAll('.vista'))panel.hidden=panel.id!=='vista-'+nombre;
}
const grafico=$('grafico'),NS='http://www.w3.org/2000/svg';
function svg(nodo,propiedades,textoDentro){
  const el=document.createElementNS(NS,nodo);
  for(const [clave,valor] of Object.entries(propiedades??{}))el.setAttribute(clave,String(valor));
  if(textoDentro!==undefined)el.textContent=String(textoDentro);
  grafico.append(el);return el;
}
function sinGrafica(mensaje){
  grafico.replaceChildren();
  svg('text',{x:400,y:120,'text-anchor':'middle',fill:'#9baab9','font-size':13},mensaje);
}
function trazar(serie,estimacion,intervalo){
  if(!Array.isArray(serie)||serie.length<2){
    sinGrafica('Aún faltan al menos dos precios observados para dibujar la trayectoria.');return;
  }
  const puntos=serie.filter(p=>Number.isFinite(p.precio)&&p.precio>0).slice(-72);
  if(puntos.length<2){sinGrafica('No hay suficientes precios válidos.');return}
  const limites=puntos.map(p=>p.precio);
  if(Number.isFinite(estimacion))limites.push(estimacion);
  if(Array.isArray(intervalo)&&intervalo.length===2&&intervalo.every(Number.isFinite))limites.push(...intervalo);
  const menor=Math.min(...limites),mayor=Math.max(...limites),margen=Math.max((mayor-menor)*0.15,menor*0.0003);
  const min=menor-margen,max=mayor+margen,altura=162;
  const y=v=>190-(v-min)/(max-min)*altura;
  const x=i=>40+i*595/Math.max(1,puntos.length-1);
  grafico.replaceChildren();
  for(let k=0;k<4;k++){
    const yy=28+k*54;
    svg('line',{x1:40,x2:760,y1:yy,y2:yy,stroke:'#2b3a48','stroke-width':1,'stroke-dasharray':'4 6'});
  }
  const path=puntos.map((p,i)=>(i?'L':'M')+x(i).toFixed(2)+' '+y(p.precio).toFixed(2)).join(' ');
  svg('path',{d:path,fill:'none',stroke:'#e1ebf3','stroke-width':2.25,
    'stroke-linecap':'round','stroke-linejoin':'round'});
  const ultima=puntos.at(-1);
  svg('circle',{cx:635,cy:y(ultima.precio),r:4,fill:'#e1ebf3'});
  svg('line',{x1:635,x2:635,y1:18,y2:202,stroke:'#667a8c',
    'stroke-dasharray':'3 5'});
  if(Array.isArray(intervalo)&&intervalo.length===2&&intervalo.every(Number.isFinite)){
    const superior=y(Math.max(...intervalo)),inferior=y(Math.min(...intervalo));
    svg('rect',{x:720,y:superior,width:33,height:Math.max(1,inferior-superior),
      fill:'#dfbd7f','fill-opacity':0.15});
    svg('line',{x1:736,x2:736,y1:superior,y2:inferior,stroke:'#dcb878',
      'stroke-width':2,'stroke-opacity':0.85});
  }
  if(Number.isFinite(estimacion)){
    svg('path',{d:'M 635 '+y(ultima.precio).toFixed(2)+' L 737 '+y(estimacion).toFixed(2),
      stroke:'#dcb878','stroke-width':2.25,'stroke-dasharray':'7 6',fill:'none'});
    svg('circle',{cx:737,cy:y(estimacion),r:4,fill:'#dcb878'});
  }
  svg('text',{x:40,y:223,fill:'#8c9cac','font-size':11},'HISTORIA OBSERVADA');
  svg('text',{x:626,y:223,fill:'#8c9cac','font-size':11},'AHORA');
  svg('text',{x:731,y:223,fill:'#8c9cac','font-size':11,'text-anchor':'middle'},'+15 MIN');
  svg('text',{x:45,y:20,fill:'#a5b4c2','font-size':11},dinero(max-margen).replace('$',''));
  grafico.setAttribute('aria-label','Precio observado en '+puntos.length+
    ' registros y proyección independiente a quince minutos');
}
function serieHistorica(c){
  const precios=c?.instrument_15m?.serie_cierres_5m;
  if(Array.isArray(precios)&&precios.length>=2){
    return precios.filter(p=>typeof p.precio==='number').map(p=>({fecha:p.fecha,precio:p.precio}));
  }
  return (estado?.historial??[]).filter(x=>typeof x.precio==='number')
    .map(x=>({fecha:x.fecha,precio:x.precio}));
}
function estadoModelo(m){
  if(!m)return 'Pendiente de cálculo.';
  const mapa={
    referencia_sin_ventaja_validada:'Sin mejora demostrada: se conserva el precio actual.',
    modelo_condicional_exploratorio:'Proyección experimental: mejora en la muestra corta.',
    barras_incompletas:'Faltan velas: se utiliza la referencia.',
    evidencia_intradia_insuficiente:'Historial insuficiente para un modelo.'
  };
  return mapa[m.status]??'Resultado sin clasificación verificada.';
}
function fuente(nombre,entrada){
  const fila=document.createElement('div');fila.className='fuente';
  const info=document.createElement('div');
  const titulo=document.createElement('strong');titulo.textContent=nombre;info.append(titulo);
  const subtitulo=document.createElement('small');
  subtitulo.textContent=entrada?.status==='observed'?'Fuente recibida':
    entrada?.reason||'No se pudo obtener una lectura';
  info.append(subtitulo);fila.append(info);
  const estadoVisual=document.createElement('span');
  estadoVisual.className='estado-fuente'+(entrada?.status==='observed'?'':' no');
  estadoVisual.textContent=entrada?.status==='observed'?'Registrada':'Sin datos';
  fila.append(estadoVisual);return fila;
}
function llenarFactores(c){
  const mercado=c?.measured_market??[];
  const get=n=>mercado.find(x=>x.name===n);
  const book=get('book'),trades=get('trades'),eth=get('eth'),euro=get('euro');
  const kp=c?.measured_space_weather;
  texto('presion',book?.status==='observed'?
    numero(book.data.top10_notional_imbalance):'—');
  texto('libroEstado',book?.status==='observed'?
    'Desequilibrio entre los 10 mejores niveles; no es una predicción.':
    book?.reason??'Libro de órdenes no disponible');
  texto('profCompra',dinero(book?.data?.bid_depth_usd_top10));
  texto('profVenta',dinero(book?.data?.ask_depth_usd_top10));
  texto('spread',typeof book?.data?.spread_bps==='number'?
    numero(book.data.spread_bps)+' puntos básicos':'—');
  texto('operaciones',numero(trades?.data?.observed_trade_count));
  texto('operacionesEstado',trades?.status==='observed'?
    'Muestra parcial según el lado creador de mercado.':
    trades?.reason??'Sin información de operaciones');
  texto('volCompra',dinero(trades?.data?.maker_buy_notional_usd));
  texto('volVenta',dinero(trades?.data?.maker_sell_notional_usd));
  texto('eth',dinero(eth?.data?.price));
  texto('btceur',euros(euro?.data?.price));
  texto('kp',numero(kp?.data?.value));
  texto('kpEstado',kp?.status==='observed'?
    'Lectura de '+fecha(kp.data.observed_at):kp?.reason??'Sin datos de NOAA');
  const fuentes=$('fuentes');fuentes.replaceChildren();
  const todas=[['Coinbase · BTC/USD', {status:c?'observed':'unavailable'}],
    ['Coinbase · Libro de órdenes',book],['Coinbase · Operaciones',trades],
    ['Coinbase · ETH/USD',eth],['Coinbase · BTC/EUR',euro],
    ['NOAA · Índice geomagnético',kp]];
  for(const [nombre,registro] of todas)fuentes.append(fuente(nombre,registro));
  texto('fuentesContador',(c?.source_count??0)+' de 6 fuentes');
}
function llenarHistoria(){
  const historial=estado?.historial??[];
  texto('historiaContador',historial.length+' lecturas');
  const cuerpo=$('tablaHistoria');cuerpo.replaceChildren();
  if(!historial.length){
    const fila=document.createElement('tr'),celda=document.createElement('td');
    celda.colSpan=4;celda.textContent='No hay capturas. Pulsa «Actualizar lectura».';
    fila.append(celda);cuerpo.append(fila);return;
  }
  for(const registro of historial.slice(-30).reverse()){
    const fila=document.createElement('tr');
    const campos=[fecha(registro.fecha),dinero(registro.precio),
      dinero(registro.precio_proyectado),String(registro.fuentes??'—')];
    for(const valor of campos){
      const celda=document.createElement('td');celda.textContent=valor;fila.append(celda);
    }
    cuerpo.append(fila);
  }
  texto('historiaNota',historial.length<2?
    'Hay una captura. Una sola instantánea no establece ninguna trayectoria causal.':
    'Hay '+historial.length+' capturas. Comparar sus cambios todavía no demuestra causalidad; se necesitan controles y validación temporal.');
}
function llenarValidacion(c){
  const m=c?.instrument_15m,b=m?.backtest;
  texto('errorModelo',porcentaje(b?.model_mae_return_pct));
  texto('errorReferencia',porcentaje(b?.reference_mae_return_pct));
  texto('decisiones',numero(b?.scored));
  texto('numeroEstados',numero(c?.universal_state?.known_states));
  texto('numeroDominios',numero(c?.universal_state?.domains?.length));
  texto('huella',c?.universal_state?.snapshot_sha256??'—');
  texto('objetivoValidacion',fecha(m?.target_at));
  let advertencia='No hay pruebas recientes que evaluar.';
  if(b?.beats_persistence===false)advertencia='En la evaluación retrospectiva, el modelo NO superó el precio sin cambio. El panel muestra la referencia como estimación central.';
  else if(b?.beats_persistence===true)advertencia='El modelo mejoró la referencia en una muestra corta. Sigue siendo experimental: falta una prueba externa independiente.';
  else if(b)advertencia='La muestra de evaluación es insuficiente. No se declara una ventaja predictiva.';
  texto('resultadoPrueba',advertencia);
}
function mostrarDatos(){
  const c=estado?.ultima,m=c?.instrument_15m;
  $('exportar').hidden=!c;
  const antigua=c?Date.now()-Date.parse(c.at)>3*60*1000:false;
  const indicador=$('estadoConexion');
  indicador.className='indicador'+(c?(antigua?' antiguo':' correcto'):'');
  indicador.textContent=!c?'Sin lectura':antigua?'Captura histórica':'Lectura reciente';
  texto('horaLectura',c?'Última captura: '+fecha(c.at):'Sin una captura registrada');
  texto('precioObservado',dinero(m?.observed_price_usd));
  texto('precioFecha',c?'Fuente: Coinbase Exchange · '+fecha(m.observed_at):
    'Pulsa «Actualizar lectura» para consultar la fuente.');
  texto('precioEstimado',dinero(m?.projected_price_usd));
  texto('modeloEstado',estadoModelo(m));
  texto('rango',Array.isArray(m?.scenario_interval_usd)?
    dinero(m.scenario_interval_usd[0])+' – '+dinero(m.scenario_interval_usd[1]):'No calculado');
  texto('candidato',dinero(m?.model_candidate_price_usd));
  texto('fechaObjetivo',m?.target_at?'Objetivo: '+fecha(m.target_at):'Solo está disponible el horizonte de 15 minutos.');
  texto('graficaNota',c?
    'Velas recuperadas durante la captura. La línea discontinua es una estimación; no es una operación ni un dato futuro.':
    'Sin datos simulados. El tramo calculado no representa un precio futuro observado.');
  trazar(serieHistorica(c),m?.projected_price_usd,m?.scenario_interval_usd);
  llenarFactores(c);llenarHistoria();llenarValidacion(c);
}
async function pedir(url,opciones){
  const respuesta=await fetch(url,{cache:'no-store',...opciones});
  const datos=await respuesta.json();
  if(!respuesta.ok)throw Error(datos.error||'No fue posible completar la consulta.');
  return datos;
}
async function cargar(){
  try{estado=await pedir('/api/estado');alerta('');mostrarDatos();}
  catch(err){alerta('No se pudo leer el panel local: '+err.message);}
}
async function actualizar(){
  if(cargando)return;
  cargando=true;
  $('actualizar').disabled=true;$('actualizar').textContent='Leyendo fuentes…';
  alerta('');
  try{estado=await pedir('/api/actualizar',{method:'POST'});mostrarDatos();}
  catch(err){alerta(err.message+' La última captura válida, si existe, se conserva.');}
  finally{cargando=false;$('actualizar').disabled=false;
    $('actualizar').textContent='Actualizar lectura';}
}
for(const boton of document.querySelectorAll('.pestana')){
  boton.addEventListener('click',()=>irAVista(boton.dataset.vista));
}
$('actualizar').addEventListener('click',actualizar);
cargar();

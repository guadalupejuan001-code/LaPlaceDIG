"""Pruebas externas del panel ORIGINAL. No modifica el producto.
Datos: captura real anterior del mismo trabajo; casos artificiales etiquetados.
"""
import os,json,time,copy,math,subprocess,shutil
from pathlib import Path
from datetime import datetime,timedelta
from playwright.sync_api import sync_playwright
ROOT=Path.cwd(); OUT=ROOT/'evidencia-auditoria'; OUT.mkdir(exist_ok=True)
SHOTS=OUT/'capturas'; SHOTS.mkdir(exist_ok=True)
real=json.loads((OUT/'captura-real.json').read_text())
assert real.get('schema')=='laplace-universo-btc-u001-v1','No hay captura real para reproducir'
server_code="""import {crearServidor} from %s;
import {readFileSync} from 'node:fs';
const real=JSON.parse(readFileSync(%s));let n=0;
const s=crearServidor({archivo:%s,capturar:async()=>{n++;if(n>1)throw Error('Fallo de fuente inducido para auditoría');return structuredClone(real)}});
s.listen(4180,'127.0.0.1');process.on('SIGTERM',()=>s.close(()=>process.exit(0)));
"""%(json.dumps((ROOT/'panel/servidor.mjs').as_uri()),json.dumps(str(OUT/'captura-real.json')),json.dumps(str(OUT/'registro-navegador.json')))
(OUT/'servidor-prueba.mjs').write_text(server_code)
(OUT/'registro-navegador.json').unlink(missing_ok=True)
server=subprocess.Popen(['node',str(OUT/'servidor-prueba.mjs')],stdout=open(OUT/'servidor-navegador.txt','w'),stderr=subprocess.STDOUT)
BASE='http://127.0.0.1:4180'; results=[]; errors=[]
def record(code,name,ok,**info):
 row={'id':code,'nombre':name,'aprobado':bool(ok),'evidencia':info};results.append(row);print(json.dumps(row,ensure_ascii=False),flush=True)
def tab(page,name):
 page.get_by_role('button',name=name,exact=True).click();return page.locator('.vista:visible').count()
version=None
try:
 with sync_playwright() as p:
  exe=shutil.which('google-chrome') or shutil.which('chromium') or shutil.which('chromium-browser')
  browser=p.chromium.launch(executable_path=exe,headless=True,args=['--no-sandbox'])
  version=browser.version
  context=browser.new_context(viewport={'width':1366,'height':1000},locale='es-MX',timezone_id='America/New_York',accept_downloads=True)
  page=context.new_page();page.set_default_timeout(10000);page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE);page.wait_for_function("document.querySelector('#precioFecha').textContent.includes('Pulsa')")
  record('N01','Inicio sin cifras ficticias y exportación oculta',page.locator('#precioObservado').inner_text()=='—' and not page.locator('#exportar').is_visible())
  page.screenshot(path=str(SHOTS/'01-sin-datos.png'),full_page=True)
  page.get_by_role('button',name='Actualizar lectura',exact=True).click()
  page.wait_for_function("document.querySelector('#precioObservado').textContent!=='—'")
  data=page.evaluate('estado')
  record('N02','Botón carga la captura real reproducida y guarda una lectura',data['ultima']['instrument_15m']['observed_price_usd']==real['instrument_15m']['observed_price_usd'] and len(data['historial'])==1,fecha_captura=real['at'],tipo='Reproducción de captura real, no una nueva cotización')
  record('N03','Dibuja los cierres descargados y la proyección',page.locator('#grafico path').count()==2,cierres=len(real['instrument_15m']['serie_cierres_5m']))
  page.screenshot(path=str(SHOTS/'02-escritorio-captura-real.png'),full_page=True)
  recorrido=[{'seccion':name,'visibles':tab(page,name)} for name in ['Factores observados','Historia','Validación','Mercado']]
  record('N04','Las cuatro secciones responden sin superponerse',all(x['visibles']==1 for x in recorrido),recorrido=recorrido)
  tab(page,'Factores observados')
  record('N05','Representa las fuentes realmente disponibles',page.locator('.estado-fuente:not(.no)').count()==real['source_count'],fuentes=page.locator('#fuentesContador').inner_text())
  page.screenshot(path=str(SHOTS/'03-factores.png'),full_page=True)
  tab(page,'Validación');b=real['instrument_15m']['backtest']
  record('N06','No oculta si el modelo falla frente a la referencia',('NO superó' in page.locator('#resultadoPrueba').inner_text())==(b['beats_persistence'] is False),texto=page.locator('#resultadoPrueba').inner_text())
  page.screenshot(path=str(SHOTS/'04-validacion.png'),full_page=True)
  tab(page,'Mercado')
  with page.expect_download() as pending:page.locator('#exportar').click()
  download=pending.value;dest=OUT/'exportado-desde-navegador.json';download.save_as(dest)
  record('N07','Descarga la captura exacta desde Exportar',json.loads(dest.read_text())==real,archivo=download.suggested_filename)
  time.sleep(2.1);before=page.locator('#precioObservado').inner_text()
  page.get_by_role('button',name='Actualizar lectura',exact=True).click();page.locator('#aviso').wait_for(state='visible')
  page.wait_for_function("!document.querySelector('#actualizar').disabled")
  record('N08','Conserva el precio y permite reintentar tras fallo de fuente',page.locator('#precioObservado').inner_text()==before and 'inducido' in page.locator('#aviso').inner_text(),tipo='Fallo inducido, no caída real del proveedor')
  page.reload();page.wait_for_function("document.querySelector('#precioObservado').textContent!=='—'")
  record('N09','Recargar no pierde la lectura',page.locator('#precioObservado').inner_text()==before)
  for code,label,w,h in [('N10','escritorio',1366,1000),('N11','móvil vertical',390,844),('N12','móvil compacto',360,800),('N13','móvil horizontal',844,390)]:
   page.set_viewport_size({'width':w,'height':h});sizes=[]
   for name in ['Mercado','Factores observados','Historia','Validación']:
    tab(page,name);sizes.append({'seccion':name,**page.evaluate('({ancho:document.documentElement.clientWidth,contenido:document.documentElement.scrollWidth})')})
   record(code,'Sin desbordamiento horizontal: '+label,all(x['contenido']<=x['ancho']+1 for x in sizes),dimensiones=[w,h],secciones=sizes,limite='Emulación de tamaño, no Android físico')
   tab(page,'Mercado');page.screenshot(path=str(SHOTS/(code+'-'+label.replace(' ','-')+'.png')),full_page=True)
  page.set_viewport_size({'width':1366,'height':1000})
  anchor=page.evaluate("""() => {const m=estado.ultima.instrument_15m,s=serieHistorica(estado.ultima);return {precio_actual:m.observed_price_usd,ultimo_cierre:s.at(-1).precio,fecha_cierre:s.at(-1).fecha,fecha_cotizacion:m.observed_at,precio_central:m.projected_price_usd,modelo:m.model_selected,tramo_calculado:document.querySelector('#grafico path:last-of-type').getAttribute('d'),alturas:[...document.querySelectorAll('#grafico circle')].map(x=>Number(x.getAttribute('cy')))}}""")
  a=anchor['alturas'];ok=math.isclose(a[0],a[1],abs_tol=.02) if anchor['precio_actual']==anchor['precio_central'] else anchor['ultimo_cierre']==anchor['precio_actual']
  record('N14','El tramo futuro parte de la cotización actual, no de un cierre anterior',ok,**anchor)
  axis=page.evaluate("""() => {const s=[{fecha:'2026-10-29T10:00:00Z',precio:100},{fecha:'2026-10-29T10:05:00Z',precio:110},{fecha:'2026-10-29T10:10:00Z',precio:105}];trazar(s,105,null);const uno=document.querySelector('#grafico path').getAttribute('d');s[1].fecha='2026-10-29T10:01:00Z';s[2].fecha='2026-10-29T11:00:00Z';trazar(s,105,null);const dos=document.querySelector('#grafico path').getAttribute('d');mostrarDatos();return {intervalos_regulares:uno,intervalos_irregulares:dos}}""")
  record('N15','La gráfica distingue separación temporal real entre muestras',axis['intervalos_regulares']!=axis['intervalos_irregulares'],caso='Geometría sintética, no cotizaciones',**axis)
  stale_context=browser.new_context(locale='es-MX',timezone_id='America/New_York');stale=stale_context.new_page()
  stale.clock.install(time=datetime.fromisoformat(real['at'].replace('Z','+00:00'))+timedelta(seconds=1))
  stale.goto(BASE);stale.wait_for_function("document.querySelector('#precioObservado').textContent!=='—'")
  initial=stale.locator('#estadoConexion').inner_text();stale.clock.fast_forward(181000);final=stale.locator('#estadoConexion').inner_text()
  record('N16','Una captura caduca en pantalla sin necesidad de recargar',final=='Captura histórica',antes=initial,despues=final,edad_ms=stale.evaluate('Date.now()-Date.parse(estado.ultima.at)'),caso='Reloj controlado del navegador')
  stale_context.close()
  forty=copy.deepcopy(data);template=forty['historial'][0];t=datetime.fromisoformat(real['at'].replace('Z','+00:00'))
  forty['historial']=[{**template,'fecha':(t-timedelta(minutes=39-i)).isoformat(timespec='milliseconds').replace('+00:00','Z')} for i in range(40)]
  hp=context.new_page();hp.route('**/api/estado',lambda route:route.fulfill(status=200,content_type='application/json',body=json.dumps(forty)))
  hp.goto(BASE);hp.wait_for_function("document.querySelector('#precioObservado').textContent!=='—'");tab(hp,'Historia');count=hp.locator('#tablaHistoria tr').count()
  record('N17','Permite revisar todas las capturas anunciadas en Historia',count==40,anunciadas=hp.locator('#historiaContador').inner_text(),visibles=count,caso='40 marcas sintéticas; comprobar límite visual sin paginación')
  hp.close()
  evil=copy.deepcopy(data);evil['ultima']['measured_market'][0]={'name':'book','status':'unavailable','reason':'<img src=x onerror="window.auditXss=1">'}
  xp=context.new_page();xp.route('**/api/estado',lambda route:route.fulfill(status=200,content_type='application/json',body=json.dumps(evil)))
  xp.goto(BASE);xp.wait_for_function("document.querySelector('#precioObservado').textContent!=='—'");tab(xp,'Factores observados')
  record('N18','El mensaje hostil de una fuente es texto, no HTML ejecutable',xp.evaluate('window.auditXss??null') is None and xp.locator('#fuentes img').count()==0,tipo='Cadena adversaria local')
  xp.close();record('N19','No aparecen excepciones JavaScript durante el recorrido',not errors,errores=errors)
  context.close();browser.close()
except Exception as e:
 record('HARNESS','Ejecución del banco de pruebas',False,error=str(e))
 raise
finally:
 server.terminate()
 try:server.wait(timeout=5)
 except subprocess.TimeoutExpired:server.kill()
 report={'navegador':version,'codigo_producto':'fab365642df471417c5d12ddc021911a90a9d1e3','origen':'Captura real reproducida; fallos y casos artificiales etiquetados','pruebas':results,'aprobadas':sum(x['aprobado'] for x in results),'fallidas':sum(not x['aprobado'] for x in results)}
 (OUT/'resultados-navegador.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps({'aprobadas':report['aprobadas'],'fallidas':report['fallidas']}))

/* Servidor local del panel LAPLACE. No expone Internet ni abre operaciones. */
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,renameSync,mkdirSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {observeUniverseBTC} from '../universo/mercado.mjs';
import {registroVacio,normalizarRegistro,añadirCaptura} from './registro.mjs';

const raiz=dirname(fileURLToPath(import.meta.url));
const archivos=Object.freeze({
  '/':'index.html',
  '/panel.css':'panel.css',
  '/panel.js':'panel.js'
});
const tipos={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8'};
const debe=(ok,texto)=>{if(!ok)throw Error(texto)};
const paginas=Object.fromEntries(Object.entries(archivos).map(([url,path])=>
  [url,readFileSync(join(raiz,'publico',path))]));
export const DIRECCION_LOCAL='127.0.0.1';
export const PUERTO_PREDETERMINADO=4179;
export const ARCHIVO_PREDETERMINADO='registros/panel-laplace.json';
function json(res,status,body){
  const text=JSON.stringify(body);
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(text);
}
function errorExplicito(err){
  return String(err?.message??'Error desconocido').replace(/[\u0000-\u001f]/g,' ').slice(0,240);
}
function leer(path){
  try{return normalizarRegistro(JSON.parse(readFileSync(path,'utf8')))}
  catch(err){if(err.code==='ENOENT')return registroVacio();throw err}
}
function grabar(path,registro){
  mkdirSync(dirname(path),{recursive:true});
  const temporal=path+'.'+process.pid+'.temporal';
  writeFileSync(temporal,JSON.stringify(registro,null,2)+'\n',{flag:'w',mode:0o600});
  renameSync(temporal,path);
}
export function crearServidor({capturar=observeUniverseBTC,archivo=ARCHIVO_PREDETERMINADO,
    ahora=()=>Date.now()}={}){
  let estado=leer(archivo),ocupado=false,ultimaLectura=0;
  const server=createServer(async(req,res)=>{
    const origen='http://'+DIRECCION_LOCAL+':'+(server.address()?.port??PUERTO_PREDETERMINADO);
    const url=(req.url??'/').split('?')[0];
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',
      "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'");
    // No permitir un Host remoto ni una solicitud POST de otro origen.
    const host=req.headers.host??'';
    if(!new RegExp('^(127\\.0\\.0\\.1|localhost)(:\\d+)?$').test(host)){
      json(res,403,{error:'Solo se permiten conexiones locales'});return;
    }
    if(req.method==='GET'&&url==='/api/estado'){
      json(res,200,{...estado,servidor_en:new Date(ahora()).toISOString(),
        horizonte_disponible_minutos:15,actualizacion_automatica:false});return;
    }
    if(req.method==='GET'&&url==='/api/exportar'){
      if(!estado.ultima){json(res,404,{error:'Todavía no hay una captura que exportar'});return}
      res.setHeader('Content-Disposition','attachment; filename="laplace-ultima-captura.json"');
      json(res,200,estado.ultima);return;
    }
    if(req.method==='POST'&&url==='/api/actualizar'){
      if(req.headers.origin&&req.headers.origin!==origen){
        json(res,403,{error:'Solicitud externa bloqueada'});return;
      }
      if(Number(req.headers['content-length']??0)>0){
        json(res,400,{error:'La actualización no admite parámetros enviados'});return;
      }
      if(ocupado){json(res,409,{error:'Ya hay una lectura en curso'});return;}
      if(ahora()-ultimaLectura<2000){
        json(res,429,{error:'Lecturas demasiado seguidas. Vuelve a pulsar en unos segundos'});return;
      }
      ocupado=true;ultimaLectura=ahora();
      try{
        const nueva=await capturar();
        const actualizado=añadirCaptura(estado,nueva);
        grabar(archivo,actualizado);
        estado=actualizado;
        json(res,200,{...estado,servidor_en:new Date(ahora()).toISOString(),
          horizonte_disponible_minutos:15,actualizacion_automatica:false});
      }catch(err){json(res,502,{error:'La medición no pudo completarse: '+errorExplicito(err),
        ultima_lectura_conservada:!!estado.ultima});}
      finally{ocupado=false;}
      return;
    }
    if(req.method==='GET'&&Object.hasOwn(paginas,url)){
      const ext=url==='/'?'.html':url.slice(url.lastIndexOf('.'));
      res.writeHead(200,{'Content-Type':tipos[ext],'Cache-Control':'no-store'});
      res.end(paginas[url]);return;
    }
    json(res,404,{error:'La ruta solicitada no existe'});
  });
  return server;
}
export async function iniciarPanel({puerto=PUERTO_PREDETERMINADO,archivo=ARCHIVO_PREDETERMINADO}={}){
  debe(Number.isSafeInteger(puerto)&&puerto>=1&&puerto<=65535,'Puerto local inválido');
  const server=crearServidor({archivo});
  await new Promise((resolver,rechazar)=>{
    server.once('error',rechazar);
    server.listen(puerto,DIRECCION_LOCAL,resolver);
  });
  return server;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
  const puerto=Number(process.env.LAPLACE_PANEL_PUERTO??PUERTO_PREDETERMINADO);
  const archivo=process.env.LAPLACE_PANEL_ARCHIVO??ARCHIVO_PREDETERMINADO;
  iniciarPanel({puerto,archivo}).then(()=>console.log(
    'LAPLACE — Panel local: http://127.0.0.1:'+puerto+
    '\nPulsa «Actualizar lectura» para obtener datos reales.')).catch(e=>{
      console.error('No se pudo iniciar LAPLACE:',errorExplicito(e));process.exitCode=1;
    });
}

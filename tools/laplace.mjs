#!/usr/bin/env node
'use strict';
// LaPlaceDIG: local data ingestion and proof. This is not a trading bot.
import {readFileSync,writeFileSync} from 'node:fs';
import {parseJSONL,canonicalLedger,canonicalFact,stringifyJSONL,ledgerHash,
        asOf,persistenceBaseline,timestamp,KIND} from '../historia/contrato.mjs';
import {proveWithOriginalEther} from '../historia/ether-xi.mjs';
import {parseTransitions,learn,predict} from '../inteligencia/laplace.mjs';
import {experiment} from '../inteligencia/experimento.mjs';
import {trainNarrative,predictNarrative,evaluateNarrative} from '../narrativa/modelo.mjs';
import {narrativeExperiment} from '../narrativa/experimento.mjs';
import {importReliefWeb,importGDELT} from '../narrativa/fuentes.mjs';
import {trainDual,predictDual} from '../coexistencia/modelo.mjs';
import {registerForecast,registerRealities,reconcileJournal,readJournal,patternResults,provePattern} from '../coexistencia/patrones.mjs';
import {dualExperiment} from '../coexistencia/experimento.mjs';
import {simulateRealities} from '../coexistencia/realidades.mjs';
import {realitiesExperiment} from '../coexistencia/experimento-realidades.mjs';

function usage(){
  process.stdout.write('LaPlaceDIG — laboratorio del demonio digital\n'
   +'  node tools/laplace.mjs validar hechos.jsonl\n'
   +'  node tools/laplace.mjs corte hechos.jsonl 2020-01-01T00:00:00Z\n'
   +'  node tools/laplace.mjs referencia hechos.jsonl CORTE_UTC ACTIVO\n'
   +'  node tools/laplace.mjs verificar-ether hechos.jsonl CORTE_UTC RUTA_MUNDO_X_QUANTUM\n'
   +'  node tools/laplace.mjs convertir-precios precios.csv > hechos.jsonl\n'
   +'  node tools/laplace.mjs aprender-leyes transiciones.jsonl CORTE_UTC BIN_XI MODELO.json\n'
   +'  node tools/laplace.mjs predecir-estado MODELO.json ESTADO_BINARIO PASOS BIN_XI\n'
   +'  node tools/laplace.mjs experimento-aprendiz BIN_XI DIRECTORIO_RESULTADOS\n'
   +'  node tools/laplace.mjs entrenar-narrativa hechos.jsonl CONFIG.json BIN_XI MODELO.json\n'
   +'  node tools/laplace.mjs probabilidad-narrativa MODELO.json hechos.jsonl CORTE_UTC BIN_XI\n'
   +'  node tools/laplace.mjs evaluar-narrativa MODELO.json hechos.jsonl FIN_TEST_UTC BIN_XI\n'
   +'  node tools/laplace.mjs experimento-narrativa BIN_XI DIRECTORIO_RESULTADOS\n'
   +'  node tools/laplace.mjs importar-narrativa reliefweb|gdelt CAPTURA.json > hechos.jsonl\n'
   +'  node tools/laplace.mjs entrenar-dual hechos.jsonl CONFIG.json BIN_XI MODELO_DUAL.json\n'
   +'  node tools/laplace.mjs pronostico-dual MODELO_DUAL.json hechos.jsonl CORTE_UTC BIN_XI REGISTRO.jsonl\n'
   +'  node tools/laplace.mjs contrastar-dual REGISTRO.jsonl hechos.jsonl CORTE_UTC\n'
   +'  node tools/laplace.mjs patrones REGISTRO.jsonl\n'
   +'  node tools/laplace.mjs verificar-patron REGISTRO.jsonl ID_PATRON BIN_XI\n'
   +'  node tools/laplace.mjs experimento-dual BIN_XI DIRECTORIO_NUEVO\n'
   +'  node tools/laplace.mjs analizar-realidades MODELO_DUAL hechos.jsonl CORTE_UTC ESCENARIOS.json BIN_XI REGISTRO.jsonl\n'
   +'  node tools/laplace.mjs experimento-realidades BIN_XI DIRECTORIO_NUEVO\n'
   +'Datos historicos siempre identificados por fuente y fecha de disponibilidad. Sin cotizaciones inventadas.\n');
}
function must(v,message){if(!v)throw Error(message)}
function readJsonl(name){must(name,'missing JSONL file');return parseJSONL(readFileSync(name,'utf8'))}
function convertPriceCSV(filename){
  must(filename,'missing CSV filename');
  const rows=readFileSync(filename,'utf8').replace(/\r/g,'').trim().split('\n');
  must(rows.shift()==='id,asset,observed_at,known_at,value,price_basis,currency,source_url',
      'Expected the exact CSV header id,asset,observed_at,known_at,value,price_basis,currency,source_url');
  must(rows.length>0,'empty CSV');
  must(rows.length<=10000,'too many rows');
  const result=rows.map((line,index)=>{
    const cells=line.split(',');
    must(cells.length===8,'CSV line '+(index+2)+' must have eight unquoted columns; use JSONL for commas in fields');
    const [id,asset,observed_at,known_at,value,price_basis,currency,source_url]=cells;
    return canonicalFact({id,kind:'precio',observed_at,known_at,value,asset,price_basis,currency,source_url});
  });
  return stringifyJSONL(result);
}
function summary(rows){
  return {
    status:'ARCHIVO_LOCAL_VALIDADO',count:rows.length,
    kinds:Object.fromEntries(KIND.map(k=>[k,rows.filter(x=>x.kind===k).length])),
    historical_sha256:ledgerHash(rows),
    earliest_known_at:rows[0]?.known_at??null,
    latest_known_at:rows.at(-1)?.known_at??null,
    warning:'No implica que los precios ni fechas sean autenticos: verifica procedencia y licencia de la fuente'
  };
}
function main(){
  const [, ,command,...params]=process.argv;
  if(!command||['ayuda','help','--help'].includes(command)){usage();return;}
  if(command==='analizar-realidades'){
    must(params.length===6,'uso: analizar-realidades MODELO_DUAL hechos.jsonl CORTE_UTC ESCENARIOS.json BIN_XI REGISTRO.jsonl');
    const checkpoint=JSON.parse(readFileSync(params[0],'utf8'));
    const run=simulateRealities(params[4],checkpoint,JSON.parse(readFileSync(params[3],'utf8')));
    const issued=registerForecast(params[5],predictDual(params[4],checkpoint,readJsonl(params[1]),params[2])).event;
    console.log(JSON.stringify(registerRealities(params[5],issued.forecast_id,run.analysis),null,2));return;
  }
  if(command==='experimento-realidades'){
    must(params.length===2,'uso: experimento-realidades BIN_XI DIRECTORIO_NUEVO');
    console.log(JSON.stringify(realitiesExperiment(params[0],params[1]),null,2));return;
  }
  if(command==='entrenar-dual'){
    must(params.length===4,'uso: entrenar-dual hechos.jsonl CONFIG.json BIN_XI MODELO_DUAL.json');
    const {checkpoint,...summary}=trainDual(params[2],readJsonl(params[0]),JSON.parse(readFileSync(params[1],'utf8')));
    if(checkpoint)writeFileSync(params[3],JSON.stringify(checkpoint,null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({...summary,checkpoint_file:checkpoint?params[3]:null},null,2));return;
  }
  if(command==='pronostico-dual'){
    must(params.length===5,'uso: pronostico-dual MODELO_DUAL.json hechos.jsonl CORTE_UTC BIN_XI REGISTRO.jsonl');
    const forecast=predictDual(params[3],JSON.parse(readFileSync(params[0],'utf8')),readJsonl(params[1]),params[2]);
    const result=registerForecast(params[4],forecast);
    console.log(JSON.stringify(result,null,2));return;
  }
  if(command==='contrastar-dual'){
    must(params.length===3,'uso: contrastar-dual REGISTRO.jsonl hechos.jsonl CORTE_UTC');
    console.log(JSON.stringify(reconcileJournal(params[0],readJsonl(params[1]),params[2]),null,2));return;
  }
  if(command==='patrones'){
    must(params.length===1,'uso: patrones REGISTRO.jsonl');
    console.log(JSON.stringify(patternResults(readJournal(params[0])),null,2));return;
  }
  if(command==='verificar-patron'){
    must(params.length===3,'uso: verificar-patron REGISTRO.jsonl ID_PATRON BIN_XI');
    const {checkpoint,...proof}=provePattern(params[2],readJournal(params[0]),params[1]);
    console.log(JSON.stringify(proof,null,2));return;
  }
  if(command==='experimento-dual'){
    must(params.length===2,'uso: experimento-dual BIN_XI DIRECTORIO_NUEVO');
    console.log(JSON.stringify(dualExperiment(params[0],params[1]),null,2));return;
  }
  if(command==='importar-narrativa'){
    must(params.length===2&&['reliefweb','gdelt'].includes(params[0]),
      'uso: importar-narrativa reliefweb|gdelt CAPTURA.json');
    const raw=JSON.parse(readFileSync(params[1],'utf8'));
    process.stdout.write(stringifyJSONL(params[0]==='reliefweb'?importReliefWeb(raw):importGDELT(raw)));return;
  }
  if(command==='experimento-narrativa'){
    must(params.length===2,'uso: experimento-narrativa BIN_XI DIRECTORIO_RESULTADOS');
    console.log(JSON.stringify(narrativeExperiment(params[0],params[1]),null,2));return;
  }
  if(command==='entrenar-narrativa'){
    must(params.length===4,'uso: entrenar-narrativa hechos.jsonl CONFIG.json BIN_XI MODELO.json');
    const result=trainNarrative(params[2],readJsonl(params[0]),JSON.parse(readFileSync(params[1],'utf8')));
    const {checkpoint,...summary}=result;
    if(checkpoint)writeFileSync(params[3],JSON.stringify(checkpoint,null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({...summary,checkpoint_file:checkpoint?params[3]:null},null,2));return;
  }
  if(['probabilidad-narrativa','evaluar-narrativa'].includes(command)){
    must(params.length===4,'uso: '+command+' MODELO.json hechos.jsonl CORTE_UTC BIN_XI');
    const checkpoint=JSON.parse(readFileSync(params[0],'utf8')),records=readJsonl(params[1]);
    const result=command==='probabilidad-narrativa'
      ?predictNarrative(params[3],checkpoint,records,params[2])
      :evaluateNarrative(params[3],checkpoint,records,params[2]);
    console.log(JSON.stringify(result,null,2));return;
  }
  if(command==='experimento-aprendiz'){
    must(params.length===2,'uso: experimento-aprendiz BIN_XI DIRECTORIO_RESULTADOS');
    console.log(JSON.stringify(experiment(params[0],params[1]),null,2));return;
  }
  if(command==='aprender-leyes'){
    must(params.length===4,'uso: aprender-leyes transiciones.jsonl CORTE_UTC BIN_XI MODELO.json');
    const result=learn(params[2],parseTransitions(readFileSync(params[0],'utf8')),params[1]);
    if(result.checkpoint)writeFileSync(params[3],JSON.stringify(result.checkpoint,null,2)+'\n',{flag:'wx'});
    const {checkpoint,...summary}=result;
    console.log(JSON.stringify({...summary,checkpoint_file:checkpoint?params[3]:null},null,2));return;
  }
  if(command==='predecir-estado'){
    must(params.length===4,'uso: predecir-estado MODELO.json ESTADO_BINARIO PASOS BIN_XI');
    must(/^[1-9][0-9]*$/.test(params[2]),'PASOS debe ser entero positivo');
    const checkpoint=JSON.parse(readFileSync(params[0],'utf8'));
    const {xi,...forecast}=predict(params[3],checkpoint,params[1],Number(params[2]));
    console.log(JSON.stringify(forecast,null,2));return;
  }
  if(command==='convertir-precios'){
    process.stdout.write(convertPriceCSV(params[0]));return;
  }
  const records=readJsonl(params[0]);
  if(command==='validar'){
    console.log(JSON.stringify(summary(records),null,2));return;
  }
  const cutoff=timestamp(params[1],'cutoff');
  if(command==='corte'){
    process.stdout.write(stringifyJSONL(asOf(records,cutoff)));return;
  }
  if(command==='referencia'){
    must(params[2],'missing asset name');
    console.log(JSON.stringify(persistenceBaseline(records,cutoff,params[2]),null,2));return;
  }
  if(command==='verificar-ether'){
    must(params[2],'missing original Mundo X quantum runtime');
    console.log(JSON.stringify(proveWithOriginalEther(params[2],records,cutoff),null,2));return;
  }
  throw Error('unknown command '+command);
}
try{main()}catch(error){console.error('LaPlaceDIG: '+error.message);process.exitCode=1;}

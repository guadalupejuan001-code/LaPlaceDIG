#!/usr/bin/env node
'use strict';
// LaPlaceDIG: local data ingestion and proof. This is not a trading bot.
import {readFileSync} from 'node:fs';
import {parseJSONL,canonicalLedger,canonicalFact,stringifyJSONL,ledgerHash,
        asOf,persistenceBaseline,timestamp} from '../historia/contrato.mjs';
import {proveWithOriginalEther} from '../historia/ether-xi.mjs';

function usage(){
  process.stdout.write('LaPlaceDIG — laboratorio del demonio digital\n'
   +'  node tools/laplace.mjs validar hechos.jsonl\n'
   +'  node tools/laplace.mjs corte hechos.jsonl 2020-01-01T00:00:00Z\n'
   +'  node tools/laplace.mjs referencia hechos.jsonl CORTE_UTC ACTIVO\n'
   +'  node tools/laplace.mjs verificar-ether hechos.jsonl CORTE_UTC RUTA_MUNDO_X_QUANTUM\n'
   +'  node tools/laplace.mjs convertir-precios precios.csv > hechos.jsonl\n'
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
    kinds:Object.fromEntries(['precio','economia','geopolitica'].map(k=>[k,rows.filter(x=>x.kind===k).length])),
    historical_sha256:ledgerHash(rows),
    earliest_known_at:rows[0]?.known_at??null,
    latest_known_at:rows.at(-1)?.known_at??null,
    warning:'No implica que los precios ni fechas sean autenticos: verifica procedencia y licencia de la fuente'
  };
}
function main(){
  const [, ,command,...params]=process.argv;
  if(!command||['ayuda','help','--help'].includes(command)){usage();return;}
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

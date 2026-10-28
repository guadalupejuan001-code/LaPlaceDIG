/* Export a verified native model into a portable read-only simulation profile.
 * The XI checkpoint remains authoritative; this export cannot rewrite it. */
import {canonicalLedger,ledgerHash} from '../historia/contrato.mjs';
import {digest} from '../inteligencia/laplace.mjs';
import {restoreNarrative,marketSamples} from '../narrativa/modelo.mjs';
import {THEMES,narrativeState} from '../narrativa/espacio.mjs';
import {historicalView,pastComparisons} from './calibracion.mjs';
import {TIME_VERSION,LAST_DATE} from './tiempo.mjs';
const need=(ok,message)=>{if(!ok)throw Error(message)};
const labels={CONFLICT_ESCALATION:'Conflicto armado',CEASEFIRE:'Alto el fuego',SANCTIONS:'Sanciones',
 SHIPPING_DISRUPTION:'Rutas comerciales',DIPLOMATIC_COOPERATION:'Cooperación diplomática',
 CIVILIAN_HARM:'Daño a civiles',DISPLACEMENT:'Desplazamiento',FOOD_INSECURITY:'Inseguridad alimentaria',
 AID_BLOCKED:'Ayuda restringida',RELIEF_ACCESS:'Acceso a ayuda',HEALTH_EMERGENCY:'Emergencia sanitaria'};
export function createTimeProfile(binary,history,report){
  const records=canonicalLedger([...history.records]);
  need(ledgerHash(records)===history.ledger_sha256&&report.source_ledger_sha256===history.ledger_sha256,'procedencia temporal incompatible');
  const fold=report.folds.filter(item=>item.checkpoint).at(-1);need(fold,'sin modelo nativo para exportar');
  const {model,native}=restoreNarrative(binary,fold.checkpoint),view=historicalView(history,report.mode);
  const training=marketSamples(view,model.config,model.config.start_at,model.config.train_end,model.config.train_end);
  const prices=new Map(view.filter(row=>row.kind==='precio'&&row.asset==='BTC-USD'&&row.price_basis==='raw_close')
    .map(row=>[row.id,row]));
  const returns={positive:[],negative:[]};
  for(const row of training.rows){
    const first=prices.get(row.price_ids[0]),last=prices.get(row.price_ids[1]);
    need(first.known_at<=model.config.train_end&&last.known_at<=model.config.train_end,'retorno futuro en entrenamiento');
    returns[row.y?'positive':'negative'].push(Math.log(Number(last.value)/Number(first.value)));
  }
  const news=records.filter(row=>['geopolitica','humanitaria'].includes(row.kind));
  const known=news.map(row=>row.known_at).sort().at(-1);need(known,'sin narrativa archivada');
  const state=narrativeState(records,known,model.config.narrative_hours),comparisons=pastComparisons(history,report);
  const body={schema:TIME_VERSION,origin_date:history.end.slice(0,10),range_start:comparisons.rows[0].decision_at.slice(0,10),range_end:LAST_DATE,
    asset:'BTC-USD',cost_bps:model.config.cost_bps,source_ledger_sha256:history.ledger_sha256,
    model_state_sha256:fold.checkpoint.state_sha256,model_validation_end:model.config.validation_end,
    training_start:model.config.start_at,training_end:model.config.train_end,training_samples:training.rows.length,
    model:{global:model.global,prior_strength:model.config.prior_strength,rules:model.rules},native,
    returns,return_price_ids:training.rows.map(row=>row.price_ids),history:comparisons.rows.map(row=>({...row,
      narrative_themes:narrativeState(records,row.decision_at,model.config.narrative_hours).atoms.filter(atom=>!atom.includes('@'))})),
    themes:Object.keys(THEMES).map(id=>({id,label:labels[id],kind:THEMES[id].kind,
      supported:model.rules.some(rule=>rule.pattern.terms.some(term=>term.split('@')[0]===id))})),
    default_themes:state.atoms.filter(atom=>!atom.includes('@')),narrative_as_of:known,
    narrative_sources:state.events.map(row=>({id:row.id,known_at:row.known_at,url:row.source_url,tags:row.tags})),
    historical_mode:report.mode,certified_point_in_time:false,live_prediction_validated:false,
    backtest:{count:report.raw.count,raw_brier:report.raw.brier,baseline_brier:report.raw.baseline_brier,
      calibrated_brier:report.calibrated.brier,calibration_improved:report.calibration_improved_held_out},
    future_method:'Conditional beta posterior + empirical daily log-return bootstrap; fixed user-declared narrative, no future news.',
    original_price_vintages_verified:false};
  return {...body,profile_sha256:digest(JSON.stringify(body))};
}

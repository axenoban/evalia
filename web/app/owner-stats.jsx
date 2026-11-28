'use client';
import {useEffect,useMemo,useState} from 'react';
import {loadOwnerStats,exportOwnerOrders} from '../lib/api.js';
import {STATS_PRESETS,statsRange,barScale} from '../lib/owner-stats.js';

const bs=v=>'Bs '+new Intl.NumberFormat('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v)||0);
const num=v=>new Intl.NumberFormat('es-BO').format(Number(v)||0);
const bucketLabel=(bucket,kind)=>{const [y,m,d]=bucket.split('-');return kind==='month'?new Intl.DateTimeFormat('es-BO',{month:'short',year:'2-digit',timeZone:'UTC'}).format(new Date(Date.UTC(+y,+m-1,1))):d+'/'+m;};

function Tile({label,value,sub}){return <div className="ev-stat-tile"><span>{label}</span><strong>{value}</strong>{sub&&<small>{sub}</small>}</div>;}
// Barras horizontales de una sola serie (una tonalidad); el nombre y el valor siempre visibles en texto.
function RankedBars({title,rows,label,value,format}){
 const scale=barScale(rows.map(value));
 return <section className="ev-stat-card"><h2>{title}</h2>{rows.length?<ol className="ev-ranked">{rows.map((r,i)=><li key={i}>
  <span className="ev-ranked-name">{label(r)}</span>
  <span className="ev-ranked-track" aria-hidden="true"><span style={{width:(scale(value(r))*100)+'%'}}/></span>
  <span className="ev-ranked-value">{format(r)}</span></li>)}</ol>:<p className="small-note">Sin datos en este periodo.</p>}</section>;
}
function SeriesChart({series,kind}){
 const [hover,setHover]=useState(null);
 const scale=barScale(series.map(s=>s.orders_amount));
 const active=hover===null?null:series[hover];
 return <section className="ev-stat-card ev-stat-series"><h2>Ventas confirmadas por {kind==='month'?'mes':'día'}</h2>
  <p className="ev-series-readout" aria-live="polite">{active?bucketLabel(active.bucket,kind)+' · '+bs(active.orders_amount)+' · '+num(active.orders)+' pedido(s) · cobros '+bs(active.payments_amount):'Toca o pasa el cursor sobre una barra para ver el detalle.'}</p>
  <div className="ev-series-bars" role="img" aria-label={'Monto de pedidos confirmados por '+(kind==='month'?'mes':'día')+'; detalle en la tabla.'} onMouseLeave={()=>setHover(null)}>
   {series.map((s,i)=><button type="button" key={s.bucket} className={'ev-series-bar'+(hover===i?' is-active':'')} onMouseEnter={()=>setHover(i)} onFocus={()=>setHover(i)} onClick={()=>setHover(i)}
     aria-label={bucketLabel(s.bucket,kind)+': '+bs(s.orders_amount)}><span style={{height:Math.max(scale(s.orders_amount)*100,s.orders_amount>0?2:0)+'%'}}/></button>)}
  </div>
  <div className="ev-series-axis" aria-hidden="true"><span>{series[0]&&bucketLabel(series[0].bucket,kind)}</span><span>{series.length>1&&bucketLabel(series[series.length-1].bucket,kind)}</span></div>
  <details className="ev-series-table"><summary>Ver tabla</summary><div className="table-scroll"><table><thead><tr><th>{kind==='month'?'Mes':'Día'}</th><th>Pedidos</th><th>Monto confirmado</th><th>Cobros aprobados</th></tr></thead>
   <tbody>{series.map(s=><tr key={s.bucket}><td>{bucketLabel(s.bucket,kind)}</td><td>{num(s.orders)}</td><td>{bs(s.orders_amount)}</td><td>{bs(s.payments_amount)}</td></tr>)}</tbody></table></div></details>
 </section>;
}
export default function OwnerStats(){
 const [preset,setPreset]=useState('month'),[from,setFrom]=useState(''),[to,setTo]=useState('');
 const [state,setState]=useState({loading:false,error:'',data:null,key:''}),[exporting,setExporting]=useState(false),[exportError,setExportError]=useState('');
 const range=useMemo(()=>statsRange(preset,from,to),[preset,from,to]);
 const key=range.valid?range.lower+'|'+range.upper:'';
 useEffect(()=>{
  if(!range.valid)return;
  let active=true;setState(s=>({...s,loading:true,error:''}));
  loadOwnerStats(range.lower,range.upper).then(data=>{if(active)setState({loading:false,error:'',data,key});})
   .catch(e=>{if(active)setState({loading:false,error:e.message||'No se pudieron cargar las estadísticas.',data:null,key});});
  return ()=>{active=false;};
 },[key]);// eslint-disable-line react-hooks/exhaustive-deps
 async function download(){
  if(!range.valid||exporting)return;
  setExporting(true);setExportError('');
  try{
   const [report,{excelWorkbook}]=await Promise.all([exportOwnerOrders(range.lower,range.upper),import('../lib/excel-workbook.js')]);
   const url=URL.createObjectURL(new Blob([excelWorkbook(report,range)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
   const a=document.createElement('a');a.href=url;a.download=`Evalia_pedidos_${range.from}_${range.to}.xlsx`;document.body.appendChild(a);a.click();a.remove();
   window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(e){setExportError(e.message||'No se pudo exportar.');}
  finally{setExporting(false);}
 }
 const data=state.key===key?state.data:null;
 return <div className="ev-owner-stats">
  <header className="ev-orders-heading"><p className="eyebrow">INTELIGENCIA COMERCIAL · SOLO PROPIETARIO</p><h1>Estadísticas</h1></header>
  <div className="ev-stats-filters" role="group" aria-label="Periodo de las estadísticas">
   <div className="ev-stats-presets">{STATS_PRESETS.map(([id,label])=><button key={id} type="button" className={'pill'+(preset===id?' active':'')} aria-pressed={preset===id} onClick={()=>setPreset(id)}>{label}</button>)}</div>
   {preset==='custom'&&<div className="ev-stats-custom"><label className="field"><span className="field-label">Desde</span><input type="date" value={from} max={to||undefined} onChange={e=>setFrom(e.target.value)}/></label>
    <label className="field"><span className="field-label">Hasta</span><input type="date" value={to} min={from||undefined} onChange={e=>setTo(e.target.value)}/></label></div>}
   <button type="button" className="button button-outline ev-stats-export" disabled={!range.valid||exporting} onClick={download}>{exporting?'Preparando archivo…':'⭳ Descargar informe Excel (.xlsx)'}</button>
  </div>
  {!range.valid&&<p className="form-error" role="alert">{range.error}</p>}
  {exportError&&<p className="form-error" role="alert">{exportError}</p>}
  {range.valid&&<p className="small-note">Periodo {range.from===range.to?range.from:range.from+' a '+range.to} (hora de Bolivia). Pedidos por fecha de confirmación; cobros por fecha de aprobación. No incluye ventas físicas fuera de pedidos ni ganancias.</p>}
  {state.loading&&!data&&<p role="status" className="small-note">Calculando estadísticas…</p>}
  {state.error&&state.key===key&&<div className="surface pad" role="alert"><p>{state.error}</p></div>}
  {data&&<>
   <div className="ev-stat-tiles">
    <Tile label="Pedidos confirmados" value={num(data.orders.count)} sub={num(data.orders.buyers)+' cliente(s)'}/>
    <Tile label="Monto de pedidos" value={bs(data.orders.amount)} sub={num(data.orders.units)+' prendas'}/>
    <Tile label="Cobros aprobados" value={bs(data.payments.amount)} sub={num(data.payments.count)+' pago(s)'}/>
    <Tile label="Saldo por cobrar hoy" value={bs(data.pending.amount)} sub={num(data.pending.orders)+' pedido(s) activos'}/>
   </div>
   <SeriesChart series={data.series} kind={data.period.bucket}/>
   <div className="ev-stat-grid">
    <RankedBars title="Modelos más pedidos" rows={data.models} label={r=>r.name+' · '+r.size} value={r=>r.units} format={r=>num(r.units)+' pr. · '+bs(r.amount)}/>
    <RankedBars title="Tallas" rows={data.sizes} label={r=>'Talla '+r.size} value={r=>r.units} format={r=>num(r.units)+' prendas'}/>
    <RankedBars title="Clientes con más compras" rows={data.customers} label={r=>r.name} value={r=>r.amount} format={r=>bs(r.amount)+' · '+num(r.orders)+' ped.'}/>
    <section className="ev-stat-card"><h2>Clientes nuevos</h2><p className="ev-stat-big">{num(data.new_customers)}</p><p className="small-note">Fichas registradas en el periodo.</p></section>
   </div>
  </>}
 </div>;
}

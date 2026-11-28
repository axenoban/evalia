'use client';
import {useEffect,useState} from 'react';
import ReactPaginate from 'react-paginate';
import {loadOrdersPage} from '../lib/api.js';
import {pageOf} from '../lib/workspace-pagination.js';
import {dateRange,matchesDate,PAGE_SIZES} from '../lib/record-date-filters.js';

// Preferencia visual por dispositivo: solo la cantidad por página, nunca datos comerciales.
const SIZE_KEY='evalia:registros-por-pagina';
function storedSize(){try{const n=Number(window.localStorage.getItem(SIZE_KEY));return PAGE_SIZES.includes(n)?n:null;}catch{return null;}}
function rememberSize(n){try{window.localStorage.setItem(SIZE_KEY,String(n));}catch{/* almacenamiento no disponible */}}
function useRecordFilters(){
 // Las listas solo se montan tras autenticar en el navegador: se lee la preferencia sin una consulta extra.
 const [page,setPage]=useState(1),[size,setSize]=useState(()=>typeof window==='undefined'?25:storedSize()??25);
 const [preset,setPreset]=useState('all'),[from,setFrom]=useState(''),[to,setTo]=useState('');
 const range=dateRange(preset,from,to);
 function changePreset(value){setPreset(value);setPage(1);}
 function changeFrom(value){setFrom(value);setPage(1);}
 function changeTo(value){setTo(value);setPage(1);}
 function changeSize(value){if(PAGE_SIZES.includes(value)){setSize(value);setPage(1);rememberSize(value);}}
 function clear(){setPreset('all');setFrom('');setTo('');setPage(1);}
 return {page,size,preset,from,to,range,setPage,changeSize,changePreset,changeFrom,changeTo,clear};
}
export function useRecordList(rows,dateKey){
 const filters=useRecordFilters(),{page,size,range,setPage}=filters;
 const filtered=rows.filter(row=>matchesDate(row[dateKey],range));
 const view=pageOf(filtered,page,size);
 useEffect(()=>{if(page!==view.page)setPage(view.page);},[page,view.page,setPage]);
 return {...filters,view,filtered};
}
export function useServerOrderList(workspace,archived,orderId=null){
 const filters=useRecordFilters(),{page,size,range,setPage}=filters;
 const {from,to,valid}=range;
 const [result,setResult]=useState(null),[retry,setRetry]=useState(0);
 const key=JSON.stringify([archived,page,size,from,to,valid,retry,orderId]);
 useEffect(()=>{
  if(!valid)return;
  const controller=new AbortController();
  let active=true;
  loadOrdersPage({archived,page,size,range:{from,to,valid},orderId,signal:controller.signal})
   .then(value=>{
    if(!active)return;
    if(value.redirect){setPage(value.redirect);return;}
    setResult({workspace,key,value,error:''});
   }).catch(e=>{
    if(active&&!controller.signal.aborted)setResult(prev=>({workspace,key,value:prev?.key===key?prev.value:null,error:e.message||'No se pudieron cargar los pedidos.'}));
   });
  return ()=>{active=false;controller.abort();};
 },[workspace,archived,page,size,from,to,valid,key,setPage,orderId]);
 const prior=valid&&result?.key===key?result:null;
 const current=prior?.workspace===workspace?prior:null;
 const loading=valid&&!current;
 return {...filters,view:prior?.value?.view??null,details:prior?.value?.details??null,
  loading,refreshing:loading&&Boolean(prior?.value),error:current?.error??'',retry:()=>setRetry(n=>n+1)};
}
export function RecordListControls({list,dateLabel,busy,onChange}){
 const [open,setOpen]=useState(false);
 function change(fn){fn();onChange?.();}
 const active=(list.preset!=='all'?1:0)+(list.size!==25?1:0);
 // En móvil los filtros se pliegan tras un botón; en PC siempre están visibles (CSS).
 return <div className={'ev-list-filters'+(open||!list.range.valid?' is-open':'')}>
  <button type="button" className="button button-outline ev-list-filters-toggle" aria-expanded={open||!list.range.valid} onClick={()=>setOpen(v=>!v)}>
   Filtros{active?' ('+active+')':''} <span aria-hidden="true">{open?'⌃':'⌄'}</span></button>
  <div className="ev-list-controls" role="group" aria-label="Filtros y cantidad de registros">
  <label className="field"><span className="field-label">{dateLabel}</span>
   <select value={list.preset} disabled={busy} onChange={e=>change(()=>list.changePreset(e.target.value))}>
    <option value="all">Todas las fechas</option><option value="today">Hoy</option><option value="week">Últimos 7 días</option><option value="month">Este mes</option><option value="custom">Rango personalizado</option>
   </select>
  </label>
  <label className="field"><span className="field-label">Registros por página</span>
   <select value={list.size} disabled={busy} onChange={e=>change(()=>list.changeSize(Number(e.target.value)))}>
    {PAGE_SIZES.map(n=><option key={n} value={n}>{n}</option>)}
   </select>
  </label>
  {list.preset==='custom'&&<>
   <label className="field"><span className="field-label">Desde</span><input type="date" value={list.from} max={list.to||undefined} disabled={busy} onChange={e=>change(()=>list.changeFrom(e.target.value))}/></label>
   <label className="field"><span className="field-label">Hasta</span><input type="date" value={list.to} min={list.from||undefined} disabled={busy} onChange={e=>change(()=>list.changeTo(e.target.value))}/></label>
  </>}
  {list.preset!=='all'&&<button type="button" className="button button-outline" disabled={busy} onClick={()=>change(list.clear)}>Quitar filtro de fechas</button>}
  {!list.range.valid&&<p role="alert" className="form-error ev-list-filter-error">Selecciona un rango válido: la fecha inicial no puede superar la final.</p>}
  </div>
 </div>;
}
export function ListPager({view,onPage,label,busy}){
 return <nav aria-label={label} className="ev-list-pager" aria-disabled={busy||undefined}>
  <span className="small-note" role="status">{view.total?view.first+'–'+view.last+' de '+view.total:'0 registros'} · Página {view.page} de {view.pages}</span>
  {view.pages>1&&<ReactPaginate pageCount={view.pages} forcePage={view.page-1} disableInitialCallback
    pageRangeDisplayed={2} marginPagesDisplayed={1} previousLabel="‹" nextLabel="›"
    previousAriaLabel="Página anterior" nextAriaLabel="Página siguiente" breakLabel="…"
    breakAriaLabels={{forward:'Avanzar páginas',backward:'Retroceder páginas'}}
    ariaLabelBuilder={(page,selected)=>'Página '+page+(selected?', actual':'')}
    containerClassName="ev-page-numbers" activeClassName="ev-page-current" disabledClassName="ev-page-disabled"
    onClick={()=>busy?false:undefined} onPageChange={({selected})=>{if(!busy)onPage(selected+1);}}/>}
 </nav>;
}

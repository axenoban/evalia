'use client';
import {useEffect,useState} from 'react';
import ReactPaginate from 'react-paginate';
import {pageOf} from '../lib/workspace-pagination.js';
import {dateRange,matchesDate,PAGE_SIZES} from '../lib/record-date-filters.js';

export function useRecordList(rows,dateKey){
 const [page,setPage]=useState(1),[size,setSize]=useState(25);
 const [preset,setPreset]=useState('all'),[from,setFrom]=useState(''),[to,setTo]=useState('');
 const range=dateRange(preset,from,to);
 const filtered=rows.filter(row=>matchesDate(row[dateKey],range));
 const view=pageOf(filtered,page,size);
 useEffect(()=>{if(page!==view.page)setPage(view.page);},[page,view.page]);
 function changePreset(value){setPreset(value);setPage(1);}
 function changeFrom(value){setFrom(value);setPage(1);}
 function changeTo(value){setTo(value);setPage(1);}
 function changeSize(value){if(PAGE_SIZES.includes(value)){setSize(value);setPage(1);}}
 function clear(){setPreset('all');setFrom('');setTo('');setPage(1);}
 return {view,size,preset,from,to,range,setPage,changeSize,changePreset,changeFrom,changeTo,clear,filtered};
}
export function RecordListControls({list,dateLabel,busy,onChange}){
 function change(fn){fn();onChange?.();}
 return <div className="ev-list-controls" role="group" aria-label="Filtros y cantidad de registros">
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

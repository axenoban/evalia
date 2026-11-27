'use client';
import {createContext,useCallback,useContext,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createConfirmationGate} from '../lib/confirmation-gate.js';

const ConfirmationContext=createContext(null);
export function useConfirmation(){
 const context=useContext(ConfirmationContext);
 if(!context)throw Error('Confirmaciones fuera del proveedor');
 return context;
}
export function ConfirmationProvider({children}){
 const [options,setOptions]=useState(null);
 const gate=useRef(null);
 if(!gate.current)gate.current=createConfirmationGate(setOptions);
 const ask=useCallback(config=>gate.current.request(config),[]);
 const cancel=useCallback(()=>gate.current.cancel(),[]);
 useEffect(()=>()=>{gate.current.cancel();},[]);
 return <ConfirmationContext.Provider value={{ask,cancel}}>
  {children}
  {options&&<ConfirmationDialog options={options} onCancel={cancel} onConfirm={reason=>gate.current.confirm(reason)}/>}
 </ConfirmationContext.Provider>;
}
function ConfirmationDialog({options,onCancel,onConfirm}){
 const dialog=useRef(null),cancelButton=useRef(null);
 const [reason,setReason]=useState('');
 const severity=['normal','warning','critical'].includes(options.severity)?options.severity:'normal';
 const requiresReason=Boolean(options.reasonRequired);
 const valid=!requiresReason||(reason.trim().length>0&&reason.trim().length<=300);
 useLayoutEffect(()=>{
  const node=dialog.current,previous=document.activeElement;
  if(!node)return;
  try{node.showModal();cancelButton.current?.focus();}
  catch{onCancel();return;}
  return ()=>{if(node.open)node.close();if(previous?.isConnected)previous.focus({preventScroll:true});};
 },[onCancel]);
 return <dialog ref={dialog} className={'ev-confirm-dialog ev-confirm-'+severity}
   aria-labelledby="ev-confirm-title" aria-describedby="ev-confirm-description" role={severity==='critical'?'alertdialog':'dialog'}
   onCancel={e=>{e.preventDefault();onCancel();}} onClose={()=>{if(dialog.current?.isConnected&&!dialog.current.open)onCancel();}}>
  <form onSubmit={e=>{e.preventDefault();if(valid)onConfirm(reason);}}>
   <header className="ev-confirm-header">
    <div className="ev-confirm-icon" aria-hidden="true">
     {severity==='normal'?<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></svg>:<svg viewBox="0 0 24 24"><path d="M10.3 4.5 2.7 18a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.5a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/></svg>}
    </div>
    <div><p className="ev-confirm-kicker">{severity==='critical'?'ACCIÓN CRÍTICA':severity==='warning'?'REQUIERE ATENCIÓN':'CONFIRMACIÓN'}</p><h2 id="ev-confirm-title">{options.title}</h2></div>
    <button type="button" className="ev-confirm-close" aria-label="Cerrar confirmación" onClick={onCancel}>×</button>
   </header>
   <div id="ev-confirm-description" className="ev-confirm-body">
    <p>{options.message}</p>
    {options.facts?.length>0&&<dl className="ev-confirm-facts">{options.facts.map(({label,value})=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
    {options.notice&&<p className="ev-confirm-notice">{options.notice}</p>}
   </div>
   {requiresReason&&<div className="ev-confirm-reason"><label htmlFor="ev-confirm-reason">Motivo del archivo</label>
    <textarea id="ev-confirm-reason" rows={3} maxLength={300} required value={reason} onChange={e=>setReason(e.target.value)} placeholder="Indica el motivo…"/>
    <div className="ev-confirm-reason-footer"><button type="button" className="button button-outline" onClick={()=>setReason('Registro de prueba o error')}>Registro de prueba o error</button><small>{reason.length}/300</small></div>
   </div>}
   <footer className="ev-confirm-actions"><button ref={cancelButton} type="button" className="button button-outline" onClick={onCancel}>Cancelar</button><button type="submit" className="button ev-confirm-primary" disabled={!valid}>{options.confirmLabel||'Confirmar'}</button></footer>
  </form>
 </dialog>;
}

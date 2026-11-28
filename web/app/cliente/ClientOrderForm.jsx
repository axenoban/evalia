'use client';
import {useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {subtotalCents,formatBs} from '../../lib/domain.js';
import {lineProblem,expectedPrice} from '../../lib/client-order.js';

const QUICK_DOZENS=[0,1,2,3,4,5,6];
// Pedido del cliente: mismas reglas que el panel (docenas surtidas, 0–11 colores distintos, mínimo 6 sin docena).
export default function ClientOrderForm({catalog,preference,destination}){
 const router=useRouter();
 const available=catalog.filter(m=>m.available);
 const [cart,setCart]=useState({}),[method,setMethod]=useState(preference==='shipping'?'shipping':'pickup');
 const [dest,setDest]=useState(destination||''),[review,setReview]=useState(false);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(null);
 const requestId=useRef(null);
 const byId=new Map(catalog.map(m=>[m.id,m]));
 const rows=Object.entries(cart).map(([id,line])=>{const model=byId.get(id);const units=line.dozens*12+line.extras.length;
  return {id,model,line,units,problem:model?lineProblem({dozens:line.dozens,extraColorIds:line.extras}):'Modelo no disponible',
   subtotal:model?subtotalCents(model.price,units):0n};});
 const total=rows.reduce((s,r)=>s+(r.problem?0n:r.subtotal),0n);
 const destOk=method==='pickup'||dest.trim().length>=2;
 const ready=rows.length>0&&rows.every(r=>!r.problem)&&destOk;
 function change(next){requestId.current=null;setReview(false);setMessage(null);setCart(next);}
 const add=m=>change({...cart,[m.id]:{dozens:1,extras:[]}});
 const remove=id=>{const n={...cart};delete n[id];change(n);};
 const setDozens=(id,d)=>change({...cart,[id]:{...cart[id],dozens:Math.max(0,Math.min(999,Number(d)||0))}});
 function toggleColor(id,color){const l=cart[id],has=l.extras.includes(color);
  if(!has&&l.extras.length>=11)return;change({...cart,[id]:{...l,extras:has?l.extras.filter(c=>c!==color):[...l.extras,color]}});}
 async function confirm(){
  if(!ready||busy)return;
  if(!requestId.current)requestId.current=crypto.randomUUID();
  setBusy(true);setMessage(null);
  try{
   const res=await fetch('/api/cliente-pedido',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',
    body:JSON.stringify({requestId:requestId.current,method,destination:method==='shipping'?dest.trim():null,
     lines:rows.map(r=>({modelId:r.id,dozens:r.line.dozens,extraColorIds:r.line.extras,expectedPrice:expectedPrice(r.model.price)}))})});
   const result=await res.json().catch(()=>({}));
   if(!res.ok){setMessage({type:'err',text:result.error||'No se pudo registrar el pedido.'});if(result.code==='40001'||result.code==='23514')router.refresh();return;}
   setMessage({type:'ok',text:'¡Pedido #'+result.reference+' confirmado! EVALIA lo preparará y te avisará por WhatsApp.'});
   requestId.current=null;setCart({});setReview(false);router.refresh();
  }catch{setMessage({type:'err',text:'Sin conexión. Revisa tu internet y vuelve a tocar «Confirmar pedido»: no se duplicará.'});}
  finally{setBusy(false);}
 }
 if(!available.length&&!rows.length)return <p className="ev-cart-note">No hay modelos disponibles en este momento.</p>;
 return <div>
  {message&&<p className={'ev-store-msg '+message.type} role={message.type==='err'?'alert':'status'}>{message.text}</p>}
  <p className="ev-cart-note">Toca «Agregar» en los modelos que quieras. Cada modelo: docenas surtidas y, si deseas, unidades sueltas de colores distintos (mínimo 6 si no llevas docena).</p>
  <div className="ev-store-grid" style={{margin:'10px 0'}}>{available.filter(m=>!cart[m.id]).map(m=><article key={m.id} className="ev-store-card">
   <div className="ev-store-photo">{m.imageUrl?<img src={m.imageUrl} alt={'Modelo '+m.name} loading="lazy"/>:null}</div>
   <div className="ev-store-body"><h2>{m.name}</h2><div className="ev-store-meta"><span>Talla {m.size}</span><span className="ev-store-price">{formatBs(subtotalCents(m.price,12))}</span></div>
    <button type="button" className="ev-store-cta" onClick={()=>add(m)}>＋ Agregar</button></div>
  </article>)}</div>
  {rows.map(r=><section key={r.id} className="ev-cart-model" aria-label={'Pedido de '+(r.model?.name||'modelo')}>
   <header><div><b>{r.model?.name||'Modelo'}</b><div className="ev-cart-note">Talla {r.model?.size} · {formatBs(subtotalCents(r.model?.price||0,12))} por docena</div></div>
    <button type="button" className="ev-choice" aria-label={'Quitar '+(r.model?.name||'modelo')} onClick={()=>remove(r.id)}>✕</button></header>
   <div><div className="ev-cart-note">Docenas surtidas</div><div className="ev-choice-row" role="group" aria-label="Docenas">
    {QUICK_DOZENS.map(d=><button key={d} type="button" className="ev-choice" aria-pressed={r.line.dozens===d} onClick={()=>setDozens(r.id,d)}>{d===0?'Sin docena':d}</button>)}
    <input aria-label="Otra cantidad de docenas" type="number" min="0" max="999" inputMode="numeric" value={r.line.dozens} onChange={e=>setDozens(r.id,e.target.value)} style={{width:80,minHeight:44,borderRadius:10,border:'1px solid #ebdfe6',padding:'6px 8px'}}/></div></div>
   {r.model?.colors?.length>0&&<div><div className="ev-cart-note">Unidades sueltas (1 por color, máximo 11){r.line.dozens===0?' — elige al menos 6':' — opcional'}</div>
    <div className="ev-choice-row">{r.model.colors.map(c=>{const on=r.line.extras.includes(c.id);return <button key={c.id} type="button" className="ev-color-choice" aria-pressed={on}
     disabled={!on&&r.line.extras.length>=11} onClick={()=>toggleColor(r.id,c.id)}><span className="ev-swatch" style={{background:c.hex}}/>{c.name}</button>;})}</div></div>}
   {r.problem?<p className="ev-cart-error" role="status">{r.problem}</p>:<p className="ev-cart-note"><b>{r.units} prendas · {formatBs(r.subtotal)}</b></p>}
  </section>)}
  {rows.length>0&&<div className="ev-store-section" style={{margin:'12px 0'}}>
   <div className="ev-choice-row" role="group" aria-label="Entrega">{[['pickup','Retiro en tienda'],['shipping','Envío']].map(([v,t])=><button key={v} type="button" className="ev-choice" aria-pressed={method===v} onClick={()=>{setMethod(v);setReview(false);requestId.current=null;}}>{t}</button>)}</div>
   {method==='shipping'&&<label className="ev-store-field" style={{marginTop:10}}>Destino del envío (ciudad, agencia)<input value={dest} maxLength={200} onChange={e=>{setDest(e.target.value);setReview(false);requestId.current=null;}}/></label>}
  </div>}
  {rows.length>0&&<div className="ev-sticky-total">
   <div className="ev-cart-total"><span>Total</span><strong>{formatBs(total)}</strong></div>
   {!review?<button type="button" className="ev-store-cta" style={{width:'100%',marginTop:8}} disabled={!ready} onClick={()=>setReview(true)}>Revisar pedido</button>:
    <div style={{display:'grid',gap:8,marginTop:8}}>
     <p className="ev-cart-note">Confirmas {rows.reduce((s,r)=>s+r.units,0)} prendas por {formatBs(total)} con {method==='shipping'?'envío a '+dest.trim():'retiro en tienda'}. Al confirmar, el pedido queda registrado.</p>
     <button type="button" className="ev-store-cta" disabled={busy} onClick={confirm}>{busy?'Confirmando…':'Confirmar pedido'}</button>
     <button type="button" className="ev-store-cta outline" disabled={busy} onClick={()=>setReview(false)}>Seguir editando</button>
    </div>}
   {!ready&&<p className="ev-cart-note">{rows.some(r=>r.problem)?'Completa los modelos marcados.':!destOk?'Escribe el destino del envío.':''}</p>}
  </div>}
 </div>;
}

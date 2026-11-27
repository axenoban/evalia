'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  authUser, adminAllowed, signIn, signOut, loadWorkspace,
  createCustomer, createModel, editProduct, saveColor, reactivateProduct, productHistory, updateCustomer, uploadPhoto, adjustStock, archiveModel, cleanupArchivedPhotos, cleanupReplacedPhoto, archiveOrder, setOrderPrepared,
  createOrder, reviseOrder, updateOrderDelivery, confirmReservation, reportPayment, reviewPayment, quickCheckout, recordDelivery, completeOrder,
  issueOrderLink, revokeOrderLink, getPrivateReceiptUrl, getAdminQrUrl, saveRealQr
} from '../lib/api.js';
import {normalizeName,normalizeSize,normalizePrice,productSizes,suggestions,matchingModels,stockProjection,equivalentProduct,productPriceOptions,QUICK_DOZENS,paymentAmountOptions} from '../lib/product-data.js';
import { getSupabase } from '../lib/supabase.js';
import { useRecordList, useServerOrderList, RecordListControls, ListPager } from './record-list-controls.jsx';
import {inspectAdminMfa,withOwnerReauthentication} from '../lib/mfa-client.js';
import MfaGate from './mfa-gate.jsx';
import {writeThenRefresh,CONFIRMED_REFRESH_WARNING} from '../lib/write-confirmation.js';
import AdminAccounts from './admin-accounts.jsx';
import {BrandMark,UiIcon} from './brand.jsx';
import {ConfirmationProvider,useConfirmation} from './confirmation-dialog.jsx';
import { buildOrderWhatsAppMessage } from '../lib/order-whatsapp.js';
import { formatAvailableDozens, formatModelDozenPrice, prioritizeModels, isRecentModel, countModelsWithStock } from '../lib/dashboard-presentation.js';
import {validateDelivery,deliveryLabel} from '../lib/delivery.js';
import {matchingCustomers,normalizedWhatsApp} from '../lib/customer-duplicates.js';
import {printOrder} from '../lib/order-print.js';
import {canAddModelToOrder,initialModelPortion} from '../lib/order-selection.js';
import {
  centsFromBs, amountCents, subtotalCents, formatBs, quantityBreakdown, checkedPortions, portionQuantity, portionBreakdown, inventoryTotals
} from '../lib/domain.js';

const MENU=[
  ['home','Resumen','▦'],
  ['catalog','Productos','▧'],
  ['booking','Nuevo pedido','＋'],
  ['orders','Pedidos','▤'],
  ['payments','Pagos','₿'],
  ['customers','Clientes','♙']
];
const today=()=>new Date().toISOString();
const uuid=()=>crypto.randomUUID();
const displayDate=iso=>iso?new Intl.DateTimeFormat('es-BO',{
  timeZone:'America/La_Paz',day:'2-digit',month:'short',year:'numeric',
  hour:'2-digit',minute:'2-digit',hour12:false
}).format(new Date(iso)):'—';
const initials=name=>String(name||'EV').trim().split(/\s+/).slice(0,2).map(s=>s[0]?.toUpperCase()).join('');
const rup=number=>new Intl.NumberFormat('es-BO').format(Number(number)||0);
const statusLabels={saved:'Compromiso anterior',in_review:'Revisión histórica',expired:'Histórico vencido',converted:'Convertido a pedido',active:'En preparación',completed:'Completado',voided:'Anulado',draft:'Borrador'};

function ColorChip({color,selected=false,onClick,compact=false,disabled=false}){
 const colorValid=/^#[\da-f]{6}$/i.test(color?.hex_code||'');
 const circle=<span className={'color-circle '+(colorValid?'':'color-unknown')}
    style={colorValid?{background:color.hex_code}:undefined}>
    {selected&&<span className="tick">✓</span>}
    {!colorValid&&<span className="color-question">?</span>}
  </span>;
 if(onClick)return <button type="button" aria-pressed={selected}
  aria-label={color?.name+' '+(selected?'seleccionado':'no seleccionado')}
  className={'color-choice '+(selected?'is-selected':'')} onClick={onClick} disabled={disabled}>
    {circle}<span>{color?.name}</span>
  </button>;
 return <span className={'color-item '+(compact?'compact':'')} title={color?.name} aria-label={color?.name}>
   {circle}<span>{color?.name}</span>
 </span>;
}
function ModelColors({model,colors,compact=false}){
 const selected=colors.filter(c=>model.colorIds?.includes(c.id));
 return selected.length?<div className={'color-row '+(compact?'small':'')}>
  {selected.map(c=><ColorChip key={c.id} color={c} compact={compact}/>)}
 </div>:<span className="muted">Sin colores registrados</span>;
}
function ProductImage({model,large=false}){
 return model.is_active&&model.imageUrl?<img className={'product-image '+(large?'large':'')} src={model.imageUrl}
   alt={'Fotografía del producto '+model.name} loading="lazy"/>:
  <div className={'product-image product-fallback '+(large?'large':'')}>
    <BrandMark className="ev-product-mark"/><span>{model.is_active?'Fotografía pendiente':'Modelo archivado'}</span>
  </div>;
}
function Status({value}){return <span className={'status status-'+value}>{statusLabels[value]||value}</span>;}
function Empty({title,detail}){return <div className="empty"><span className="empty-glyph">◇</span><strong>{title}</strong><p>{detail}</p></div>;}
function SectionHead({eyebrow,title,description,actions}){return <header className="section-head">
 <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description&&<p className="description">{description}</p>}</div>
 {actions&&<div className="head-actions">{actions}</div>}
 </header>;}
function Field({title,hint,children,wide=false}){return <label className={'field '+(wide?'wide':'')}>
 <span className="field-label">{title}</span>{children}{hint&&<small className="field-hint">{hint}</small>}
 </label>;}
function Notice({type='info',children,onClose}){return <div className={'alert alert-'+type} role={type==='error'?'alert':'status'}>
 <span>{children}</span>{onClose&&<button aria-label="Cerrar mensaje" type="button" onClick={onClose}>×</button>}
 </div>;}
function ToastNotifications({error,message,onCloseError,onCloseMessage}){
 useEffect(()=>{
  if(!message)return;
  const timer=window.setTimeout(onCloseMessage,6000);
  return ()=>window.clearTimeout(timer);
 },[message]);
 useEffect(()=>{
  if(!error)return;
  const timer=window.setTimeout(onCloseError,9000);
  return ()=>window.clearTimeout(timer);
 },[error]);
 if(!error&&!message)return null;
 return <div className="ev-toast-stack" aria-label="Notificaciones del sistema">
  {error&&<div className="ev-toast ev-toast-error" role="alert">
   <span className="ev-toast-glyph" aria-hidden="true">!</span>
   <div><strong>Revisa esta operación</strong><p>{error}</p></div>
   <button type="button" onClick={onCloseError} aria-label="Cerrar notificación de error">×</button>
  </div>}
  {message&&<div className="ev-toast ev-toast-success" role="status">
   <span className="ev-toast-glyph" aria-hidden="true">✓</span>
   <div><strong>Operación realizada</strong><p>{message}</p></div>
   <button type="button" onClick={onCloseMessage} aria-label="Cerrar notificación de éxito">×</button>
  </div>}
 </div>;
}
function SummaryCard({label,value,sub,kind='',symbol}){return <div className={'metric '+kind}>
  <div className="ev-metric-heading">{symbol&&<span className="ev-metric-icon" aria-hidden="true"><UiIcon name={symbol}/></span>}
   <span className="metric-label">{label}</span></div>
  <strong>{value}</strong>{sub&&<small>{sub}</small>}
 </div>;}
function DeliveryMethodChoices({label,method,onChange,busy=false}){
 return <fieldset className="ev-quick-options ev-delivery-options">
  <legend className="field-label">{label}</legend>
  <div className="ev-fixed-grid" role="group" aria-label={label}>
   {[['pickup','Retiro local'],['shipping','Envío nacional / interdepartamental']].map(([value,text])=><button type="button" key={value} className={'pill ev-quick-choice '+(method===value?'active':'')} aria-pressed={method===value} disabled={busy} onClick={()=>onChange(value)}>{text}</button>)}
  </div>
 </fieldset>;
}
function DestinationShortcut({destination,known,onSelect,busy}){
 if(!known?.trim()||known===destination)return null;
 return <button type="button" className="button button-outline ev-destination-shortcut" disabled={busy} onClick={()=>onSelect(known)}>Usar destino habitual: {known}</button>;
}
function DeliveryPreferenceFields({method,setMethod,destination,setDestination,busy=false}) {
 return <div className="delivery-preference-fields">
  <DeliveryMethodChoices label="Modalidad habitual de entrega" method={method} busy={busy} onChange={value=>{setMethod(value);if(value!=='shipping')setDestination('');}}/>
  {method==='shipping'&&<Field title="Destino habitual del envío (obligatorio)">
   <input aria-label="Destino habitual" value={destination} required minLength={2} maxLength={200}
    placeholder="Ciudad, departamento y agencia de envío" disabled={busy}
    onChange={e=>setDestination(e.target.value)}/>
  </Field>}
 </div>;
}
function ClientForm({onCreate,busy,compact=false,customers=[]}){
 const [name,setName]=useState(''),[phone,setPhone]=useState('');
 const [method,setMethod]=useState(''),[destination,setDestination]=useState(''),[error,setError]=useState('');
 const [duplicateConfirmed,setDuplicateConfirmed]=useState(false);
 const [serverDuplicate,setServerDuplicate]=useState(false);
 const requestId=useRef(null),submitting=useRef(false);
 const matches=matchingCustomers(customers,phone);
 const duplicate=matches.length>0||serverDuplicate;
 function changed(){requestId.current=null;setDuplicateConfirmed(false);setServerDuplicate(false);}

 async function submit(e){
  e.preventDefault();if(busy||submitting.current)return;submitting.current=true;setError('');
  try{
   if(!name.trim()||!phone.trim())throw new Error('Nombre y WhatsApp obligatorios.');
   if(duplicate&&!duplicateConfirmed)throw Error('Confirma que deseas registrar otra ficha con este número.');
   const delivery=validateDelivery(method,destination);
   if(!requestId.current)requestId.current=uuid();
   const ok=await onCreate({name:name.trim(),whatsapp:phone.trim(),...delivery,requestId:requestId.current,confirmDuplicate:duplicateConfirmed});
   if(ok?.state==='duplicate'){setServerDuplicate(true);setDuplicateConfirmed(false);return;}
   if(ok===true){requestId.current=null;setServerDuplicate(false);setName('');setPhone('');setMethod('');setDestination('');setDuplicateConfirmed(false);}
  }catch(e){setError(e.message);}finally{submitting.current=false;}
 }
 return <form className={'customer-form '+(compact?'mini-form':'')} onSubmit={submit}>
  <div className="form-inline">
   <Field title="Nombre del cliente"><input name="clientName" value={name} required maxLength={130}
    autoComplete="name" placeholder="Nombre completo…" onChange={e=>{changed();setName(e.target.value);}}/></Field>
   <Field title="WhatsApp"><input name="clientPhone" type="tel" value={phone} required maxLength={30}
    autoComplete="tel" inputMode="tel" placeholder="Número de WhatsApp…" onChange={e=>{changed();setPhone(e.target.value);}}/></Field>
  </div>
  <DeliveryPreferenceFields method={method} busy={busy} setMethod={v=>{changed();setMethod(v);}}
   destination={destination} setDestination={v=>{changed();setDestination(v);}}/>
  {duplicate&&<div className="surface pad" role="status"><p className="small-note">Posible cliente duplicado{matches.length?': '+matches.map(c=>c.name).join(', '):' detectado en la base de datos'}. Puedes crear otra ficha si corresponde a otra persona.</p><label className="qr-confirm"><input type="checkbox" checked={duplicateConfirmed} onChange={e=>setDuplicateConfirmed(e.target.checked)}/>Confirmo registrar otra ficha con este WhatsApp.</label></div>}
  {error&&<p className="form-error" role="alert">{error}</p>}
  <div className="form-actions"><button className="button button-primary" disabled={busy||(duplicate&&!duplicateConfirmed)} type="submit">
   {busy?'Guardando…':'Guardar cliente'}
  </button></div>
 </form>;
}
function DashboardProductCard({model,stock,recent}){
 const blocked=Boolean(stock?.blocked);
 const available=Number(stock?.available??0);
 const exhausted=!blocked&&available===0;
 return <article className={'ev-model-card'+(blocked?' ev-model-blocked':exhausted?' ev-model-exhausted':'')}>
  <div className="ev-model-photo">
   <ProductImage model={model} large/>
   {blocked&&<span className="ev-model-photo-status">En revisión</span>}
   {exhausted&&<span className="ev-model-photo-status">Sin existencias</span>}
  </div>
  <div className="ev-model-details">
   <h3 title={model.name}>{model.name}</h3>
   {recent&&<span className="ev-recent-model">Nuevo · últimas 48 h</span>}
   <span className="ev-stock-caption">Stock disponible</span>
   <strong className="ev-stock-count">{blocked?'En revisión':formatAvailableDozens(stock?.available??0)}</strong>
   <span className="ev-model-price">{formatModelDozenPrice(model.price_dozen_bs)}</span>
  </div>
 </article>;
}
function Dashboard({data,setTab}){
 const activeModels=prioritizeModels(data.models);
 const now=Date.now();
 const recentModels=activeModels.filter(m=>isRecentModel(m,now));
 const [showOlder,setShowOlder]=useState(true);
 const visibleModels=recentModels.length&&!showOlder?recentModels:activeModels;
 const trackRef=useRef(null);
 const [trackEdges,setTrackEdges]=useState({prev:false,next:false});
 const updateTrackEdges=useCallback(()=>{
  const el=trackRef.current;
  if(!el)return;
  setTrackEdges({prev:el.scrollLeft>2,next:el.scrollLeft+el.clientWidth<el.scrollWidth-2});
 },[]);
 useEffect(()=>{
  updateTrackEdges();
  window.addEventListener('resize',updateTrackEdges);
  return ()=>window.removeEventListener('resize',updateTrackEdges);
 },[updateTrackEdges,visibleModels.length]);
 const shiftModels=direction=>{
  const el=trackRef.current;
  if(el)el.scrollBy({left:direction*Math.max(220,el.clientWidth*.72),behavior:'smooth'});
 };
 const totals=inventoryTotals(data.stock);
 const modelsWithStock=countModelsWithStock(activeModels,data.stock);
 const activeOrders=data.orders.filter(o=>o.status==='active'&&!o.archived_at)
  .sort((a,b)=>Date.parse(b.confirmed_at||0)-Date.parse(a.confirmed_at||0));
 const activeLegacy=data.reservations.filter(r=>r.status==='saved'||r.status==='in_review');
 const pendingPayments=data.payments.filter(p=>(p.status==='pending'||p.status==='observed')&&!data.orders.some(o=>o.archived_at&&(o.id===p.order_id||(o.origin_reservation_id&&o.origin_reservation_id===p.reservation_id))));
 const blocked=activeModels.filter(m=>data.stock[m.id]?.blocked);
 const customerById=new Map(data.customers.map(c=>[c.id,c]));
 const ordersById=new Map(data.orders.map(o=>[o.id,o]));
 const legacyById=new Map(data.reservations.map(r=>[r.id,r]));
 return <div className="ev-dashboard">
  <SectionHead eyebrow="GESTIÓN COMERCIAL" title="Resumen"/>
  <div className="metrics-grid ev-overview" aria-label="Indicadores prioritarios">
   <SummaryCard symbol="⌑" label="Pedidos pendientes" value={activeOrders.length} kind="primary"/>
   <SummaryCard symbol="▧" label="Modelos con stock" value={modelsWithStock}/>
  </div>
  {blocked.length>0&&<Notice type="error">{blocked.length} modelo(s) están en revisión y no admiten nuevos pedidos.</Notice>}

  <section className="ev-zone ev-zone-catalog" aria-labelledby="ev-models-heading">
   <header className="ev-zone-header">
    <div className="ev-zone-heading"><span className="ev-zone-icon" aria-hidden="true"><UiIcon name="catalog"/></span>
     <div><h2 id="ev-models-heading">Modelos y stock disponible</h2></div>
    </div>
    <div className="ev-zone-actions">
     <button type="button" className="ev-section-link" onClick={()=>setTab('catalog')}>Administrar productos <span aria-hidden="true">→</span></button>
     {recentModels.length>0&&activeModels.length>recentModels.length&&<button type="button" className="ev-section-link" aria-pressed={showOlder} onClick={()=>setShowOlder(v=>!v)}>{showOlder?'Solo recientes':'Ver anteriores (' + (activeModels.length-recentModels.length)+')'}</button>}
     {visibleModels.length>0&&<div className="ev-carousel-buttons" aria-label="Desplazar modelos">
      <button type="button" aria-label="Ver modelos anteriores" disabled={!trackEdges.prev} onClick={()=>shiftModels(-1)}>‹</button>
      <button type="button" aria-label="Ver más modelos" disabled={!trackEdges.next} onClick={()=>shiftModels(1)}>›</button>
     </div>}
    </div>
   </header>
   {visibleModels.length?
    <div ref={trackRef} className="ev-model-track" role="region" tabIndex={0}
       aria-label="Carrusel de modelos y disponibilidad" onScroll={updateTrackEdges}>
     {visibleModels.map(m=><DashboardProductCard key={m.id} model={m} stock={data.stock[m.id]} recent={isRecentModel(m,now)}/>)}
    </div>:
    <Empty title="Aún no hay modelos" detail="Registra un modelo y su inventario desde Productos."/>}
  </section>

  <div className="ev-dashboard-actions"><button className="button button-primary" onClick={()=>setTab('booking')}>＋ Nuevo pedido</button></div>
  {activeLegacy.length>0&&<div className="legacy-alert" role="status">
    <strong>Compromisos anteriores pendientes: {activeLegacy.length}</strong>
    <span>{rup(totals.reserved)} prendas siguen apartadas por registros antiguos. No se crean más apartados. Consulta esos casos en Pedidos.</span>
    <button className="button button-outline" onClick={()=>setTab('orders')}>Ver compromisos anteriores</button>
   </div>}
  <div className="ev-support-grid">
   <section className="ev-zone ev-zone-orders" aria-labelledby="ev-orders-heading">
    <header className="ev-zone-header">
     <div className="ev-zone-heading"><span className="ev-zone-icon" aria-hidden="true"><UiIcon name="orders"/></span>
      <div><h2 id="ev-orders-heading">Pedidos pendientes</h2></div>
     </div>
     <button type="button" className="ev-section-link" onClick={()=>setTab('orders')}>Ver pedidos <span aria-hidden="true">→</span></button>
    </header>
    {activeOrders.length?<div className="ev-order-list">
     {activeOrders.slice(0,5).map(o=>{
      const customer=customerById.get(o.customer_id);
      const total=Array.isArray(o.lines)?o.lines.reduce((sum,line)=>sum+Number(line.quantity||0),0):null;
      return <div className="ev-order-row" key={o.id}>
       <div className="ev-order-person"><strong>{customer?.name||'Cliente'}</strong>
        <span>{displayDate(o.confirmed_at)}</span></div>
       <span className="ev-delivery-type">{deliveryLabel(o.fulfillment_method)}</span>
       <div className="ev-order-end">{total!==null&&<b>{rup(total)} prendas</b>}
        <span className="ev-active-tag">Activo</span></div>
      </div>;
     })}
    </div>:<Empty title="Sin pedidos pendientes" detail="Los pedidos confirmados activos aparecerán aquí."/>}
   </section>
   <section className="ev-zone ev-zone-payments" aria-labelledby="ev-payments-heading">
    <header className="ev-zone-header">
     <div className="ev-zone-heading"><span className="ev-zone-icon" aria-hidden="true"><UiIcon name="payments"/></span>
      <div><h2 id="ev-payments-heading">Pagos por verificar</h2></div>
     </div>
     <button type="button" className="ev-section-link" onClick={()=>setTab('payments')}>Ver pagos <span aria-hidden="true">→</span></button>
    </header>
    {pendingPayments.length?<div className="ev-payment-list">
     {pendingPayments.slice(0,4).map(p=>{
      const order=ordersById.get(p.order_id);
      const legacy=legacyById.get(p.reservation_id);
      const customer=customerById.get(order?.customer_id||legacy?.customer_id);
      const amount=Number(p.amount_bs);
      const amountLabel=Number.isFinite(amount)&&amount>=0?'Bs '+new Intl.NumberFormat('es-BO',{maximumFractionDigits:2}).format(amount):'Importe pendiente';
      return <div className="ev-payment-row" key={p.id}>
       <span className="ev-payment-icon" aria-hidden="true">▣</span>
       <div><strong>{customer?.name||'Pago informado'}</strong><small>{amountLabel}</small></div>
       <span className={'ev-payment-tag '+(p.status==='observed'?'ev-payment-observed':'')}>{p.status==='observed'?'En observación':'Por verificar'}</span>
      </div>;
     })}
    </div>:<Empty title="Sin pagos por verificar" detail="Los comprobantes informados que requieran revisión aparecerán aquí."/>}
   </section>
  </div>
 </div>;
}
function StockTable({data,limit=null}){
 const models=limit?data.models.slice(0,limit):data.models;
 return models.length?<div className="table-scroll"><table className="stock-table">
  <thead><tr><th>Producto</th><th>Publicado</th><th>Compromisos anteriores</th><th>En pedidos</th><th>Disponible</th></tr></thead>
  <tbody>{models.map(m=>{const s=data.stock[m.id]||{};return <tr key={m.id}>
    <td><div className="table-model"><ProductImage model={m}/><div><strong>{m.name}</strong><small>Talla {m.size_label}</small></div></div></td>
    <td>{rup(s.on_hand)}</td><td>{rup(s.reserved)}</td><td>{rup(s.pending_delivery)}</td>
    <td><b className={s.blocked?'error-text':Number(s.available)===0?'warn-text':'positive-text'}>{s.blocked?'En revisión':rup(s.available)}</b></td>
  </tr>})}</tbody>
 </table></div>:<Empty title="Aún no hay productos" detail="Registra el primer modelo para comenzar."/>;
}
function StockEditor({model,stock,onSave,busy}){
 const [operation,setOperation]=useState('add'),[amount,setAmount]=useState('1'),[unit,setUnit]=useState('dozens');
 const requestId=useRef(null);
 const {units,committed,target,available,valid}=stockProjection(stock,operation,amount,unit);
 function change(set,value){set(value);requestId.current=null;}
 async function submit(e){e.preventDefault();if(!valid||busy)return;
  if(!requestId.current)requestId.current=uuid();
  const ok=await onSave(model.id,operation,units,stock.version,requestId.current);
  if(ok){requestId.current=null;setAmount(unit==='dozens'?'1':'12');}
 }
 return <form className="stock-editor" onSubmit={submit}>
  <p className="editor-title">Ajuste de inventario — {model.name}</p>
  <div className="stock-ops" role="group" aria-label="Tipo de movimiento">
   {[['add','＋ Añadir'],['physical_sale','− Venta física'],['set_total','= Corregir total']].map(([v,label])=>
    <button key={v} type="button" className={'pill '+(operation===v?'active':'')} disabled={busy}
      aria-pressed={operation===v} onClick={()=>change(setOperation,v)}>{label}</button>)}
  </div>
  <div className="stock-ops" role="group" aria-label="Unidad del ajuste">{[['dozens','Docenas'],['units','Prendas']].map(([v,label])=><button type="button" key={v} className={'pill '+(unit===v?'active':'')} aria-pressed={unit===v} disabled={busy} onClick={()=>{if(v!==unit){change(setUnit,v);setAmount(v==='dozens'?'1':'12');}}}>{label}</button>)}</div>
  <div className="stock-bottom ev-stock-bottom"><div className="field"><label className="field-label" htmlFor={'stock-units-'+model.id}>{unit==='dozens'?'Cantidad en docenas':'Cantidad en prendas'}</label>
   <div className="ev-stock-stepper"><button type="button" className="button button-outline" aria-label="Disminuir cantidad" disabled={busy||Number(amount)<=(operation==='set_total'?0:1)} onClick={()=>change(setAmount,String(Math.max(operation==='set_total'?0:1,(Number(amount)||0)-1)))}>−</button>
   <input id={'stock-units-'+model.id} type="number" name="units" required min={operation==='set_total'?0:1} max={unit==='dozens'?178956970:2147483647} step="1" inputMode="numeric" disabled={busy} value={amount} onChange={e=>change(setAmount,e.target.value)}/>
   <button type="button" className="button button-outline" aria-label="Aumentar cantidad" disabled={busy||Number(amount)>=(unit==='dozens'?178956970:2147483647)} onClick={()=>change(setAmount,String(Math.min(unit==='dozens'?178956970:2147483647,(Number(amount)||0)+1)))}>＋</button></div>
   </div>
   <div className="stock-projection"><small>Stock resultante / disponible</small><b>{Number.isSafeInteger(target)?rup(target):'—'} / {Number.isSafeInteger(available)?rup(available):'—'} prendas</b><span>{rup(committed)} comprometidas</span></div>
  </div>
  <button className="button button-primary" type="submit" disabled={busy||!valid}>{busy?'Guardando…':'Aplicar ajuste'}</button>
  {target<committed&&<p className="form-error" role="alert">No puedes reducir el stock por debajo del compromiso con clientes.</p>}
 </form>;
}
function ProductHistory({model}){
 const [result,setResult]=useState(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;productHistory(model.id).then(r=>{if(active)setResult(r);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[model.id,model.updated_at]);
 if(error)return <p role="alert" className="form-error">{error}</p>;
 if(!result)return <p role="status">Cargando historial…</p>;
 if(!result.length)return <p className="small-note">Sin modificaciones auditadas.</p>;
 return <div className="ev-product-history">{result.map(e=><div key={e.request_id}><strong>{e.operation==='reactivate'?'Reactivación':e.operation==='archive'?'Inhabilitación':e.source==='legacy'?'Precio / fotografía':'Edición de ficha'}</strong><small>{displayDate(e.created_at)}</small>
  {e.source==='legacy'?<p>{e.old_price} → {e.new_price} Bs{e.old_image_path!==e.new_image_path?' · Foto modificada':''}</p>:<><p>{['name','size_label','price_dozen_bs'].filter(k=>e.previous_data?.[k]!==e.new_data?.[k]).map(k=>String(e.previous_data?.[k]??'—')+' → '+String(e.new_data?.[k]??'—')).join(' · ')||'Ficha actualizada'}</p>{e.operation==='reactivate'&&<p>Stock republicado: {e.new_data?.on_hand} prendas</p>}{JSON.stringify(e.previous_data?.colors)!==JSON.stringify(e.new_data?.colors)&&e.operation==='edit'&&<p>Colores actualizados</p>}{e.previous_data?.image_path!==e.new_data?.image_path&&<p>Fotografía actualizada</p>}</>}
  </div>)}</div>;
}
function ReactivateForm({model,onSave,busy}){
 const [docenas,setDocenas]=useState('0'),request=useRef(null);
 const valid=docenas.trim()!==''&&Number.isSafeInteger(Number(docenas))&&Number(docenas)>=0&&Number(docenas)<=178956970;
 return <form className="stock-editor" onSubmit={async e=>{e.preventDefault();if(!valid||busy)return;if(!request.current)request.current=uuid();await onSave({model,units:Number(docenas)*12,requestId:request.current});}}>
  <Field title="Docenas disponibles para republicar"><input required type="number" min="0" max="178956970" step="1" value={docenas} disabled={busy} onChange={e=>{setDocenas(e.target.value);request.current=null;}}/></Field>
  <p className="small-note">Confirma las existencias físicas actuales. La foto archivada no se recupera; puedes cargar otra después.</p>
  <button className="button button-primary" disabled={busy||!valid||Boolean(model.image_path)}>Reactivar producto</button>
 </form>;
}
function ColorLibrary({colors,onSave,busy}){
 const [editing,setEditing]=useState(null),[name,setName]=useState(''),[hex,setHex]=useState('#9b6682'),[active,setActive]=useState(true);
 const request=useRef(null);
 function select(c){setEditing(c);setName(c?.name??'');setHex(c?.hex_code??'#9b6682');setActive(c?.is_active??true);request.current=null;}
 const duplicate=colors.some(c=>c.id!==editing?.id&&normalizeName(c.name).toLowerCase()===normalizeName(name).toLowerCase());
 return <section className="surface pad ev-register-palette"><header className="ev-register-heading"><span aria-hidden="true">◉</span><div><h2>Paleta de colores</h2><p>Biblioteca reutilizable</p></div></header>
  <form className="palette-form" onSubmit={async e=>{e.preventDefault();if(duplicate||busy)return;if(!request.current)request.current=uuid();
   const ok=await onSave({id:editing?.id??null,name:normalizeName(name),hex,active,expected:editing?.updated_at??null,requestId:request.current});if(ok)select(null);}}>
   <Field title={editing?'Corregir nombre del color':'Nombre del color'}><input value={name} required maxLength={80} disabled={busy} onChange={e=>{setName(e.target.value);request.current=null;}}/></Field>
   <Field title="Muestra de color"><div className="color-input"><input type="color" aria-label="Elegir color visual" value={hex} disabled={busy} onChange={e=>{setHex(e.target.value);request.current=null;}}/><span>{hex.toUpperCase()}</span></div></Field>
   {editing&&<label className="small-note"><input type="checkbox" checked={active} disabled={busy} onChange={e=>{setActive(e.target.checked);request.current=null;}}/> Color activo</label>}
   {duplicate&&<p className="form-error">Ya existe ese nombre de color.</p>}
   <div className="form-actions"><button type="submit" className="button button-outline" disabled={busy||duplicate||!name.trim()}>{editing?'Guardar corrección':'Guardar color'}</button>{editing&&<button type="button" className="button button-outline" disabled={busy} onClick={()=>select(null)}>Cancelar edición</button>}</div>
  </form>
  <div className="palette-list">{colors.map(c=><button className="button button-outline ev-palette-edit" type="button" key={c.id} disabled={busy} onClick={()=>select(c)}><ColorChip color={c}/>{!c.is_active?' (inactivo)':''}<span aria-hidden="true">✎</span></button>)}</div>
 </section>;
}
function ExpandableColorLibrary({colors,onSave,busy}){
 const [open,setOpen]=useState(false);
 useEffect(()=>{setOpen(window.matchMedia('(min-width: 901px)').matches);},[]);
 return <details className="ev-color-library-disclosure" open={open} onToggle={e=>setOpen(e.currentTarget.open)}>
  <summary><span>Paleta de colores</span><span aria-hidden="true">{open?'−':'＋'}</span></summary>
  {open&&<ColorLibrary colors={colors} onSave={onSave} busy={busy}/>}
 </details>;
}
function ModelEditor({model,models,colors,onSave,busy}){
 return <ModelForm model={model} models={models} colors={colors} onCreate={onSave} busy={busy}/>;
}
function Catalog({data,onSaveColor,onCreateModel,onAdjust,onUpdateModel,onArchive,onCleanup,onReactivate,busy}){
 const {ask}=useConfirmation();
 const [view,setView]=useState('list'),[search,setSearch]=useState(''),[size,setSize]=useState('all'),[availability,setAvailability]=useState('all'),[archived,setArchived]=useState(false),[editing,setEditing]=useState(null),[section,setSection]=useState(''),[seed,setSeed]=useState(null);
 const pendingPhotos=[...new Set(data.models.filter(m=>!m.is_active&&m.image_path&&!data.models.some(x=>x.is_active&&x.image_path===m.image_path)).map(m=>m.image_path))];
 const sizes=productSizes(data.models);
 const filtered=data.models.filter(m=>m.is_active!==archived&&(m.name+' '+m.size_label).toLocaleLowerCase().includes(search.toLocaleLowerCase())&&(size==='all'||normalizeSize(m.size_label)===size)&&(archived||availability==='all'||(availability==='stock'?!data.stock[m.id]?.blocked&&Number(data.stock[m.id]?.available)>0:availability==='empty'?!data.stock[m.id]?.blocked&&Number(data.stock[m.id]?.available)===0:Boolean(data.stock[m.id]?.blocked))));
 const list=useRecordList(filtered,'created_at'),{view:page}=list;
 function close(){setEditing(null);setSection('');}
 function reset(){list.setPage(1);close();}
 function toggle(id,name){if(editing===id&&section===name){close();return;}setEditing(id);setSection(name);}
 function register(model=null){setSeed(model);setView('new');close();}
 const selectedModel=data.models.find(m=>m.id===editing);
 return <>
  <SectionHead eyebrow="CATÁLOGO E INVENTARIO" title={view==='new'?'Registrar producto':view==='edit'?'Editar producto':view==='colors'?'Colores':'Productos'}
   actions={<div className="ev-catalog-actions"><button type="button" className="button button-outline" disabled={busy} onClick={()=>{close();setSeed(null);setView(view==='list'?'colors':'list');}}>{view==='list'?'Paleta de colores':'← Volver al catálogo'}</button>{view==='list'&&<button className="button button-primary" disabled={busy} onClick={()=>register()}>＋ Registrar producto</button>}</div>}/>
  {view==='colors'?<ColorLibrary colors={data.colors} onSave={onSaveColor} busy={busy}/>:view==='new'||view==='edit'?<div className="two-columns catalog-forms ev-product-registration">
   <section className="surface pad ev-register-main">
    {view==='edit'&&selectedModel?<ModelEditor key={selectedModel.id+'-'+selectedModel.updated_at} model={selectedModel} models={data.models} colors={data.colors} onSave={async params=>{const ok=await onUpdateModel(params);if(ok){setView('list');close();}return ok;}} busy={busy}/>:<ModelForm key={seed?.id??'new'} seed={seed} models={data.models} colors={data.colors} onCreate={async params=>{const ok=await onCreateModel(params);if(ok){setView('list');setSeed(null);reset();}return ok;}} busy={busy}/>}
   </section><ExpandableColorLibrary colors={data.colors} onSave={onSaveColor} busy={busy}/>
  </div>:<>
   <div className="toolbar"><label className="search"><span aria-hidden>⌕</span><input type="search" aria-label="Buscar producto" placeholder="Buscar por modelo o talla…" value={search} onChange={e=>{setSearch(e.target.value);reset();}}/></label><span className="muted">{page.total} modelos</span></div>
   <div className="ev-product-filters"><Field title="Talla"><select value={size} onChange={e=>{setSize(e.target.value);reset();}}><option value="all">Todas las tallas</option>{sizes.map(v=><option key={v}>{v}</option>)}</select></Field>
   {!archived&&<Field title="Disponibilidad"><select value={availability} onChange={e=>{setAvailability(e.target.value);reset();}}><option value="all">Todos</option><option value="stock">Con stock</option><option value="empty">Agotados</option><option value="blocked">En revisión</option></select></Field>}</div>
   {pendingPhotos.length>0&&<div className="ev-archive-pending" role="status"><span>{pendingPhotos.length} fotografía(s) de archivo pendientes de limpieza.</span><button type="button" className="button button-outline" disabled={busy} onClick={()=>onCleanup(pendingPhotos)}>Reintentar limpieza</button></div>}
   {page.total?<div className="product-grid ev-compact-product-grid">{page.items.map(m=>{const stock=data.stock[m.id]||{},opened=editing===m.id;return <article className="product-card ev-compact-product" key={m.id}>
    <div className="ev-product-main"><div className="product-cover"><ProductImage model={m} large/><span className="size-tag">TALLA {m.size_label}</span></div>
    <div className="product-card-body"><div className="product-card-header"><div><h2>{m.name}</h2><p className="price">{formatBs(centsFromBs(m.price_dozen_bs))} <small>/ docena</small></p></div>
    <details className="ev-product-menu"><summary aria-label={'Acciones de '+m.name}>⋮</summary><div className="ev-product-menu-options">
     {m.is_active&&<button type="button" disabled={busy} onClick={()=>{setEditing(m.id);setView('edit');}}>Editar producto</button>}
     <button type="button" disabled={busy} onClick={()=>register(m)}>Duplicar producto</button>
     <button type="button" disabled={busy} onClick={()=>toggle(m.id,'history')}>Historial de cambios</button>
     {m.is_active?<button type="button" className="error-text" disabled={busy} onClick={async()=>{if(await ask({severity:'critical',title:'Inhabilitar producto',message:'El modelo dejará de venderse y se eliminará su fotografía. El historial permanece.',facts:[{label:'Modelo',value:m.name},{label:'Talla',value:m.size_label}],notice:'La fotografía no se recupera al reactivar el producto.',confirmLabel:'Inhabilitar'}))await onArchive(m);}}>Inhabilitar producto</button>:<button type="button" disabled={busy} onClick={()=>toggle(m.id,'reactivate')}>Reactivar producto</button>}
    </div></details></div>
    <span className={'availability '+(!m.is_active||stock.blocked?'bad':Number(stock.available)===0?'none':'ok')}>{!m.is_active?'Inhabilitado':stock.blocked?'Revisión':Number(stock.available)===0?'Agotado':'Disponible'}</span>
    <ModelColors model={m} colors={data.colors} compact/>
    </div></div>
    <div className="ev-product-bottom"><div className="stock-grid-mini"><div><small>Publicadas</small><b>{rup(stock.on_hand)}</b></div><div><small>Comprometidas</small><b>{rup(Number(stock.reserved||0)+Number(stock.pending_delivery||0))}</b></div><div className="emphasized"><small>Disponibles</small><b>{rup(stock.available)}</b></div></div>
     {m.is_active&&<button className="button button-outline full" type="button" disabled={busy} onClick={()=>toggle(m.id,'stock')}>{opened&&section==='stock'?'Cerrar ajuste':'▥ Ajustar stock'}</button>}
     {opened&&section==='stock'&&<StockEditor model={m} stock={stock} onSave={onAdjust} busy={busy}/>}
     {opened&&section==='history'&&<ProductHistory key={m.id+'-'+m.updated_at} model={m}/>}
     {opened&&section==='reactivate'&&<ReactivateForm model={m} onSave={onReactivate} busy={busy}/>}
    </div></article>})}</div>:<Empty title="No se encontraron productos" detail="Cambia los filtros o registra un modelo."/>}
   <RecordListControls list={list} dateLabel="Fecha de registro" busy={busy} onChange={close}/>
   <ListPager view={page} onPage={p=>{list.setPage(p);close();}} label="Páginas de productos" busy={busy}/>
   <nav className="ev-order-archive-toolbar" aria-label="Vista de productos"><button type="button" className="button button-outline" aria-pressed={!archived} disabled={busy} onClick={()=>{setArchived(false);reset();}}>Productos activos</button><button type="button" className="button button-outline" aria-pressed={archived} disabled={busy} onClick={()=>{setArchived(true);reset();}}>Inhabilitados ({data.models.filter(m=>!m.is_active).length})</button></nav>
  </>}
 </>;
}
function QuickOptions({label,options,value,onSelect,busy,custom,onCustom,customLabel,children,quantity=false}){
 return <fieldset className={'ev-quick-options '+(quantity?'ev-quick-quantity':'')}>
  <legend className="field-label">{label}</legend>
  <div className="ev-quick-grid" role="group" aria-label={label}>
   {options.map(option=><button type="button" className={'pill ev-quick-choice '+(!custom&&String(value)===String(option.value)?'active':'')} key={option.value} aria-pressed={!custom&&String(value)===String(option.value)} disabled={busy||option.disabled} onClick={()=>onSelect(option.value)}>{option.label}</button>)}
   <button type="button" className={'pill ev-quick-choice ev-quick-custom '+(custom?'active':'')} aria-pressed={custom} disabled={busy} onClick={onCustom}>＋ {customLabel}</button>
  </div>
  {custom&&<div className="ev-quick-input">{children}</div>}
 </fieldset>;
}
function ModelForm({colors,models=[],model=null,seed=null,onCreate,busy}){
 const {ask}=useConfirmation();
 const original=model??seed;
 const [name,setName]=useState(original?.name??''),[size,setSize]=useState(original?.size_label??''),[customSize,setCustomSize]=useState(false),[price,setPrice]=useState(original?String(original.price_dozen_bs):'');
 const [docenas,setDocenas]=useState('0'),[selected,setSelected]=useState(()=>[...(original?.colorIds??[])]);
 const [customPrice,setCustomPrice]=useState(false),[customStock,setCustomStock]=useState(false),[showPaletteCopy,setShowPaletteCopy]=useState(false);
 const [photo,setPhoto]=useState(null),[preview,setPreview]=useState(''),[localError,setLocalError]=useState('');
 const requestId=useRef(null),photoInput=useRef(null);
 const sizes=productSizes(models),{names}=suggestions(models,size);
 const prices=productPriceOptions(models,size,original?.price_dozen_bs);
 const activeColors=colors.filter(c=>c.is_active);
 const customPriceVisible=customPrice||prices.length===0;
 const paletteSources=models.filter(m=>m.id!==model?.id&&m.colorIds?.length);
 const validSelected=selected.filter(id=>activeColors.some(c=>c.id===id));
 const duplicates=matchingModels(models,name,size,model?.id);
 const unchanged=equivalentProduct(model,{name,size,price,colorIds:selected,photo});
 function change(set,value){set(value);requestId.current=null;setLocalError('');}
 function choosePhoto(file){
  setPhoto(null);setLocalError('');requestId.current=null;
  if(file){if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size===0||file.size>5242880){setLocalError('Selecciona una foto JPG, PNG o WebP de hasta 5 MB.');return;}
   setPhoto(file);
  }
 }
 useEffect(()=>{if(!photo){setPreview('');return;}const url=URL.createObjectURL(photo);setPreview(url);return()=>URL.revokeObjectURL(url);},[photo]);
 async function submit(e){
  e.preventDefault();setLocalError('');
  if(busy||unchanged)return;
  try{
   const normalized=normalizePrice(price),amount=centsFromBs(normalized);
   if(amount>999999999999n)throw Error('Precio fuera de rango.');
   const n=normalizeName(name),t=normalizeSize(size);
   if(!n||n.length>120||!t||t.length>24)throw Error('Nombre o talla inválidos.');
   if(!validSelected.length||validSelected.length!==selected.length)throw Error('Selecciona al menos un color activo; retira los inactivos.');
   if(!model&&(!docenas.trim()||!Number.isSafeInteger(Number(docenas))||Number(docenas)<0||Number(docenas)>178956970))throw Error('Registra docenas completas publicables.');
   if(!requestId.current){
    if(duplicates.length&&!await ask({severity:'warning',title:'Posible producto duplicado',message:'Ya existe un modelo activo con el mismo nombre y talla.',facts:[{label:'Modelo',value:n},{label:'Talla',value:t}],confirmLabel:'Continuar registro'}))return;
    requestId.current=uuid();
   }
   const ok=await onCreate({model,name:n,size:t,price:normalized,stockDocenas:Number(docenas),colorIds:validSelected,photo,requestId:requestId.current});
   if(ok)requestId.current=null;
  }catch(err){setLocalError(err.message);}
 }
 return <form onSubmit={submit} className="model-form">
  <div className="ev-register-section-title"><b>01</b> Fotografía del producto</div>
  <div className="photo-field"><div className="photo-preview">{preview||model?.imageUrl?<img alt="Vista previa de fotografía" src={preview||model.imageUrl}/>:<div className="upload-placeholder"><span>▧</span><b>Fotografía del modelo</b><small>JPG · PNG · WebP</small></div>}</div>
   <label className="file-label"><span className="button button-outline">{model?'Reemplazar fotografía':'Elegir fotografía'}</span><input ref={photoInput} name="modelPhoto" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>choosePhoto(e.target.files?.[0])}/></label>
   {photo&&<button type="button" className="button button-outline" disabled={busy} onClick={()=>{choosePhoto(null);if(photoInput.current)photoInput.current.value='';}}>Quitar selección</button>}
  </div>
  <div className="ev-register-section-title"><b>02</b> Información comercial</div>
  <div className="form-inline">
   <Field title="Nombre del modelo"><input name="modelName" required maxLength={120} list="ev-model-names" value={name} disabled={busy} onChange={e=>change(setName,e.target.value)} placeholder="Nombre comercial…"/><datalist id="ev-model-names">{names.map(n=><option key={n} value={n}/>)}</datalist></Field>
   <QuickOptions label="Talla única del modelo" options={sizes.map(v=>({value:v,label:v}))} value={normalizeSize(size)} custom={customSize} busy={busy} onSelect={v=>{setCustomSize(false);change(setSize,v);}} customLabel="Otra talla" onCustom={()=>{setCustomSize(true);change(setSize,'');}}>
    <Field title="Nueva talla"><input name="modelSize" required maxLength={24} value={size} disabled={busy} onChange={e=>change(setSize,e.target.value)} placeholder="Ej. L"/></Field>
   </QuickOptions>
   <QuickOptions label="Precio por docena (Bs)" options={prices.map(v=>({value:v,label:v+' Bs'}))} value={Number(normalizePrice(price))>0?String(Number(normalizePrice(price))):''} custom={customPriceVisible} busy={busy} onSelect={v=>{setCustomPrice(false);change(setPrice,v);}} customLabel="Otro precio" onCustom={()=>{setCustomPrice(true);change(setPrice,'');}}>
    <Field title="Importe por docena"><input name="modelPrice" required inputMode="decimal" value={price} disabled={busy} onChange={e=>change(setPrice,e.target.value)} placeholder="Ej. 380"/></Field>
   </QuickOptions>
   {!model&&<div className="ev-docena-field"><QuickOptions label="Docenas completas publicables" options={[...QUICK_DOZENS.map(v=>({value:String(v),label:String(v)})),{value:'0',label:'Sin stock'}]} value={docenas} custom={customStock} busy={busy} quantity onSelect={v=>{setCustomStock(false);change(setDocenas,v);}} customLabel="Más" onCustom={()=>{setCustomStock(true);change(setDocenas,'');}}>
    <Field title="Otra cantidad de docenas"><input name="modelStock" type="number" step="1" min="0" max="178956970" value={docenas} disabled={busy} onChange={e=>change(setDocenas,e.target.value)} required/></Field>
   </QuickOptions><small className="field-hint">{docenas!==''&&Number.isSafeInteger(Number(docenas))&&Number(docenas)>=0?rup(Number(docenas)*12)+' prendas publicables':'Selecciona una cantidad.'}</small></div>}
  </div>
  {duplicates.length>0&&<p className="small-note" role="status">Ya existe {duplicates.length} modelo(s) activo(s) con ese nombre y talla.</p>}
  {model&&<p className="small-note">Los pedidos conservan sus datos históricos. Nombre y talla se protegen si existen compromisos pendientes; el precio nuevo solo afecta futuras ventas.</p>}
  <div className="palette-selector"><div className="ev-register-section-title"><b>03</b> Colores disponibles</div>
   <div className="palette-title"><strong>Colores que ofrece este modelo</strong><span>{selected.length} seleccionados</span></div>
   <div className="ev-color-actions"><button type="button" className="button button-outline" disabled={busy||!activeColors.length} onClick={()=>change(setSelected,activeColors.map(c=>c.id))}>Seleccionar todos</button><button type="button" className="button button-outline" disabled={busy||!selected.length} onClick={()=>change(setSelected,[])}>Limpiar</button>
   {paletteSources.length>0&&<button type="button" className="button button-outline ev-copy-palette" disabled={busy} aria-expanded={showPaletteCopy} onClick={()=>setShowPaletteCopy(v=>!v)}>{showPaletteCopy?'Cerrar paletas':'Copiar paleta de modelo'} <span aria-hidden="true">{showPaletteCopy?'⌃':'⌄'}</span></button>}</div>
   {showPaletteCopy&&paletteSources.length>0&&<div className="ev-palette-source-list" role="group" aria-label="Paletas de otros modelos">{paletteSources.map(m=><button className="button button-outline" type="button" key={m.id} disabled={busy} onClick={()=>{change(setSelected,m.colorIds.filter(id=>activeColors.some(c=>c.id===id)));setShowPaletteCopy(false);}}>{m.name} · {m.size_label}</button>)}</div>}
   {activeColors.length?<div className="color-select-grid">{activeColors.map(c=><ColorChip key={c.id} color={c} disabled={busy} selected={selected.includes(c.id)} onClick={()=>change(setSelected,selected.includes(c.id)?selected.filter(x=>x!==c.id):[...selected,c.id])}/>)}</div>:<Notice>Primero crea un color desde la paleta.</Notice>}
   {validSelected.length!==selected.length&&<button type="button" className="button button-outline" disabled={busy} onClick={()=>change(setSelected,validSelected)}>Retirar colores inactivos</button>}
  </div>
  {localError&&<p className="form-error" role="alert">{localError}</p>}
  <button className="button button-primary full" type="submit" disabled={busy||!activeColors.length||unchanged}>{busy?'Guardando…':model?'Guardar corrección auditada':'Registrar producto e inventario'}</button>
 </form>;
}
function ClientEditForm({customer,onSave,onCancel,busy,customers=[]}){
 const [name,setName]=useState(customer.name),[phone,setPhone]=useState(customer.whatsapp);
 const [method,setMethod]=useState(customer.delivery_preference==='unclassified'?'':customer.delivery_preference);
 const [destination,setDestination]=useState(customer.shipping_destination??'');
 const [error,setError]=useState('');
 const requestId=useRef(null);
 const [duplicateConfirmed,setDuplicateConfirmed]=useState(false);
 const matches=normalizedWhatsApp(phone)===normalizedWhatsApp(customer.whatsapp)?[]:matchingCustomers(customers,phone,customer.id);
 async function submit(e){
  e.preventDefault();if(busy)return;setError('');
  try{
   const delivery=validateDelivery(method,destination);
   if(!name.trim()||!phone.trim())throw new Error('Nombre y WhatsApp obligatorios.');
   if(matches.length&&!duplicateConfirmed)throw Error('Confirma el uso compartido de este WhatsApp.');
   if(!requestId.current)requestId.current=uuid();
   const ok=await onSave({customer,name:name.trim(),whatsapp:phone.trim(),...delivery,requestId:requestId.current});
   if(ok){requestId.current=null;onCancel();}
  }catch(e){setError(e.message);}
 }
 const touched=name.trim()!==customer.name||phone.trim()!==customer.whatsapp||
  method!==customer.delivery_preference||((method==='shipping'?destination.trim():'')!==(customer.shipping_destination??''));
 return <form className="customer-edit" onSubmit={submit}>
  <p className="small-note">La categoría y el destino habitual se reutilizan al crear pedidos. Los pedidos anteriores conservan su destino registrado.</p>
  <div className="form-inline">
   <Field title="Nombre"><input value={name} maxLength={130} required
    onChange={e=>{setName(e.target.value);requestId.current=null;}}/></Field>
   <Field title="WhatsApp"><input value={phone} maxLength={30} type="tel" inputMode="tel" required
    onChange={e=>{setPhone(e.target.value);requestId.current=null;setDuplicateConfirmed(false);}}/></Field>
  </div>
  <DeliveryPreferenceFields method={method} busy={busy} setMethod={v=>{setMethod(v);requestId.current=null;}}
   destination={destination} setDestination={v=>{setDestination(v);requestId.current=null;}}/>
  {matches.length>0&&<div className="surface pad" role="status"><p className="small-note">Este WhatsApp coincide con: {matches.map(c=>c.name).join(', ')}.</p><label className="qr-confirm"><input type="checkbox" checked={duplicateConfirmed} onChange={e=>setDuplicateConfirmed(e.target.checked)}/>Confirmo usar el mismo número en fichas diferentes.</label></div>}
  {error&&<p role="alert" className="form-error">{error}</p>}
  <div className="form-actions">
   <button type="submit" disabled={busy||!touched||(matches.length>0&&!duplicateConfirmed)} className="button button-primary">Guardar ficha y destino</button>
   <button type="button" className="button button-outline" onClick={onCancel}>Cancelar</button>
  </div>
 </form>;
}
function ClientPanel({data,onCreate,onUpdate,busy}){
 const [search,setSearch]=useState(''),[editing,setEditing]=useState(null);
 const clients=data.customers.filter(c=>(c.name+' '+c.whatsapp).toLocaleLowerCase().includes(search.toLocaleLowerCase()));
 const list=useRecordList(clients,'created_at');
 const {view}=list;
 return <>
  <SectionHead eyebrow="DIRECTORIO COMERCIAL" title="Clientes y compradores."
    description="Registra y actualiza los datos de contacto de tus compradores. El teléfono no fusiona fichas."/>
  <div className="two-columns customer-layout">
   <section className="surface pad"><h2>Registrar cliente</h2>
    <p className="muted">Indica si compra para retiro o para envíos. Si recibe envíos, registra siempre su destino habitual.</p>
    <ClientForm onCreate={onCreate} busy={busy} customers={data.customers}/></section>
   <section className="surface pad"><h2>{data.customers.length} fichas registradas</h2>
    <label className="search"><span aria-hidden>⌕</span><input type="search" aria-label="Buscar cliente"
     value={search} placeholder="Buscar nombre o WhatsApp…" disabled={busy} onChange={e=>{setSearch(e.target.value);list.setPage(1);setEditing(null);}}/></label>
    <RecordListControls list={list} dateLabel="Fecha de registro del cliente" busy={busy} onChange={()=>setEditing(null)}/>
    {view.total?<div className="client-list">{view.items.map(c=>{
      const reservations=data.reservations.filter(r=>r.customer_id===c.id).length;
      const orders=data.orders.filter(o=>o.customer_id===c.id&&!o.archived_at).length;
      return <div className="client-record" key={c.id}><div className="client-row"><span className="avatar">{initials(c.name)}</span>
       <div><strong>{c.name}</strong><small>{c.whatsapp} · {deliveryLabel(c.delivery_preference)}{c.shipping_destination?' · '+c.shipping_destination:''}</small><span>{orders} pedidos{reservations>0?' · '+reservations+' registro(s) anterior(es)':''}</span></div>
       <button className="button button-outline" type="button" disabled={busy}
        onClick={()=>setEditing(editing===c.id?null:c.id)}>{editing===c.id?'Cerrar':'Editar'}</button></div>
       {editing===c.id&&<ClientEditForm key={c.id+'-'+c.updated_at} customer={c}
        onSave={onUpdate} onCancel={()=>setEditing(null)} busy={busy} customers={data.customers}/>}
      </div>
    })}</div>:<Empty title="Sin clientes coincidentes" detail="Registra una ficha o cambia la búsqueda."/>}
    <ListPager view={view} onPage={p=>{list.setPage(p);setEditing(null);}} label="Páginas de clientes" busy={busy}/>
   </section>
  </div>
 </>;
}
function ExtraColorSummary({ids=[],colors}){
 if(!ids.length)return null;
 return <div className="extra-color-summary">
  <small>Prendas adicionales elegidas</small>
  <div className="color-row small">
   {ids.map(id=>{const color=colors.find(c=>c.id===id);
    return <span key={id} className="selected-color"><ColorChip color={color||{id,name:'Color registrado',hex_code:null}} compact/></span>;
   })}
  </div>
 </div>;
}
function PortionEditor({model,stock,colors,selection,onChange,onRemove}){
 const dozens=Number(selection.dozens);
 const extras=selection.extraColorIds;
 const validDozens=/^(0|[1-9]\d*)$/.test(String(selection.dozens));
 const quantity=validDozens?portionQuantity(dozens,extras):0;
 const available=Number(stock.available)||0;
 const allowedColors=colors.filter(c=>model.colorIds?.includes(c.id)&&c.is_active);
 const insufficient=quantity>available;
 const noDozen=validDozens&&dozens===0;
 const validLine=validDozens&&Number.isSafeInteger(quantity)&&quantity>=6&&!insufficient&&!stock.blocked;
 const maximumDozens=Math.max(0,Math.floor((available-extras.length)/12));
 const [extrasOpen,setExtrasOpen]=useState(()=>extras.length>0||Number(selection.dozens)===0);
 const [customDozens,setCustomDozens]=useState(()=>Number(selection.dozens)>8);
 const quickDozens=[0,...QUICK_DOZENS].map(n=>({value:String(n),label:n===0?'Sin doc.':String(n),disabled:n>0&&(stock.blocked||n>maximumDozens)}));
 const showCustomDozens=customDozens||!validDozens||dozens>8;
 const showExtras=extrasOpen||noDozen;
 function setDozens(value){
  if(String(value)==='0')setExtrasOpen(true);
  else if(dozens===0&&extras.length===0)setExtrasOpen(false);
  onChange({...selection,dozens:String(value)});
 }
 function toggleColor(id){
  if(extras.includes(id))onChange({...selection,extraColorIds:extras.filter(x=>x!==id)});
  else if(extras.length<11&&quantity<available&&!stock.blocked)
   onChange({...selection,extraColorIds:[...extras,id]});
 }
 return <article className={'cart-model ev-portion-model '+(validLine?'complete':'incomplete')}>
  <div className="cart-model-head">
   <ProductImage model={model}/>
   <div className="cart-model-info"><h3>{model.name}</h3>
    <span>Talla {model.size_label} · {formatBs(centsFromBs(model.price_dozen_bs))} por docena</span>
    <small>{stock.blocked?'BLOQUEADO':formatAvailableDozens(available)+' libres'}</small>
   </div>
   <button type="button" className="remove-model" title="Quitar modelo" aria-label={'Quitar '+model.name}
    onClick={onRemove}>×</button>
  </div>
  <div className="ev-portion-primary">
   <div className="ev-portion-dozens">
    <div className="portion-label"><b>Docenas surtidas</b><span>12 prendas por docena</span></div>
    <div className="ev-portion-quick">
     <QuickOptions label="Seleccionar docenas" options={quickDozens} value={String(selection.dozens)} custom={showCustomDozens}
      onSelect={value=>{setCustomDozens(false);setDozens(value);}} customLabel="Otra cantidad" onCustom={()=>setCustomDozens(true)}>
    <div className="dozen-entry">
     <button type="button" aria-label={'Quitar docena de '+model.name}
      onClick={()=>setDozens(Math.max(0,dozens-1))} disabled={!validDozens||dozens<=0}>−</button>
     <input type="number" min="0" max={Math.min(maximumDozens,178956969)} step="1" inputMode="numeric"
      name={'dozens-'+model.id} aria-label={'Docenas de '+model.name} value={selection.dozens}
      onChange={e=>setDozens(e.target.value)}/>
     <button type="button" aria-label={'Añadir docena a '+model.name}
      onClick={()=>setDozens(dozens+1)} disabled={!validDozens||dozens>=maximumDozens||stock.blocked}>＋</button>
    </div>
    </QuickOptions></div>
   </div>
   <button type="button" className={'ev-units-toggle '+(showExtras?'expanded':'')}
    aria-expanded={showExtras} aria-controls={'extra-colors-'+model.id}
    onClick={()=>{if(!noDozen)setExtrasOpen(current=>!current);}}>
    <span className="ev-units-leading"><strong>{extras.length?extras.length+' unidades por color':'＋ Agregar unidades'}</strong>
     <small>{noDozen?'Mínimo 6 colores diferentes (media docena)':'Opcional · hasta 11 unidades por color'}</small></span>
    <span className="ev-units-chevron" aria-hidden="true">{showExtras?'⌃':'⌄'}</span>
   </button>
  </div>
  <div id={'extra-colors-'+model.id} hidden={!showExtras} className="extra-color-panel ev-extra-colors">
   <div className="portion-instructions">
    <b>{noDozen?'Media docena o unidades: selecciona de 6 a 11 colores':'Selecciona unidades adicionales (máximo 11)'}</b>
    <p>{noDozen?'Sin docenas completas, cada unidad lleva un color diferente y el mínimo es de 6.':
     'Cada color representa exactamente una prenda adicional. Las docenas completas siguen siendo surtidas.'}</p>
   </div>
   <div className="color-select-grid extra-select-grid">
    {allowedColors.map(color=><ColorChip key={color.id} color={color}
     selected={extras.includes(color.id)} onClick={()=>toggleColor(color.id)}
     disabled={!extras.includes(color.id)&&(extras.length>=11||quantity>=available||stock.blocked)}/>)}
   </div>
   {!allowedColors.length&&<p className="form-hint">No hay colores activos asignados a este modelo.</p>}
   {noDozen&&extras.length<6&&<p className="portion-warning" role="status">
    Selecciona {6-extras.length} {6-extras.length===1?'color más':'colores más'} para alcanzar el mínimo mayorista.
   </p>}
   {insufficient&&<p className="form-error" role="alert">Stock insuficiente: {quantity} seleccionadas, {available} disponibles.</p>}
   {stock.blocked&&<p className="form-error">Modelo con incidencia de inventario.</p>}
  </div>
  <div className="portion-result">
   <div><span className="portion-total-label">Subtotal del modelo</span>
    <strong>{validDozens?portionBreakdown(dozens,extras.length):'Docenas inválidas'} · {validDozens?quantity:'—'} prendas</strong>
   </div><b>{validLine?formatBs(subtotalCents(model.price_dozen_bs,quantity)):'Por completar'}</b>
  </div>
 </article>;
}
function OrderStepHeader({number,title,description,state}){
 return <div className="form-section-title ev-booking-section-title">
  <span className="step" aria-hidden="true">{number===1?'♙':number===2?'▧':'✓'}</span>
  <div className="order-step-heading"><h2>{title}</h2><p>{description}</p></div>
  {state==='done'&&<span className="ev-section-complete" aria-label="Sección lista">✓</span>}
 </div>;
}
function BookingPanel({data,onOrder,onCreateClient,busy}){
 const [customerId,setCustomerId]=useState('');
 const [customerSearch,setCustomerSearch]=useState('');
 const [customerListOpen,setCustomerListOpen]=useState(false);
 const [highlightedCustomer,setHighlightedCustomer]=useState(0);
 const customerPickerRef=useRef(null);
 const [productSearch,setProductSearch]=useState('');
 const [portions,setPortions]=useState({});
 const [localError,setLocalError]=useState('');
 const [recentlyAdded,setRecentlyAdded]=useState(null);
 const [addClient,setAddClient]=useState(false);
 const [method,setMethod]=useState(''),[destination,setDestination]=useState('');
 const requestId=useRef(null);
 const models=data.models.filter(m=>m.is_active);
 const stock=data.stock;
 const chosen=models.filter(m=>Object.hasOwn(portions,m.id));
 const availableModels=models.filter(m=>!Object.hasOwn(portions,m.id)&&
   (m.name+' '+m.size_label).toLocaleLowerCase().includes(productSearch.toLocaleLowerCase()));
 const matchedCustomers=data.customers.filter(c=>(c.name+' '+c.whatsapp).toLocaleLowerCase().includes(customerSearch.toLocaleLowerCase()));
 const chosenCustomer=data.customers.find(c=>c.id===customerId);
 const visibleCustomers=matchedCustomers.slice(0,8);
 useEffect(()=>{
  const dismiss=e=>{if(!customerPickerRef.current?.contains(e.target))setCustomerListOpen(false);};
  document.addEventListener('pointerdown',dismiss);
  return ()=>document.removeEventListener('pointerdown',dismiss);
 },[]);
 function selectCustomer(customer){
  setCustomerId(customer.id);
  setMethod(customer.delivery_preference==='unclassified'?'':(customer.delivery_preference??''));
  setDestination(customer.shipping_destination??'');
  setCustomerListOpen(false);
  setCustomerSearch('');
  setHighlightedCustomer(0);
  requestId.current=null;
 }
 const amount=chosen.reduce((total,m)=>{
  const s=portions[m.id],q=portionQuantity(Number(s.dozens),s.extraColorIds);
  const valid=/^(0|[1-9]\d*)$/.test(String(s.dozens));
  return total+(valid&&Number.isSafeInteger(q)&&q>=6?subtotalCents(m.price_dozen_bs,q):0n);
 },0n);
 const totalItems=chosen.reduce((n,m)=>{
  const s=portions[m.id],q=portionQuantity(Number(s.dozens),s.extraColorIds);
  return n+(Number.isSafeInteger(q)&&q>=0?q:0);
 },0);
 const clientReady=Boolean(chosenCustomer);
 const deliveryReady=(()=>{
  try{validateDelivery(method,destination);return true;}catch{return false;}
 })();
 const productsReady=chosen.length>0&&(()=>{
  try{return checkedPortions(models,portions,stock,data.colors).length===chosen.length;}
  catch{return false;}
 })();
 const stage=!clientReady?1:!productsReady?2:3;
 useEffect(()=>{if(localError)document.getElementById('operation-error')?.focus();},[localError]);
 function editPortion(id,value){requestId.current=null;setPortions(v=>({...v,[id]:value}));setLocalError('');}
 function addModel(model){
  requestId.current=null;
  const modelStock=stock[model.id]||{};
  const colorCount=data.colors.filter(c=>model.colorIds?.includes(c.id)&&c.is_active).length;
  try{
   const selection=initialModelPortion(modelStock,colorCount);
   setPortions(v=>({...v,[model.id]:selection}));
   setRecentlyAdded(model.id);
   setLocalError('');
  }catch(e){setLocalError(e.message);}
 }
 useEffect(()=>{
  if(recentlyAdded){
   document.getElementById('order-model-'+recentlyAdded)?.scrollIntoView({block:'nearest'});
  }
 },[recentlyAdded]);
 function removeModel(id){requestId.current=null;setPortions(current=>{
  const copy={...current};delete copy[id];return copy;
 });setLocalError('');}
 async function submit(e){
  e.preventDefault();setLocalError('');
  try{
   if(!customerId)throw new Error('Selecciona un cliente antes de continuar.');
   const lines=checkedPortions(models,portions,stock,data.colors);
   const delivery=validateDelivery(method,destination);
   if(!requestId.current)requestId.current=uuid();
   const ok=await onOrder(customerId,lines,requestId.current,delivery);
   if(ok){requestId.current=null;setPortions({});setCustomerId('');setCustomerSearch('');setCustomerListOpen(false);setMethod('');setDestination('');}
  }catch(err){setLocalError(err.message);}
 }
 return <div className="ev-booking">
  <SectionHead eyebrow="VENTAS MAYORISTAS" title="Registrar pedido confirmado"
   description="Selecciona comprador y modelos; las docenas son surtidas y las unidades por color se detallan cuando las agregas."/>
  <nav className="order-progress ev-order-progress" aria-label="Progreso del registro de pedido">
   <div className="ev-progress-caption">
    <strong>Progreso del pedido</strong>
    <span>Paso {stage} de 3</span>
   </div>
   <div className="ev-progress-bar" role="progressbar" aria-label="Progreso del pedido"
    aria-valuemin={1} aria-valuemax={3} aria-valuenow={stage}>
    <span style={{width:(stage*100/3)+'%'}}/>
   </div>
   <div className="ev-progress-labels">
    {['Cliente','Modelos','Confirmación'].map((label,index)=>
     <span key={label} className={index+1<stage?'done':index+1===stage?'current':'next'}>
      <span aria-hidden="true">{index+1<stage?'✓':index+1}</span>{label}
     </span>)}
   </div>
  </nav>
  <div className="booking-layout">
   <div className="surface booking-form">
    <section className={'form-section order-step-card '+(1<stage?'done':1===stage?'current':'next')}>
     <OrderStepHeader number={1} title="Elegir comprador" description="Busca por nombre o WhatsApp, o registra un cliente nuevo." state={1<stage?'done':1===stage?'current':'next'}/>
     <div className="customer-chooser ev-customer-chooser">
      <div className="ev-client-picker-row">
       <div className="ev-client-field" ref={customerPickerRef}>
        <label htmlFor="ev-client-search" className="field-label">Cliente del pedido</label>
        <div className="search ev-client-search">
         <span aria-hidden="true">⌕</span>
         <input id="ev-client-search" type="search" role="combobox"
          aria-label="Buscar y seleccionar cliente por nombre o WhatsApp" aria-autocomplete="list"
          aria-expanded={customerListOpen} aria-controls="ev-client-results"
          aria-activedescendant={customerListOpen&&visibleCustomers[highlightedCustomer]?'ev-client-option-'+visibleCustomers[highlightedCustomer].id:undefined}
          autoComplete="off" placeholder="Nombre o número de WhatsApp…"
          value={customerSearch} onFocus={()=>setCustomerListOpen(true)}
          onChange={e=>{setCustomerSearch(e.target.value);setCustomerListOpen(true);setHighlightedCustomer(0);}}
          onKeyDown={e=>{
           if(e.key==='ArrowDown'){e.preventDefault();setCustomerListOpen(true);setHighlightedCustomer(i=>Math.min(visibleCustomers.length-1,Math.max(0,i+1)));}
           else if(e.key==='ArrowUp'){e.preventDefault();setCustomerListOpen(true);setHighlightedCustomer(i=>Math.max(0,i-1));}
           else if(e.key==='Enter'&&customerListOpen&&visibleCustomers.length){e.preventDefault();selectCustomer(visibleCustomers[Math.min(highlightedCustomer,visibleCustomers.length-1)]);}
           else if(e.key==='Escape'){setCustomerListOpen(false);}
          }}/>
        </div>
        <div id="ev-client-results" role="listbox" aria-label="Resultados de clientes"
         className="ev-client-results" hidden={!customerListOpen}>
         {visibleCustomers.length?visibleCustomers.map((c,index)=>
          <button type="button" key={c.id} id={'ev-client-option-'+c.id}
           role="option" aria-selected={customerId===c.id}
           className={'ev-client-option '+(index===highlightedCustomer?'highlighted':'')}
           onMouseDown={e=>e.preventDefault()} onClick={()=>selectCustomer(c)}>
           <span className="avatar">{initials(c.name)}</span>
           <span className="ev-client-meta"><strong>{c.name}</strong><small>{c.whatsapp}</small></span>
           <span className="ev-client-type">{c.delivery_preference==='shipping'?'Envío':c.delivery_preference==='pickup'?'Retiro':'Sin clasificar'}</span>
           {customerId===c.id&&<span className="ev-client-selected-icon" aria-label="Seleccionado">✓</span>}
          </button>):
          <p className="ev-client-empty">No se encontraron clientes. Puedes registrar uno nuevo.</p>}
         {matchedCustomers.length>visibleCustomers.length&&
          <p className="ev-client-more">Mostrando 8 de {matchedCustomers.length}. Escribe para filtrar.</p>}
        </div>
       </div>
       <button type="button" className="button button-outline ev-new-client" aria-expanded={addClient}
        onClick={()=>setAddClient(x=>!x)}>{addClient?'Cerrar ficha':'＋ Nuevo cliente'}</button>
      </div>
     </div>
     {chosenCustomer&&<div className="selected-client ev-selected-client">
       <span className="avatar small">{initials(chosenCustomer.name)}</span>
       <div><b>{chosenCustomer.name}</b><small>{chosenCustomer.whatsapp}</small></div>
       <span className="ev-chosen-tag">✓ Seleccionado</span>
      </div>}
     {addClient&&<div className="inline-client"><ClientForm compact busy={busy} customers={data.customers}
       onCreate={async(payload)=>{const ok=await onCreateClient(payload);if(ok===true){setAddClient(false);setCustomerSearch(payload.whatsapp);setCustomerListOpen(true);setHighlightedCustomer(0);}return ok;}}/></div>}
    </section>
    <section className={'form-section order-step-card '+(2<stage?'done':2===stage?'current':'next')}>
     <OrderStepHeader number={2} title="Seleccionar productos" description="Agrega modelos y elige docenas; despliega unidades y colores solo cuando lo necesites." state={2<stage?'done':2===stage?'current':'next'}/>
     <label className="search model-search"><span aria-hidden="true">⌕</span>
      <input type="search" aria-label="Buscar modelos para añadir" placeholder="Buscar modelo o talla…"
       value={productSearch} onChange={e=>setProductSearch(e.target.value)}/></label>
     {availableModels.length?<div className="product-picker" aria-label="Productos disponibles para el pedido">{availableModels.map(m=>{
      const st=stock[m.id]||{},available=Number(st.available)||0;
      const activeColors=data.colors.filter(c=>m.colorIds?.includes(c.id)&&c.is_active).length;
      const canAdd=canAddModelToOrder(st,activeColors);
      return <button key={m.id} type="button" className="picker-item picker-add"
       disabled={!canAdd} aria-label={'Agregar '+m.name+' al pedido'}
       onClick={()=>addModel(m)}>
       <ProductImage model={m}/>
       <div className="picker-info"><b>{m.name}</b><small>Talla {m.size_label} · {formatBs(centsFromBs(m.price_dozen_bs))}/doc.</small>
        <span className={!canAdd?'error-text':'positive-text'}>{st.blocked?'Incidencia · bloqueado':
          !canAdd?'Sin cupo suficiente para el mínimo mayorista':formatAvailableDozens(available)+' disponibles'}</span>
       </div><span className="picker-add-action" aria-hidden="true">＋ Agregar</span>
      </button>})}</div>:<p className="muted">{models.length?'Todos los modelos coincidentes están agregados.':'Todavía no hay productos activos.'}</p>}
     <div className="cart-subhead"><h3>Modelos agregados al pedido</h3><span aria-live="polite">{chosen.length} modelo(s) · {totalItems} prendas</span></div>
     {chosen.length?<div className="cart-models">{chosen.map(m=>
      <div key={m.id} id={'order-model-'+m.id} className="order-model-anchor"><PortionEditor model={m} colors={data.colors} stock={stock[m.id]||{}}
       selection={portions[m.id]} onChange={v=>editPortion(m.id,v)} onRemove={()=>removeModel(m.id)}/></div>
     )}</div>:<Empty title="Aún no agregaste modelos" detail="Elige uno o varios productos del catálogo superior."/>}
    </section>
    <section className={'form-section order-step-card '+(3<stage?'done':3===stage?'current':'next')}>
     <OrderStepHeader number={3} title="Revisar y confirmar" description="Comprueba los importes antes de comprometer inventario." state={3<stage?'done':3===stage?'current':'next'}/>
     <div className="order-confirmation-note"><strong>Compra confirmada</strong><p>Registra únicamente pedidos aceptados por el cliente. Al confirmar, las prendas quedan comprometidas para su entrega y el precio queda fijado.</p></div>
     <div className="order-delivery-choice">
      <DeliveryMethodChoices label="¿Cómo recibirá este pedido?" method={method} busy={busy} onChange={value=>{setMethod(value);if(value!=='shipping')setDestination('');requestId.current=null;}}/>
      {method==='shipping'&&<DestinationShortcut destination={destination} known={chosenCustomer?.shipping_destination} busy={busy} onSelect={value=>{setDestination(value);requestId.current=null;}}/>}
      {method==='shipping'&&<Field title="Destino exacto para este pedido">
       <input aria-label="Destino del pedido" value={destination} required maxLength={200} minLength={2}
        placeholder="Ciudad / departamento / agencia" disabled={busy}
        onChange={e=>{setDestination(e.target.value);requestId.current=null;}}/>
      </Field>}
      <p className="small-note">El pedido guarda su destino propio, aunque después se modifique la ficha del cliente.</p>
     </div>
    </section>
    {localError&&<p className="form-error" role="alert" tabIndex={-1} id="operation-error">{localError}</p>}
   </div>
   <aside className="surface checkout">
    <p className="eyebrow">RESUMEN PREVIO</p><h2>Detalle mayorista</h2>
    <div className="checkout-customer"><span className="label-dim">Cliente</span>
     <strong>{chosenCustomer?.name||'Selecciona un cliente'}</strong></div>
    <div className="checkout-lines">{chosen.length?chosen.map(m=>{
     const s=portions[m.id],q=portionQuantity(Number(s.dozens),s.extraColorIds),
           valid=Number.isSafeInteger(q)&&q>=6;
     return <div className="checkout-line" key={m.id}>
      <div><b>{m.name}</b><small>{portionBreakdown(Number(s.dozens),s.extraColorIds.length)} · {q} prendas</small>
       <ExtraColorSummary ids={s.extraColorIds} colors={data.colors}/></div>
      <strong>{valid?formatBs(subtotalCents(m.price_dozen_bs,q)):'—'}</strong>
     </div>;}):<p className="muted">Los modelos seleccionados aparecerán aquí.</p>}</div>
    <div className="checkout-total"><span>Total del pedido</span><strong>{formatBs(amount)}</strong></div>
    <div className="checkout-delivery"><span>Entrega</span>
     <strong>{deliveryLabel(method)}</strong>{method==='shipping'&&destination.trim()&&<small>{destination.trim()}</small>}
    </div>
    <p className="checkout-note">Las docenas son surtidas. Se registran los colores de las prendas adicionales, una por color. La disponibilidad física por color se verifica fuera del sistema.</p>
    <form id="booking-submit" onSubmit={submit}>
     <button className="button button-primary full" type="submit" disabled={busy||!clientReady||!productsReady||!deliveryReady}>
      {busy?'Guardando…':'Confirmar y registrar pedido'}
     </button>
    </form>
   </aside>
  </div>
 </div>;
}
function LineComposition({line,colors,compact=false}){
 const hasBreakdown=line.dozen_count!==null&&line.dozen_count!==undefined;
 return <div className={'line-composition '+(compact?'compact':'')}>
  <span>{hasBreakdown?
    portionBreakdown(Number(line.dozen_count),Number(line.extra_units)):
    quantityBreakdown(line.quantity)+' · registro anterior sin desglose de colores'}</span>
  <ExtraColorSummary ids={line.extraColorIds||[]} colors={line.extraColorsSnapshot??colors}/>
 </div>;
}

function PaymentForm({targetId,onSubmit,busy,balance}){
 const [amount,setAmount]=useState(''),[note,setNote]=useState(''),[customAmount,setCustomAmount]=useState(false);
 const suggested=paymentAmountOptions(balance);
 const showCustom=customAmount||suggested.length===0||Boolean(amount&&!suggested.some(x=>x.value===amount));
 const requestId=useRef(null);
 async function submit(e){
  e.preventDefault();
  const parsed=amount.trim().replace(',','.');
  if(!/^\d+(?:\.\d{1,2})?$/.test(parsed)||Number(parsed)<=0)return;
  if(!requestId.current)requestId.current=uuid();
  const ok=await onSubmit({
   orderId:targetId,
   amount:parsed,requestId:requestId.current,note:note.trim()||null
  });
  if(ok){requestId.current=null;setAmount('');setNote('');setCustomAmount(false);}
 }
 return <form className="money-form" onSubmit={submit}>
  <p className="small-note">Registrar aviso de pago externo. <strong>No reduce el saldo</strong> hasta que el administrador compruebe la recepción y lo apruebe.</p>
  <div className="form-inline">
   <QuickOptions label="Monto informado (Bs)" options={suggested} value={amount} custom={showCustom} busy={busy} onSelect={value=>{setCustomAmount(false);setAmount(value);requestId.current=null;}} customLabel="Otro importe" onCustom={()=>{setCustomAmount(true);setAmount('');requestId.current=null;}}>
    <Field title="Importe recibido"><input type="text" name={'payment-'+targetId} inputMode="decimal" placeholder="Ej. 150,50" disabled={busy}
     value={amount} onChange={e=>{setAmount(e.target.value);requestId.current=null;}} required/></Field>
   </QuickOptions>
   <Field title="Referencia u observación (opcional)">
    <input type="text" maxLength={1000} name="paymentNote" placeholder="Transferencia, efectivo…"
     value={note} onChange={e=>{setNote(e.target.value);requestId.current=null;}}/></Field>
  </div>
  <button className="button button-outline" type="submit" disabled={busy||!amount.trim()}>
   {busy?'Registrando…':'＋ Informar pago para revisión'}</button>
 </form>;
}
function PaymentHistory({items=[],compact=false}){
 return items.length?<div className={'payment-history '+(compact?'compact':'')}>
  {items.map(p=><div key={p.id} className="payment-history-line">
   <span>{formatBs(centsFromBs(p.amount_bs))} · {displayDate(p.created_at)}</span>
   <strong className={'pay-state pay-'+p.status}>{
    {pending:'Pendiente',observed:'En observación',rejected:'Rechazado',approved:'Aprobado'}[p.status]||p.status
   }</strong>
   {p.public_note&&<small>{p.public_note}</small>}
  </div>)}
 </div>:<p className="small-note">Todavía no hay pagos informados.</p>;
}
function QrAdmin({settings,onSave,busy,canManage=true}){
 const [file,setFile]=useState(null),[verified,setVerified]=useState(false);
 const [hint,setHint]=useState('');
 const req=useRef(null);
 async function show(){
  try{
   if(!settings?.image_path)return;
   const url=await getAdminQrUrl(settings.image_path);
   window.open(url,'_blank','noopener,noreferrer');
  }catch(err){setHint(err.message);}
 }
 async function submit(e){
  e.preventDefault();setHint('');
  if(!file||!verified)return;
  if(!req.current)req.current=uuid();
  const form=e.currentTarget,values=new FormData(form),password=values.get('password'),code=values.get('code');
  form.elements.password.value='';form.elements.code.value='';
  const ok=await onSave(file,verified,req.current,password,code);
  if(ok){req.current=null;setFile(null);setVerified(false);setHint('QR vigente publicado para los enlaces de pedidos activos.');}
 }
 return <section className="surface pad qr-admin">
  <h2>QR oficial de EVALIA</h2>
  <p className="small-note">Usa exclusivamente la imagen verdadera que recibiste de tu banco. No se genera un QR ficticio desde el software.</p>
  {settings?.reusable_verified?<div className="qr-status">
    <span className="pay-state pay-approved">QR verificado para reutilización</span>
    <button type="button" className="button button-outline" onClick={show}>Ver QR vigente</button>
   </div>:<p className="small-note">Todavía no hay un QR bancario vigente publicado.</p>}
  {canManage?<form onSubmit={submit} className="money-form">
   <Field title="Imagen bancaria JPG, PNG o WebP (máx. 5 MB)">
    <input type="file" accept="image/jpeg,image/png,image/webp"
     onChange={e=>{setFile(e.target.files?.[0]||null);req.current=null;}} required/></Field>
   <label className="qr-confirm"><input type="checkbox" checked={verified}
     onChange={e=>{setVerified(e.target.checked);req.current=null;}}/>
     He comprobado que esta imagen es un QR real, vigente y reutilizable para recibir pagos.</label>
   <Field title="Confirma tu contraseña"><input name="password" type="password" autoComplete="current-password" required/></Field>
   <Field title="Código del autenticador"><input name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required/></Field>
   <button className="button button-primary" type="submit" disabled={busy||!file||!verified}>
    {busy?'Guardando…':'Publicar QR para clientes'}</button>
  </form>:<p className="small-note">Solo el propietario puede modificar el QR bancario.</p>}
  {hint&&<p role="status" className="small-note">{hint}</p>}
 </section>;
}
function OrderLinkPanel({order,data,onIssue,onRevoke,busy}){
 const [plain,setPlain]=useState(null),[draft,setDraft]=useState(''),[hint,setHint]=useState('');
 const saved=data.links.find(l=>l.order_id===order.id);
 const active=Boolean(saved&&!saved.revoked_at&&order.status==='active');
 async function issue(){
  setHint('');
  const link=await onIssue(order.id);
  if(link){
   const customer=data.customers.find(c=>c.id===order.customer_id);
   setPlain(link);
   setDraft(buildOrderWhatsAppMessage({
    order,customer,models:data.models,colors:data.colors,
    finance:data.finances[order.id],url:link
   }));
   setHint('Enlace privado creado. Revisa el mensaje y compártelo solo con el comprador. Si sales de esta pantalla necesitarás generar un enlace nuevo.');
  }
 }
 async function revoke(){
  setHint('');
  const ok=await onRevoke(order.id);
  if(ok){setPlain(null);setDraft('');setHint('Enlace revocado inmediatamente.');}
 }
 async function copy(value,success){
  try{await navigator.clipboard.writeText(value);setHint(success);}
  catch{setHint('No se pudo copiar automáticamente; selecciona el texto y cópialo manualmente.');}
 }
 return <div className="order-links">
  <h3>Confirmación por WhatsApp y enlace privado</h3>
  <p className="small-note">El enlace permite consultar únicamente este pedido e informar pagos para revisión. Cualquier persona que lo reciba podrá usarlo: envíalo solo al comprador.</p>
  {active?<span className="pay-state pay-approved">Enlace vigente (versión {saved.version})</span>:
   <span className="pay-state">{order.status==='completed'?'Desactivado por cierre':'Sin enlace activo'}</span>}
  {order.status==='active'&&<div className="form-actions">
   <button type="button" className="button button-outline" disabled={busy} onClick={issue}>
    {active?'↻ Reemplazar enlace':'＋ Crear enlace privado'}</button>
   {active&&<button type="button" className="button button-outline" disabled={busy} onClick={revoke}>Revocar</button>}
  </div>}
  {plain&&active&&<div className="whatsapp-message-composer">
    <label htmlFor={'whatsapp-message-'+order.id} className="field-label">Mensaje de confirmación para WhatsApp</label>
    <p className="small-note">Texto preparado con los datos reales del pedido. Puedes editarlo antes de copiar; no se envía automáticamente.</p>
    <textarea id={'whatsapp-message-'+order.id} className="whatsapp-message-draft"
      rows={13} value={draft} onChange={e=>setDraft(e.target.value)} spellCheck={true}/>
    <div className="form-actions">
     <button type="button" className="button button-primary" disabled={busy||!draft.trim()}
      onClick={()=>copy(draft,'Mensaje de confirmación copiado. Pégalo en el chat del comprador.')}>
      Copiar mensaje para WhatsApp</button>
     <button type="button" className="button button-outline" disabled={busy}
      onClick={()=>copy(plain,'Enlace privado copiado. Pégalo únicamente en el chat del comprador.')}>
      Copiar solo enlace</button>
    </div>
   </div>}
  {plain&&!active&&<p className="small-note">El enlace fue reemplazado o revocado. Crea uno nuevo para compartirlo.</p>}
  {hint&&<p role="status" className="small-note">{hint}</p>}
 </div>;
}
function PaymentReview({data,onReview,onSaveQr,busy,canManageQr}){
 const [notes,setNotes]=useState({});
 const [filter,setFilter]=useState('pending');
 const pending=['pending','observed'];
 const payments=data.payments.filter(p=>!data.orders.some(o=>o.archived_at&&(o.id===p.order_id||(o.origin_reservation_id&&o.origin_reservation_id===p.reservation_id)))&&(filter==='all'||(filter==='pending'?pending.includes(p.status):p.status===filter)));
 const list=useRecordList(payments,'created_at');
 const {view}=list;
 return <><SectionHead eyebrow="CONCILIACIÓN MANUAL" title="Verifica los pagos recibidos."
  description="Un aviso o comprobante NO confirma dinero ingresado. Comprueba la recepción fuera del sistema antes de aprobar."/>
  <QrAdmin settings={data.qrSettings} onSave={onSaveQr} busy={busy} canManage={canManageQr}/>
  <div className="toolbar"><label className="field"><span className="field-label">Filtrar estado</span>
   <select value={filter} disabled={busy} onChange={e=>{setFilter(e.target.value);list.setPage(1);}}>
    <option value="pending">Pendientes y en observación</option>
    <option value="approved">Aprobados</option><option value="rejected">Rechazados</option>
    <option value="all">Todos</option></select></label>
   <span className="muted">{view.total} declaración(es)</span></div>
  <RecordListControls list={list} dateLabel="Fecha de declaración del pago" busy={busy}/>
  <div className="record-list">{view.items.map(p=>{
   const order=data.orders.find(o=>o.id===p.order_id);
   const res=data.reservations.find(r=>r.id===p.reservation_id);
   const customer=data.customers.find(c=>c.id===(order?.customer_id||res?.customer_id));
   return <article className="record" key={p.id}>
    <header className="record-head"><div><h3>{customer?.name||'Cliente'} · {formatBs(centsFromBs(p.amount_bs))}</h3>
      <small>{order?'Pedido':'Compromiso anterior'} · {displayDate(p.created_at)} · {p.origin==='client'?'Aviso del cliente':'Registrado por administración'}</small></div>
      <span className={'pay-state pay-'+p.status}>{p.status}</span></header>
    <p className="small-note">{p.note||'Sin observación inicial'}</p>
    {p.receipt_path&&<button type="button" className="button button-outline" onClick={async()=>{
      try{const url=await getPrivateReceiptUrl(p.receipt_path);window.open(url,'_blank','noopener,noreferrer');}
      catch{setNotes(v=>({...v,[p.id]:'No se pudo abrir el comprobante privado.'}));}
    }}>Ver comprobante privado</button>}
    {['pending','observed'].includes(p.status)&&<div className="payment-review-actions">
      <Field title="Observación (visible al cliente si tiene enlace)">
       <input value={notes[p.id]??''} maxLength={1000} placeholder="Detalle de revisión…"
        onChange={e=>setNotes(prev=>({...prev,[p.id]:e.target.value}))}/></Field>
      <div className="form-actions">
       <button className="button button-primary" type="button" disabled={busy}
        onClick={()=>onReview(p.id,'approve',notes[p.id]||null)}>✓ Aprobar solo si fue recibido</button>
       <button className="button button-outline" type="button" disabled={busy}
        onClick={()=>onReview(p.id,'observe',notes[p.id]||null)}>En observación</button>
       <button className="button button-outline" type="button" disabled={busy}
        onClick={()=>onReview(p.id,'reject',notes[p.id]||null)}>Rechazar</button>
      </div>
    </div>}
    {data.paymentReviews.filter(v=>v.report_id===p.id).map(v=><small className="small-note" key={v.id}>
      {displayDate(v.created_at)} · {v.action} {v.note?' · '+v.note:''}</small>)}
   </article>;
  })}</div>
  {!view.total&&<Empty title="Sin declaraciones coincidentes" detail="Cambia el estado o las fechas para consultar otros registros."/>}
  <ListPager view={view} onPage={list.setPage} label="Páginas de pagos" busy={busy}/>
 </>;
}
function DeliveryForm({order,data,onSave,busy}){
 const [lines,setLines]=useState({});
 const requestId=useRef(null);
 const remaining=order.lines.map(l=>{
  const sent=data.deliveryLines.filter(d=>d.order_line_id===l.id).reduce((n,d)=>n+Number(d.quantity),0);
  return {...l,remaining:Math.max(0,Number(l.quantity)-sent)};
 }).filter(l=>l.remaining>0);
 function change(id,value){setLines(v=>({...v,[id]:value}));requestId.current=null;}
 async function submit(e){
  e.preventDefault();
  const selected=[];
  for(const l of remaining){
   const raw=String(lines[l.id]??'0').trim();
   if(!/^\d+$/.test(raw))return;
   const qty=Number(raw);
   if(!Number.isSafeInteger(qty)||qty<0||qty>l.remaining)return;
   if(qty>0)selected.push({orderLineId:l.id,quantity:qty});
  }
  if(!selected.length)return;
  if(!requestId.current)requestId.current=uuid();
  const ok=await onSave(order.id,selected,requestId.current);
  if(ok){requestId.current=null;setLines({});}
 }
 if(!remaining.length)return <p className="small-note">Entrega completa registrada. Puedes cerrar el pedido cuando el saldo aprobado sea cero.</p>;
 return <form className="delivery-form" onSubmit={submit}>
  <p className="small-note">Registra solo las prendas físicamente retiradas. Se descuentan de stock físico y de pendientes de entrega, sin cambiar dos veces el disponible.</p>
  {remaining.map(l=>{const model=data.models.find(m=>m.id===l.model_id);return <div key={l.id} className="delivery-line">
    <span>{model?.name||'Modelo'} · Pendientes: <b>{l.remaining}</b></span>
    <input type="number" min="0" step="1" max={l.remaining} inputMode="numeric"
     aria-label={'Unidades entregadas de '+(model?.name||'modelo')} value={lines[l.id]??'0'}
     onChange={e=>change(l.id,e.target.value)}/></div>})}
  <button type="submit" className="button button-outline" disabled={busy}>Registrar retirada real</button>
 </form>;
}
function LegacyCommitments({data,onConvert,busy}){
 const {ask}=useConfirmation();
 const active=data.reservations.filter(r=>r.status==='saved'||r.status==='in_review');
 if(!active.length)return null;
 return <details className="legacy-commitments surface">
  <summary><strong>Registros anteriores pendientes ({active.length})</strong>
   <span>Solo para resolver compromisos previos al cambio. No se pueden crear nuevos apartados.</span></summary>
  <div className="legacy-commitment-list">
   {active.map(r=>{
    const customer=data.customers.find(c=>c.id===r.customer_id);
    const payments=data.payments.filter(p=>p.reservation_id===r.id);
    const protective=payments.some(p=>p.status==='approved'&&new Date(p.approved_at)<new Date(r.expires_at));
    const canConvert=r.status==='saved'&&(new Date(r.expires_at)>new Date()||(protective&&new Date(r.review_at)>new Date()));
    return <article className="legacy-commitment" key={r.id}>
     <div className="record-head"><strong>{customer?.name||'Cliente'}</strong><Status value={r.status}/></div>
     <p className="small-note">Registro anterior · {r.lines.reduce((sum,l)=>sum+Number(l.quantity),0)} prendas · Vencimiento: {displayDate(r.expires_at)}</p>
     <div className="record-lines">{r.lines.map(l=>{
      const model=data.models.find(m=>m.id===l.model_id);
      return <div className="record-line-detail" key={l.id}>
       <span>{l.model_name_snapshot??model?.name??'Modelo'} · {l.quantity} prendas</span>
       <LineComposition line={l} colors={data.colors} compact/>
      </div>;
     })}</div>
     {payments.length>0&&<PaymentHistory items={payments} compact/>}
     {canConvert?<button type="button" className="button button-outline" disabled={busy}
       onClick={async()=>{if(await ask({severity:'normal',title:'Confirmar compra',message:'Confirma solo si el cliente aceptó comprar estas prendas. El registro pasará a pedido sin descontar stock dos veces.',facts:[{label:'Cliente',value:customer?.name||'Cliente'},{label:'Prendas',value:r.lines.reduce((sum,l)=>sum+Number(l.quantity),0)}],confirmLabel:'Convertir en pedido'}))await onConvert(r.id);}}>
       Confirmar compra y convertir en pedido</button>:
       <p className="small-note">{r.status==='in_review'?'Este registro antiguo tiene protección de depósito y requiere revisión administrativa; su cupo no se libera automáticamente.':'Su vigencia terminó. El procesador anterior liberará las prendas si no hay depósito oportuno.'}</p>}
    </article>;
   })}
  </div>
 </details>;
}
function OrderQuickActions({order,finance,delivery,payments,onQuick,busy}){
 const {ask}=useConfirmation();
 const [note,setNote]=useState('');
 const attempt=useRef(null);
 const balance=amountCents(finance.pending??0);
 const excess=amountCents(finance.excess??0);
 const remaining=Number(delivery.remaining??0);
 const pendingEvidence=payments.some(p=>p.status==='pending'||p.status==='observed');
 const canPay=balance>0n&&excess===0n&&!pendingEvidence;
 const canDeliver=balance===0n&&excess===0n&&remaining>0;
 async function run(action){
  const money=action!=='deliver',goods=action!=='pay';
  const details=action==='pay'
   ?'¿Confirmas que recibiste '+formatBs(balance)+' y verificaste el ingreso? El pedido quedará pagado, pero sin retirar.'
   :action==='deliver'
   ?'¿Confirmas que entregaste físicamente las '+remaining+' prendas restantes? El pedido se cerrará como COMPLETADO.'
   :'¿Confirmas que recibiste '+formatBs(balance)+' y entregaste físicamente las '+remaining+' prendas restantes? Se cerrará el pedido COMPLETADO.';
  if(!await ask({severity:'critical',title:action==='pay'?'Confirmar cobro':action==='deliver'?'Confirmar entrega':'Confirmar cobro y entrega',message:details,facts:[...(money?[{label:'Importe recibido',value:formatBs(balance)}]:[]),...(goods?[{label:'Prendas entregadas',value:remaining}]:[])],notice:'Esta operación se registra en el historial y no puede deshacerse desde el panel.',confirmLabel:action==='pay'?'Registrar cobro':action==='deliver'?'Registrar entrega':'Cobrar y entregar'}))return;
  if(!attempt.current||attempt.current.action!==action||attempt.current.note!==note)
   attempt.current={id:uuid(),action,note};
  const ok=await onQuick({orderId:order.id,action,requestId:attempt.current.id,
   note:note.trim()||null,moneyReceived:money,goodsDelivered:goods});
  if(ok){attempt.current=null;setNote('');}
 }
 if(order.status!=='active')return null;
 return <section className="express-checkout" aria-label="Acciones rápidas del pedido">
  <div className="express-checkout-heading">
   <span className="express-icon" aria-hidden="true">✓</span>
   <div><h3>Finalizar pedido rápidamente</h3>
    <p>Registra el cobro verificado y la entrega total. Los abonos y comprobantes se consultan por separado.</p></div>
  </div>
  <div className="express-status" role="status">
   <div className={balance===0n?'complete':'pending'}><span>Pago</span><b>{balance===0n?'Total recibido':'Restan '+formatBs(balance)}</b></div>
   <div className={remaining===0?'complete':'pending'}><span>Entrega</span><b>{remaining===0?'Todo entregado':remaining+' prendas por retirar'}</b></div>
  </div>
  {pendingEvidence&&<p className="express-warning" role="alert">
    Hay un comprobante o aviso de pago sin resolver. Revísalo en Pagos antes de registrar un cobro total para evitar duplicarlo.
   </p>}
  {excess>0n&&<p className="express-warning" role="alert">Existe un exceso de dinero aprobado. Concílialo antes de usar el cierre rápido.</p>}
  {(canPay||canDeliver)&&<label className="express-note">
   <span>Nota o referencia de operación (opcional)</span>
   <input type="text" maxLength={1000} value={note} placeholder="Ej. efectivo, QR verificado…"
    onChange={e=>{setNote(e.target.value);attempt.current=null;}}/>
   </label>}
  {(canPay||canDeliver)&&<div className="express-actions">
   {canPay&&remaining>0&&<button type="button" className="button express-primary" disabled={busy}
      onClick={()=>run('pay_deliver')}>
      ✓ Cobrar saldo y entregar todo</button>}
   {canPay&&<button type="button" className="button express-secondary" disabled={busy}
      onClick={()=>run('pay')}>Registrar pago total recibido</button>}
   {canDeliver&&<button type="button" className="button express-primary" disabled={busy}
      onClick={()=>run('deliver')}>✓ Entregar todo y completar</button>}
  </div>}
  <p className="express-disclaimer">Las acciones de cobro exigen que el dinero haya sido recibido y comprobado. Las de entrega exigen que las prendas hayan sido entregadas físicamente. Se guardan con auditoría e impiden duplicados.</p>
 </section>;
}
function OrderDeliveryEditor({order,customer,onSave,busy}){
 const [method,setMethod]=useState(order.fulfillment_method==='legacy'?'':order.fulfillment_method);
 const [destination,setDestination]=useState(order.shipping_destination??customer?.shipping_destination??'');
 const [error,setError]=useState('');
 const requestId=useRef(null);
 async function save(e){
  e.preventDefault();setError('');
  try{
   const delivery=validateDelivery(method,destination);
   if(!requestId.current)requestId.current=uuid();
   const ok=await onSave({orderId:order.id,...delivery,requestId:requestId.current});
   if(ok)requestId.current=null;
  }catch(e){setError(e.message);}
 }
 return <form className="order-delivery-editor" onSubmit={save}>
  <DeliveryMethodChoices label="Modalidad de este pedido" method={method} busy={busy} onChange={value=>{setMethod(value);if(value!=='shipping')setDestination('');requestId.current=null;}}/>
  {method==='shipping'&&<DestinationShortcut destination={destination} known={customer?.shipping_destination} busy={busy} onSelect={value=>{setDestination(value);requestId.current=null;}}/>}
  {method==='shipping'&&<Field title="Destino de este pedido">
   <input value={destination} aria-label="Cambiar destino del pedido" required minLength={2} maxLength={200}
    onChange={e=>{setDestination(e.target.value);requestId.current=null;}}/>
  </Field>}
  {error&&<p className="form-error" role="alert">{error}</p>}
  <button className="button button-outline" type="submit" disabled={busy}>Guardar entrega y destino</button>
  <p className="small-note">Se registra el cambio. Si ya imprimiste una etiqueta, vuelve a imprimirla tras corregir los datos.</p>
 </form>;
}
function OrderEditPanel({order,data,busy,onSave,onCancel}){
 const {ask}=useConfirmation();
 const requestId=useRef(null);
 const [search,setSearch]=useState('');
 const [error,setError]=useState('');
 const [portions,setPortions]=useState(()=>Object.fromEntries(order.lines.map(l=>[
  l.model_id,{dozens:String(l.dozen_count??0),extraColorIds:[...(l.extraColorIds??[])]}
 ])));
 const models=data.models.filter(m=>m.is_active);
 const original=new Map(order.lines.map(l=>[l.model_id,l]));
 const effectiveStock=Object.fromEntries(models.map(m=>{
  const s=data.stock[m.id]||{};
  return [m.id,{...s,available:Number(s.available??0)+Number(original.get(m.id)?.quantity??0)}];
 }));
 const selected=models.filter(m=>Object.hasOwn(portions,m.id));
 const available=models.filter(m=>!Object.hasOwn(portions,m.id)&&
  (m.name+' '+m.size_label).toLocaleLowerCase().includes(search.toLocaleLowerCase()));
 const preview=selected.reduce((sum,m)=>{
  const s=portions[m.id];
  if(!/^(0|[1-9]\d*)$/.test(String(s.dozens)))return sum;
  const quantity=portionQuantity(Number(s.dozens),s.extraColorIds);
  if(!Number.isSafeInteger(quantity)||quantity<6)return sum;
  return sum+subtotalCents(original.get(m.id)?.price_dozen_bs??m.price_dozen_bs,quantity);
 },0n);
 function change(id,value){requestId.current=null;setError('');setPortions(p=>({...p,[id]:value}));}
 function remove(id){requestId.current=null;setError('');setPortions(p=>{const next={...p};delete next[id];return next;});}
 async function save(e){
  e.preventDefault();setError('');
  try{
   const lines=checkedPortions(models,portions,effectiveStock,data.colors);
   if(!await ask({severity:'warning',title:'Guardar cambios del pedido',message:'Se actualizarán el inventario y el importe del pedido.',facts:[{label:'Total actual',value:formatBs(order.lines.reduce((sum,l)=>sum+centsFromBs(l.subtotal_bs),0n))},{label:'Nuevo total',value:formatBs(preview)}],notice:'Comunica los cambios al comprador.',confirmLabel:'Guardar cambios'}))return;
   if(!requestId.current)requestId.current=uuid();
   await onSave({orderId:order.id,lines,expectedRevision:order.revision,requestId:requestId.current});
  }catch(err){setError(err.message);}
 }
 return <form className="ev-order-edit-panel" onSubmit={save} aria-label="Modificar modelos y cantidades del pedido">
  <div className="ev-order-edit-heading"><h3>Editar modelos y cantidades</h3>
   <p>Los modelos existentes conservan su precio confirmado; los nuevos usan su precio vigente.
    Las docenas siguen siendo surtidas y las unidades adicionales exigen colores distintos.</p></div>
  <label className="search ev-order-edit-search"><span aria-hidden="true">⌕</span>
   <input type="search" placeholder="Buscar modelo para agregar" aria-label="Buscar modelos para editar pedido"
    value={search} onChange={e=>setSearch(e.target.value)}/></label>
  {available.length>0&&<div className="ev-order-edit-add-list" aria-label="Agregar modelos">
   {available.map(m=>{
    const count=data.colors.filter(c=>m.colorIds?.includes(c.id)&&c.is_active).length;
    const allowed=canAddModelToOrder(data.stock[m.id],count);
    return <button type="button" key={m.id} className="ev-order-edit-add"
     disabled={busy||!allowed} onClick={()=>{
      try{change(m.id,initialModelPortion(data.stock[m.id],count));}
      catch(e){setError(e.message);}
     }}>
     <ProductImage model={m}/><span><strong>{m.name}</strong><small>Talla {m.size_label} · {formatAvailableDozens(data.stock[m.id]?.available??0)} libres</small></span>
     <b aria-hidden="true">＋</b>
    </button>;
   })}
  </div>}
  <div className="ev-order-edit-selected">
   {selected.map(m=><PortionEditor key={m.id} model={m} colors={data.colors}
    stock={effectiveStock[m.id]} selection={portions[m.id]}
    onChange={v=>change(m.id,v)} onRemove={()=>remove(m.id)}/>)}
   {!selected.length&&<p className="form-hint">El pedido debe conservar al menos un modelo.</p>}
  </div>
  <div className="ev-order-edit-footer">
   <span>Total propuesto <strong>{formatBs(preview)}</strong></span>
   <div><button type="button" className="button button-outline" onClick={onCancel}>Cancelar</button>
    <button type="submit" className="button button-primary" disabled={busy||!selected.length}>
     {busy?'Guardando…':'Guardar cambios'}</button></div>
  </div>
  {error&&<p className="form-error" role="alert">{error}</p>}
  <p className="small-note">Solo pedidos activos sin pagos, entregas ni enlace privado activo. No modifica cobros ya realizados ni envía mensajes automáticamente.</p>
 </form>;
}
function Orders({data:workspace,onReport,onDeliver,onComplete,onQuick,onIssueLink,onRevokeLink,onConvertLegacy,onUpdateFulfillment,onPrint,onEdit,onArchiveOrder,onPreparation,busy}){
 const {ask}=useConfirmation();
 const [editingId,setEditingId]=useState(null);
 const [showArchived,setShowArchived]=useState(false);
 const list=useServerOrderList(workspace,showArchived);
 const {view}=list;
 const data=list.details?{...workspace,...list.details}:workspace;
 const pageBusy=busy||list.loading||Boolean(list.error);
 const changeArchive=archived=>{setShowArchived(archived);list.setPage(1);setEditingId(null);};
 return <><header className="ev-orders-heading"><p className="eyebrow">{showArchived?'HISTORIAL COMERCIAL':'PEDIDOS CONFIRMADOS'}</p><h1>{showArchived?'Pedidos archivados':'Pedidos'}</h1></header>
  {!showArchived&&<LegacyCommitments data={workspace} onConvert={onConvertLegacy} busy={busy}/>}
  <RecordListControls list={list} dateLabel={showArchived?"Fecha de archivo":"Fecha de confirmación del pedido"} busy={busy} onChange={()=>setEditingId(null)}/>
  {list.loading&&<p className="small-note" role="status">{list.refreshing?'Actualizando pedidos; las acciones quedan temporalmente desactivadas.':'Cargando página de pedidos…'}</p>}
  {list.error&&<div role="alert" className="surface pad"><p>No se pudieron actualizar los pedidos. {view?'Los datos visibles no están verificados. ':''}{list.error}</p><button type="button" className="button button-outline" disabled={busy} onClick={list.retry}>Reintentar</button></div>}
  {!list.range.valid||!view?null:view.total?<div className="record-list ev-order-accordion-list" aria-label="Lista de pedidos">
   {view.items.map(o=>{
    const customer=data.customers.find(x=>x.id===o.customer_id);
    const total=o.lines.reduce((sum,l)=>sum+centsFromBs(l.subtotal_bs),0n);
    const finance=data.finances[o.id]||{total:0,approved:0,pending:0,excess:0};
    const delivery=data.deliveryStats[o.id]||{ordered:0,delivered:0,remaining:0};
    const orderedUnits=o.lines.reduce((sum,l)=>sum+Number(l.quantity||0),0);
    const relatedPayments=data.payments.filter(p=>p.order_id===o.id||
      (o.origin_reservation_id&&p.reservation_id===o.origin_reservation_id));
    const editReason=o.status!=='active'?'El pedido está completado':
     o.origin_reservation_id?'Pedido originado en un registro histórico':
     relatedPayments.length?'Tiene movimientos o avisos de pago':
     data.deliveries.some(d=>d.order_id===o.id)||Number(delivery.delivered)>0?'Ya registra una entrega':
     data.links.some(l=>l.order_id===o.id&&!l.revoked_at)?'Tiene un enlace privado activo':
     o.lines.some(l=>l.dozen_count===null||l.dozen_count===undefined||
       !data.models.some(m=>m.id===l.model_id&&m.is_active))?'Composición antigua o modelo inactivo':
     o.lines.some(l=>data.stock[l.model_id]?.blocked)?'Modelo con inventario en revisión':
     !Number.isSafeInteger(o.revision)?'Falta habilitar la edición en Supabase':null;
    const canArchive=!o.archived_at&&((o.status==='completed'&&!relatedPayments.some(p=>p.status==='pending'||p.status==='observed'))||(o.status==='active'&&!relatedPayments.length&&!data.deliveries.some(d=>d.order_id===o.id)&&Number(delivery.delivered)===0));
    const sizes=[...new Set(o.lines.map(l=>l.size_label_snapshot??data.models.find(m=>m.id===l.model_id)?.size_label).filter(Boolean))];
    return <details className="record order-record ev-order-accordion" key={o.id} name="evalia-orders" data-order-status={o.status}>
     <summary className="ev-order-summary">
      <span className="ev-order-summary-primary">
       <span className="avatar ev-order-avatar" aria-hidden="true">{initials(customer?.name)}</span>
       <span className="ev-order-identification">
        <strong>{customer?.name||'Cliente'}</strong>
        <small>{displayDate(o.confirmed_at)}</small>
       </span>
      </span>
      <span className="ev-order-summary-facts">
       <span className="ev-order-summary-count">{o.lines.length} {o.lines.length===1?'modelo':'modelos'} · {rup(orderedUnits)} prendas</span>
       {sizes.length>0&&<span className="ev-order-sizes">{sizes.length===1?'Talla ':'Tallas '}{sizes.join(' · ')}</span>}
       <span className="ev-order-summary-delivery">{deliveryLabel(o.fulfillment_method)}</span>
      </span>
      <span className="ev-order-summary-end">
       <strong className="ev-order-summary-total">{formatBs(total)}</strong>
       {o.status==='active'&&!o.archived_at?<button type="button" className="ev-preparation-toggle" data-prepared={Boolean(o.prepared_at)} disabled={pageBusy} aria-label={(o.prepared_at?'Volver a en preparación: ':'Marcar preparado: ')+(customer?.name||'Cliente')} onClick={e=>{e.preventDefault();e.stopPropagation();onPreparation(o);}}><strong>{o.prepared_at?'✓ Preparado':'En preparación'}</strong><small>{o.prepared_at?'Deshacer':'Marcar preparado'}</small></button>:<Status value={o.status}/>}
       {o.archived_at&&<span className="ev-order-archive-label">Archivado</span>}
      </span>
      <span className="ev-order-expand" aria-hidden="true">⌄</span>
     </summary>
     <div className="ev-order-expanded">
      {o.archived_at?<p className="small-note">Archivado · {displayDate(o.archived_at)} · {o.archive_reason}{o.status==='voided'?' · Sin cobros ni entregas pendientes.':''}</p>:
       <div className="ev-order-archive-action">
        <button type="button" className="button ev-archive-button" disabled={pageBusy||!canArchive} onClick={async()=>{
         const explanation=o.status==='active'?'Anular este pedido libera las prendas comprometidas y desactiva su enlace.':'Archivar este pedido solo lo oculta. Conserva los cobros y las entregas registrados.';
         const decision=await ask({severity:o.status==='active'?'critical':'warning',title:o.status==='active'?'Anular pedido':'Archivar pedido',message:explanation,facts:[{label:'Cliente',value:customer?.name||'Cliente'},{label:'Total',value:formatBs(total)}],reasonRequired:true,confirmLabel:o.status==='active'?'Anular pedido':'Archivar pedido'});
         if(decision?.confirmed&&decision.reason)await onArchiveOrder(o.id,decision.reason);
        }}>{o.status==='active'?'Anular y ocultar pedido':'Archivar pedido'}</button>
        {!canArchive&&<span className="small-note">Resuelve primero los movimientos pendientes. No se anulan pedidos activos con pagos, avisos o entregas.</span>}
       </div>}
      {o.status==='active'&&<div className="ev-order-edit-access">
       <button type="button" className="button button-outline ev-order-edit-button" disabled={pageBusy||Boolean(editReason)}
        onClick={()=>setEditingId(current=>current===o.id?null:o.id)}>
        {editingId===o.id?'Cerrar edición':'✎ Editar pedido'}
       </button>
       {editReason&&<span className="ev-edit-restriction">{editReason}</span>}
      </div>}
      {editingId===o.id&&!editReason&&<OrderEditPanel key={o.id+'-'+o.revision}
       order={o} data={data} busy={pageBusy} onCancel={()=>setEditingId(null)}
       onSave={async params=>{const ok=await onEdit(params);if(ok)setEditingId(null);return ok;}}/>}
      {o.status==='active'&&<div className="ev-order-finance-brief" aria-label="Situación del cobro">
       {amountCents(finance.pending)>0n?
        <span className="ev-order-balance-due"><span>Saldo por cobrar</span><strong>{formatBs(amountCents(finance.pending))}</strong></span>:
        <span className="ev-order-balance-ready">{Number(delivery.remaining)>0?'Pago verificado · entrega pendiente':'Pago y entrega registrados'}</span>}
       {amountCents(finance.pending)>0n&&amountCents(finance.approved)>0n&&
        <small>Abonos aprobados: {formatBs(amountCents(finance.approved))}</small>}
      </div>}
      <section className="ev-order-model-section" aria-label="Modelos incluidos en el pedido">
       <h3>Modelos</h3>
       <div className="order-lines">
        {o.lines.map(l=>{const m=data.models.find(x=>x.id===l.model_id);
         return <div className="order-product" key={l.id||l.model_id}>
          {m?.is_active&&<ProductImage model={m}/>}
          <div className="order-product-data">
           <strong>{l.model_name_snapshot??m?.name??'Modelo'}</strong>
           <small>Talla {l.size_label_snapshot??m?.size_label??'—'}</small>
           <LineComposition line={l} colors={data.colors} compact/>
          </div>
          <div className="order-line-price">
           {Number(l.quantity)!==12&&<small>{formatBs(centsFromBs(l.price_dozen_bs))} / doc.</small>}
           <strong>{formatBs(centsFromBs(l.subtotal_bs))}</strong>
          </div>
         </div>;
        })}
       </div>
      </section>
      <details className="ev-order-print-details" aria-label="Impresión y destino del pedido">
       <summary>Impresión y destino <span aria-hidden="true">⌄</span></summary>
       <section className="order-shipping-panel ev-order-shipping" aria-label="Entrega e impresión">
        {o.fulfillment_method==='shipping'&&<p>Destino: {o.shipping_destination}</p>}
        {o.fulfillment_method==='legacy'&&<p>Pedido anterior a la clasificación de entregas. Indica cómo se entregará para habilitar la impresión.</p>}
        {o.status!=='voided'&&o.fulfillment_method!=='legacy'&&<button type="button" className="button button-primary"
         disabled={pageBusy} onClick={()=>onPrint(o,customer)}>🖨 {o.fulfillment_method==='shipping'?'Vista previa de etiqueta de envío':'Vista previa del comprobante'}</button>}
        {o.status==='active'&&<details className="order-delivery-details">
         <summary>{o.fulfillment_method==='legacy'?'Clasificar entrega para imprimir':'Corregir destino o modalidad'}</summary>
         <OrderDeliveryEditor order={o} customer={customer} onSave={onUpdateFulfillment} busy={pageBusy}/>
        </details>}
       </section>
      </details>
      {Number(finance.excess)>0&&<Notice type="error">Existe exceso de pago para conciliación: {formatBs(amountCents(finance.excess))}. No se puede cerrar automáticamente.</Notice>}
      <details className="ev-order-management" aria-label="Gestión y acciones del pedido">
       <summary><span>{o.status==='active'?'Cobro y cierre':'Historial y seguimiento'}</span></summary>
       <div className="order-operations ev-order-operations">
        {o.status==='active'&&<OrderQuickActions order={o} finance={finance} delivery={delivery}
         payments={relatedPayments} onQuick={onQuick} busy={pageBusy}/>}
        <details className="order-advanced" aria-label="Abonos y comprobantes">
         <summary>Abonos y comprobantes <span>Ver historial</span></summary>
         <div className="order-advanced-body">
          <h3>Historial de pagos</h3>
          <PaymentHistory items={relatedPayments}/>
          {o.status==='active'&&Number(finance.pending)>0&&
           <PaymentForm targetId={o.id} onSubmit={onReport} busy={pageBusy} balance={finance.pending}/>}
         </div>
        </details>
        {o.status==='active'&&<button className="button button-primary" type="button"
         disabled={pageBusy||Number(finance.pending)!==0||Number(finance.excess)!==0||Number(delivery.remaining)!==0}
         onClick={()=>onComplete(o.id)}>✓ Marcar COMPLETADO</button>}
        {o.status==='completed'&&<p className="small-note">Pedido completado: pago acreditado y retirada total registrados. El enlace privado queda inactivo.</p>}
        <details className="ev-order-link-details">
         <summary>WhatsApp y enlace privado <span aria-hidden="true">⌄</span></summary>
         {!o.archived_at&&<OrderLinkPanel order={o} data={data} onIssue={onIssueLink} onRevoke={onRevokeLink} busy={pageBusy}/>}
        </details>
       </div>
      </details>
     </div>
    </details>;
   })}
  </div>:<Empty title={list.preset!=='all'?"Sin pedidos en este rango":showArchived?"Sin pedidos archivados":"Aún no hay pedidos"} detail={list.preset!=='all'?"Cambia las fechas o quita el filtro.":showArchived?"Los registros archivados se conservan aquí.":"Registra la primera compra confirmada desde Nuevo pedido."}/>}
  {view&&<ListPager view={view} onPage={p=>{list.setPage(p);setEditingId(null);}} label="Páginas de pedidos" busy={busy||list.loading}/> }
  <nav className="ev-order-archive-toolbar" aria-label="Vista de pedidos">
   <button type="button" className="button button-outline" aria-pressed={!showArchived} disabled={busy} onClick={()=>changeArchive(false)}>Pedidos vigentes e historial</button>
   <button type="button" className="button button-outline" aria-pressed={showArchived} disabled={busy} onClick={()=>changeArchive(true)}>Archivados ({workspace.orders.filter(o=>o.archived_at).length})</button>
  </nav>
 </>;
}
function Login({onLogin,onRetryLogout,logoutPending,busy,error}){
 const [showPassword,setShowPassword]=useState(false);
 return <main className="login-screen"><section className="login-card">
  <div className="brand brand-large"><BrandMark/><div><b>EVALIA</b><small>GESTIÓN COMERCIAL</small></div></div>
  <p className="eyebrow">ACCESO ADMINISTRATIVO</p><h1>Tu catálogo, tus pedidos, tu control.</h1>
  <p className="description">Inicia sesión para trabajar con información real de tu base de datos Supabase.</p>
  {process.env.NEXT_PUBLIC_EVALIA_STATIC_PREVIEW==='1'&&<Notice>Vista administrativa en GitHub Pages. El portal privado del cliente requiere alojamiento Next.js con servidor.</Notice>}
  <form id="evalia-login" name="evalia-login" method="post" autoComplete="on" onSubmit={e=>{
    e.preventDefault();
    if(busy)return;
    const values=new FormData(e.currentTarget);
    onLogin(String(values.get('email')||'').trim(),String(values.get('password')||''));
   }}>
   <Field title="Correo del administrador"><input id="evalia-login-email" type="email" name="email" required autoComplete="username"
    autoCapitalize="none" spellCheck={false} placeholder="Correo de acceso…"/></Field>
   <Field title="Contraseña"><input id="evalia-login-password" type={showPassword?'text':'password'} name="password" required autoComplete="current-password"
    autoCapitalize="none" spellCheck={false} placeholder="Contraseña…"/></Field>
   <button className="button button-ghost" type="button" aria-controls="evalia-login-password" aria-pressed={showPassword}
    onClick={()=>setShowPassword(v=>!v)}>{showPassword?'Ocultar contraseña':'Mostrar contraseña'}</button>
   {error&&<p role="alert" className="form-error">{error}</p>}
   <button className="button button-primary full" disabled={busy||logoutPending} type="submit">{busy?'Verificando…':'Entrar al panel'}</button>
   {logoutPending&&<button className="button button-outline full" type="button" disabled={busy} onClick={onRetryLogout}>Reintentar cierre de sesión</button>}
  </form>
  <p className="small-note"><a href="/cuenta">¿Olvidaste tu contraseña?</a></p>
  <p className="small-note">En tu dispositivo personal puedes guardar la contraseña con el gestor del navegador. Cierra sesión al usar un dispositivo compartido. No existe registro público de cuentas.</p>
 </section></main>;
}
export default function HomePage(){return <ConfirmationProvider><EvaliaWorkspace/></ConfirmationProvider>;}
function EvaliaWorkspace(){
 const {cancel:cancelConfirmation}=useConfirmation();
 const [tab,setTab]=useState('home'),[data,setData]=useState(null),[ready,setReady]=useState(false);
 const [authenticated,setAuthenticated]=useState(false),[forbidden,setForbidden]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [logoutPending,setLogoutPending]=useState(false);
 const [owner,setOwner]=useState(false);
 const [mfaGate,setMfaGate]=useState(null),pendingIdentity=useRef(null);
 const [canEnrollMfa,setCanEnrollMfa]=useState(false);
 const menu=owner?[...MENU,['security','Usuarios','⚙']]:MENU;
 const refreshGeneration=useRef(0),authGeneration=useRef(0),authorizedUser=useRef(null);
 const db=useMemo(()=>getSupabase(),[]);
 const configured=Boolean(db);
 const clearAccess=useCallback(()=>{
  cancelConfirmation();
  authGeneration.current++;
  refreshGeneration.current++;
  authorizedUser.current=null;pendingIdentity.current=null;setMfaGate(null);setCanEnrollMfa(false);
  setOwner(false);
  setAuthenticated(false);setData(null);setForbidden(false);setMessage('');setTab('home');
 },[cancelConfirmation]);
 const refresh=useCallback(async()=>{
  cancelConfirmation();
  const generation=++refreshGeneration.current;
  const expected=authorizedUser.current;
  if(!expected)return;
  try{
   const user=await authUser();
   const permitted=user?.id===expected&&await adminAllowed();
   if(generation!==refreshGeneration.current)return;
   if(!permitted){
    clearAccess();setError('Tu acceso ya no está autorizado. Inicia sesión nuevamente.');return;
   }
   const role=await db.rpc('is_evalia_owner');
   if(generation!==refreshGeneration.current)return;
   setOwner(!role.error&&role.data===true);
   const snapshot=await loadWorkspace();
   if(generation===refreshGeneration.current){cancelConfirmation();setData(snapshot);}
  }catch(e){
   if(generation!==refreshGeneration.current)return;
   cancelConfirmation();setData(null);
   throw e;
  }
 },[clearAccess,db,cancelConfirmation]);
 const authorize=useCallback(async(user,generation)=>{
  if(!user||generation!==authGeneration.current)return 'cancelled';
  pendingIdentity.current=user.id;
  const state=await inspectAdminMfa(db,user.id);
  if(generation!==authGeneration.current)return 'cancelled';
  if(state.step==='enroll'||state.step==='challenge'){
   setMfaGate({identity:user.id,...state});return 'mfa';
  }
  if(state.step!=='check-server'||!await adminAllowed()){
   if(generation!==authGeneration.current)return 'cancelled';
   pendingIdentity.current=null;setMfaGate(null);return 'denied';
  }
  if(generation!==authGeneration.current)return 'cancelled';
  pendingIdentity.current=null;setMfaGate(null);setCanEnrollMfa(state.factors.length===0);authorizedUser.current=user.id;setAuthenticated(true);setForbidden(false);
  try{await refresh();}catch{setError('Acceso autorizado, pero no se pudieron cargar los datos. Pulsa Actualizar.');}
  return 'authorized';
 },[db,refresh]);
 useEffect(()=>{
  let active=true;
  if(!db){setReady(true);return;}
  const generation=authGeneration.current;
  authUser().then(async user=>{
    if(!active||generation!==authGeneration.current||!user)return;
    const outcome=await authorize(user,generation);
    if(active&&generation===authGeneration.current)setForbidden(outcome==='denied');
  }).catch(()=>{if(active&&generation===authGeneration.current)setError('No se pudo verificar el acceso. Inténtalo nuevamente.');})
   .finally(()=>{if(active)setReady(true);});
  const {data:listener}=db.auth.onAuthStateChange((event,session)=>{
    if(!active)return;
    if(event==='SIGNED_OUT'){clearAccess();return;}
    const expected=authorizedUser.current||pendingIdentity.current;
    if((event==='SIGNED_IN'||event==='TOKEN_REFRESHED')&&expected&&session?.user?.id!==expected){
     clearAccess();setError('La cuenta cambió en otra pestaña. Inicia sesión nuevamente.');
    }
  });
  return ()=>{active=false;refreshGeneration.current++;authGeneration.current++;listener.subscription.unsubscribe();};
 },[db,authorize,clearAccess]);
 useEffect(()=>{
  if(!authenticated)return;
  const revalidate=()=>{
   if(document.visibilityState==='visible')refresh().catch(()=>setError('No se pudo verificar el acceso o actualizar los datos. Pulsa Actualizar.'));
  };
  const timer=setInterval(revalidate,60000);
  document.addEventListener('visibilitychange',revalidate);
  return ()=>{clearInterval(timer);document.removeEventListener('visibilitychange',revalidate);};
 },[authenticated,refresh]);
 async function login(email,password){
  if(busy||logoutPending)return;
  setBusy(true);setError('');setForbidden(false);
  const generation=++authGeneration.current;
  try{
   const session=await signIn(email,password);
   if(generation!==authGeneration.current)return;
   const outcome=session?.user?await authorize(session.user,generation):'denied';
   if(outcome==='denied'){
    if(generation!==authGeneration.current)return;
    clearAccess();
    try{await signOut();setLogoutPending(false);setError('No se pudo iniciar sesión. Verifica tus credenciales y autorización.');}
    catch{setLogoutPending(true);setError('No se pudo cerrar la sesión no autorizada. Reintenta el cierre.');}
    return;
   }
  }catch{
   if(generation===authGeneration.current)setError('No se pudo iniciar sesión. Verifica tus credenciales y conexión.');
  }finally{setBusy(false);}
 }
 function startOptionalMfa(){
  if(busy||!canEnrollMfa||!authorizedUser.current)return;
  const identity=authorizedUser.current;
  clearAccess();pendingIdentity.current=identity;setMfaGate({identity,step:'enroll',factors:[]});
 }
 async function finishMfa(identity){
  if(pendingIdentity.current!==identity)return;
  const generation=authGeneration.current,user=await authUser();
  if(user?.id!==identity||generation!==authGeneration.current)throw Error('La sesión cambió.');
  const outcome=await authorize(user,generation);
  if(outcome!=='authorized'&&outcome!=='cancelled')throw Error('No se pudo autorizar el acceso. Cierra sesión e inténtalo nuevamente.');
 }
 async function logout(){
  if(busy)return;
  clearAccess();setError('');setBusy(true);
  try{await signOut();setLogoutPending(false);}
  catch{setLogoutPending(true);setError('No se pudo cerrar la sesión en el servidor. Reintenta antes de dejar el dispositivo.');}
  finally{setBusy(false);}
 }
 async function mutation(fn,success){
  if(busy||!authorizedUser.current)return false;
  const actor=authorizedUser.current;
  setBusy(true);setError('');setMessage('');
  try{
   const result=await writeThenRefresh(fn,refresh);
   if(!result.confirmed){
    if(authorizedUser.current===actor)setError(result.error?.message||'No se pudo confirmar la operación. Verifica el registro antes de reintentar.');
    return false;
   }
   if(authorizedUser.current===actor){
    setMessage(success);
    if(!result.refreshed)setError(CONFIRMED_REFRESH_WARNING);
   }
   return true;
  }finally{setBusy(false);}
 }
 async function refreshManually(){
  if(busy||!authorizedUser.current)return;
  const actor=authorizedUser.current;
  setBusy(true);setError('');setMessage('');
  try{await refresh();if(authorizedUser.current===actor)setMessage('Datos actualizados.');}
  catch(e){if(authorizedUser.current===actor)setError(e.message||'No se pudieron actualizar los datos.');}
  finally{setBusy(false);}
 }
 async function addModel(values){
  return mutation(async()=>{
   const req=values.requestId||uuid(),path=values.photo?await uploadPhoto(values.photo,req):null;
   await createModel({...values,imagePath:path,requestId:req});
  },'El modelo y su stock se registraron en Supabase.');
 }
 async function saveModelEdit(params){
  const actor=authorizedUser.current;let cleanupPending=false;
  const ok=await mutation(async()=>{
   const imagePath=params.photo?await uploadPhoto(params.photo,params.requestId):null;
   // Only clean the previous path after a confirmed write, and only when no active product references it.
   await editProduct({modelId:params.model.id,name:params.name,size:params.size,price:params.price,colorIds:params.colorIds,imagePath,expectedUpdatedAt:params.model.updated_at,requestId:params.requestId});
   if(imagePath&&params.model.image_path&&imagePath!==params.model.image_path){
    try{await cleanupReplacedPhoto(params.model.image_path);}catch{cleanupPending=true;}
   }
  },'Ficha actualizada; los pedidos históricos conservan sus datos.');
  if(ok&&cleanupPending&&authorizedUser.current===actor)setMessage('Ficha actualizada; la fotografía anterior quedó pendiente de limpieza.');
  return ok;
 }
 async function archiveProduct(model){
  const actor=authorizedUser.current;
  let cleanupPending=false;
  const ok=await mutation(async()=>{
   const result=await archiveModel(model);
   if(result?.photo_path){try{await cleanupArchivedPhotos([result.photo_path]);}catch{cleanupPending=true;}}
  },'Producto inhabilitado; el historial permanece intacto.');
  if(ok&&cleanupPending&&authorizedUser.current===actor)setMessage('Producto inhabilitado; fotografía pendiente de limpieza. Actualiza y utiliza la opción de limpieza.');
  return ok;
 }
 const changePreparation=o=>mutation(()=>setOrderPrepared({orderId:o.id,prepared:!o.prepared_at,expectedVersion:o.preparation_version}),o.prepared_at?'Pedido nuevamente en preparación.':'Pedido marcado como preparado.');
 const archiveSelectedOrder=(orderId,reason)=>mutation(()=>archiveOrder(orderId,reason),'Pedido archivado; historial conservado.');
 const cleanArchivedPhotos=(paths)=>mutation(()=>cleanupArchivedPhotos(paths),'Fotografías archivadas eliminadas.');
 const saveCustomerEdit=(params)=>mutation(()=>updateCustomer({
  customerId:params.customer.id,name:params.name,whatsapp:params.whatsapp,
  method:params.method,destination:params.destination,
  expectedUpdatedAt:params.customer.updated_at,requestId:params.requestId
 }),'Ficha y destino corregidos con auditoría.');
 const addColor=(params)=>mutation(()=>saveColor(params),'Color guardado.');
 const reactivate=(params)=>mutation(()=>reactivateProduct({modelId:params.model.id,units:params.units,expectedUpdatedAt:params.model.updated_at,requestId:params.requestId}),'Producto reactivado con stock confirmado.');
 async function addClient(payload){
  let duplicate=null;
  const ok=await mutation(async()=>{
   const result=await createCustomer(payload);
   if(result.state==='duplicate'){duplicate=result;throw Error('Se encontró otra ficha con ese WhatsApp. Confirma antes de continuar.');}
  },'Cliente registrado con categoría de entrega.');
  return duplicate||ok;
 }
 const updateStock=(modelId,operation,units,version,requestId)=>
  mutation(()=>adjustStock({modelId,operation,units,version,requestId:requestId||uuid()}),'Stock actualizado.');
 const order=(customerId,lines,requestId,delivery)=>mutation(()=>createOrder(customerId,lines,requestId||uuid(),delivery),'Pedido confirmado con destino y precios congelados.');
 const editOrder=(args)=>mutation(()=>reviseOrder(args),'Pedido actualizado con auditoría; verifica el detalle y comunica el cambio al cliente.');
 const convert=(id)=>mutation(()=>confirmReservation(id,uuid()),'Registro anterior convertido en pedido, sin descontar inventario dos veces.');
 const report=(v)=>mutation(()=>reportPayment(v),'Aviso de pago guardado; pendiente de aprobación.');
 const checkoutFast=(details)=>mutation(()=>quickCheckout(details),
  details.action==='pay'
   ?'Pago total registrado y aprobado. El pedido queda pendiente de recogida.'
   :details.action==='deliver'
    ?'Entrega física total registrada. El pedido está COMPLETADO.'
    :'Pago y entrega total registrados. El pedido está COMPLETADO.');

 const approve=(id,action,note)=>mutation(()=>reviewPayment({reportId:id,action,requestId:uuid(),note}),
  action==='approve'?'Pago aprobado después de verificar su recepción.':'Revisión registrada sin mover dinero.');
 const deliver=(orderId,lines,requestId)=>mutation(()=>recordDelivery({orderId,lines,requestId}),
  'Retirada física registrada; inventario actualizado.');
 const complete=(orderId)=>mutation(()=>completeOrder({orderId,requestId:uuid()}),
  'Pedido COMPLETADO con pago y entrega íntegros.');
 const saveQr=(file,verified,requestId,password,code)=>mutation(()=>withOwnerReauthentication(db,password,code,scoped=>saveRealQr(file,verified,requestId,scoped)),
  'QR real registrado y disponible para pedidos activos.');
 async function issueLink(orderId){
  if(busy||!authorizedUser.current)return null;
  const actor=authorizedUser.current;
  setBusy(true);setError('');setMessage('');
  try{
   const result=await writeThenRefresh(()=>issueOrderLink(orderId),refresh);
   if(authorizedUser.current!==actor)return null;
   if(!result.confirmed){
    setError(result.error?.message||'No se pudo confirmar la creación del enlace. Verifica el estado antes de reintentar.');
    return null;
   }
   if(!result.refreshed){
    setError('El enlace fue creado, pero no se pudo actualizar el pedido. Actualiza antes de compartir o reemplazar el enlace.');
    return null;
   }
   setMessage('Enlace privado creado; compártelo solo con el destinatario.');
   return result.value;
  }finally{setBusy(false);}
 }
 const revokeLink=(orderId)=>mutation(()=>revokeOrderLink(orderId),'Enlace privado revocado.');

 const updateFulfillment=(args)=>mutation(()=>updateOrderDelivery(args),'Modalidad y destino del pedido actualizados.');
 const printSelected=(order,customer)=>{
  try{return printOrder({order,customer,models:data.models,colors:data.colors},window.open.bind(window));}
  catch(e){setError(e.message);return false;}
 };



 if(!configured)return <main className="setup-screen"><section className="setup-card">
  <BrandMark/><h1>Configuración de EVALIA</h1>
  <p>La aplicación operativa no tiene conexión a Supabase. La base ya está inicializada. Configura <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> en <code>web/.env.local</code>, usando únicamente la clave pública de tu proyecto. Después inicia sesión como administrador autorizado.</p>
  <p>No se mostrarán datos ficticios como si fueran operaciones reales.</p>
 </section></main>;
 if(!ready)return <main className="loading">Verificando acceso administrativo…</main>;
 if(!authenticated&&mfaGate)return <MfaGate key={mfaGate.identity+':'+mfaGate.step} db={db} identity={mfaGate.identity} step={mfaGate.step} factors={mfaGate.factors} onVerified={finishMfa} onCancel={logout}/>;
 if(!authenticated)return forbidden?<main className="setup-screen"><section className="setup-card">
  <h1>Acceso restringido</h1><p>La cuenta no figura como administradora de EVALIA.</p>
  <button className="button button-outline" onClick={()=>{setForbidden(false);setError('');}}>Volver al acceso</button>
 </section></main>:<Login onLogin={login} onRetryLogout={logout} logoutPending={logoutPending} busy={busy} error={error}/>;
 return <div className="app-shell">
  <aside className="sidebar"><div className="brand"><BrandMark/>
   <div><b>EVALIA</b><small>GESTIÓN COMERCIAL</small></div></div>
   <p className="sidebar-label">ESPACIO DE TRABAJO</p>
   <nav className="sidebar-nav" aria-label="Navegación principal">{menu.map(([id,label,symbol])=>
    <button key={id} onClick={()=>setTab(id)} aria-current={tab===id?'page':undefined}
      className={tab===id?'active':''}><span className="nav-icon"><UiIcon name={id}/></span>{label}</button>)}</nav>
   <div className="sidebar-bottom"><span className="connected-dot"/><div><strong>Base de datos conectada</strong><small>Sesión administrativa</small></div></div>
  </aside>
  <div className="workspace">
   <header className="topbar"><div className="breadcrumb"><BrandMark className="ev-mobile-brand"/>EVALIA <span>/</span>
    <strong>{menu.find(x=>x[0]===tab)?.[1]}</strong></div>
    <div className="top-actions"><span className="live-label"><span className="connected-dot"/> Supabase</span>
     <button className="button button-ghost" onClick={refreshManually} disabled={busy}>↻ Actualizar</button>
     {canEnrollMfa&&<button className="button button-ghost" onClick={startOptionalMfa} disabled={busy}>Activar MFA</button>}
     <button className="button button-ghost" onClick={logout} disabled={busy}>Salir</button></div>
   </header>
   <main id="main" className="main-content">
    {process.env.NEXT_PUBLIC_EVALIA_STATIC_PREVIEW==='1'&&<Notice>Vista administrativa de prueba alojada en GitHub Pages y conectada a Supabase. Los enlaces privados de clientes necesitan un servidor Next.js.</Notice>}
    <ToastNotifications error={error} message={message}
      onCloseError={()=>setError('')} onCloseMessage={()=>setMessage('')}/>
    {!data?<div className="loading">{error?'No se pudieron obtener los registros. Revisa el error y pulsa Actualizar.':'Cargando productos y registros…'}</div>:
      tab==='home'?<Dashboard data={data} setTab={setTab}/>:
      tab==='catalog'?<Catalog data={data} onSaveColor={addColor} onCreateModel={addModel} onAdjust={updateStock} onUpdateModel={saveModelEdit} onArchive={archiveProduct} onCleanup={cleanArchivedPhotos} onReactivate={reactivate} busy={busy}/>: 
      tab==='booking'?<BookingPanel data={data} onOrder={order} onCreateClient={addClient} busy={busy}/>: 
      tab==='orders'?<Orders data={data} onReport={report} onDeliver={deliver} onComplete={complete} onQuick={checkoutFast} onIssueLink={issueLink} onRevokeLink={revokeLink} onConvertLegacy={convert} onUpdateFulfillment={updateFulfillment} onPrint={printSelected} onEdit={editOrder} onArchiveOrder={archiveSelectedOrder} onPreparation={changePreparation} busy={busy}/>:  
      tab==='payments'?<PaymentReview data={data} onReview={approve} onSaveQr={saveQr} busy={busy} canManageQr={owner}/>: 
      tab==='security'?(owner?<AdminAccounts/>:<Notice type="error">Acceso exclusivo del propietario.</Notice>):  
      <ClientPanel data={data} onCreate={addClient} onUpdate={saveCustomerEdit} busy={busy}/>}
   </main>
   <footer className="footer">EVALIA · Destaca en cada detalle <span>Panel administrativo · Moneda Bs · Zona horaria Bolivia</span></footer>
  </div>
  <nav className={'mobile-nav'+(owner?' mobile-nav-owner':'')} aria-label="Navegación móvil">{menu.map(([id,label,sign])=>
   <button key={id} aria-current={tab===id?'page':undefined} onClick={()=>setTab(id)} className={tab===id?'active':''}>
    <span><UiIcon name={id}/></span><small>{id==='booking'?'Nuevo':label}</small></button>)}</nav>
 </div>;
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  authUser, adminAllowed, signIn, signOut, loadWorkspace, createColor,
  createCustomer, createModel, updateModel, updateCustomer, uploadPhoto, removePhoto, adjustStock,
  createOrder, confirmReservation, reportPayment, reviewPayment, quickCheckout, recordDelivery, completeOrder,
  issueOrderLink, revokeOrderLink, getPrivateReceiptUrl, getAdminQrUrl, saveRealQr
} from '../lib/api.js';
import { getSupabase } from '../lib/supabase.js';
import { buildOrderWhatsAppMessage } from '../lib/order-whatsapp.js';
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
const statusLabels={saved:'Compromiso anterior',in_review:'Revisión histórica',expired:'Histórico vencido',converted:'Convertido a pedido',active:'En preparación',completed:'Completado',draft:'Borrador'};

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
 return model.imageUrl?<img className={'product-image '+(large?'large':'')} src={model.imageUrl}
   alt={'Fotografía del producto '+model.name} loading="lazy"/>:
  <div className={'product-image product-fallback '+(large?'large':'')}>
    <span className="fallback-mark">E</span><span>Fotografía pendiente</span>
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
function SummaryCard({label,value,sub,kind=''}){return <div className={'metric '+kind}>
 <span className="metric-label">{label}</span><strong>{value}</strong><small>{sub}</small>
 </div>;}
function ClientForm({onCreate,busy,compact=false}){
 const [name,setName]=useState(''),[phone,setPhone]=useState('');
 async function submit(e){
  e.preventDefault();
  if(!name.trim()||!phone.trim())return;
  const ok=await onCreate(name.trim(),phone.trim());
  if(ok){setName('');setPhone('');}
 }
 return <form className={'customer-form '+(compact?'mini-form':'')} onSubmit={submit}>
  <div className="form-inline">
   <Field title="Nombre del cliente"><input name="clientName" value={name} required maxLength={130}
    autoComplete="name" placeholder="Nombre completo…" onChange={e=>setName(e.target.value)}/></Field>
   <Field title="WhatsApp"><input name="clientPhone" type="tel" value={phone} required maxLength={30}
    autoComplete="tel" inputMode="tel" placeholder="Número de WhatsApp…" onChange={e=>setPhone(e.target.value)}/></Field>
  </div>
  <div className="form-actions"><button className="button button-primary" disabled={busy} type="submit">
   {busy?'Guardando…':'Guardar cliente'}
  </button></div>
 </form>;
}
function Dashboard({data,setTab}){
 const totals=inventoryTotals(data.stock);
 const activeOrders=data.orders.filter(o=>o.status==='active');
 const activeLegacy=data.reservations.filter(r=>r.status==='saved'||r.status==='in_review');
 const pendingPayments=data.payments.filter(p=>p.status==='pending'||p.status==='observed');
 const blocked=data.models.filter(m=>data.stock[m.id]?.blocked);
 return <>
  <SectionHead eyebrow="GESTIÓN COMERCIAL" title="Tu negocio, bajo control."
   description="Registra únicamente compras confirmadas, gestiona cobros y controla el inventario disponible."
   actions={<button className="button button-primary" onClick={()=>setTab('booking')}>＋ Nuevo pedido</button>}/>
  <div className="metrics-grid">
   <SummaryCard label="Unidades disponibles" value={rup(totals.available)} sub="Libres para pedidos o venta física" kind="primary"/>
   <SummaryCard label="Prendas en pedidos" value={rup(totals.pending)} sub="Confirmadas y aún no retiradas"/>
   <SummaryCard label="Pedidos activos" value={activeOrders.length} sub="Por cobrar o entregar"/>
   <SummaryCard label="Pagos por verificar" value={pendingPayments.length} sub="Pendientes y en observación"/>
  </div>
  {activeLegacy.length>0&&<div className="legacy-alert" role="status">
    <strong>Compromisos anteriores pendientes: {activeLegacy.length}</strong>
    <span>{rup(totals.reserved)} prendas siguen apartadas por registros antiguos. No se crean más apartados. Puedes consultar esos casos en Pedidos; sus vencimientos anteriores siguen vigentes.</span>
    <button className="button button-outline" onClick={()=>setTab('orders')}>Ver compromisos anteriores</button>
   </div>}
  {blocked.length>0&&<Notice type="error">{blocked.length} modelo(s) tienen incidencias y no permiten nuevos compromisos.</Notice>}
  <div className="two-columns">
   <section className="surface">
    <div className="surface-heading"><div><h2>Inventario por producto</h2><p>Existencia física menos pedidos y compromisos antiguos pendientes.</p></div>
      <button className="link-button" onClick={()=>setTab('catalog')}>Administrar productos →</button></div>
    <StockTable data={data} limit={6}/>
   </section>
   <section className="surface">
    <div className="surface-heading"><div><h2>Pedidos recientes</h2><p>Compras confirmadas de la base de datos.</p></div></div>
    {data.orders.length?<div className="activity-list">
     {data.orders.slice(0,6).map(o=><div className="activity-row" key={o.id}>
       <span className="activity-symbol">▤</span><div>
        <strong>Pedido · {data.customers.find(c=>c.id===o.customer_id)?.name||'Cliente'}</strong>
        <small>{displayDate(o.confirmed_at)}</small></div><Status value={o.status}/>
      </div>)}
    </div>:<Empty title="Sin pedidos registrados" detail="Registra la primera compra confirmada desde Nuevo pedido."/>}
   </section>
  </div>
 </>;
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
 const [operation,setOperation]=useState('add'),[amount,setAmount]=useState('12');
 const requestId=useRef(null);
 const units=Number(amount),valid=Number.isSafeInteger(units)&&units>=(operation==='set_total'?0:1);
 const expected=operation==='set_total'?units:operation==='add'?Number(stock.on_hand)+units:Number(stock.on_hand)-units;
 const committed=Number(stock.reserved)+Number(stock.pending_delivery);
 async function submit(e){e.preventDefault();if(!valid)return;
  if(!requestId.current)requestId.current=uuid();
  const ok=await onSave(model.id,operation,units,stock.version,requestId.current);
  if(ok){requestId.current=null;setAmount('12');}
 }
 return <form className="stock-editor" onSubmit={submit}>
  <p className="editor-title">Ajuste de inventario — {model.name}</p>
  <div className="stock-ops" role="group" aria-label="Tipo de movimiento">
   {[['add','＋ Añadir'],['physical_sale','− Venta física'],['set_total','= Corregir total']].map(([v,label])=>
    <button key={v} type="button" className={'pill '+(operation===v?'active':'')}
      aria-pressed={operation===v} onClick={()=>{setOperation(v);requestId.current=null;}}>{label}</button>)}
  </div>
  <div className="stock-bottom"><Field title="Cantidad en prendas"><input type="number" name="units" required
   min={operation==='set_total'?0:1} max="2147483647" step="1" inputMode="numeric"
   value={amount} onChange={e=>{setAmount(e.target.value);requestId.current=null;}}/></Field>
   <div className="stock-projection"><small>Resultado estimado</small><b>{valid?rup(expected):'—'} prendas</b>
    <span>{committed} comprometidas; nunca se pueden consumir</span></div>
  </div>
  <button className="button button-primary" type="submit" disabled={busy||!valid||expected<committed||(stock.blocked&&operation==='physical_sale')}>
   {busy?'Guardando…':'Aplicar ajuste'}
  </button>
  {expected<committed&&<p className="form-error" role="alert">No puedes reducir el stock por debajo del compromiso con clientes.</p>}
 </form>;
}
function ModelEditor({model,onSave,busy}){
 const [price,setPrice]=useState(String(model.price_dozen_bs));
 const [photo,setPhoto]=useState(null),[error,setError]=useState('');
 const requestId=useRef(null);
 const changed=price.trim()!==String(model.price_dozen_bs)||Boolean(photo);
 async function submit(e){
  e.preventDefault();setError('');
  try{
   centsFromBs(price);
   if(!changed)return;
   if(!requestId.current)requestId.current=uuid();
   const ok=await onSave({model,price,photo,requestId:requestId.current});
   if(ok){requestId.current=null;setPhoto(null);}
  }catch(e){setError(e.message);}
 }
 return <form className="stock-editor" onSubmit={submit}>
  <p className="editor-title">Actualizar precio o foto — {model.name}</p>
  <p className="small-note">El precio nuevo solo afecta los próximos pedidos. Los pedidos existentes conservan su tarifa histórica. No modifica talla, colores ni stock.</p>
  <div className="form-inline">
   <Field title="Nuevo precio por docena (Bs)">
    <input name={'editModelPrice-'+model.id} value={price} inputMode="decimal" required
     onChange={e=>{setPrice(e.target.value);requestId.current=null;}}/></Field>
   <Field title="Reemplazar fotografía (opcional)">
    <input name={'editModelPhoto-'+model.id} type="file" accept="image/jpeg,image/png,image/webp"
     onChange={e=>{setPhoto(e.target.files?.[0]||null);requestId.current=null;}}/></Field>
  </div>
  {error&&<p className="form-error" role="alert">{error}</p>}
  <button className="button button-primary" disabled={busy||!changed} type="submit">
   {busy?'Guardando…':'Guardar corrección auditada'}</button>
 </form>;
}
function Catalog({data,onCreateColor,onCreateModel,onAdjust,onUpdateModel,busy}){
 const [view,setView]=useState('list'),[search,setSearch]=useState(''),[editStock,setEditStock]=useState(null),[editCatalog,setEditCatalog]=useState(null);
 const [newColor,setNewColor]=useState(''),[newHex,setNewHex]=useState('#9b6682');
 const filtered=data.models.filter(m=>(m.name+' '+m.size_label).toLocaleLowerCase().includes(search.toLocaleLowerCase()));
 async function submitColor(e){e.preventDefault();const ok=await onCreateColor(newColor.trim(),newHex);if(ok)setNewColor('');}
 return <>
  <SectionHead eyebrow="CATÁLOGO E INVENTARIO" title="Productos que se venden."
   description="Cada modelo conserva su talla y su propio precio. Los colores son muestras visuales, no existencias individuales."
   actions={<button className="button button-primary" onClick={()=>setView(view==='new'?'list':'new')}>
     {view==='new'?'← Volver al catálogo':'＋ Registrar producto'}</button>}/>
  {view==='new'?<div className="two-columns catalog-forms">
   <section className="surface pad"><h2>Nuevo modelo</h2><p className="muted">Alta rápida para la próxima feria.</p>
    <ModelForm colors={data.colors.filter(c=>c.is_active)} onCreate={async params=>{const ok=await onCreateModel(params);if(ok)setView('list');return ok;}} busy={busy}/>
   </section>
   <section className="surface pad"><h2>Paleta de colores</h2>
    <p className="muted">Primero registra colores reutilizables. El círculo refleja el tono que has elegido.</p>
    <form onSubmit={submitColor} className="palette-form"><Field title="Nombre del color">
     <input value={newColor} name="colorName" required maxLength={80} onChange={e=>setNewColor(e.target.value)}
      placeholder="Ej. tono de tela…"/></Field>
     <Field title="Muestra de color"><div className="color-input"><input type="color" name="colorHex"
       aria-label="Elegir color visual" value={newHex} onChange={e=>setNewHex(e.target.value)}/>
       <span>{newHex.toUpperCase()}</span></div></Field>
     <button className="button button-outline" type="submit" disabled={busy}>Guardar color</button>
    </form>
    <div className="palette-list">{data.colors.map(c=><ColorChip key={c.id} color={c}/>)}</div>
    <p className="form-hint">El tono es una referencia visual ajustada manualmente; no sustituye una fotografía de la tela.</p>
   </section>
  </div>:<>
   <div className="toolbar"><label className="search"><span aria-hidden>⌕</span>
    <input type="search" aria-label="Buscar producto" placeholder="Buscar por modelo o talla…"
      value={search} onChange={e=>setSearch(e.target.value)}/></label>
    <span className="muted">{filtered.length} modelos</span></div>
   {filtered.length?<div className="product-grid">{filtered.map(m=>{const s=data.stock[m.id]||{};return <article className="product-card" key={m.id}>
    <div className="product-cover"><ProductImage model={m} large/>
     <span className="size-tag">TALLA {m.size_label}</span></div>
    <div className="product-card-body"><div className="product-card-header">
      <div><h2>{m.name}</h2><p className="price">{formatBs(centsFromBs(m.price_dozen_bs))} <small>/ docena</small></p></div>
      <span className={'availability '+(s.blocked?'bad':Number(s.available)===0?'none':'ok')}>
       {s.blocked?'Revisión':Number(s.available)===0?'Agotado':'Disponible'}</span></div>
     <ModelColors model={m} colors={data.colors} compact/>
     <div className="stock-grid-mini">
      <div><small>Publicadas</small><b>{rup(s.on_hand)}</b></div>
      <div><small>Comprometidas</small><b>{rup(Number(s.reserved||0)+Number(s.pending_delivery||0))}</b></div>
      <div className="emphasized"><small>Disponibles</small><b>{rup(s.available)}</b></div>
     </div>
     <button className="button button-outline full" type="button" onClick={()=>setEditStock(editStock===m.id?null:m.id)}>
       {editStock===m.id?'Cerrar ajuste':'▥ Ajustar stock'}
     </button>
     {editStock===m.id&&<StockEditor model={m} stock={s} onSave={onAdjust} busy={busy}/>}
     <button className="button button-outline full" type="button"
      onClick={()=>{setEditCatalog(editCatalog===m.id?null:m.id);setEditStock(null);}}>
      {editCatalog===m.id?'Cerrar edición':'✎ Cambiar precio o fotografía'}</button>
     {editCatalog===m.id&&<ModelEditor key={m.id+'-'+m.updated_at} model={m} onSave={onUpdateModel} busy={busy}/>}

    </div>
   </article>})}</div>:<Empty title="No se encontraron productos" detail="Prueba otra búsqueda o registra un modelo."/>}
  </>}
 </>;
}
function ModelForm({colors,onCreate,busy}){
 const [name,setName]=useState(''),[size,setSize]=useState(''),[price,setPrice]=useState('');
 const [docenas,setDocenas]=useState('0'),[selected,setSelected]=useState([]);
 const [photo,setPhoto]=useState(null),[preview,setPreview]=useState('');
 const [localError,setLocalError]=useState('');
 const requestId=useRef(null);
 function choosePhoto(file){
  setPhoto(file||null);setPreview('');setLocalError('');requestId.current=null;
  if(file){if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5242880){
   setPhoto(null);setLocalError('Selecciona una foto JPG, PNG o WebP de hasta 5 MB.');return;
  }
   const reader=new FileReader();reader.onload=()=>setPreview(String(reader.result));reader.readAsDataURL(file);
  }
 }
 async function submit(e){
  e.preventDefault();setLocalError('');
  try{
   centsFromBs(price);
   if(!selected.length)throw new Error('Selecciona al menos un color ofertado.');
   if(!Number.isSafeInteger(Number(docenas))||Number(docenas)<0)throw new Error('Registra docenas completas publicables.');
   if(!requestId.current)requestId.current=uuid();
   const ok=await onCreate({name:name.trim(),size:size.trim(),price,stockDocenas:Number(docenas),colorIds:selected,photo,requestId:requestId.current});
   if(ok){requestId.current=null;setName('');setSize('');setPrice('');setDocenas('0');setSelected([]);setPhoto(null);setPreview('');}
  }catch(err){setLocalError(err.message);}
 }
 return <form onSubmit={submit} className="model-form">
  <div className="photo-field">
   <div className="photo-preview">{preview?<img alt="Vista previa de la foto elegida" src={preview}/>:
    <div className="upload-placeholder"><span>▧</span><b>Fotografía del modelo</b><small>JPG · PNG · WebP</small></div>}</div>
   <label className="file-label"><span className="button button-outline">Elegir fotografía</span>
    <input name="modelPhoto" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>choosePhoto(e.target.files?.[0])}/>
   </label>
  </div>
  <div className="form-inline">
   <Field title="Nombre del modelo"><input name="modelName" required maxLength={120} value={name}
     onChange={e=>{setName(e.target.value);requestId.current=null;}} placeholder="Nombre comercial…"/></Field>
   <Field title="Talla única del modelo"><input name="modelSize" required maxLength={24} value={size}
     onChange={e=>{setSize(e.target.value);requestId.current=null;}} placeholder="Ej. M, XL o 2XL…"/></Field>
   <Field title="Precio mayorista por docena (Bs)"><input name="modelPrice" required
     inputMode="decimal" value={price} onChange={e=>{setPrice(e.target.value);requestId.current=null;}}
     placeholder="Importe por docena…"/></Field>
   <Field title="Docenas completas publicables"
     hint={'Publicarás '+rup((Number(docenas)||0)*12)+' prendas; deja fuera tu margen de seguridad.'}>
     <input name="modelStock" type="number" step="1" min="0" max="178956970" value={docenas}
      onChange={e=>{setDocenas(e.target.value);requestId.current=null;}} required/></Field>
  </div>
  <div className="palette-selector">
   <div className="palette-title"><strong>Colores que ofrece este modelo</strong><span>{selected.length} seleccionados</span></div>
   <p>Selecciona muestras de la paleta. No registraremos unidades por color.</p>
   {colors.length?<div className="color-select-grid">{colors.map(c=><ColorChip key={c.id} color={c}
     selected={selected.includes(c.id)} onClick={()=>{requestId.current=null;setSelected(current=>current.includes(c.id)?current.filter(x=>x!==c.id):[...current,c.id]);}}/>)}</div>:
     <Notice>Primero crea un color desde el panel de paleta.</Notice>}
  </div>
  {localError&&<p className="form-error" role="alert">{localError}</p>}
  <button className="button button-primary full" type="submit" disabled={busy||!colors.length}>
   {busy?'Guardando modelo…':'Registrar producto e inventario'}</button>
 </form>;
}
function ClientEditForm({customer,onSave,onCancel,busy}){
 const [name,setName]=useState(customer.name),[phone,setPhone]=useState(customer.whatsapp),[error,setError]=useState('');
 const requestId=useRef(null);
 async function submit(e){
  e.preventDefault();setError('');
  const newName=name.trim(),newPhone=phone.trim();
  if(!newName||!newPhone){setError('Nombre y WhatsApp obligatorios.');return;}
  if(newName===customer.name&&newPhone===customer.whatsapp)return;
  if(!requestId.current)requestId.current=uuid();
  const ok=await onSave({customer,name:newName,whatsapp:newPhone,requestId:requestId.current});
  if(ok){requestId.current=null;onCancel();}
 }
 return <form className="customer-edit" onSubmit={submit}>
  <p className="small-note">Corrige esta ficha sin fusionarla con otros clientes ni cambiar sus pedidos.</p>
  <div className="form-inline">
   <Field title="Nombre"><input value={name} maxLength={130} required
    onChange={e=>{setName(e.target.value);requestId.current=null;}}/></Field>
   <Field title="WhatsApp"><input value={phone} maxLength={30} type="tel" inputMode="tel" required
    onChange={e=>{setPhone(e.target.value);requestId.current=null;}}/></Field>
  </div>
  {error&&<p role="alert" className="form-error">{error}</p>}
  <div className="form-actions">
   <button type="submit" disabled={busy||name.trim()===customer.name&&phone.trim()===customer.whatsapp} className="button button-primary">Guardar corrección</button>
   <button type="button" className="button button-outline" onClick={onCancel}>Cancelar</button>
  </div>
 </form>;
}
function ClientPanel({data,onCreate,onUpdate,busy}){
 const [search,setSearch]=useState(''),[editing,setEditing]=useState(null);
 const clients=data.customers.filter(c=>(c.name+' '+c.whatsapp).toLocaleLowerCase().includes(search.toLocaleLowerCase()));
 return <>
  <SectionHead eyebrow="DIRECTORIO COMERCIAL" title="Clientes y compradores."
    description="Registra y actualiza los datos de contacto de tus compradores. El teléfono no fusiona fichas."/>
  <div className="two-columns customer-layout">
   <section className="surface pad"><h2>Registrar cliente</h2>
    <p className="muted">Solo los datos necesarios para reconocer el pedido y contactar por WhatsApp.</p>
    <ClientForm onCreate={onCreate} busy={busy}/></section>
   <section className="surface pad"><h2>{data.customers.length} fichas registradas</h2>
    <label className="search"><span aria-hidden>⌕</span><input type="search" aria-label="Buscar cliente"
     value={search} placeholder="Buscar nombre o WhatsApp…" onChange={e=>setSearch(e.target.value)}/></label>
    {clients.length?<div className="client-list">{clients.map(c=>{
      const reservations=data.reservations.filter(r=>r.customer_id===c.id).length;
      const orders=data.orders.filter(o=>o.customer_id===c.id).length;
      return <div className="client-record" key={c.id}><div className="client-row"><span className="avatar">{initials(c.name)}</span>
       <div><strong>{c.name}</strong><small>{c.whatsapp}</small><span>{orders} pedidos{reservations>0?' · '+reservations+' registro(s) anterior(es)':''}</span></div>
       <button className="button button-outline" type="button" disabled={busy}
        onClick={()=>setEditing(editing===c.id?null:c.id)}>{editing===c.id?'Cerrar':'Editar'}</button></div>
       {editing===c.id&&<ClientEditForm key={c.id+'-'+c.updated_at} customer={c}
        onSave={onUpdate} onCancel={()=>setEditing(null)} busy={busy}/>}
      </div>
    })}</div>:<Empty title="Sin clientes coincidentes" detail="Registra una ficha o cambia la búsqueda."/>}
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
 function setDozens(value){
   onChange({...selection,dozens:String(value)});
 }
 function toggleColor(id){
  if(extras.includes(id))onChange({...selection,extraColorIds:extras.filter(x=>x!==id)});
  else if(extras.length<11&&quantity<available&&!stock.blocked)
   onChange({...selection,extraColorIds:[...extras,id]});
 }
 return <article className={'cart-model '+(validLine?'complete':'incomplete')}>
  <div className="cart-model-head">
   <ProductImage model={model}/>
   <div className="cart-model-info"><h3>{model.name}</h3>
    <span>Talla {model.size_label} · {formatBs(centsFromBs(model.price_dozen_bs))} por docena</span>
    <small>{stock.blocked?'BLOQUEADO':available+' prendas libres de '+stock.on_hand+' publicadas'}</small>
   </div>
   <button type="button" className="remove-model" title="Quitar modelo" aria-label={'Quitar '+model.name}
    onClick={onRemove}>×</button>
  </div>
  <div className="portion-controls">
   <div className="dozen-panel">
    <div className="portion-label"><b>Docenas completas</b><span>Surtidas · 12 prendas cada una</span></div>
    <div className="dozen-entry"><button type="button" aria-label={'Quitar docena de '+model.name}
      onClick={()=>setDozens(Math.max(0,dozens-1))} disabled={!validDozens||dozens<=0}>−</button>
      <input type="number" min="0" max={Math.min(maximumDozens,178956969)} step="1" inputMode="numeric"
       name={'dozens-'+model.id} aria-label={'Docenas de '+model.name} value={selection.dozens}
       onChange={e=>setDozens(e.target.value)}/>
      <button type="button" aria-label={'Añadir docena a '+model.name}
       onClick={()=>setDozens(dozens+1)} disabled={!validDozens||dozens>=maximumDozens||stock.blocked}>＋</button>
    </div>
   </div>
   <div className="extra-panel">
    <div className="portion-label"><b>Prendas adicionales</b>
     <span>{extras.length} de 11 · un solo ejemplar de cada color</span></div>
    <div className="extra-count">{extras.length}<small>colores</small></div>
   </div>
  </div>
  <div className="extra-color-panel">
   <div className="portion-instructions">
    <b>{noDozen?'Elige de 6 a 11 colores':'Agrega hasta 11 prendas por color'}</b>
    <p>{noDozen?'Sin docena, necesitas al menos 6 prendas y cada una debe tener un color diferente.':
      'Las docenas completas son surtidas; los colores elegidos aquí corresponden solo a las prendas adicionales.'}</p>
   </div>
   <div className="color-select-grid extra-select-grid">
    {allowedColors.map(color=><ColorChip key={color.id} color={color}
       selected={extras.includes(color.id)} onClick={() => toggleColor(color.id)}
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
 return <div className="form-section-title">
  <span className="step" aria-hidden="true">{state==='done'?'✓':number}</span>
  <div className="order-step-heading"><h2>{title}</h2><p>{description}</p></div>
  <span className={'order-step-badge '+state}>
   {state==='done'?'Completado':state==='current'?'Paso actual':'Pendiente'}
  </span>
 </div>;
}
function BookingPanel({data,onOrder,onCreateClient,busy}){
 const [customerId,setCustomerId]=useState('');
 const [customerSearch,setCustomerSearch]=useState('');
 const [productSearch,setProductSearch]=useState('');
 const [portions,setPortions]=useState({});
 const [localError,setLocalError]=useState('');
 const [recentlyAdded,setRecentlyAdded]=useState(null);
 const [addClient,setAddClient]=useState(false);
 const requestId=useRef(null);
 const models=data.models.filter(m=>m.is_active);
 const stock=data.stock;
 const chosen=models.filter(m=>Object.hasOwn(portions,m.id));
 const availableModels=models.filter(m=>!Object.hasOwn(portions,m.id)&&
   (m.name+' '+m.size_label).toLocaleLowerCase().includes(productSearch.toLocaleLowerCase()));
 const matchedCustomers=data.customers.filter(c=>(c.name+' '+c.whatsapp).toLocaleLowerCase().includes(customerSearch.toLocaleLowerCase()));
 const chosenCustomer=data.customers.find(c=>c.id===customerId);
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
   if(!requestId.current)requestId.current=uuid();
   const ok=await onOrder(customerId,lines,requestId.current);
   if(ok){requestId.current=null;setPortions({});setCustomerId('');setCustomerSearch('');}
  }catch(err){setLocalError(err.message);}
 }
 return <>
  <SectionHead eyebrow="VENTAS MAYORISTAS" title="Registrar pedido confirmado"
   description="Selecciona el cliente y los modelos que comprará. Las docenas son surtidas y las prendas extra llevan colores individuales sin repetir."/>
  <nav className="order-progress" aria-label="Progreso del registro de pedido">
   {[['Cliente','Identificación'],['Productos','Cantidad y colores'],['Confirmación','Registro final']].map(([label,desc],index)=>{
    const number=index+1,state=number<stage?'done':number===stage?'current':'next';
    return <div className={'order-progress-item '+state} key={number} aria-current={state==='current'?'step':undefined}>
     <span className="order-progress-number" aria-hidden="true">{state==='done'?'✓':number}</span>
     <div><strong>{label}</strong><small>{desc}</small></div>
     <span className="order-progress-state">{state==='done'?'Listo':state==='current'?'En curso':'Siguiente'}</span>
    </div>;
   })}
  </nav>
  <div className="booking-layout">
   <div className="surface booking-form">
    <section className={'form-section order-step-card '+(1<stage?'done':1===stage?'current':'next')}>
     <OrderStepHeader number={1} title="Elegir comprador" description="Busca por nombre o WhatsApp, o registra un cliente nuevo." state={1<stage?'done':1===stage?'current':'next'}/>
     <div className="customer-chooser">
      <label className="search"><span aria-hidden="true">⌕</span>
       <input type="search" aria-label="Buscar clientes por nombre o WhatsApp" autoComplete="off"
        placeholder="Buscar cliente por WhatsApp…" value={customerSearch}
        onChange={e=>setCustomerSearch(e.target.value)}/></label>
      <div className="client-selection"><Field title="Cliente del pedido">
       <select name="customerId" value={customerId} required
        onChange={e=>{setCustomerId(e.target.value);requestId.current=null;}}>
        <option value="">Selecciona un cliente…</option>
        {chosenCustomer&&!matchedCustomers.some(c=>c.id===chosenCustomer.id)&&
          <option value={chosenCustomer.id}>{chosenCustomer.name} · {chosenCustomer.whatsapp}</option>}
        {matchedCustomers.map(c=><option key={c.id} value={c.id}>{c.name} · {c.whatsapp}</option>)}
       </select></Field>
       <button type="button" className="button button-outline" onClick={()=>setAddClient(x=>!x)}>
        {addClient?'Cerrar ficha':'＋ Nuevo cliente'}</button>
      </div>
     </div>
     {chosenCustomer&&<div className="selected-client">
       <span className="avatar small">{initials(chosenCustomer.name)}</span><div>
         <b>{chosenCustomer.name}</b><small>{chosenCustomer.whatsapp}</small></div></div>}
     {addClient&&<div className="inline-client"><ClientForm compact busy={busy}
       onCreate={async(n,p)=>{const ok=await onCreateClient(n,p);if(ok){setAddClient(false);setCustomerSearch(p);}return ok;}}/></div>}
    </section>
    <section className={'form-section order-step-card '+(2<stage?'done':2===stage?'current':'next')}>
     <OrderStepHeader number={2} title="Seleccionar productos" description="Toca cualquier tarjeta para añadirla y configurar sus cantidades." state={2<stage?'done':2===stage?'current':'next'}/>
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
          !canAdd?'Sin cupo suficiente para el mínimo mayorista':available+' prendas disponibles'}</span>
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
    <p className="checkout-note">Las docenas son surtidas. Se registran los colores de las prendas adicionales, una por color. La disponibilidad física por color se verifica fuera del sistema.</p>
    <form id="booking-submit" onSubmit={submit}>
     <button className="button button-primary full" type="submit" disabled={busy||!clientReady||!productsReady}>
      {busy?'Guardando…':'Confirmar y registrar pedido'}
     </button>
    </form>
   </aside>
  </div>
 </>;
}
function LineComposition({line,colors,compact=false}){
 const hasBreakdown=line.dozen_count!==null&&line.dozen_count!==undefined;
 return <div className={'line-composition '+(compact?'compact':'')}>
  <span>{hasBreakdown?
    portionBreakdown(Number(line.dozen_count),Number(line.extra_units)):
    quantityBreakdown(line.quantity)+' · registro anterior sin desglose de colores'}</span>
  <ExtraColorSummary ids={line.extraColorIds||[]} colors={colors}/>
 </div>;
}

function PaymentForm({targetId,onSubmit,busy}){
 const [amount,setAmount]=useState(''),[note,setNote]=useState('');
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
  if(ok){requestId.current=null;setAmount('');setNote('');}
 }
 return <form className="money-form" onSubmit={submit}>
  <p className="small-note">Registrar aviso de pago externo. <strong>No reduce el saldo</strong> hasta que el administrador compruebe la recepción y lo apruebe.</p>
  <div className="form-inline">
   <Field title="Monto informado (Bs)">
    <input type="text" name={'payment-'+targetId} inputMode="decimal" placeholder="Ej. 150,50"
     value={amount} onChange={e=>{setAmount(e.target.value);requestId.current=null;}} required/></Field>
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
function QrAdmin({settings,onSave,busy}){
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
  const ok=await onSave(file,verified,req.current);
  if(ok){req.current=null;setFile(null);setVerified(false);setHint('QR vigente publicado para los enlaces de pedidos activos.');}
 }
 return <section className="surface pad qr-admin">
  <h2>QR oficial de EVALIA</h2>
  <p className="small-note">Usa exclusivamente la imagen verdadera que recibiste de tu banco. No se genera un QR ficticio desde el software.</p>
  {settings?.reusable_verified?<div className="qr-status">
    <span className="pay-state pay-approved">QR verificado para reutilización</span>
    <button type="button" className="button button-outline" onClick={show}>Ver QR vigente</button>
   </div>:<p className="small-note">Todavía no hay un QR bancario vigente publicado.</p>}
  <form onSubmit={submit} className="money-form">
   <Field title="Imagen bancaria JPG, PNG o WebP (máx. 5 MB)">
    <input type="file" accept="image/jpeg,image/png,image/webp"
     onChange={e=>{setFile(e.target.files?.[0]||null);req.current=null;}} required/></Field>
   <label className="qr-confirm"><input type="checkbox" checked={verified}
     onChange={e=>{setVerified(e.target.checked);req.current=null;}}/>
     He comprobado que esta imagen es un QR real, vigente y reutilizable para recibir pagos.</label>
   <button className="button button-primary" type="submit" disabled={busy||!file||!verified}>
    {busy?'Guardando…':'Publicar QR para clientes'}</button>
  </form>
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
     <button type="button" className="button button-primary" disabled={!draft.trim()}
      onClick={()=>copy(draft,'Mensaje de confirmación copiado. Pégalo en el chat del comprador.')}>
      Copiar mensaje para WhatsApp</button>
     <button type="button" className="button button-outline"
      onClick={()=>copy(plain,'Enlace privado copiado. Pégalo únicamente en el chat del comprador.')}>
      Copiar solo enlace</button>
    </div>
   </div>}
  {plain&&!active&&<p className="small-note">El enlace fue reemplazado o revocado. Crea uno nuevo para compartirlo.</p>}
  {hint&&<p role="status" className="small-note">{hint}</p>}
 </div>;
}
function PaymentReview({data,onReview,onSaveQr,busy}){
 const [notes,setNotes]=useState({});
 const [filter,setFilter]=useState('pending');
 const pending=['pending','observed'];
 const list=data.payments.filter(p=>filter==='all'||(filter==='pending'?pending.includes(p.status):p.status===filter));
 return <><SectionHead eyebrow="CONCILIACIÓN MANUAL" title="Verifica los pagos recibidos."
  description="Un aviso o comprobante NO confirma dinero ingresado. Comprueba la recepción fuera del sistema antes de aprobar."/>
  <QrAdmin settings={data.qrSettings} onSave={onSaveQr} busy={busy}/>
  <div className="toolbar"><label className="field"><span className="field-label">Filtrar estado</span>
   <select value={filter} onChange={e=>setFilter(e.target.value)}>
    <option value="pending">Pendientes y en observación</option>
    <option value="approved">Aprobados</option><option value="rejected">Rechazados</option>
    <option value="all">Todos</option></select></label>
   <span className="muted">{list.length} declaración(es)</span></div>
  <div className="record-list">{list.map(p=>{
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
  {!list.length&&<Empty title="Sin declaraciones con este estado" detail="Los pagos que informen los clientes o el administrador aparecerán aquí."/>}
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
       <span>{model?.name||'Modelo'} · {l.quantity} prendas</span>
       <LineComposition line={l} colors={data.colors} compact/>
      </div>;
     })}</div>
     {payments.length>0&&<PaymentHistory items={payments} compact/>}
     {canConvert?<button type="button" className="button button-outline" disabled={busy}
       onClick={()=>{if(window.confirm('Confirma solo si el cliente aceptó comprar estas prendas. La operación pasará a Pedido sin descontar stock dos veces.'))onConvert(r.id);}}>
       Confirmar compra y convertir en pedido</button>:
       <p className="small-note">{r.status==='in_review'?'Este registro antiguo tiene protección de depósito y requiere revisión administrativa; su cupo no se libera automáticamente.':'Su vigencia terminó. El procesador anterior liberará las prendas si no hay depósito oportuno.'}</p>}
    </article>;
   })}
  </div>
 </details>;
}
function OrderQuickActions({order,finance,delivery,payments,onQuick,busy}){
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
  if(!window.confirm(details+'\n\nEsta operación se registrará en el historial y no puede deshacerse desde el panel.'))return;
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
    <p>Registra los hechos reales en una operación. Los abonos y las entregas parciales siguen disponibles más abajo.</p></div>
  </div>
  <div className="express-status" role="status">
   <div className={balance===0n?'complete':'pending'}><span>Pago</span><b>{balance===0n?'Total recibido':'Restan '+formatBs(balance)}</b></div>
   <div className={remaining===0?'complete':'pending'}><span>Entrega</span><b>{remaining===0?'Todo entregado':remaining+' prendas por retirar'}</b></div>
  </div>
  {pendingEvidence&&<p className="express-warning" role="alert">
    Hay un comprobante o aviso de pago sin resolver. Revísalo en Pagos antes de registrar un cobro total para evitar duplicarlo.
   </p>}
  {excess>0n&&<p className="express-warning" role="alert">Existe un exceso de dinero aprobado. Concílialo antes de usar el cierre rápido.</p>}
  {(canPay||canDeliver)&&<div className="express-actions">
   {canPay&&remaining>0&&<button type="button" className="button express-primary" disabled={busy}
      onClick={()=>run('pay_deliver')}>
      ✓ Cobrar saldo y entregar todo</button>}
   {canPay&&<button type="button" className="button express-secondary" disabled={busy}
      onClick={()=>run('pay')}>Registrar pago total recibido</button>}
   {canDeliver&&<button type="button" className="button express-primary" disabled={busy}
      onClick={()=>run('deliver')}>✓ Entregar todo y completar</button>}
  </div>}
  {(canPay||canDeliver)&&<label className="express-note">
   <span>Referencia o medio de pago (opcional)</span>
   <input type="text" maxLength={1000} value={note} placeholder="Ej. efectivo, QR verificado…"
    onChange={e=>{setNote(e.target.value);attempt.current=null;}}/>
   </label>}
  <p className="express-disclaimer">Las acciones de cobro exigen que el dinero haya sido recibido y comprobado. Las de entrega exigen que las prendas hayan sido entregadas físicamente. Se guardan con auditoría e impiden duplicados.</p>
 </section>;
}
function Orders({data,onReport,onDeliver,onComplete,onQuick,onIssueLink,onRevokeLink,onConvertLegacy,busy}){
 return <><SectionHead eyebrow="PEDIDOS CONFIRMADOS" title="Desglose de pedidos."
   description="Cada modelo conserva docenas, prendas individuales con sus colores y el importe histórico confirmado."/>
  <LegacyCommitments data={data} onConvert={onConvertLegacy} busy={busy}/>
  {data.orders.length?<div className="record-list">{data.orders.map(o=>{
   const customer=data.customers.find(x=>x.id===o.customer_id);
   const total=o.lines.reduce((sum,l)=>sum+centsFromBs(l.subtotal_bs),0n);
   const finance=data.finances[o.id]||{total:0,approved:0,pending:0,excess:0};
   const delivery=data.deliveryStats[o.id]||{ordered:0,delivered:0,remaining:0};
   return <article className="record order-record" key={o.id}>
    <header className="record-head"><div className="record-name"><span className="avatar">{initials(customer?.name)}</span>
      <div><strong>{customer?.name||'Cliente'}</strong><small>{customer?.whatsapp||'—'} · {displayDate(o.confirmed_at)}</small></div></div>
      <Status value={o.status}/></header>
    <div className="order-lines">{o.lines.map(l=>{const m=data.models.find(x=>x.id===l.model_id);return <div className="order-product" key={l.model_id}>
     {m&&<ProductImage model={m}/>}<div className="order-product-data"><strong>{m?.name||'Modelo'}</strong>
      <small>Talla {m?.size_label||'—'} · {l.quantity} prendas</small>
      <LineComposition line={l} colors={data.colors} compact/>
     </div><div className="order-line-price"><small>{formatBs(centsFromBs(l.price_dozen_bs))} / doc.</small><strong>{formatBs(centsFromBs(l.subtotal_bs))}</strong></div>
    </div>})}</div>
    <footer className="order-total"><span>Total del pedido</span><strong>{formatBs(total)}</strong></footer>
    <div className="order-operations">
      <div className="order-operational-metrics">
       <div><small>Abonado y aprobado</small><strong>{formatBs(amountCents(finance.approved))}</strong></div>
       <div><small>Saldo pendiente</small><strong>{formatBs(amountCents(finance.pending))}</strong></div>
       <div><small>Retiradas</small><strong>{delivery.delivered} / {delivery.ordered}</strong></div>
      </div>
      {Number(finance.excess)>0&&<Notice type="error">Existe exceso de pago para conciliación: {formatBs(amountCents(finance.excess))}. No se puede cerrar automáticamente.</Notice>}
      {o.status==='active'&&<OrderQuickActions order={o} finance={finance} delivery={delivery}
       payments={data.payments.filter(p=>p.order_id===o.id || (o.origin_reservation_id && p.reservation_id===o.origin_reservation_id))}
       onQuick={onQuick} busy={busy}/>}
      <details className="order-advanced" aria-label="Abonos y entregas parciales">
       <summary>Abonos, comprobantes y entregas parciales <span>Opciones adicionales</span></summary>
       <div className="order-advanced-body">
        <h3>Historial de pagos</h3>
        <PaymentHistory items={data.payments.filter(p=>p.order_id===o.id || (o.origin_reservation_id && p.reservation_id===o.origin_reservation_id))}/>
        {o.status==='active'&&Number(finance.pending)>0&&<PaymentForm targetId={o.id} onSubmit={onReport} busy={busy}/>}
        <h3>Retiradas físicas</h3>
        {o.status==='active'&&Number(finance.pending)===0&&Number(finance.excess)===0?
         <DeliveryForm key={o.id+'-'+delivery.delivered} order={o} data={data} onSave={onDeliver} busy={busy}/>:
         o.status==='active'?<p className="small-note">Las entregas requieren pago aprobado completo. Los avisos pendientes no son dinero recibido.</p>:null}
       </div>
      </details>
      {o.status==='active'&&<button className="button button-primary" type="button" disabled={busy||Number(finance.pending)!==0||Number(finance.excess)!==0||Number(delivery.remaining)!==0}
       onClick={()=>onComplete(o.id)}>✓ Marcar COMPLETADO</button>}
      {o.status==='completed'&&<p className="small-note">Pedido completado: pago acreditado y retirada total registrados. El enlace privado queda inactivo.</p>}
      <OrderLinkPanel order={o} data={data} onIssue={onIssueLink} onRevoke={onRevokeLink} busy={busy}/>
    </div>
   </article>
   })}</div>:<Empty title="Aún no hay pedidos" detail="Registra la primera compra confirmada desde Nuevo pedido."/>}
 </>;
}
function Login({onLogin,busy,error}){
 const [email,setEmail]=useState(''),[password,setPassword]=useState('');
 return <main className="login-screen"><section className="login-card">
  <div className="brand brand-large"><span className="brand-icon">E</span><div><b>EVALIA</b><small>GESTIÓN COMERCIAL</small></div></div>
  <p className="eyebrow">ACCESO ADMINISTRATIVO</p><h1>Tu catálogo, tus pedidos, tu control.</h1>
  <p className="description">Inicia sesión para trabajar con información real de tu base de datos Supabase.</p>
  {process.env.NEXT_PUBLIC_EVALIA_STATIC_PREVIEW==='1'&&<Notice>Vista administrativa en GitHub Pages. El portal privado del cliente requiere alojamiento Next.js con servidor.</Notice>}
  <form onSubmit={e=>{e.preventDefault();onLogin(email,password);}}>
   <Field title="Correo del administrador"><input type="email" name="email" required autoComplete="username"
    value={email} onChange={e=>setEmail(e.target.value)} placeholder="Correo de acceso…"/></Field>
   <Field title="Contraseña"><input type="password" name="password" required autoComplete="current-password"
    value={password} onChange={e=>setPassword(e.target.value)} placeholder="Contraseña…"/></Field>
   {error&&<p role="alert" className="form-error">{error}</p>}
   <button className="button button-primary full" disabled={busy} type="submit">{busy?'Verificando…':'Entrar al panel'}</button>
  </form>
  <p className="small-note">Solo tienen acceso los usuarios autorizados en admin_profiles. No existe registro público de cuentas.</p>
 </section></main>;
}
export default function HomePage(){
 const [tab,setTab]=useState('home'),[data,setData]=useState(null),[ready,setReady]=useState(false);
 const [authenticated,setAuthenticated]=useState(false),[forbidden,setForbidden]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const refreshGeneration=useRef(0);
 const db=useMemo(()=>getSupabase(),[]);
 const configured=Boolean(db);
 const refresh=useCallback(async()=>{const generation=++refreshGeneration.current;
  const snapshot=await loadWorkspace();
  if(generation===refreshGeneration.current)setData(snapshot);
 },[]);
 useEffect(()=>{
  let active=true;
  if(!db){setReady(true);return;}
  authUser().then(async user=>{
    if(!active)return;
    if(!user){setReady(true);return;}
    const permitted=await adminAllowed();
    if(!active)return;
    setForbidden(!permitted);setAuthenticated(permitted);
    if(permitted)await refresh();
  }).catch(err=>{if(active)setError(err.message);}).finally(()=>{if(active)setReady(true);});
  const {data:listener}=db.auth.onAuthStateChange((event)=>{
    if(event==='SIGNED_OUT'&&active){setAuthenticated(false);setData(null);setForbidden(false);}
  });
  return ()=>{active=false;listener.subscription.unsubscribe();};
 },[db,refresh]);
 useEffect(()=>{
  if(!authenticated)return;
  const timer=setInterval(()=>{
   if(document.visibilityState==='visible')refresh().catch(err=>setError(err.message));
  },60000);
  return ()=>clearInterval(timer);
 },[authenticated,refresh]);
 async function login(email,password){
  setBusy(true);setError('');
  try{await signIn(email,password);if(!await adminAllowed()){
    setForbidden(true);await signOut();throw new Error('Cuenta sin autorización administrativa.');}
    setForbidden(false);setAuthenticated(true);await refresh();
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 async function mutation(fn,success){
  if(busy)return false;
  setBusy(true);setError('');setMessage('');
  try{await fn();await refresh();setMessage(success);return true;}
  catch(e){setError(e.message);return false;}finally{setBusy(false);}
 }
 async function addModel(values){
  return mutation(async()=>{
   const req=values.requestId||uuid(),path=values.photo?await uploadPhoto(values.photo):null;
   await createModel({...values,imagePath:path,requestId:req});
  },'El modelo y su stock se registraron en Supabase.');
 }
 const saveModelEdit=(params)=>mutation(async()=>{
  const imagePath=params.photo?await uploadPhoto(params.photo):null;
  try{
   await updateModel({modelId:params.model.id,price:params.price,imagePath,
    expectedUpdatedAt:params.model.updated_at,requestId:params.requestId});
  }catch(e){if(imagePath)await removePhoto(imagePath).catch(()=>{});throw e;}
 },'Precio/fotografía actualizados; los pedidos históricos no cambiaron.');
 const saveCustomerEdit=(params)=>mutation(()=>updateCustomer({
  customerId:params.customer.id,name:params.name,whatsapp:params.whatsapp,
  expectedUpdatedAt:params.customer.updated_at,requestId:params.requestId
 }),'Ficha corregida y registrada en auditoría.');
 const addColor=(name,hex)=>mutation(()=>createColor(name,hex),'Color registrado.');
 const addClient=(name,phone)=>mutation(()=>createCustomer(name,phone),'Cliente registrado.');
 const updateStock=(modelId,operation,units,version,requestId)=>
  mutation(()=>adjustStock({modelId,operation,units,version,requestId:requestId||uuid()}),'Stock actualizado.');
 const order=(customerId,lines,requestId)=>mutation(()=>createOrder(customerId,lines,requestId||uuid()),'Pedido confirmado con precios congelados.');
 const convert=(id)=>mutation(()=>confirmReservation(id,uuid()),'Registro anterior convertido en pedido, sin descontar inventario dos veces.');
 const report=(v)=>mutation(()=>reportPayment(v),'Aviso de pago guardado; pendiente de aprobación.');
 const checkoutFast=(details)=>mutation(()=>quickCheckout(details),
  details.action==='pay'
   ?'Saldo total aprobado. El pedido permanece pendiente de recogida.'
   :'Pago y retirada registrados correctamente; pedido COMPLETADO.');

 const approve=(id,action,note)=>mutation(()=>reviewPayment({reportId:id,action,requestId:uuid(),note}),
  action==='approve'?'Pago aprobado después de verificar su recepción.':'Revisión registrada sin mover dinero.');
 const deliver=(orderId,lines,requestId)=>mutation(()=>recordDelivery({orderId,lines,requestId}),
  'Retirada física registrada; inventario actualizado.');
 const complete=(orderId)=>mutation(()=>completeOrder({orderId,requestId:uuid()}),
  'Pedido COMPLETADO con pago y entrega íntegros.');
 const saveQr=(file,verified,requestId)=>mutation(()=>saveRealQr(file,verified,requestId),
  'QR real registrado y disponible para pedidos activos.');
 async function issueLink(orderId){
  if(busy)return null;
  setBusy(true);setError('');
  try{const link=await issueOrderLink(orderId);await refresh();setMessage('Enlace privado creado; compártelo solo con el destinatario.');return link;}
  catch(e){setError(e.message);return null;}
  finally{setBusy(false);}
 }
 const revokeLink=(orderId)=>mutation(()=>revokeOrderLink(orderId),'Enlace privado revocado.');


 if(!configured)return <main className="setup-screen"><section className="setup-card">
  <span className="brand-icon">E</span><h1>Configuración de EVALIA</h1>
  <p>La aplicación operativa no tiene conexión a Supabase. La base ya está inicializada. Configura <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> en <code>web/.env.local</code>, usando únicamente la clave pública de tu proyecto. Después inicia sesión como administrador autorizado.</p>
  <p>No se mostrarán datos ficticios como si fueran operaciones reales.</p>
 </section></main>;
 if(!ready)return <main className="loading">Verificando acceso administrativo…</main>;
 if(!authenticated)return forbidden?<main className="setup-screen"><section className="setup-card">
  <h1>Acceso restringido</h1><p>La cuenta no figura como administradora de EVALIA.</p>
  <button className="button button-outline" onClick={()=>{setForbidden(false);setError('');}}>Volver al acceso</button>
 </section></main>:<Login onLogin={login} busy={busy} error={error}/>;
 return <div className="app-shell">
  <aside className="sidebar"><div className="brand"><span className="brand-icon">E</span>
   <div><b>EVALIA</b><small>GESTIÓN COMERCIAL</small></div></div>
   <p className="sidebar-label">ESPACIO DE TRABAJO</p>
   <nav className="sidebar-nav" aria-label="Navegación principal">{MENU.map(([id,label,symbol])=>
    <button key={id} onClick={()=>setTab(id)} aria-current={tab===id?'page':undefined}
      className={tab===id?'active':''}><span className="nav-icon">{symbol}</span>{label}</button>)}</nav>
   <div className="sidebar-bottom"><span className="connected-dot"/><div><strong>Base de datos conectada</strong><small>Sesión administrativa</small></div></div>
  </aside>
  <div className="workspace">
   <header className="topbar"><div className="breadcrumb">EVALIA <span>/</span>
    <strong>{MENU.find(x=>x[0]===tab)?.[1]}</strong></div>
    <div className="top-actions"><span className="live-label"><span className="connected-dot"/> Supabase</span>
     <button className="button button-ghost" onClick={()=>mutation(async()=>refresh(),'Datos actualizados.')} disabled={busy}>↻ Actualizar</button>
     <button className="button button-ghost" onClick={async()=>{await signOut();setAuthenticated(false);setData(null);}}>Salir</button></div>
   </header>
   <main id="main" className="main-content">
    {process.env.NEXT_PUBLIC_EVALIA_STATIC_PREVIEW==='1'&&<Notice>Vista administrativa de prueba alojada en GitHub Pages y conectada a Supabase. Los enlaces privados de clientes necesitan un servidor Next.js.</Notice>}
    {error&&<Notice type="error" onClose={()=>setError('')}>{error}</Notice>}
    {message&&<Notice type="success" onClose={()=>setMessage('')}>{message}</Notice>}
    {!data?<div className="loading">{error?'No se pudieron obtener los registros. Revisa el error y pulsa Actualizar.':'Cargando productos y registros…'}</div>:
      tab==='home'?<Dashboard data={data} setTab={setTab}/>:
      tab==='catalog'?<Catalog data={data} onCreateColor={addColor} onCreateModel={addModel} onAdjust={updateStock} onUpdateModel={saveModelEdit} busy={busy}/>: 
      tab==='booking'?<BookingPanel data={data} onOrder={order} onCreateClient={addClient} busy={busy}/>: 
      tab==='orders'?<Orders data={data} onReport={report} onDeliver={deliver} onComplete={complete} onQuick={checkoutFast} onIssueLink={issueLink} onRevokeLink={revokeLink} onConvertLegacy={convert} busy={busy}/>:  
      tab==='payments'?<PaymentReview data={data} onReview={approve} onSaveQr={saveQr} busy={busy}/>:  
      <ClientPanel data={data} onCreate={addClient} onUpdate={saveCustomerEdit} busy={busy}/>}
   </main>
   <footer className="footer">EVALIA · Destaca en cada detalle <span>Panel administrativo · Moneda Bs · Zona horaria Bolivia</span></footer>
  </div>
  <nav className="mobile-nav" aria-label="Navegación móvil">{MENU.filter(x=>x[0]!=='home').map(([id,label,sign])=>
   <button key={id} aria-current={tab===id?'page':undefined} onClick={()=>setTab(id)} className={tab===id?'active':''}>
    <span>{sign}</span><small>{label}</small></button>)}</nav>
 </div>;
}

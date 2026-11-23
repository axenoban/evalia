'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  authUser, adminAllowed, signIn, signOut, loadWorkspace, createColor,
  createCustomer, createModel, uploadPhoto, adjustStock, createReservation,
  createOrder, confirmReservation
} from '../lib/api.js';
import { getSupabase } from '../lib/supabase.js';
import {
  centsFromBs, subtotalCents, formatBs, quantityBreakdown, checkedLines, inventoryTotals
} from '../lib/domain.js';

const MENU=[
  ['home','Resumen','▦'],
  ['catalog','Productos','▧'],
  ['booking','Nueva operación','＋'],
  ['reservations','Reservas','◇'],
  ['orders','Pedidos','▤'],
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
const statusLabels={saved:'Reservada',in_review:'En revisión',expired:'Vencida',converted:'Convertida',active:'En preparación',completed:'Completado',draft:'Borrador'};

function ColorChip({color,selected=false,onClick,compact=false}){
 const colorValid=/^#[\da-f]{6}$/i.test(color?.hex_code||'');
 const circle=<span className={'color-circle '+(colorValid?'':'color-unknown')}
    style={colorValid?{background:color.hex_code}:undefined}>
    {selected&&<span className="tick">✓</span>}
    {!colorValid&&<span className="color-question">?</span>}
  </span>;
 if(onClick)return <button type="button" aria-pressed={selected}
  aria-label={color?.name+' '+(selected?'seleccionado':'no seleccionado')}
  className={'color-choice '+(selected?'is-selected':'')} onClick={onClick}>
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
 const activeReservations=data.reservations.filter(r=>r.status==='saved'||r.status==='in_review');
 const activeOrders=data.orders.filter(o=>o.status==='active');
 const blocked=data.models.filter(m=>data.stock[m.id]?.blocked);
 return <>
  <SectionHead eyebrow="GESTIÓN COMERCIAL" title="Tu negocio, bajo control."
   description="Un espacio para registrar modelos, preparar apartados y cuidar las existencias reales."
   actions={<button className="button button-primary" onClick={()=>setTab('booking')}>＋ Nueva reserva o pedido</button>}/>
  <div className="metrics-grid">
   <SummaryCard label="Unidades disponibles" value={rup(totals.available)} sub="Libres para nuevas operaciones" kind="primary"/>
   <SummaryCard label="Comprometidas" value={rup(totals.reserved+totals.pending)} sub={rup(totals.reserved)+' en reservas · '+rup(totals.pending)+' en pedidos'}/>
   <SummaryCard label="Reservas pendientes" value={activeReservations.length} sub="Por confirmar o revisar"/>
   <SummaryCard label="Pedidos activos" value={activeOrders.length} sub="Por cobrar y entregar"/>
  </div>
  {blocked.length>0&&<Notice type="error">{blocked.length} modelo(s) tienen incidencias y no permiten nuevos compromisos.</Notice>}
  <div className="two-columns">
   <section className="surface">
    <div className="surface-heading"><div><h2>Inventario por producto</h2><p>Publicado menos unidades comprometidas.</p></div>
      <button className="link-button" onClick={()=>setTab('catalog')}>Administrar productos →</button></div>
    <StockTable data={data} limit={6}/>
   </section>
   <section className="surface">
    <div className="surface-heading"><div><h2>Actividad comercial</h2><p>Operaciones recientes de la base de datos.</p></div></div>
    {data.reservations.length||data.orders.length?<div className="activity-list">
     {[...data.reservations.slice(0,3).map(x=>({id:x.id,date:x.created_at,type:'Reserva',status:x.status,customer_id:x.customer_id})),
       ...data.orders.slice(0,3).map(x=>({id:x.id,date:x.confirmed_at,type:'Pedido',status:x.status,customer_id:x.customer_id}))]
       .sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,6)
       .map(x=><div className="activity-row" key={x.id}>
        <span className="activity-symbol">{x.type==='Reserva'?'◇':'▤'}</span><div>
          <strong>{x.type} · {data.customers.find(c=>c.id===x.customer_id)?.name||'Cliente'}</strong>
          <small>{displayDate(x.date)}</small></div><Status value={x.status}/>
       </div>)}
    </div>:<Empty title="Sin actividad registrada" detail="Los registros reales aparecerán aquí."/>}
   </section>
  </div>
 </>;
}
function StockTable({data,limit=null}){
 const models=limit?data.models.slice(0,limit):data.models;
 return models.length?<div className="table-scroll"><table className="stock-table">
  <thead><tr><th>Producto</th><th>Publicado</th><th>Reservado</th><th>En pedidos</th><th>Disponible</th></tr></thead>
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
function Catalog({data,onCreateColor,onCreateModel,onAdjust,busy}){
 const [view,setView]=useState('list'),[search,setSearch]=useState(''),[editStock,setEditStock]=useState(null);
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
function ClientPanel({data,onCreate,busy}){
 const [search,setSearch]=useState('');
 const clients=data.customers.filter(c=>(c.name+' '+c.whatsapp).toLocaleLowerCase().includes(search.toLocaleLowerCase()));
 return <>
  <SectionHead eyebrow="DIRECTORIO COMERCIAL" title="Clientes y compradores."
    description="Identifica a cada cliente antes de registrar una reserva o pedido. El teléfono no fusiona fichas."/>
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
      return <div className="client-row" key={c.id}><span className="avatar">{initials(c.name)}</span>
       <div><strong>{c.name}</strong><small>{c.whatsapp}</small><span>{reservations} reservas · {orders} pedidos</span></div></div>
    })}</div>:<Empty title="Sin clientes coincidentes" detail="Registra una ficha o cambia la búsqueda."/>}
   </section>
  </div>
 </>;
}
function QuantitySelector({model,stock,value,onChange}){
 const n=Number(value)||0;
 function step(d){onChange(d>0?(n===0?6:n+1):n<=6?0:n-1);}
 return <div className="quantity-control">
  <div className="quantity-stepper">
   <button type="button" aria-label={'Quitar una prenda de '+model.name} onClick={()=>step(-1)} disabled={!n}>−</button>
   <input type="number" name={'qty-'+model.id} aria-label={'Cantidad para '+model.name}
     value={value} min="0" max={stock.available} step="1" inputMode="numeric" onChange={e=>onChange(e.target.value)}/>
   <button type="button" aria-label={'Añadir una prenda de '+model.name} onClick={()=>step(1)} disabled={n>=Number(stock.available)}>＋</button>
  </div>
  <div className="quick-quantities">{[6,12,18,24].filter(x=>x<=Number(stock.available)).map(x=>
   <button key={x} type="button" aria-pressed={n===x} className={n===x?'chosen':''} onClick={()=>onChange(String(x))}>{x}</button>)}</div>
 </div>;
}
function BookingPanel({data,onReservation,onOrder,onCreateClient,busy,setTab}){
 const [customerId,setCustomerId]=useState('');
 const [quantities,setQuantities]=useState({});
 const [mode,setMode]=useState('reservation'),[localError,setLocalError]=useState('');
 const [addClient,setAddClient]=useState(false);
 const requestId=useRef(null);
 const models=data.models.filter(m=>m.is_active);
 const selection=models.filter(m=>Number(quantities[m.id]||0)>0);
 const amount=selection.reduce((s,m)=>{
   const n=Number(quantities[m.id]);
   return s+(Number.isSafeInteger(n)&&n>=6?subtotalCents(m.price_dozen_bs,n):0n);
 },0n);
 useEffect(()=>{if(localError)document.getElementById('operation-error')?.focus();},[localError]);
 function changeQuantity(id,value){requestId.current=null;setQuantities(prev=>({...prev,[id]:value}));setLocalError('');}
 async function submit(e){
  e.preventDefault();setLocalError('');
  try{
   if(!customerId)throw new Error('Selecciona un cliente antes de continuar.');
   const lines=checkedLines(models,quantities,data.stock);
   if(!requestId.current)requestId.current=uuid();
   const ok=mode==='reservation'?await onReservation(customerId,lines,requestId.current):await onOrder(customerId,lines,requestId.current);
   if(ok){requestId.current=null;setQuantities({});setCustomerId('');}
  }catch(err){
   setLocalError(err.message);
  }
 }
 return <>
  <SectionHead eyebrow="VENTAS MAYORISTAS" title="Prepara la operación."
   description="Elige un cliente, agrega modelos y revisa cantidades por docena, media docena o prendas adicionales."/>
  <div className="booking-layout">
   <div className="surface booking-form">
    <section className="form-section">
     <div className="form-section-title"><span className="step">1</span><div><h2>Cliente</h2><p>Vincula la operación a una ficha.</p></div></div>
     <div className="client-selection"><Field title="Comprador registrado"><select name="customerId" value={customerId}
       required onChange={e=>{setCustomerId(e.target.value);requestId.current=null;}}>
       <option value="">Selecciona una persona…</option>
       {data.customers.map(c=><option key={c.id} value={c.id}>{c.name} · {c.whatsapp}</option>)}
      </select></Field>
      <button type="button" className="button button-outline" onClick={()=>setAddClient(x=>!x)}>
        {addClient?'Cerrar':'＋ Nuevo cliente'}</button>
     </div>
     {customerId&&<div className="selected-client"><span className="avatar small">{initials(data.customers.find(c=>c.id===customerId)?.name)}</span><div>
      <b>{data.customers.find(c=>c.id===customerId)?.name}</b>
      <small>{data.customers.find(c=>c.id===customerId)?.whatsapp}</small></div></div>}
     {addClient&&<div className="inline-client"><ClientForm compact busy={busy} onCreate={async(n,p)=>{
       const ok=await onCreateClient(n,p);
       if(ok)setAddClient(false);
       return ok;
     }}/></div>}
    </section>
    <section className="form-section">
     <div className="form-section-title"><span className="step">2</span><div><h2>Seleccionar productos</h2>
      <p>El surtido corresponde al modelo completo, no a cantidades específicas por color.</p></div></div>
     {models.length?<div className="booking-products">{models.map(m=>{const stock=data.stock[m.id]||{};
      const q=Number(quantities[m.id])||0,active=q>0;
      return <div key={m.id} className={'booking-product '+(active?'active':'')}>
       <div className="booking-product-main"><ProductImage model={m}/>
        <div className="booking-product-info"><strong>{m.name}</strong>
          <span>Talla {m.size_label} · {formatBs(centsFromBs(m.price_dozen_bs))} / docena</span>
          <small>{stock.blocked?'Bloqueado por incidencia':rup(stock.available)+' disponibles'}</small></div>
        <QuantitySelector model={m} stock={stock} value={quantities[m.id]??'0'}
          onChange={v=>changeQuantity(m.id,v)}/>
       </div>
       <ModelColors model={m} colors={data.colors} compact/>
       {active&&<div className="booking-product-summary"><span>{quantityBreakdown(q)}</span>
        <strong>{q>=6&&Number.isSafeInteger(q)?formatBs(subtotalCents(m.price_dozen_bs,q)):'Mínimo 6 unidades'}</strong></div>}
      </div>;
     })}</div>:<Empty title="Sin productos activos" detail="Registra primero un modelo con stock."/>}
    </section>
    <section className="form-section">
     <div className="form-section-title"><span className="step">3</span><div><h2>Tipo de operación</h2>
      <p>Elige qué deseas registrar en la base de datos.</p></div></div>
     <div className="mode-choice">
      <label className={mode==='reservation'?'selected':''}>
       <input type="radio" name="operationType" value="reservation" checked={mode==='reservation'}
        onChange={()=>{setMode('reservation');requestId.current=null;}}/>
       <span><b>Reservar</b><small>Bloquea cupo hasta su vencimiento comercial.</small></span>
      </label>
      <label className={mode==='order'?'selected':''}>
       <input type="radio" name="operationType" value="order" checked={mode==='order'}
        onChange={()=>{setMode('order');requestId.current=null;}}/>
       <span><b>Pedido directo</b><small>Confirma el pedido y separa unidades pendientes de entrega.</small></span>
      </label>
     </div>
    </section>
    {localError&&<p className="form-error" role="alert" tabIndex={-1} id="operation-error">{localError}</p>}
   </div>
   <aside className="surface checkout">
    <p className="eyebrow">REVISIÓN ANTES DE GUARDAR</p><h2>Resumen de la operación</h2>
    <div className="checkout-customer"><span className="label-dim">Cliente</span>
      <strong>{data.customers.find(c=>c.id===customerId)?.name||'Aún no seleccionado'}</strong></div>
    <div className="checkout-lines">{selection.length?selection.map(m=>{const q=Number(quantities[m.id]);return <div className="checkout-line" key={m.id}>
      <div><b>{m.name}</b><small>{q} unidades · {quantityBreakdown(q)}</small></div>
      <strong>{Number.isSafeInteger(q)&&q>=6?formatBs(subtotalCents(m.price_dozen_bs,q)):'—'}</strong>
     </div>}):<p className="muted">Los modelos seleccionados aparecerán aquí.</p>}</div>
    <div className="checkout-total"><span>Importe total</span><strong>{formatBs(amount)}</strong></div>
    <p className="checkout-note">Precios calculados por modelo y sin descuento. Los colores son una referencia visual del surtido.</p>
    <form id="booking-submit" onSubmit={submit}><button className="button button-primary full" type="submit" disabled={busy||!selection.length}>
      {busy?'Registrando…':mode==='reservation'?'Guardar reserva':'Confirmar pedido'}
    </button></form>
   </aside>
  </div>
 </>;
}
function Reservations({data,onConvert,busy}){
 return <><SectionHead eyebrow="CUPOS RESERVADOS" title="Reservas en seguimiento."
    description="Los cupos siguen bloqueados mientras la reserva esté activa o en revisión."/>
  {data.reservations.length?<div className="record-list">{data.reservations.map(r=>{const c=data.customers.find(x=>x.id===r.customer_id);
   const canConvert=r.status==='saved'&&new Date(r.expires_at)>new Date();
   return <article className="record" key={r.id}><header className="record-head">
    <div className="record-name"><span className="avatar">{initials(c?.name)}</span><div><strong>{c?.name||'Cliente sin ficha'}</strong>
      <small>{c?.whatsapp||'—'}</small></div></div><Status value={r.status}/></header>
    <p className="record-dates">Registrada: {displayDate(r.created_at)} · Vence: <b>{displayDate(r.expires_at)}</b></p>
    <div className="record-lines">{r.lines.map(l=>{const m=data.models.find(x=>x.id===l.model_id);return <div key={l.model_id}>
      <span>{m?.name||'Modelo'} · Talla {m?.size_label||'—'}</span>
      <strong>{l.quantity} prendas <small>({quantityBreakdown(l.quantity)})</small></strong></div>})}</div>
    {canConvert&&<footer className="record-actions"><button disabled={busy} className="button button-outline"
      onClick={()=>onConvert(r.id)}>{busy?'Procesando…':'Convertir a pedido'}</button></footer>}
    {r.status==='in_review'&&<p className="small-note">Requiere revisión administrativa; no se libera el cupo automáticamente.</p>}
   </article>})}</div>:<Empty title="Aún no hay reservas" detail="Guarda una reserva desde Nueva operación."/>}
 </>;
}
function Orders({data}){
 return <><SectionHead eyebrow="PEDIDOS CONFIRMADOS" title="Desglose de pedidos."
   description="Las cantidades y precios por modelo quedan congelados al confirmar. Los colores no se comprometen individualmente."/>
  {data.orders.length?<div className="record-list">{data.orders.map(o=>{
   const customer=data.customers.find(x=>x.id===o.customer_id);
   const total=o.lines.reduce((sum,l)=>sum+centsFromBs(l.subtotal_bs),0n);
   return <article className="record order-record" key={o.id}>
    <header className="record-head"><div className="record-name"><span className="avatar">{initials(customer?.name)}</span>
      <div><strong>{customer?.name||'Cliente'}</strong><small>{customer?.whatsapp||'—'} · {displayDate(o.confirmed_at)}</small></div></div>
      <Status value={o.status}/></header>
    <div className="order-lines">{o.lines.map(l=>{const m=data.models.find(x=>x.id===l.model_id);return <div className="order-product" key={l.model_id}>
     {m&&<ProductImage model={m}/>}<div className="order-product-data"><strong>{m?.name||'Modelo'}</strong>
      <small>Talla {m?.size_label||'—'} · {l.quantity} unidades · {quantityBreakdown(l.quantity)}</small>
      {m&&<ModelColors model={m} colors={data.colors} compact/>}
     </div><div className="order-line-price"><small>{formatBs(centsFromBs(l.price_dozen_bs))} / doc.</small><strong>{formatBs(centsFromBs(l.subtotal_bs))}</strong></div>
    </div>})}</div>
    <footer className="order-total"><span>Total del pedido</span><strong>{formatBs(total)}</strong></footer>
    <p className="small-note">Registro real de pedido. Los módulos de aprobación de pagos y entregas están pendientes de habilitación; no marcar como completado desde esta pantalla.</p>
   </article>
   })}</div>:<Empty title="Aún no hay pedidos" detail="Crea un pedido directo o convierte una reserva vigente."/>}
 </>;
}
function Login({onLogin,busy,error}){
 const [email,setEmail]=useState(''),[password,setPassword]=useState('');
 return <main className="login-screen"><section className="login-card">
  <div className="brand brand-large"><span className="brand-icon">E</span><div><b>EVALIA</b><small>GESTIÓN COMERCIAL</small></div></div>
  <p className="eyebrow">ACCESO ADMINISTRATIVO</p><h1>Tu catálogo, tus pedidos, tu control.</h1>
  <p className="description">Inicia sesión para trabajar con información real de tu base de datos Supabase.</p>
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
 const db=useMemo(()=>getSupabase(),[]);
 const configured=Boolean(db);
 const refresh=useCallback(async()=>{const snapshot=await loadWorkspace();setData(snapshot);},[]);
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
 const addColor=(name,hex)=>mutation(()=>createColor(name,hex),'Color registrado.');
 const addClient=(name,phone)=>mutation(()=>createCustomer(name,phone),'Cliente registrado.');
 const updateStock=(modelId,operation,units,version,requestId)=>
  mutation(()=>adjustStock({modelId,operation,units,version,requestId:requestId||uuid()}),'Stock actualizado.');
 const reserve=(customerId,lines,requestId)=>mutation(()=>createReservation(customerId,lines,requestId||uuid()),'Reserva guardada y cupo comprometido.');
 const order=(customerId,lines,requestId)=>mutation(()=>createOrder(customerId,lines,requestId||uuid()),'Pedido confirmado con precios congelados.');
 const convert=(id)=>mutation(()=>confirmReservation(id,uuid()),'Reserva convertida en pedido sin doble descuento de stock.');
 if(!configured)return <main className="setup-screen"><section className="setup-card">
  <span className="brand-icon">E</span><h1>Configuración de EVALIA</h1>
  <p>La aplicación operativa no tiene conexión a Supabase. Configura <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> según <code>web/.env.example</code>, aplica y valida las migraciones.</p>
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
    {error&&<Notice type="error" onClose={()=>setError('')}>{error}</Notice>}
    {message&&<Notice type="success" onClose={()=>setMessage('')}>{message}</Notice>}
    {!data?<div className="loading">{error?'No se pudieron obtener los registros. Revisa el error y pulsa Actualizar.':'Cargando productos y registros…'}</div>:
      tab==='home'?<Dashboard data={data} setTab={setTab}/>:
      tab==='catalog'?<Catalog data={data} onCreateColor={addColor} onCreateModel={addModel} onAdjust={updateStock} busy={busy}/>:
      tab==='booking'?<BookingPanel data={data} onReservation={reserve} onOrder={order} onCreateClient={addClient} setTab={setTab} busy={busy}/>:
      tab==='reservations'?<Reservations data={data} onConvert={convert} busy={busy}/>:
      tab==='orders'?<Orders data={data}/>:
      <ClientPanel data={data} onCreate={addClient} busy={busy}/>}
   </main>
   <footer className="footer">EVALIA · Destaca en cada detalle <span>Panel administrativo · Moneda Bs · Zona horaria Bolivia</span></footer>
  </div>
  <nav className="mobile-nav" aria-label="Navegación móvil">{MENU.filter(x=>x[0]!=='home').map(([id,label,sign])=>
   <button key={id} aria-current={tab===id?'page':undefined} onClick={()=>setTab(id)} className={tab===id?'active':''}>
    <span>{sign}</span><small>{label.replace('Nueva operación','Registrar')}</small></button>)}</nav>
 </div>;
}

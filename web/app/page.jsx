'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  authUser, adminAllowed, signIn, signOut, loadWorkspace, reviseReservation, createColor,
  createCustomer, createModel, uploadPhoto, adjustStock, createReservation,
  createOrder, confirmReservation
} from '../lib/api.js';
import { getSupabase } from '../lib/supabase.js';
import {
  centsFromBs, subtotalCents, formatBs, quantityBreakdown, checkedPortions, portionQuantity, portionBreakdown, inventoryTotals
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
function BookingPanel({data,onReservation,onOrder,onUpdate,onCloseEdit,editReservation,onCreateClient,busy}){
 const [customerId,setCustomerId]=useState(editReservation?.customer_id||'');
 const [customerSearch,setCustomerSearch]=useState('');
 const [productSearch,setProductSearch]=useState('');
 const [portions,setPortions]=useState(()=>editReservation?
  Object.fromEntries(editReservation.lines.filter(l=>l.dozen_count!==null&&l.dozen_count!==undefined)
   .map(l=>[l.model_id,{dozens:String(l.dozen_count),extraColorIds:l.extraColorIds||[]}])):{});
 const [mode,setMode]=useState(editReservation?'edit':'reservation'),[localError,setLocalError]=useState('');
 const [addClient,setAddClient]=useState(false);
 const requestId=useRef(null);
 const models=data.models.filter(m=>m.is_active);
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
 useEffect(()=>{if(localError)document.getElementById('operation-error')?.focus();},[localError]);
 function editPortion(id,value){requestId.current=null;setPortions(v=>({...v,[id]:value}));setLocalError('');}
 function addModel(model){requestId.current=null;
  const stock=data.stock[model.id]||{},available=Number(stock.available)||0;
  setPortions(v=>({...v,[model.id]:{dozens:available>=12?'1':'0',extraColorIds:[]}}));
  setLocalError('');
 }
 function removeModel(id){requestId.current=null;setPortions(current=>{
  const copy={...current};delete copy[id];return copy;
 });setLocalError('');}
 async function submit(e){
  e.preventDefault();setLocalError('');
  try{
   if(!customerId)throw new Error('Selecciona un cliente antes de continuar.');
   const lines=checkedPortions(models,portions,data.stock,data.colors);
   if(!requestId.current)requestId.current=uuid();
   const ok=mode==='edit'?await onUpdate(editReservation.id,lines,requestId.current):
    mode==='reservation'?await onReservation(customerId,lines,requestId.current):await onOrder(customerId,lines,requestId.current);
   if(ok){requestId.current=null;setPortions({});setCustomerId('');setCustomerSearch('');if(editReservation)onCloseEdit();}
  }catch(err){setLocalError(err.message);}
 }
 return <>
  <SectionHead eyebrow="VENTAS MAYORISTAS" title={editReservation?'Editar reserva':'Arma la reserva o el pedido.'}
   description={editReservation?'Modifica los modelos, docenas y colores elegidos. El sistema compara con el cupo reservado anterior y guarda historial.':'Agrega modelos, indica las docenas surtidas y elige los colores para cada prenda adicional. La disponibilidad se controla por modelo.'}
   actions={editReservation&&<button className="button button-outline" type="button" onClick={onCloseEdit}>← Volver a reservas</button>}/>
  <div className="booking-layout">
   <div className="surface booking-form">
    <section className="form-section">
     <div className="form-section-title"><span className="step">1</span><div><h2>Identificar cliente</h2>
      <p>Busca por WhatsApp o por nombre. El registro es administrativo.</p></div></div>
     <div className="customer-chooser">
      <label className="search"><span aria-hidden="true">⌕</span>
       <input type="search" aria-label="Buscar clientes por nombre o WhatsApp" autoComplete="off"
        placeholder="Buscar cliente por WhatsApp…" value={customerSearch}
        onChange={e=>setCustomerSearch(e.target.value)}/></label>
      <div className="client-selection"><Field title="Cliente para esta operación">
       <select name="customerId" value={customerId} required
        disabled={Boolean(editReservation)} onChange={e=>{setCustomerId(e.target.value);requestId.current=null;}}>
        <option value="">Selecciona un cliente…</option>
        {chosenCustomer&&!matchedCustomers.some(c=>c.id===chosenCustomer.id)&&
          <option value={chosenCustomer.id}>{chosenCustomer.name} · {chosenCustomer.whatsapp}</option>}
        {matchedCustomers.map(c=><option key={c.id} value={c.id}>{c.name} · {c.whatsapp}</option>)}
       </select></Field>
       {!editReservation&&<button type="button" className="button button-outline" onClick={()=>setAddClient(x=>!x)}>
        {addClient?'Cerrar ficha':'＋ Nuevo cliente'}</button>}
      </div>
     </div>
     {chosenCustomer&&<div className="selected-client">
       <span className="avatar small">{initials(chosenCustomer.name)}</span><div>
         <b>{chosenCustomer.name}</b><small>{chosenCustomer.whatsapp}</small></div></div>}
     {addClient&&<div className="inline-client"><ClientForm compact busy={busy}
       onCreate={async(n,p)=>{const ok=await onCreateClient(n,p);if(ok){setAddClient(false);setCustomerSearch(p);}return ok;}}/></div>}
    </section>
    <section className="form-section">
     <div className="form-section-title"><span className="step">2</span><div><h2>Agregar modelos</h2>
      <p>Un mismo pedido puede contener modelos con cantidades y tallas diferentes.</p></div></div>
     <label className="search model-search"><span aria-hidden="true">⌕</span>
      <input type="search" aria-label="Buscar modelos para añadir" placeholder="Buscar modelo o talla…"
       value={productSearch} onChange={e=>setProductSearch(e.target.value)}/></label>
     {availableModels.length?<div className="product-picker">{availableModels.map(m=>{
      const st=data.stock[m.id]||{},available=Number(st.available)||0;
      return <div key={m.id} className="picker-item">
       <ProductImage model={m}/>
       <div className="picker-info"><b>{m.name}</b><small>Talla {m.size_label} · {formatBs(centsFromBs(m.price_dozen_bs))}/doc.</small>
        <span className={st.blocked?'error-text':'positive-text'}>{st.blocked?'Incidencia · bloqueado':available+' prendas disponibles'}</span>
       </div><button type="button" className="button button-outline" disabled={!available||st.blocked}
        onClick={()=>addModel(m)}>＋ Agregar</button>
      </div>})}</div>:<p className="muted">{models.length?'Todos los modelos coincidentes están agregados.':'Todavía no hay productos activos.'}</p>}
     <div className="cart-subhead"><h3>Modelos en la operación</h3><span>{chosen.length} modelo(s) · {totalItems} prendas</span></div>
     {chosen.length?<div className="cart-models">{chosen.map(m=>
      <PortionEditor key={m.id} model={m} colors={data.colors} stock={data.stock[m.id]||{}}
       selection={portions[m.id]} onChange={v=>editPortion(m.id,v)} onRemove={()=>removeModel(m.id)}/>
     )}</div>:<Empty title="Aún no agregaste modelos" detail="Elige uno o varios productos del catálogo superior."/>}
    </section>
    <section className="form-section">
     <div className="form-section-title"><span className="step">3</span><div><h2>Guardar como reserva o pedido</h2>
      <p>Antes de confirmar, revisa los colores individuales y el precio por modelo.</p></div></div>
     {editReservation?<Notice>Editar no libera cupo hasta guardar. Cada cambio queda registrado en el historial de reserva.</Notice>:<div className="mode-choice">
      <label className={mode==='reservation'?'selected':''}>
       <input type="radio" name="operationType" value="reservation" checked={mode==='reservation'}
        onChange={()=>{setMode('reservation');requestId.current=null;}}/>
       <span><b>Reserva</b><small>Bloquea unidades globales hasta la feria correspondiente.</small></span>
      </label>
      <label className={mode==='order'?'selected':''}>
       <input type="radio" name="operationType" value="order" checked={mode==='order'}
        onChange={()=>{setMode('order');requestId.current=null;}}/>
       <span><b>Pedido directo</b><small>Congela los importes y conserva las prendas pendientes de entrega.</small></span>
      </label>
     </div>}
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
    <div className="checkout-total"><span>Importe total</span><strong>{formatBs(amount)}</strong></div>
    <p className="checkout-note">Las docenas son surtidas. Se registran los colores de las prendas adicionales, una por color. La disponibilidad física por color se verifica fuera del sistema.</p>
    <form id="booking-submit" onSubmit={submit}>
     <button className="button button-primary full" type="submit" disabled={busy||!chosen.length}>
      {busy?'Guardando…':mode==='edit'?'Guardar cambios de la reserva':mode==='reservation'?'Guardar reserva':'Confirmar pedido'}
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
function reservationMessage(res,customer,data){
 const lines=res.lines.map(l=>{
  const model=data.models.find(m=>m.id===l.model_id);
  const colors=(l.extraColorIds||[]).map(id=>data.colors.find(c=>c.id===id)?.name||'Color registrado');
  const body=l.dozen_count===null||l.dozen_count===undefined?
    l.quantity+' prendas':
    portionBreakdown(Number(l.dozen_count),Number(l.extra_units));
  return '• '+(model?.name||'Modelo')+' (talla '+(model?.size_label||'—')+'): '+body+
   (colors.length?'; colores individuales: '+colors.join(', '):'');
 });
 return 'Reserva EVALIA\nReferencia: '+res.id+
   '\nCliente: '+(customer?.name||'Cliente')+
   '\n'+lines.join('\n')+
   '\nVence: '+displayDate(res.expires_at)+
   '\nLas docenas son surtidas. Los colores individuales elegidos se verifican físicamente antes de confirmarlos.';
}
function Reservations({data,onConvert,onEdit,busy}){
 const [copied,setCopied]=useState('');
 async function copyDetails(r,customer){
  try{
   await navigator.clipboard.writeText(reservationMessage(r,customer,data));
   setCopied(r.id);
  }catch{setCopied('error:'+r.id);}
 }
 return <><SectionHead eyebrow="CUPOS RESERVADOS" title="Reservas en seguimiento."
    description="Los colores individuales se conservan en el registro. El cupo se calcula sobre las prendas totales por modelo."/>
  {data.reservations.length?<div className="record-list">{data.reservations.map(r=>{const c=data.customers.find(x=>x.id===r.customer_id);
   const canConvert=r.status==='saved'&&new Date(r.expires_at)>new Date();
   return <article className="record" key={r.id}><header className="record-head">
    <div className="record-name"><span className="avatar">{initials(c?.name)}</span><div><strong>{c?.name||'Cliente sin ficha'}</strong>
      <small>{c?.whatsapp||'—'}</small></div></div><Status value={r.status}/></header>
    <p className="record-dates">Referencia: <code>{r.id}</code><br/>
      Registrada: {displayDate(r.created_at)} · Vence: <b>{displayDate(r.expires_at)}</b></p>
    <div className="record-lines">{r.lines.map(l=>{const m=data.models.find(x=>x.id===l.model_id);return <div key={l.model_id} className="record-line-detail">
      <div><b>{m?.name||'Modelo'} · Talla {m?.size_label||'—'}</b>
        <LineComposition line={l} colors={data.colors} compact/></div>
      <strong>{l.quantity} prendas</strong>
    </div>})}</div>
    <footer className="record-actions">
      <button type="button" className="button button-outline" onClick={()=>copyDetails(r,c)}>▣ Copiar para WhatsApp</button>
      {canConvert&&r.lines.every(l=>l.dozen_count!==null&&l.dozen_count!==undefined)&&
        <button disabled={busy} className="button button-outline" onClick={()=>onEdit(r)}>✎ Editar</button>}
      {canConvert&&<button disabled={busy} className="button button-primary" onClick={()=>onConvert(r.id)}>
        {busy?'Procesando…':'Confirmar como pedido'}</button>}
    </footer>
    {copied===r.id&&<p className="small-note" role="status">Texto copiado. Puedes enviarlo manualmente por WhatsApp.</p>}
    {copied==='error:'+r.id&&<p className="form-error" role="alert">No se pudo copiar; verifica los permisos del navegador.</p>}
    {data.revisions?.some(x=>x.reservation_id===r.id)&&<p className="small-note">
      Modificaciones auditadas: {data.revisions.filter(x=>x.reservation_id===r.id).length} ·
      Última: {displayDate(data.revisions.find(x=>x.reservation_id===r.id)?.created_at)}
    </p>}
    {r.status==='in_review'&&<p className="small-note">Requiere revisión administrativa; no se libera el cupo automáticamente.</p>}
   </article>})}</div>:<Empty title="Aún no hay reservas" detail="Guarda una reserva desde Nueva operación."/>}
 </>;
}
function Orders({data}){
 return <><SectionHead eyebrow="PEDIDOS CONFIRMADOS" title="Desglose de pedidos."
   description="Cada modelo conserva docenas, prendas individuales con sus colores y el importe histórico confirmado."/>
  {data.orders.length?<div className="record-list">{data.orders.map(o=>{
   const customer=data.customers.find(x=>x.id===o.customer_id);
   const total=o.lines.reduce((sum,l)=>sum+centsFromBs(l.subtotal_bs),0n);
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
    <p className="small-note">Los colores individuales están registrados, pero el inventario no lleva existencias por color. Los módulos de verificación de pagos y entregas todavía no están habilitados.</p>
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
 const [editingReservation,setEditingReservation]=useState(null);
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
 useEffect(()=>{if(tab!=='booking'&&editingReservation)setEditingReservation(null);},[tab,editingReservation]);
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
 const addColor=(name,hex)=>mutation(()=>createColor(name,hex),'Color registrado.');
 const addClient=(name,phone)=>mutation(()=>createCustomer(name,phone),'Cliente registrado.');
 const updateStock=(modelId,operation,units,version,requestId)=>
  mutation(()=>adjustStock({modelId,operation,units,version,requestId:requestId||uuid()}),'Stock actualizado.');
 const reserve=(customerId,lines,requestId)=>mutation(()=>createReservation(customerId,lines,requestId||uuid()),'Reserva guardada y cupo comprometido.');
 const order=(customerId,lines,requestId)=>mutation(()=>createOrder(customerId,lines,requestId||uuid()),'Pedido confirmado con precios congelados.');
 const convert=(id)=>mutation(()=>confirmReservation(id,uuid()),'Reserva convertida en pedido sin doble descuento de stock.');
 const revise=(id,lines,requestId)=>mutation(()=>reviseReservation(id,lines,requestId),'Reserva actualizada; historial y cupo revisados.');
 const openEdit=(reservation)=>{setEditingReservation(reservation);setTab('booking');};
 const closeEdit=()=>{setEditingReservation(null);setTab('reservations');};
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
      tab==='booking'?<BookingPanel key={editingReservation?.id||'new'} data={data} editReservation={editingReservation}
       onReservation={reserve} onOrder={order} onUpdate={revise} onCloseEdit={closeEdit} onCreateClient={addClient} busy={busy}/>: 
      tab==='reservations'?<Reservations data={data} onConvert={convert} onEdit={openEdit} busy={busy}/>: 
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

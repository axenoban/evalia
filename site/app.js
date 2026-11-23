import {
 STORAGE_KEY,exampleState,checkState,stockOf,money,toCents,subtotalCents,orderTotal,customerBalance,
 pendingDelivery,localParts,addColor,addCustomer,createModel,adjustStock,reportShortage,reserve,
 directOrder,convertReservation,registerPayment,approvePayment,rejectPayment,deliver,completeOrder,processExpirations
} from './domain.js';

const $=q=>document.querySelector(q), $$=q=>[...document.querySelectorAll(q)];
const escapeHTML=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtCount=n=>Number(n).toLocaleString('es-BO');
const svg=(name,size=20)=>{
 const paths={
  grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  box:'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/>',
  bookmark:'<path d="M5 4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v18l-7-5-7 5V4Z"/>',
  bag:'<path d="M4 8h16l-1.3 12H5.3L4 8ZM9 9V6a3 3 0 0 1 6 0v3"/>',
  users:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  arrow:'<path d="m5 12 14 0m-6-6 6 6-6 6"/>',
  chevron:'<path d="m9 18 6-6-6-6"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
  alert:'<path d="m12 3 10 18H2L12 3Zm0 7v4m0 3h.01"/>',
  check:'<path d="m4 12 5 5L20 6"/>',
  close:'<path d="m5 5 14 14M19 5 5 19"/>',
  spark:'<path d="m12 2 1.7 7.3L21 11l-7.3 1.7L12 20l-1.7-7.3L3 11l7.3-1.7L12 2Z"/>',
  sliders:'<path d="M4 7h16M4 17h16M8 4v6M16 14v6"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  wallet:'<rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 9V5a2 2 0 0 1 2-2h13M16 15h5"/>',
  layers:'<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 17l9 5 9-5"/>',
  refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.2 9a7 7 0 0 1 12-2L20 12M4 12l2.8 5a7 7 0 0 0 12-2"/>',
  external:'<path d="M13 4h7v7M20 4l-9 9"/><path d="M19 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4"/>'
 };
 return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.grid}</svg>`;
};
const nav=[['dashboard','Resumen','grid'],['catalog','Catálogo','layers'],['booking','Nueva reserva','plus'],['reservations','Reservas','bookmark'],['orders','Pedidos','bag'],['customers','Clientes','users'],['settings','Simulación','sliders']];
let page='dashboard',modal=null, filter='', state, offset=0;
try{offset=Number(localStorage.getItem('evalia-demo-clock')||0)||0;}catch{}
const now=()=>new Date(Date.now()+offset).toISOString();
function load(){
 try{const raw=localStorage.getItem(STORAGE_KEY);if(raw){const parsed=JSON.parse(raw);checkState(parsed);return parsed;}}catch(e){console.warn('Estado local inválido',e);}
 return exampleState();
}
function save(next){checkState(next);state=next;try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(e){console.warn(e);toast('No se pudo guardar en este navegador; libera almacenamiento.',true);}render();}
function toast(text,bad=false){const el=$('#toast');el.textContent=text;el.className=bad?'visible bad':'visible';clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.className='',4200);}
function act(fn,msg='Cambios guardados'){try{const next=fn(state);save(next);if(next!==state||msg)toast(msg);}catch(e){toast(e?.message||'No se pudo completar la operación.',true);}}
const model=id=>state.models.find(m=>m.id===id);
const customer=id=>state.customers.find(c=>c.id===id);
const dateshort=s=>new Intl.DateTimeFormat('es-BO',{timeZone:'America/La_Paz',day:'2-digit',month:'short',year:'numeric'}).format(new Date(s));
const datefull=s=>new Intl.DateTimeFormat('es-BO',{timeZone:'America/La_Paz',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(s));
const docena=n=>`${fmtCount(n)} prendas · ${(n/12).toLocaleString('es-BO',{maximumFractionDigits:2})} doc.`;
const priceById=(m,q)=>subtotalCents(m.priceDozenCents,q);
const colorHex={'Negro':'#353036','Rosa empolvado':'#D9AFB9','Marfil':'#EEE4D9','Ciruela':'#6C485F','Azul':'#7287A7','Verde':'#78947C','Beige':'#C4AC92','Blanco':'#FFFFFF','Rojo':'#B65E64','Gris':'#A8A6A7'};
function colorsHtml(m){return `<div class="colors">${(m.colorIds||[]).map(id=>{const c=state.colors.find(x=>x.id===id);return c?`<span title="${escapeHTML(c.name)}" class="swatch" style="background:${colorHex[c.name]||'#B9ADAF'}"></span>`:''}).join('')}<span class="muted tiny">${m.colorIds?.length||0} colores</span></div>`;}
function badges(label,kind='neutral'){return `<span class="status status-${kind}">${escapeHTML(label)}</span>`;}
function stockLabel(s){return s.blocked?badges('Revisión','danger'):s.available===0?badges('Agotado','warn'):s.available<=12?badges('Bajo stock','warn'):badges('Disponible','success');}
function cover(m,large=false){const text=escapeHTML(m.name.slice(-1));return m.image?`<img class="product-img ${large?'large':''}" src="${m.image}" alt="Imagen de ${escapeHTML(m.name)}" />`:`<div class="product-img placeholder ${large?'large':''}"><span class="decor decor-one"></span><span class="decor decor-two"></span><span class="decor-mark">E</span><span class="decor-text">EVALIA · DEMO</span></div>`;}
const empty=(title,description,button='')=>`<div class="empty">${svg('box',42)}<h3>${escapeHTML(title)}</h3><p>${escapeHTML(description)}</p>${button}</div>`;
const btn=(label,cmd,id,variation='subtle')=>`<button class="btn btn-${variation}" data-action="${cmd}" data-id="${escapeHTML(id||'')}">${label}</button>`;
function render(){
 const root=$('#root');
 const title=nav.find(n=>n[0]===page)?.[1]||'Resumen';
 root.innerHTML=`
 <div class="app-shell">
  <aside class="sidebar">
   <div class="brand"><div class="brand-mark">E<span>·</span></div><div class="brand-word">EVALIA<small>GESTIÓN COMERCIAL</small></div></div>
   <div class="brand-rule"></div><span class="nav-section">ESPACIO DE TRABAJO</span>
   <nav aria-label="Menú principal">${nav.map(([id,label,ico])=>`<button class="nav-link ${page===id?'selected':''}" data-page="${id}">${svg(ico,19)} <span>${label}</span>${id==='reservations'&&state.reservations.filter(r=>r.status==='saved').length?`<b class="nav-count">${state.reservations.filter(r=>r.status==='saved').length}</b>`:''}</button>`).join('')}</nav>
   <div class="side-bottom"><div class="side-dot"></div><div><b>Modo demostración</b><small>Datos locales, sin conexión bancaria</small></div></div>
  </aside>
  <div class="workspace">
   <header class="topbar"><div class="breadcrumbs"><span>EVALIA</span>${svg('chevron',14)}<strong>${escapeHTML(title)}</strong></div><div class="header-actions"><span class="top-demo">${svg('spark',15)} DATOS DE PRUEBA</span><div class="user-avatar">EV</div></div></header>
   <div class="notice">${svg('alert',17)} <span><b>Vista de prueba.</b> Los modelos, clientes y abonos son ficticios; los cambios solo se guardan en este navegador. No uses información personal real.</span></div>
   <main id="main">${content()}</main>
   <footer class="footer">EVALIA · Destaca en cada detalle <span>Prototipo interactivo — sin Supabase activo</span></footer>
  </div>
 </div>
 <nav class="mobile-nav" aria-label="Menú móvil">${[['dashboard','Inicio','grid'],['catalog','Modelos','layers'],['booking','Crear','plus'],['reservations','Reservas','bookmark'],['orders','Pedidos','bag'],['settings','Más','sliders']].map(([id,label,ico])=>`<button class="${page===id?'selected':''}" data-page="${id}">${svg(ico,19)}<span>${label}</span></button>`).join('')}</nav>
 ${modal?modalHtml():''}`;
 if(page==='booking')updateBookingSummary();
}
function content(){switch(page){case 'catalog':return catalog();case 'booking':return booking();case 'reservations':return reservations();case 'orders':return orders();case 'customers':return customers();case 'settings':return settings();default:return dashboard();}}
const pageHead=(eyebrow,title,sub,actions='')=>`<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${sub}</p></div>${actions?`<div class="page-actions">${actions}</div>`:''}</div>`;
function dashboard(){
 const units=state.models.reduce((s,m)=>s+Math.max(0,stockOf(state,m.id).available),0);
 const activeR=state.reservations.filter(r=>r.status==='saved'||r.status==='in_review').length;
 const activeO=state.orders.filter(o=>o.status==='active').length;
 const reserved=state.models.reduce((s,m)=>s+stockOf(state,m.id).reserved,0);
 const kpis=[{icon:'layers',name:'Modelos activos',value:state.models.filter(m=>m.active).length,note:'En el catálogo'},{icon:'box',name:'Prendas disponibles',value:fmtCount(units),note:`${fmtCount(reserved)} comprometidas en reservas`},{icon:'bookmark',name:'Reservas vigentes',value:activeR,note:'Pendientes de confirmación'},{icon:'bag',name:'Pedidos activos',value:activeO,note:'Pendientes de entrega o cierre'}];
 return `${pageHead('VISIÓN GENERAL','Tu negocio, de un vistazo.','Administra modelos, apartados y entregas desde un mismo lugar.',`${btn(`${svg('plus',17)} Nueva reserva`,'navigate','booking','primary')}`)}
 <section class="stat-grid">${kpis.map(k=>`<article class="stat-card"><div class="stat-top"><span>${k.name}</span><span class="stat-icon">${svg(k.icon,19)}</span></div><div class="stat-value">${k.value}</div><div class="stat-note">${k.note}</div></article>`).join('')}</section>
 <div class="dash-grid"><section class="panel wide"><div class="panel-head"><div><h2>Estado del inventario</h2><p>Existencias por modelo, sin desglose por color.</p></div>${btn('Ver catálogo','navigate','catalog')}</div>${stockTable()}</section>
 <section class="panel"><div class="panel-head"><div><h2>Actividad reciente</h2><p>Últimos movimientos registrados.</p></div></div>${state.stockEvents.length?`<div class="activity">${state.stockEvents.slice(0,6).map(e=>`<div class="activity-item"><span class="activity-icon">${svg(e.delta>=0?'plus':'arrow',17)}</span><div><strong>${e.operation==='initial'?'Alta inicial':e.operation==='add'?'Reposición':e.operation==='physical_sale'?'Ajuste por venta':e.operation==='set_total'?'Corrección de stock':'Entrega registrada'}</strong><small>${escapeHTML(model(e.modelId)?.name||'Modelo')} · ${dateshort(e.at)}</small></div><b class="${e.delta<0?'negative':'positive'}">${e.delta>0?'+':''}${e.delta}</b></div>`).join('')}</div>`:empty('Sin movimientos','Los cambios de inventario aparecerán aquí.')}</section></div>
 <section class="callout-line"><div class="callout-symbol">${svg('spark',24)}</div><div><h3>Inventario sin complicaciones</h3><p>Registra únicamente las prendas que deseas comprometer. Los colores se muestran en el catálogo, sin control de cantidad individual.</p></div>${btn('Añadir modelo','new-model','', 'outline')}</section>`;
}
function stockTable(){
 if(!state.models.length)return empty('No hay modelos','Registra un modelo para comenzar.',btn('Añadir modelo','new-model','', 'primary'));
 return `<div class="table-scroll"><table class="data-table"><thead><tr><th>MODELO</th><th>PUBLICADAS</th><th>RESERVADAS</th><th>PEDIDOS</th><th>DISPONIBLES</th><th>ESTADO</th></tr></thead><tbody>${state.models.map(m=>{const s=stockOf(state,m.id);return `<tr><td><div class="table-name"><span class="mini-initial">${escapeHTML(m.name.slice(-1))}</span><div><b>${escapeHTML(m.name)}</b><small>Talla ${escapeHTML(m.size)}</small></div></div></td><td>${s.onHand}</td><td>${s.reserved}</td><td>${s.pending}</td><td><b>${s.available}</b></td><td>${stockLabel(s)}</td></tr>`;}).join('')}</tbody></table></div>`;
}
function catalog(){
 const selected=state.models.filter(m=>m.name.toLowerCase().includes(filter.toLowerCase())||m.size.toLowerCase().includes(filter.toLowerCase()));
 return `${pageHead('COLECCIÓN / ADMINISTRACIÓN','Catálogo de modelos','Cada modelo tiene una talla, un precio de docena y un único inventario total.',`${btn(`${svg('plus',18)} Añadir modelo`,'new-model','', 'primary')}`)}
 <div class="catalog-toolbar"><div class="search-wrap">${svg('search',18)}<input id="model-filter" placeholder="Buscar por modelo o talla…" value="${escapeHTML(filter)}" aria-label="Buscar modelo"/></div><div class="minor-info">${state.models.length} modelos registrados</div></div>
 ${selected.length?`<div class="product-grid">${selected.map(m=>{const st=stockOf(state,m.id);return `<article class="product-card">${cover(m)}<div class="product-body"><div class="product-overline"><span>TALLA ${escapeHTML(m.size)}</span>${stockLabel(st)}</div><h3>${escapeHTML(m.name)}</h3><div class="product-price">${money(m.priceDozenCents)}<span> / docena</span></div>${colorsHtml(m)}<div class="product-divider"></div><div class="product-stock"><div><small>DISPONIBLE</small><b>${st.available} <span>prendas</span></b></div><div class="align-right"><small>PUBLICADO</small><b>${st.onHand} <span>prendas</span></b></div></div><div class="product-actions">${btn(`${svg('sliders',16)} Ajustar stock`,'stock',m.id,'outline')}${btn(svg('alert',17),'shortage',m.id)}</div></div></article>`;}).join('')}</div>`:empty('No hay resultados','Prueba otro término o añade un modelo.',btn('Añadir modelo','new-model','', 'primary'))}`;
}
function booking(){
 return `${pageHead('OPERACIONES / MAYORISTAS','Preparar reserva o pedido','Selecciona un cliente y las cantidades por modelo. Mínimo: 6 unidades por cada modelo.')}
 <div class="create-layout"><form id="booking-form" class="panel form-panel"><div class="block-heading"><span class="step-number">01</span><div><h2>Cliente</h2><p>Selecciona una ficha existente o crea una nueva.</p></div></div>
 <div class="inline-select"><label class="field"><span>Cliente</span><select name="customerId" required><option value="">Seleccionar cliente</option>${state.customers.map(c=>`<option value="${c.id}">${escapeHTML(c.name)} · ${escapeHTML(c.whatsapp)}</option>`).join('')}</select></label>${btn(`${svg('plus',17)} Nuevo`,'new-customer','')}</div>
 <div class="section-divider"></div><div class="block-heading"><span class="step-number">02</span><div><h2>Seleccionar modelos</h2><p>Deja en cero los modelos que no quieras incluir.</p></div></div>
 ${state.models.length?`<div class="booking-lines">${state.models.filter(m=>m.active).map(m=>{const st=stockOf(state,m.id);return `<div class="booking-line"><div class="booking-photo">${cover(m)}</div><div class="booking-line-detail"><b>${escapeHTML(m.name)}</b><span>Talla ${escapeHTML(m.size)} · ${money(m.priceDozenCents)} / doc.</span><small>${st.available} prendas libres</small></div><label class="qty-field"><span>UNIDADES</span><input class="booking-qty" name="qty:${m.id}" type="number" min="0" step="1" max="${Math.max(0,st.available)}" value="0" ${st.available<6||st.blocked?'disabled':''}></label></div>`;}).join('')}</div>`:empty('No hay modelos','Primero añade un modelo al catálogo.')}
 <div class="section-divider"></div><div class="block-heading"><span class="step-number">03</span><div><h2>Tipo de operación</h2><p>Una reserva bloquea cupo; el pedido directo se confirma inmediatamente.</p></div></div>
 <div class="radio-cards"><label><input type="radio" name="mode" value="reserve" checked/><span>${svg('bookmark',19)}<b>Guardar reserva</b><small>Vence en próxima fecha de feria aplicable.</small></span></label><label><input type="radio" name="mode" value="order"/><span>${svg('bag',19)}<b>Pedido directo</b><small>Queda activo para abonos y entrega.</small></span></label></div>
 <button class="btn btn-primary full" type="submit">${svg('check',18)} Confirmar operación ${svg('arrow',16)}</button>
 </form><aside class="panel summary-panel"><span class="eyebrow">RESUMEN DE OPERACIÓN</span><div id="booking-summary"></div><div class="hint-box">${svg('alert',18)} <p>Los colores ofrecidos no garantizan una combinación específica en cada docena. Los pedidos especiales se coordinan fuera de esta demo.</p></div></aside></div>`;
}
function updateBookingSummary(){const el=$('#booking-summary');if(!el)return;let total=0,count=0,lines=[];for(const input of $$('.booking-qty')){const q=Number(input.value),m=model(input.name.slice(4));if(!m||!Number.isInteger(q)||q<=0)continue;count+=q;if(q>=6){const p=priceById(m,q);total+=p;lines.push(`<div class="summary-row"><span>${escapeHTML(m.name)} <small>× ${q}</small></span><b>${money(p)}</b></div>`);}else lines.push(`<div class="summary-row warning"><span>${escapeHTML(m.name)} <small>× ${q}, mínimo 6</small></span><b>—</b></div>`);}el.innerHTML=`<div class="summary-amount">${money(total)}</div><span class="muted tiny">Total mayorista estimado</span><div class="summary-rule"></div>${lines.join('')||'<p class="muted">Selecciona al menos 6 prendas de un modelo para ver el total.</p>'}<div class="summary-rule"></div><div class="summary-row"><span>Unidades seleccionadas</span><strong>${count}</strong></div><div class="summary-row"><span>Descuentos</span><strong>No aplican en V1</strong></div>`;}
function reservations(){const items=state.reservations;
 return `${pageHead('CONTROL DE CUPOS','Reservas','Las existencias reservadas no se descuentan físicamente hasta entregar el pedido.',btn(`${svg('plus',17)} Nueva reserva`,'navigate','booking','primary'))}
 <div class="panel list-panel">${items.length?items.map(r=>{const c=customer(r.customerId),payments=state.payments.filter(p=>p.reservationId===r.id);const pending=payments.filter(p=>p.status==='pending');return `<article class="record-row"><div class="record-left"><span class="record-icon">${svg('bookmark',22)}</span><div><div class="record-title"><b>Reserva #${r.id.slice(0,8).toUpperCase()}</b>${badges(r.status==='saved'?'Vigente':r.status==='in_review'?'En revisión':r.status==='expired'?'Vencida':'Convertida',r.status==='saved'?'success':r.status==='expired'?'danger':r.status==='in_review'?'warn':'neutral')}</div><span>${escapeHTML(c?.name||'Cliente')} · ${r.lines.map(l=>`${escapeHTML(model(l.modelId)?.name||'Modelo')} × ${l.quantity}`).join(' · ')}</span><small>Creada ${dateshort(r.createdAt)} · Feria ${datefull(r.expiresAt)}${r.status==='in_review'?` · Revisión ${datefull(r.reviewAt)}`:''}</small></div></div><div class="record-actions">${['saved','in_review'].includes(r.status)?`${btn('Confirmar pedido','convert-reserve',r.id,'primary')}${btn('Registrar depósito','pay-reserve',r.id,'outline')}`:''}${pending.length?`<span class="attention">${pending.length} depósito(s) por revisar</span>`:''}</div></article>`;}).join(''):empty('Sin reservas','Crea una reserva para empezar a controlar cupos.',btn('Nueva reserva','navigate','booking','primary'))}</div>
 ${paymentReview('reservation')}`;
}
function orders(){return `${pageHead('OPERACIONES / PEDIDOS','Pedidos y entregas','Registra abonos aprobados y entrega las prendas únicamente cuando estén pagadas.',btn(`${svg('plus',17)} Pedido directo`,'navigate','booking','primary'))}
 <div class="order-list">${state.orders.length?state.orders.map(o=>{const c=customer(o.customerId),balance=customerBalance(state,o.id),pending=pendingDelivery(o),paid=orderTotal(o)-balance;return `<article class="panel order-card"><div class="order-header"><div><span class="eyebrow">PEDIDO #${o.id.slice(0,8).toUpperCase()}</span><h3>${escapeHTML(c?.name||'Cliente')}</h3><p>${dateshort(o.createdAt)} · ${o.reservationId?'Procedente de reserva':'Pedido directo'}</p></div>${badges(o.status==='completed'?'Completado':'Activo',o.status==='completed'?'success':'neutral')}</div>
 <div class="order-items">${o.lines.map(l=>`<div><span>${escapeHTML(model(l.modelId)?.name||'Modelo')} · talla ${escapeHTML(model(l.modelId)?.size||'')} <small>(${l.quantity} un.)</small></span><strong>${money(l.subtotalCents)}</strong><small>${l.delivered} entregadas / ${l.quantity-l.delivered} pendientes</small></div>`).join('')}</div>
 <div class="order-totals"><div><small>TOTAL</small><b>${money(orderTotal(o))}</b></div><div><small>ABONOS APROBADOS</small><b>${money(paid)}</b></div><div><small>SALDO PENDIENTE</small><b class="${balance>0?'due':''}">${money(Math.max(0,balance))}</b></div><div><small>POR ENTREGAR</small><b>${pending} un.</b></div></div>
 ${o.status==='active'?`<div class="order-buttons">${btn(`${svg('wallet',16)} Registrar abono`,'pay-order',o.id,'outline')}${btn(`${svg('bag',16)} Registrar entrega`,'deliver',o.id,'outline')}${btn(`${svg('check',16)} Completar`,'complete',o.id,'primary')}</div>`:''}
 </article>`;}).join(''):empty('Sin pedidos','Puedes confirmar una reserva o crear un pedido directo.')}</div>${paymentReview('order')}`;}
function paymentReview(type){const ps=state.payments.filter(p=>p.status==='pending' && (type==='order'?Boolean(p.orderId):Boolean(p.reservationId)&&!p.orderId));if(!ps.length)return '';
 return `<section class="panel review-panel"><div class="panel-head"><div><h2>Abonos pendientes de revisión</h2><p>Demo: solo una aprobación manual los contabiliza; no existe integración bancaria.</p></div></div>${ps.map(p=>`<div class="review-row"><div><b>${money(p.amountCents)}</b><small>${p.orderId?'Pedido':'Reserva'} · ${datefull(p.at)}</small></div><div>${btn('Aprobar (simulado)','approve-payment',p.id,'primary')}${btn('Rechazar','reject-payment',p.id)}</div></div>`).join('')}</section>`;}
function customers(){return `${pageHead('DIRECTORIO','Clientes','Las fichas se guardan solo en este navegador. No ingreses números reales.',btn(`${svg('plus',16)} Nuevo cliente`,'new-customer','', 'primary'))}<div class="panel list-panel">${state.customers.length?state.customers.map(c=>`<div class="customer-row"><div class="customer-avatar">${escapeHTML(c.name.slice(0,1).toUpperCase())}</div><div><b>${escapeHTML(c.name)}</b><small>${escapeHTML(c.whatsapp)}</small></div><span class="muted tiny">${state.orders.filter(o=>o.customerId===c.id).length} pedidos</span></div>`).join(''):empty('Sin clientes','Crea una ficha para registrar reservas.')}</div>`;}
function settings(){const inc=state.incidents.filter(x=>x.status==='open');return `${pageHead('LABORATORIO','Simulación y pruebas','Controla el reloj de prueba, reinicia los datos y revisa qué funciones todavía requieren un backend real.')}
 <div class="settings-grid"><section class="panel setting-card"><div class="setting-icon">${svg('clock',23)}</div><h2>Reloj comercial de prueba</h2><p>Fecha y hora simuladas en Santa Cruz de la Sierra (America/La_Paz).</p><div class="clock-value">${datefull(now())}</div><div class="setting-actions">${btn('Avanzar 7 días','advance-clock','7','outline')}${btn('Revisar vencimientos','run-expiry','','primary')}${btn('Reloj actual','reset-clock','')}</div><p class="tiny muted">Para visualizar caducidades, avanza el reloj y comprueba las reservas. No se envía ningún mensaje por WhatsApp.</p></section>
 <section class="panel setting-card"><div class="setting-icon">${svg('refresh',23)}</div><h2>Datos de demostración</h2><p>Restablece los modelos, clientes, pedidos y reservas ficticios al estado original.</p><div class="setting-actions">${btn('Restablecer demo','reset-demo','','outline')}</div><p class="tiny muted">Esta acción borra los cambios de esta demo en el navegador. No toca el repositorio ni Supabase.</p></section>
 <section class="panel setting-card"><div class="setting-icon">${svg('alert',23)}</div><h2>Incidencias de stock</h2>${inc.length?`<p>${inc.length} modelo(s) bloqueados por faltantes reales declarados.</p>${inc.map(i=>`<p><strong>${escapeHTML(model(i.modelId)?.name||'Modelo')}</strong>: conteo ${i.observed}, registrado ${i.recorded}. Sin liberación automática.</p>`).join('')}`:'<p>No hay incidencias registradas.</p>'}<p class="tiny muted">La conciliación y el desbloqueo no están implementados en esta demo.</p></section>
 <section class="panel setting-card"><div class="setting-icon">${svg('layers',23)}</div><h2>Alcance del prototipo</h2><ul class="feature-list"><li>${svg('check',16)} Catálogo y colores informativos</li><li>${svg('check',16)} Inventario y reservas por modelo</li><li>${svg('check',16)} Precio mayorista y vencimiento</li><li>${svg('check',16)} Abonos y entregas simuladas</li><li>${svg('close',16)} Sin login, Supabase ni conexión bancaria</li><li>${svg('close',16)} Sin portal privado seguro ni QR real</li></ul></section></div>`;}
const field=(label,name,type='text',extra='')=>`<label class="field"><span>${label}</span><input name="${name}" type="${type}" ${extra} required /></label>`;
function openModal(name,id=''){modal={name,id};render();const dialog=$('dialog[data-modal]');if(dialog && dialog.showModal)dialog.showModal();}
function closeModal(){const dialog=$('dialog[data-modal]');if(dialog)dialog.close();modal=null;render();}
function modalHtml(){const name=modal.name, id=modal.id, m=model(id), r=state.reservations.find(x=>x.id===id),o=state.orders.find(x=>x.id===id);
 let title='',body='',foot='Guardar cambios';
 if(name==='new-model'){
 title='Añadir modelo';foot='Guardar modelo';body=`<p class="modal-subtitle">Una talla por modelo y solo un total de inventario publicado.</p><div class="form-grid">${field('Nombre del modelo','name')}${field('Talla única','size','text','placeholder="Ej. M, XL, 2XL"')}${field('Precio mayorista por docena (Bs)','price','text','inputmode="decimal" placeholder="Ej. 380"')}${field('Prendas publicables iniciales','stock','number','min="0" step="1" value="0"')}</div><label class="field"><span>Fotografía opcional (se guarda solo en tu navegador)</span><input type="file" name="photo" accept="image/jpeg,image/png,image/webp" /></label><div class="field"><span>Colores ofrecidos</span><div class="check-grid">${state.colors.map(c=>`<label class="color-check"><input type="checkbox" name="color" value="${c.id}"/><span>${escapeHTML(c.name)}</span></label>`).join('')}</div></div><div class="helper-action">${btn(`${svg('plus',16)} Crear color`,'new-color','')}</div>`;
 }else if(name==='new-color'){title='Nuevo color';foot='Guardar color';body=`${field('Nombre del color','name','text','placeholder="Ej. Vino"')}`;}
 else if(name==='new-customer'){title='Nuevo cliente';foot='Guardar cliente';body=`<p class="modal-subtitle">Usa exclusivamente información ficticia en la prueba pública.</p>${field('Nombre de referencia','name')}${field('WhatsApp ficticio','whatsapp','text','placeholder="Ej. 000000003"')}`;}
 else if(name==='stock'){
 const s=stockOf(state,id);title='Ajustar existencias';foot='Aplicar ajuste';body=`<p class="modal-subtitle"><strong>${escapeHTML(m?.name||'')}</strong> · Talla ${escapeHTML(m?.size||'')}</p><div class="modal-metrics"><span>Publicadas <b>${s.onHand}</b></span><span>Comprometidas <b>${s.reserved+s.pending}</b></span><span>Libres <b>${s.available}</b></span></div><label class="field"><span>Operación</span><select name="operation"><option value="add">Añadir existencias</option><option value="physical_sale">Descontar venta física</option><option value="set_total">Establecer total publicable</option></select></label>${field('Cantidad de prendas','units','number','min="0" step="1" value="12"')}<input type="hidden" name="version" value="${s.version}"/><p class="form-hint">Los ajustes no pueden consumir prendas reservadas o asignadas a pedidos.</p>`;
 }else if(name==='shortage'){title='Declarar faltante';foot='Registrar incidencia';body=`<p class="modal-subtitle">Solo cuando las prendas aptas realmente disponibles son menores que las registradas. Esta acción bloqueará nuevas reservas del modelo hasta conciliación.</p>${field('Cantidad apta observada','observed','number',`min="0" max="${m?.onHand||0}" step="1"`)}<label class="field"><span>Observación opcional</span><textarea name="notes" rows="3" placeholder="Sin detalles de prendas individuales"></textarea></label>`;}
 else if(name==='pay-order'||name==='pay-reserve'){
 title='Registrar aviso de abono';foot='Registrar aviso';body=`<p class="modal-subtitle">Simulación manual: registrar un abono NO acredita dinero. Después deberá aprobarse manualmente.</p>${field('Importe declarado (Bs)','amount','text','inputmode="decimal" placeholder="Ej. 150"')}`;
 }else if(name==='deliver'){
 title='Registrar entrega';foot='Guardar entrega';const balance=customerBalance(state,id);body=`<p class="modal-subtitle">${escapeHTML(customer(o?.customerId)?.name||'Cliente')} · Saldo ${money(balance)}. Solo pueden entregarse prendas después de acreditar el pago completo (simulado).</p>${o?.lines.map(l=>`<label class="field"><span>${escapeHTML(model(l.modelId)?.name||'Modelo')} · pendientes ${l.quantity-l.delivered}</span><input type="number" name="deliver:${l.modelId}" value="${l.quantity-l.delivered}" min="0" max="${l.quantity-l.delivered}" step="1" required/></label>`).join('')}`;
 }
 return `<dialog data-modal aria-label="${escapeHTML(title)}" class="modal-dialog"><div class="modal-top"><div><span class="eyebrow">EVALIA · DEMO</span><h2>${title}</h2></div><button class="icon-button" type="button" data-action="close-modal" aria-label="Cerrar">${svg('close',21)}</button></div><form id="modal-form" data-kind="${name}" data-id="${escapeHTML(id)}">${body}<div class="modal-footer"><button type="button" class="btn btn-subtle" data-action="close-modal">Cancelar</button><button type="submit" class="btn btn-primary">${foot} ${svg('arrow',16)}</button></div></form></dialog>`;
}
async function resizePhoto(file){
 if(!file||!file.size)return '';
 if(file.size>7_000_000)throw new Error('La foto supera el límite de 7 MB.');
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Selecciona JPG, PNG o WEBP.');
 const url=URL.createObjectURL(file);
 try{
  const img=new Image();img.src=url;await img.decode();const size=Math.min(1,900/Math.max(img.width,img.height));const cvs=document.createElement('canvas');cvs.width=Math.max(1,Math.round(img.width*size));cvs.height=Math.max(1,Math.round(img.height*size));cvs.getContext('2d').drawImage(img,0,0,cvs.width,cvs.height);
  const output=cvs.toDataURL('image/jpeg',0.68);if(output.length>850000)throw new Error('La fotografía comprimida sigue siendo demasiado grande.');return output;
 }finally{URL.revokeObjectURL(url);}
}
async function handleModal(form){
 const kind=form.dataset.kind,id=form.dataset.id,fd=new FormData(form);
 try{
  if(kind==='new-model'){
   const image=await resizePhoto(fd.get('photo'));save(createModel(state,{name:fd.get('name'),size:fd.get('size'),priceDozenCents:toCents(fd.get('price')),onHand:Number(fd.get('stock')),colors:fd.getAll('color'),image}));toast('Modelo añadido a la demo.');
  }else if(kind==='new-color'){save(addColor(state,fd.get('name')));toast('Color añadido.');}
  else if(kind==='new-customer'){save(addCustomer(state,{name:fd.get('name'),whatsapp:fd.get('whatsapp')}));toast('Cliente de demostración creado.');}
  else if(kind==='stock'){save(adjustStock(state,{modelId:id,operation:fd.get('operation'),units:Number(fd.get('units')),expectedVersion:Number(fd.get('version')),at:now()}));toast('Existencias actualizadas.');}
  else if(kind==='shortage'){save(reportShortage(state,{modelId:id,observed:Number(fd.get('observed')),notes:fd.get('notes')}));toast('Incidencia registrada. Modelo bloqueado.');}
  else if(kind==='pay-reserve'||kind==='pay-order'){save(registerPayment(state,{orderId:kind==='pay-order'?id:null,reservationId:kind==='pay-reserve'?id:null,amountCents:toCents(fd.get('amount')),at:now()}));toast('Aviso de abono guardado, pendiente de aprobación simulada.');}
  else if(kind==='deliver'){const lines=[...fd.entries()].filter(([k,v])=>k.startsWith('deliver:')&&Number(v)>0).map(([k,v])=>({modelId:k.slice(8),quantity:Number(v)}));save(deliver(state,{orderId:id,lines,at:now()}));toast('Entrega física simulada registrada.');}
  modal=null;render();
 }catch(e){toast(e?.message||'No se pudo guardar.',true);}
}
async function handleAction(target){
 const action=target.dataset.action,id=target.dataset.id;
 if(action==='navigate'){page=id;filter='';render();return;}
 if(action==='close-modal'){closeModal();return;}
 if(['new-model','new-color','new-customer','stock','shortage','pay-reserve','pay-order','deliver'].includes(action)){openModal(action,id);return;}
 if(action==='convert-reserve')return act(s=>convertReservation(s,{reservationId:id,at:now()}),'Reserva convertida en pedido sin descontar stock dos veces.');
 if(action==='approve-payment')return act(s=>approvePayment(s,{paymentId:id,at:now()}),'Abono aprobado en la simulación (sin cobro bancario).');
 if(action==='reject-payment')return act(s=>rejectPayment(s,id),'Aviso rechazado.');
 if(action==='complete')return act(s=>completeOrder(s,id),'Pedido completado; sin deuda ni entrega pendiente.');
 if(action==='advance-clock'){offset+=Number(id)*86_400_000;try{localStorage.setItem('evalia-demo-clock',String(offset));}catch{};save(processExpirations(state,now()));return toast('Se avanzó el reloj de demostración.');}
 if(action==='reset-clock'){offset=0;try{localStorage.removeItem('evalia-demo-clock');}catch{};save(processExpirations(state,now()));return toast('Reloj restablecido.');}
 if(action==='run-expiry')return act(s=>processExpirations(s,now()),'Vencimientos revisados.');
 if(action==='reset-demo'){if(!confirm('¿Restablecer todos los datos ficticios y cambios locales de esta demo?'))return;offset=0;try{localStorage.removeItem('evalia-demo-clock');}catch{};save(exampleState());return toast('Datos ficticios restablecidos.');}
}
state=load();state=processExpirations(state,now());try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{}
render();
document.addEventListener('click',e=>{
 const menu=e.target.closest('[data-page]');if(menu){page=menu.dataset.page;filter='';modal=null;render();window.scrollTo(0,0);return;}
 const action=e.target.closest('[data-action]');if(action){e.preventDefault();handleAction(action);}
});
document.addEventListener('submit',e=>{
 if(e.target.id==='booking-form'){
  e.preventDefault();const fd=new FormData(e.target),customerId=fd.get('customerId'),lines=[...fd.entries()].filter(([k,v])=>k.startsWith('qty:')&&Number(v)>0).map(([k,v])=>({modelId:k.slice(4),quantity:Number(v)}));
  if(!customerId){toast('Selecciona un cliente.',true);return;}
  const mode=fd.get('mode');act(s=>mode==='reserve'?reserve(s,{customerId,lines,at:now()}):directOrder(s,{customerId,lines,at:now()}),mode==='reserve'?'Reserva guardada; cupo bloqueado.':'Pedido confirmado; cupo asignado.');
  if(state.history[0]?.action===(mode==='reserve'?'reserva':'pedido'))page=mode==='reserve'?'reservations':'orders';render();
 }else if(e.target.id==='modal-form'){e.preventDefault();handleModal(e.target);}
});
document.addEventListener('input',e=>{if(e.target.classList.contains('booking-qty'))updateBookingSummary();if(e.target.id==='model-filter'){filter=e.target.value;const pos=e.target.selectionStart;const section=$('.product-grid')||$('.empty');if(section){const html=catalog();const doc=new DOMParser().parseFromString(html,'text/html');const newSection=doc.querySelector('.product-grid')||doc.querySelector('.empty');if(newSection)section.replaceWith(newSection);}e.target.focus();e.target.setSelectionRange(pos,pos);}});

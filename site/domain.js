/** EVALIA V1 — browser-only simulation. No real transactions or server authorization. */
export const STORAGE_KEY = 'evalia-demo-v1';
export const TZ = 'America/La_Paz';
export const DEMO_VERSION = 2;
const msDay = 86_400_000;
const uid = () => (globalThis.crypto?.randomUUID?.() || `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`);
const copy = obj => structuredClone(obj);
const fail = message => { throw new Error(message); };
const requireInt = (x, name, min = 0) => { if (!Number.isSafeInteger(x) || x < min) fail(`${name} debe ser un número entero de al menos ${min}.`); };
const byId = (items,id,type) => items.find(x => x.id === id) ?? fail(`${type} no encontrado.`);
export const emptyState = () => ({schema:DEMO_VERSION, models:[], colors:[], customers:[], reservations:[], orders:[], payments:[], stockEvents:[], incidents:[], tasks:[], history:[], requestIds:[]});
export const money = cents => `${(cents / 100).toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2})} Bs`;
export function toCents(text){
  const value=String(text ?? '').trim().replace(',','.');
  if(!/^\d+(?:\.\d{1,2})?$/.test(value)) fail('Importe inválido: usa bolivianos con hasta dos decimales.');
  const [whole,frac='']=value.split('.'); const cents=Number(whole)*100+Number((frac+'00').slice(0,2));
  requireInt(cents,'Importe',0); return cents;
}
/** Exact rational price in centavos, then nearest whole boliviano, except exact .50. */
export function subtotalCents(priceDozenCents, quantity){
  requireInt(priceDozenCents,'Precio por docena',1);requireInt(quantity,'Cantidad',6);
  const scaled=priceDozenCents*quantity;
  if(!Number.isSafeInteger(scaled)) fail('Precio fuera del rango seguro.');
  const whole=Math.floor(scaled/1200), remainder=scaled%1200;
  if(remainder===600) return whole*100+50;
  return (whole+(remainder>600?1:0))*100;
}
export const orderTotal = order => order.lines.reduce((s,l)=>s+l.subtotalCents,0);
export function customerBalance(state,orderId){
 const order=byId(state.orders,orderId,'Pedido');
 const paid=state.payments.filter(p=>p.orderId===orderId && p.status==='approved').reduce((s,p)=>s+p.amountCents,0);
 return orderTotal(order)-paid;
}
export const pendingDelivery = order => order.lines.reduce((sum,l)=>sum+l.quantity-l.delivered,0);
export function stockOf(state, modelId){
 const m=byId(state.models,modelId,'Modelo');
 const reserved=state.reservations.filter(r=>['saved','in_review'].includes(r.status)).reduce((sum,r)=>sum+r.lines.filter(l=>l.modelId===modelId).reduce((a,l)=>a+l.quantity,0),0);
 const pending=state.orders.filter(o=>o.status==='active').reduce((sum,o)=>sum+o.lines.filter(l=>l.modelId===modelId).reduce((a,l)=>a+l.quantity-l.delivered,0),0);
 return {onHand:m.onHand,reserved,pending,available:m.onHand-reserved-pending,blocked:Boolean(m.blocked),version:m.version};
}
export function localParts(instant){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',weekday:'short'}).formatToParts(new Date(instant));
 const get=type=>parts.find(p=>p.type===type).value;
 return {year:Number(get('year')),month:Number(get('month')),day:Number(get('day')),weekday:get('weekday')};
}
/** Bolivia currently UTC-4 year-round; UTC 16:00 is 12:00 America/La_Paz. */
export function dueFor(instant){
 const d=localParts(instant), ahead={Sun:3,Mon:2,Tue:4,Wed:3,Thu:2,Fri:5,Sat:4}[d.weekday];
 if(ahead===undefined) fail('Día de semana inválido.');
 return new Date(Date.UTC(d.year,d.month-1,d.day+ahead,16,0)).toISOString();
}
export const reviewFor = expiresAt => new Date(Date.parse(expiresAt)+7*msDay).toISOString();
function mutate(state,action,requestId,fn){
 if(requestId && state.requestIds.includes(requestId)) return state;
 const next=copy(state);fn(next);
 if(requestId) next.requestIds.push(requestId);
 next.history.unshift({id:uid(),at:action.at ?? new Date().toISOString(),action:action.kind});
 next.history=next.history.slice(0,1000);
 return next;
}
export function addColor(state,name){
 const value=String(name??'').trim();if(!value)fail('Indica el nombre del color.');
 if(state.colors.some(c=>c.name.toLocaleLowerCase()===value.toLocaleLowerCase()))fail('El color ya existe.');
 return mutate(state,{kind:'color'},null,s=>s.colors.push({id:uid(),name:value}));
}
export function addCustomer(state,{name,whatsapp}){
 const nm=String(name??'').trim(), phone=String(whatsapp??'').trim();
 if(!nm||!phone) fail('Nombre y WhatsApp son obligatorios.');
 return mutate(state,{kind:'cliente'},null,s=>s.customers.push({id:uid(),name:nm,whatsapp:phone}));
}
export function createModel(state,{name,size,priceDozenCents,colors,onHand=0,image=''}){
 const nm=String(name??'').trim(), sz=String(size??'').trim();
 if(!nm||!sz)fail('Indica modelo y talla única.');
 requireInt(priceDozenCents,'Precio por docena',1);requireInt(onHand,'Stock inicial',0);
 if(!Array.isArray(colors)||colors.length===0)fail('Selecciona al menos un color ofrecido.');
 for(const id of colors)if(!state.colors.some(c=>c.id===id))fail('Color no registrado en catálogo.');
 if(new Set(colors).size!==colors.length)fail('Colores repetidos.');
 if(image && !/^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(image))fail('Imagen no admitida.');
 return mutate(state,{kind:'modelo'},null,s=>{
  const id=uid();s.models.push({id,name:nm,size:sz,priceDozenCents,colorIds:colors,onHand,version:0,blocked:false,image,active:true});
  if(onHand)s.stockEvents.unshift({id:uid(),at:new Date().toISOString(),modelId:id,operation:'initial',before:0,after:onHand,delta:onHand});
 });
}
export function adjustStock(state,{modelId,operation,units,expectedVersion,requestId=uid(),at=new Date().toISOString()}){
 requireInt(units,'Cantidad',operation==='set_total'?0:1);requireInt(expectedVersion,'Versión',0);
 if(!['add','physical_sale','set_total'].includes(operation))fail('Operación de inventario no permitida.');
 if(state.requestIds.includes(requestId))return state;
 return mutate(state,{kind:'inventario',at},requestId,s=>{
  const m=byId(s.models,modelId,'Modelo');
  if(m.version!==expectedVersion)fail('El inventario cambió; vuelve a cargar.');
  if(m.blocked && operation==='physical_sale')fail('Inventario bloqueado por incidencia.');
  const before=m.onHand;
  const after=operation==='add'?before+units:operation==='physical_sale'?before-units:units;
  requireInt(after,'Existencia final',0);
  const st=stockOf(s,modelId);
  if(after<st.reserved+st.pending)fail('El ajuste consumiría unidades comprometidas con clientes.');
  m.onHand=after;m.version++;
  s.stockEvents.unshift({id:requestId,at,modelId,operation,before,after,delta:after-before});
 });
}
export function reportShortage(state,{modelId,observed,notes=''}){
 requireInt(observed,'Existencia real observada',0);
 return mutate(state,{kind:'incidencia'},null,s=>{
  const m=byId(s.models,modelId,'Modelo');
  if(observed>=m.onHand)fail('El conteo no muestra un faltante.');
  m.blocked=true;m.version++;
  s.incidents.unshift({id:uid(),modelId,observed,recorded:m.onHand,notes:String(notes).slice(0,240),at:new Date().toISOString(),status:'open'});
 });
}
function normalizedLines(state,lines){
 if(!Array.isArray(lines)||!lines.length)fail('Agrega al menos un modelo.');
 const merged=new Map();
 for(const l of lines){const q=Number(l.quantity);requireInt(q,'Cantidad',1);byId(state.models,l.modelId,'Modelo');merged.set(l.modelId,(merged.get(l.modelId)||0)+q);}
 const out=[...merged].map(([modelId,quantity])=>({modelId,quantity}));
 for(const l of out){requireInt(l.quantity,'Cantidad mayorista por modelo',6);const st=stockOf(state,l.modelId);if(st.blocked)fail('Modelo bloqueado por falta de stock.');if(l.quantity>st.available)fail('Existencias insuficientes para uno de los modelos.');}
 return out;
}
export function reserve(state,{customerId,lines,at=new Date().toISOString(),requestId=uid()}){
 if(state.requestIds.includes(requestId))return state;
 byId(state.customers,customerId,'Cliente'); const valid=normalizedLines(state,lines);
 return mutate(state,{kind:'reserva',at},requestId,s=>{
  const exp=dueFor(at);s.reservations.unshift({id:uid(),customerId,lines:valid,status:'saved',createdAt:at,expiresAt:exp,reviewAt:reviewFor(exp),orderId:null});
 });
}
function newOrder(state,customerId,lines,at,reservationId=null){
 return {id:uid(),customerId,reservationId,createdAt:at,status:'active',lines:lines.map(l=>{
   const m=byId(state.models,l.modelId,'Modelo');
   return {...l,priceDozenCents:m.priceDozenCents,subtotalCents:subtotalCents(m.priceDozenCents,l.quantity),delivered:0};
 })};
}
export function directOrder(state,{customerId,lines,at=new Date().toISOString(),requestId=uid()}){
 if(state.requestIds.includes(requestId))return state;
 byId(state.customers,customerId,'Cliente');const valid=normalizedLines(state,lines);
 return mutate(state,{kind:'pedido',at},requestId,s=>s.orders.unshift(newOrder(s,customerId,valid,at)));
}
export function convertReservation(state,{reservationId,at=new Date().toISOString(),requestId=uid()}){
 if(state.requestIds.includes(requestId))return state;
 const r=byId(state.reservations,reservationId,'Reserva');
 if(r.status!=='saved' && r.status!=='in_review')fail('Solo una reserva vigente se puede confirmar.');
 if(Date.parse(at)>=Date.parse(r.expiresAt) && !isProtected(state,r))fail('La reserva ya superó su vencimiento sin depósito aprobado.');
 return mutate(state,{kind:'confirmación',at},requestId,s=>{
  const res=byId(s.reservations,reservationId,'Reserva');
  const o=newOrder(s,res.customerId,res.lines,at,res.id);
  s.orders.unshift(o);res.status='converted';res.orderId=o.id;
  for(const p of s.payments)if(p.reservationId===res.id)p.orderId=o.id;
 });
}
export function registerPayment(state,{orderId=null,reservationId=null,amountCents,at=new Date().toISOString(),requestId=uid()}){
 if(state.requestIds.includes(requestId))return state;
 requireInt(amountCents,'Abono',1);
 if(Boolean(orderId)===Boolean(reservationId))fail('El abono debe corresponder a una reserva o a un pedido.');
 if(orderId){const o=byId(state.orders,orderId,'Pedido');if(o.status!=='active')fail('Pedido completado.');}
 if(reservationId){const r=byId(state.reservations,reservationId,'Reserva');if(!['saved','in_review'].includes(r.status))fail('Reserva no activa.');}
 return mutate(state,{kind:'aviso de abono',at},requestId,s=>s.payments.unshift({id:uid(),orderId,reservationId,amountCents,status:'pending',at,approvedAt:null}));
}
export function approvePayment(state,{paymentId,at=new Date().toISOString(),requestId=uid()}){
 if(state.requestIds.includes(requestId))return state;
 const p=byId(state.payments,paymentId,'Abono');if(p.status!=='pending')fail('El abono ya fue revisado.');
 if(p.reservationId && !p.orderId){const r=byId(state.reservations,p.reservationId,'Reserva');if(r.status!=='saved'&&r.status!=='in_review')fail('Reserva vencida o convertida: revisar manualmente.');if(Date.parse(at)>=Date.parse(r.expiresAt))fail('Depósito tardío: no protege la reserva automáticamente.');}
 return mutate(state,{kind:'abono aprobado (simulado)',at},requestId,s=>{byId(s.payments,paymentId,'Abono').status='approved';byId(s.payments,paymentId,'Abono').approvedAt=at;});
}
export function rejectPayment(state,paymentId){return mutate(state,{kind:'abono rechazado'},null,s=>{const p=byId(s.payments,paymentId,'Abono');if(p.status!=='pending')fail('Abono ya revisado.');p.status='rejected';});}
function isProtected(state,reservation){return state.payments.some(p=>p.reservationId===reservation.id&&p.status==='approved'&&Date.parse(p.approvedAt)<Date.parse(reservation.expiresAt));}
export function processExpirations(state,at=new Date().toISOString()){
 const due=state.reservations.filter(r=>r.status==='saved'&&Date.parse(at)>=Date.parse(r.expiresAt) && (!isProtected(state,r)||Date.parse(at)>=Date.parse(r.reviewAt)));
 if(!due.length)return state;
 return mutate(state,{kind:'vencimientos',at},null,s=>{
  for(const r of s.reservations){
   if(r.status==='saved'&&Date.parse(at)>=Date.parse(r.expiresAt)){
    if(!isProtected(s,r)){r.status='expired';continue;}
    if(Date.parse(at)>=Date.parse(r.reviewAt)){r.status='in_review';s.tasks.unshift({id:uid(),reservationId:r.id,type:'contact_manual',at});}
   }
  }
 });
}
export function deliver(state,{orderId,lines,at=new Date().toISOString(),requestId=uid()}){
 if(state.requestIds.includes(requestId))return state;
 const order=byId(state.orders,orderId,'Pedido');if(order.status!=='active')fail('Pedido no activo.');
 if(customerBalance(state,orderId)!==0)fail('El pedido debe estar totalmente pagado y aprobado antes de entregar.');
 if(!Array.isArray(lines)||!lines.length)fail('Indica las prendas realmente entregadas.');
 const data=lines.map(l=>({modelId:l.modelId,quantity:Number(l.quantity)}));
 if(new Set(data.map(l=>l.modelId)).size!==data.length)fail('Modelo duplicado en la entrega.');
 for(const l of data){requireInt(l.quantity,'Unidades a entregar',1);const oline=order.lines.find(x=>x.modelId===l.modelId);if(!oline||l.quantity>oline.quantity-oline.delivered)fail('Cantidad superior al pendiente de entrega.');if(byId(state.models,l.modelId,'Modelo').blocked)fail('Modelo bloqueado por incidencia.');}
 return mutate(state,{kind:'entrega',at},requestId,s=>{
  const o=byId(s.orders,orderId,'Pedido');
  for(const l of data){const ol=o.lines.find(x=>x.modelId===l.modelId),m=byId(s.models,l.modelId,'Modelo');if(m.onHand<l.quantity)fail('No hay unidades físicas suficientes.');ol.delivered+=l.quantity;m.onHand-=l.quantity;m.version++;s.stockEvents.unshift({id:uid(),at,modelId:m.id,operation:'delivery',before:m.onHand+l.quantity,after:m.onHand,delta:-l.quantity});}
 });
}
export function completeOrder(state,orderId){
 const o=byId(state.orders,orderId,'Pedido');if(o.status!=='active')fail('Pedido ya completado.');
 if(pendingDelivery(o)!==0)fail('Faltan prendas por entregar.');
 if(customerBalance(state,orderId)!==0)fail('Saldo distinto de cero.');
 return mutate(state,{kind:'pedido completado'},null,s=>byId(s.orders,orderId,'Pedido').status='completed');
}
/** Fictional example data; all models, colors, contacts and prices are demo-only. */
export function exampleState(){
 let s=emptyState();
 for(const color of ['Negro','Rosa empolvado','Marfil','Ciruela','Azul','Verde','Beige'])s=addColor(s,color);
 const ids=name=>s.colors.filter(x=>name.includes(x.name)).map(x=>x.id);
 s=createModel(s,{name:'Modelo de muestra A',size:'M',priceDozenCents:38000,colors:ids(['Negro','Rosa empolvado','Marfil','Ciruela']),onHand:72});
 s=createModel(s,{name:'Modelo de muestra B',size:'XL',priceDozenCents:42000,colors:ids(['Negro','Azul','Verde','Beige']),onHand:48});
 s=createModel(s,{name:'Modelo de muestra C',size:'2XL',priceDozenCents:38100,colors:ids(['Negro','Rosa empolvado','Beige']),onHand:36});
 s=addCustomer(s,{name:'Compradora ficticia 01',whatsapp:'000000001'});
 s=addCustomer(s,{name:'Compradora ficticia 02',whatsapp:'000000002'});
 s=reserve(s,{customerId:s.customers[0].id,lines:[{modelId:s.models[0].id,quantity:12}],at:new Date().toISOString()});
 s=directOrder(s,{customerId:s.customers[1].id,lines:[{modelId:s.models[1].id,quantity:12}],at:new Date().toISOString()});
 return s;
}
export function checkState(state){
 if(!state||state.schema!==DEMO_VERSION||!Array.isArray(state.models)||!Array.isArray(state.reservations)||!Array.isArray(state.orders)||!Array.isArray(state.payments))fail('Versión de datos incompatible. Restablece la demo.');
 for(const m of state.models){const x=stockOf(state,m.id);if(x.onHand<0||x.reserved<0||x.pending<0)fail('Inventario inválido.');}
 return true;
}

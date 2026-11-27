import {PAGE_SIZES,validDay} from './record-date-filters.js';
import {readAllPages} from './workspace-pagination.js';
import {indexBy} from './workspace-assembly.js';

export const ORDER_COLUMNS='id,customer_id,status,origin_reservation_id,confirmed_at,fulfillment_method,shipping_destination,recipient_name,recipient_phone,fulfillment_updated_at,archived_at,archive_reason,prepared_at,preparation_version,revision';
const LINE_COLUMNS='id,order_id,model_id,quantity,dozen_count,extra_units,price_dozen_bs,subtotal_bs';
const PAYMENT_COLUMNS='id,request_id,order_id,reservation_id,amount_bs,status,origin,note,public_note,receipt_path,created_at,approved_at';
const CUSTOMER_COLUMNS='id,name,whatsapp,delivery_preference,shipping_destination,created_at,updated_at';

export function dateBounds(range){
 if(!range?.valid||range.from&&!validDay(range.from)||range.to&&!validDay(range.to)||range.from&&range.to&&range.from>range.to)throw Error('Rango de fechas inválido');
 const lower=range.from?new Date(range.from+'T00:00:00-04:00').toISOString():null;
 const upper=range.to?new Date(Date.parse(range.to+'T00:00:00-04:00')+86400000).toISOString():null;
 return {lower,upper};
}
export function buildOrderPageQuery(db,{archived,range,page,size,signal}){
 if(typeof archived!=='boolean'||!PAGE_SIZES.includes(size)||!Number.isSafeInteger(page)||page<1||!Number.isSafeInteger(page*size))throw Error('Página inválida');
 const {lower,upper}=dateBounds(range),date=archived?'archived_at':'confirmed_at';
 let q=db.from('orders').select(ORDER_COLUMNS,{count:'exact'});
 q=archived?q.not('archived_at','is',null):q.is('archived_at',null);
 if(lower)q=q.gte(date,lower);
 if(upper)q=q.lt(date,upper);
 q=q.order(date,{ascending:false}).order('id',{ascending:true}).range((page-1)*size,page*size-1);
 return signal?q.abortSignal(signal):q;
}
export function serverPageView(rows,count,page,size){
 if(!Array.isArray(rows)||!Number.isSafeInteger(count)||count<0||!PAGE_SIZES.includes(size)||!Number.isSafeInteger(page)||page<1)throw Error('Respuesta de página inválida');
 const pages=Math.max(1,Math.ceil(count/size)),actual=Math.min(page,pages);
 if(page!==actual)return {redirect:actual};
 const start=(page-1)*size;
 if(rows.length!==Math.min(size,count-start)||new Set(rows.map(r=>r.id)).size!==rows.length||rows.some(r=>!r.id))throw Error('Página incompleta; actualiza para reintentar.');
 return {items:rows,total:count,page,pages,first:count?start+1:0,last:start+rows.length};
}
function checked(response,label){
 if(response.error)throw Error(label+': '+response.error.message);
 if(response.data===null||response.data===undefined)throw Error(label+': respuesta incompleta');
 return response.data;
}
function unique(rows){return [...new Map(rows.map(r=>[r.id,r])).values()];}
export async function rowsByIds(db,table,columns,field,ids,keys,signal,sort=[]){
 const all=[],distinct=[...new Set(ids.filter(Boolean))];
 for(let i=0;i<distinct.length;i+=100){
  if(signal?.aborted)throw Error('Consulta cancelada');
  const chunk=distinct.slice(i,i+100);
  const result=await readAllPages(()=>{
   let q=db.from(table).select(columns,{count:'exact'}).in(field,chunk);
   for(const [col,ascending] of sort)q=q.order(col,{ascending});
   for(const k of keys)q=q.order(k,{ascending:true});
   return signal?q.abortSignal(signal):q;
  },keys,table);
  all.push(...result.data);
 }
 return all;
}
export async function loadDashboardOrderLines(db,orders,signal){
 const top=orders.filter(o=>o.status==='active'&&!o.archived_at).slice(0,5).map(o=>o.id);
 return rowsByIds(db,'order_lines',LINE_COLUMNS,'order_id',top,['id'],signal);
}
export async function loadOrderPage(db,params){
 const {page,size,signal}=params;
 const response=await buildOrderPageQuery(db,params);
 // PostgREST can return PGRST103 for an offset beyond the new last page.
 // Re-read page one rather than masking other API or authorization failures.
 if(page>1&&response.error?.code==='PGRST103')return {redirect:1};
 const view=serverPageView(checked(response,'Pedidos'),response.count,page,size);
 if(view.redirect)return {redirect:view.redirect};
 const ids=view.items.map(o=>o.id),origins=view.items.map(o=>o.origin_reservation_id).filter(Boolean);
 const [lines,payments,legacyPayments,deliveries,links,customers]=await Promise.all([
  rowsByIds(db,'order_lines',LINE_COLUMNS,'order_id',ids,['id'],signal),
  rowsByIds(db,'payment_reports',PAYMENT_COLUMNS,'order_id',ids,['id'],signal,[['created_at',false]]),
  rowsByIds(db,'payment_reports',PAYMENT_COLUMNS,'reservation_id',origins,['id'],signal,[['created_at',false]]),
  rowsByIds(db,'deliveries','id,order_id,delivered_at,actor_id','order_id',ids,['id'],signal),
  rowsByIds(db,'order_access_links','order_id,issued_at,revoked_at,version','order_id',ids,['order_id'],signal),
  rowsByIds(db,'customers',CUSTOMER_COLUMNS,'id',view.items.map(o=>o.customer_id),['id'],signal)
 ]);
 const extraColors=await rowsByIds(db,'order_extra_colors','order_line_id,color_id,position','order_line_id',lines.map(l=>l.id),['order_line_id','color_id'],signal,[['position',true]]);
 const linesByOrder=indexBy(lines,'order_id'),colorsByLine=indexBy(extraColors,'order_line_id');
 const orders=view.items.map(o=>({...o,revision:o.revision??null,lines:(linesByOrder.get(o.id)??[]).map(l=>({...l,extraColorIds:(colorsByLine.get(l.id)??[]).map(c=>c.color_id)}))}));
 if(orders.some(o=>!o.lines.length)||customers.length!==new Set(orders.map(o=>o.customer_id)).size)throw Error('Detalle del pedido incompleto; actualiza para reintentar.');
 const financeEntries=[],deliveryEntries=[];
 // Bounded concurrency: never launch two RPCs for every order in the database at once.
 for(let i=0;i<ids.length;i+=10){
  if(signal?.aborted)throw Error('Consulta cancelada');
  const batch=ids.slice(i,i+10);
  await Promise.all(batch.map(async id=>{
   const rpc=(name)=>{let q=db.rpc(name,{p_order_id:id});return signal?q.abortSignal(signal):q;};
   const [f,d]=await Promise.all([rpc('get_evalia_order_finance'),rpc('get_evalia_order_delivery')]);
   financeEntries.push([id,checked(f,'Saldo del pedido')]);deliveryEntries.push([id,checked(d,'Retiro del pedido')]);
  }));
 }
 const allPayments=unique([...payments,...legacyPayments]).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))||String(a.id).localeCompare(String(b.id)));
 const deliveryLines=await rowsByIds(db,'delivery_lines','delivery_id,order_line_id,order_id,quantity','order_id',ids,['delivery_id','order_line_id'],signal);
 return {view:{...view,items:orders},details:{customers,payments:allPayments,deliveries,deliveryLines,links,finances:Object.fromEntries(financeEntries),deliveryStats:Object.fromEntries(deliveryEntries)}};
}

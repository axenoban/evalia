import {checkedPortions,centsFromBs,subtotalCents,portionQuantity} from './domain.js';
import {normalizedWhatsApp} from './customer-duplicates.js';
import {searchKey as normalize} from './search-text.js';
export const emptyBooking=()=>({customerId:'',method:'',destination:'',portions:{},attempt:null,receipt:null});
export function findBookingCustomers(customers,query){
 const key=normalize(query),phone=/^[+\d\s().-]+$/.test(key)?normalizedWhatsApp(key):'';
 return customers.filter(c=>!key||normalize(c.name).includes(key)||normalize(c.whatsapp).includes(key)||(phone&&normalizedWhatsApp(c.whatsapp).includes(phone)));
}
export function recentBookingCustomers(customers,orders,limit=5){
 const byId=new Map(customers.map(c=>[c.id,c])),ids=new Set(),result=[];
 for(const o of [...orders].filter(o=>!o.archived_at&&o.status!=='voided').sort((a,b)=>String(b.confirmed_at).localeCompare(String(a.confirmed_at))||String(a.id).localeCompare(String(b.id)))){
  if(!ids.has(o.customer_id)&&byId.has(o.customer_id)){ids.add(o.customer_id);result.push(byId.get(o.customer_id));if(result.length>=limit)break;}
 }
 return result;
}
export function reviewBooking(models,portions,stock,colors){
 const byId=new Map(models.filter(m=>m.is_active).map(m=>[m.id,m])),rows=[],issues=[];
 let total=0n,units=0;
 for(const [id,selection] of Object.entries(portions)){
  const model=byId.get(id);
  try{
   const [line]=checkedPortions(models.filter(m=>m.is_active),{[id]:selection},stock,colors);
   const quantity=portionQuantity(line.dozens,line.extraColorIds),subtotal=subtotalCents(model.price_dozen_bs,quantity);
   const cents=centsFromBs(model.price_dozen_bs);
   const expectedPrice=String(cents/100n)+'.'+String(cents%100n).padStart(2,'0');
   rows.push({id,model,selection,line:{...line,expectedPrice},quantity,subtotal,valid:true});
   total+=subtotal;units+=quantity;
  }catch(e){issues.push(e.message);rows.push({id,model,selection,valid:false,error:e.message});}
 }
 if(rows.length>100)issues.push('Máximo 100 modelos por pedido.');
 return {rows,issues,total,units,ready:rows.length>0&&issues.length===0,lines:rows.filter(r=>r.valid).map(r=>r.line)};
}
export function repeatBooking(order,models){
 const byId=new Map(models.map(m=>[m.id,m]));
 // Keep every requested line and color, even when unavailable: review must resolve it.
 const portions=Object.fromEntries(order.lines.map(l=>[l.model_id,{dozens:String(l.dozen_count??0),extraColorIds:[...(l.extraColorIds??[])],previousName:l.model_name_snapshot??byId.get(l.model_id)?.name??'Modelo anterior'}]));
 return {...emptyBooking(),customerId:order.customer_id,method:order.fulfillment_method==='legacy'?'':order.fulfillment_method??'',destination:order.shipping_destination??'',portions};
}
export function hasBookingDraft(draft){return Boolean(draft.customerId||Object.keys(draft.portions).length||draft.attempt);}

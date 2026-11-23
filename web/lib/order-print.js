import {centsFromBs,formatBs,portionBreakdown} from './domain.js';
import {normalizeDestination} from './delivery.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const doc=(title,body,shipping=false)=>'<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>'+
 esc(title)+'</title><style>html{font-family:Arial,Helvetica,sans-serif;color:#111}*{box-sizing:border-box}body{margin:0;padding:20px}' +
 'h1{font-size:20px;margin:0 0 16px}p{margin:8px 0;line-height:1.4}.label{font-size:11px;color:#555;text-transform:uppercase;letter-spacing:.07em}' +
 '.value{font-size:20px;font-weight:750;word-break:break-word}table{width:100%;border-collapse:collapse;margin:14px 0}th,td{padding:9px 5px;text-align:left;border-bottom:1px solid #ddd;font-size:12px}.total{font-size:21px;text-align:right;font-weight:750}' +
 '.dest{font-size:25px;line-height:1.25;white-space:pre-wrap;overflow-wrap:anywhere}.shipping-label{border:2px solid #111;padding:16px}.shipping-label .row{margin:15px 0}' +
 '@page{size:'+(shipping?'A6':'A4')+';margin:10mm}@media print{body{padding:0}}' +
 '</style></head><body>'+body+'</body></html>';
/** DOM aislado por modalidad: etiqueta de envío no contiene productos ni valores de compra. */
export function buildOrderPrintHtml({order,customer,models=[],colors=[]}){
 if(!order)throw new Error('Pedido no disponible.');
 const mode=order.fulfillment_method;
 if(mode==='legacy')throw new Error('Clasifica el tipo de entrega antes de imprimir.');
 if(!['pickup','shipping'].includes(mode))throw new Error('Modalidad inválida.');
 const recipient=String(order.recipient_name??customer?.name??'').trim();
 const phone=String(order.recipient_phone??customer?.whatsapp??'').trim();
 if(!recipient)throw new Error('El pedido necesita nombre de destinatario.');
 if(mode==='shipping'){
  const destination=normalizeDestination(order.shipping_destination);
  if(!destination||!phone)throw new Error('Para imprimir envío faltan destino o teléfono.');
  const body='<main class="shipping-label"><div class="row"><p class="label">Destino</p><p class="dest">'+esc(destination)+
   '</p></div><div class="row"><p class="label">Nombre</p><p class="value">'+esc(recipient)+
   '</p></div><div class="row"><p class="label">Número de contacto</p><p class="value">'+esc(phone)+'</p></div></main>';
  return doc('Etiqueta de envío',body,true);
 }
 const byModel=new Map(models.map(x=>[x.id,x])),byColor=new Map(colors.map(x=>[x.id,x]));
 const rows=order.lines.map(line=>{
  const m=byModel.get(line.model_id);
  const colorNames=(line.extraColorIds??[]).map(id=>byColor.get(id)?.name).filter(Boolean).join(', ');
  const detail=line.dozen_count!=null?portionBreakdown(Number(line.dozen_count),Number(line.extra_units??0)):'Cantidad: '+line.quantity;
  return '<tr><td>'+esc(m?.name??'Modelo')+' <small>('+esc(m?.size_label??'Única')+')</small><br><small>'+
   esc(detail)+(colorNames?' · Colores adicionales: '+esc(colorNames):'')+'</small></td><td>'+
   esc(line.quantity)+'</td><td>'+esc(formatBs(centsFromBs(line.subtotal_bs)))+'</td></tr>';
 }).join('');
 const total=order.lines.reduce((n,line)=>n+centsFromBs(line.subtotal_bs),0n);
 return doc('Comprobante de pedido','<main><h1>EVALIA · Pedido</h1><p class="label">Cliente</p><p class="value">'+
  esc(recipient)+'</p><table><thead><tr><th>Producto y composición</th><th>Prendas</th><th>Importe</th></tr></thead><tbody>'+
  rows+'</tbody></table><p class="total">Total: '+esc(formatBs(total))+'</p></main>');
}
export function printOrder(data,openWindow){
 const html=buildOrderPrintHtml(data);
 const popup=openWindow('','_blank','width=810,height=930');
 if(!popup)throw new Error('Habilita las ventanas emergentes de EVALIA para imprimir.');
 popup.opener=null;
 popup.document.open();popup.document.write(html);popup.document.close();popup.focus();
 popup.print();
 return true;
}

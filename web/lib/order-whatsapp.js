import { amountCents, formatBs, portionBreakdown } from './domain.js';

// Mensaje editable para WhatsApp: no realiza envíos ni registra pagos.
// Solo se forma cuando el administrador emite un enlace privado de pedido activo.
const plain=value=>String(value??'').replace(/[\r\n\t]+/g,' ').replace(/[\*_~`]/g,'').replace(/\s+/g,' ').trim();

export function buildOrderWhatsAppMessage({order,customer,models=[],colors=[],finance,url}){
 if(!order||order.status!=='active'||!Array.isArray(order.lines)||!order.lines.length)
  throw new Error('Solo se puede compartir un pedido activo con detalle.');
 let parsed;
 try{parsed=new URL(String(url));}catch{throw new Error('Enlace privado inválido.');}
 if(parsed.protocol!=='https:'&&!(parsed.protocol==='http:'&&parsed.hostname==='localhost'))
  throw new Error('El enlace privado debe ser HTTPS.');
 if(!/^\/p\/[A-Za-z0-9_-]{43}$/.test(parsed.pathname)||parsed.search||parsed.hash)
  throw new Error('La ruta del enlace privado no es válida.');
 const modelById=new Map(models.map(x=>[x.id,x]));
 const colorById=new Map(colors.map(x=>[x.id,x]));
 let total=0n;
 const items=order.lines.map((line,index)=>{
  const model=modelById.get(line.model_id);
  const count=Number(line.quantity);
  if(!Number.isSafeInteger(count)||count<6)throw new Error('Cantidad de pedido inválida.');
  const subtotal=amountCents(line.subtotal_bs);
  total+=subtotal;
  const title=plain(model?.name)||'Modelo';
  const size=plain(model?.size_label)||'Única';
  const dozens=Number(line.dozen_count);
  const extra=Array.isArray(line.extraColorIds)?line.extraColorIds:[];
  const composition=line.dozen_count===null||line.dozen_count===undefined
   ?count+' prendas'
   :portionBreakdown(dozens,Number(line.extra_units??extra.length));
  const knownColors=extra.map(id=>plain(colorById.get(id)?.name)||'Color registrado');
  return [
    (index+1)+'. *'+title+'* (talla '+size+')',
    '   '+composition+' · '+count+' prendas',
    ...(knownColors.length?['   Colores individuales: '+knownColors.join(', ')]:[]),
    '   Subtotal: '+formatBs(subtotal)
  ].join('\n');
 });
 const lines=[
  '*EVALIA | Confirmación de pedido*',
  '',
  'Hola'+(plain(customer?.name)?', '+plain(customer.name):'')+'.',
  'Tu pedido fue registrado con estos detalles:',
  ...(plain(order.id)?['Referencia: '+plain(order.id)]:[]),
  '',
  ...items.map(x=>x+'\n'),
  '*Total del pedido: '+formatBs(total)+'*'
 ];
 if(finance&&finance.approved!==undefined&&finance.pending!==undefined){
  lines.push('Pagos aprobados: '+formatBs(amountCents(finance.approved)));
  lines.push('Saldo pendiente: '+formatBs(amountCents(finance.pending)));
 }
 lines.push('','Consulta tu pedido y, si corresponde, informa tu pago aquí:');
 lines.push(parsed.toString());
 lines.push('','_Los pagos informados quedan sujetos a verificación antes de acreditarse. Las docenas son surtidas; la disponibilidad física de los colores individuales se comprueba al preparar el pedido._');
 lines.push('','*EVALIA · Destaca en cada detalle*');
 return lines.join('\n');
}

import {centsFromBs,formatBs,portionBreakdown} from './domain.js';
import {normalizeDestination} from './delivery.js';

export const PRINT_FORMATS=Object.freeze({
 horizontal:Object.freeze({width:150,height:100,label:'15 × 10 cm · Horizontal'}),
 vertical:Object.freeze({width:100,height:150,label:'10 × 15 cm · Vertical'}),
 square:Object.freeze({width:100,height:100,label:'10 × 10 cm · Cuadrado'})
});
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=amount=>formatBs(amount).replace(/ Bs$/,'');
const logo='<svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><title>EVALIA — monograma EV</title><circle cx="256" cy="256" r="245" fill="#451E3B"/><path d="M138 138H257L267 169C246 148 224 140 185 140C176 140 173 147 173 159V232H211C223 232 232 226 238 215V251C229 240 222 234 206 234H173V303C173 315 176 322 184 322H210C233 320 254 307 273 288L265 310L303 398L361 252C368 239 356 234 350 233V232H391V233C376 237 370 247 363 263L295 436L247 324H138V323C148 319 151 312 151 304V159C151 148 147 142 138 139Z M297 200C300 224 306 231 331 234C306 237 300 244 297 267C294 244 288 237 263 234C288 231 294 224 297 200Z" fill="#fff"/></svg>';
const defaultFormat=mode=>mode==='shipping'?'square':'vertical';
const getFormat=(mode,format)=>{
 const key=format??defaultFormat(mode);
 if(!Object.hasOwn(PRINT_FORMATS,key))throw new Error('Formato de impresión inválido.');
 return key;
};
const pageCss=key=>{
 const {width,height}=PRINT_FORMATS[key];
 return '@page{size:'+width+'mm '+height+'mm;margin:5mm}:root{--paper-width:'+width+'mm;--paper-height:'+height+'mm}';
};
const styles="\n:root{--ink:#4D3443;--brand:#451E3B;--text:#222024;--muted:#59535a;--rule:#c7c3c6;--tint:#f5f0ea}\nhtml{font-family:Arial,Helvetica,sans-serif;color:var(--text);background:#eeeae7;font-size:10pt}\nhtml.mono{--ink:#111;--brand:#000;--text:#111;--muted:#333;--rule:#aaa;--tint:#eee}\n*{box-sizing:border-box}body{margin:0;padding:12px 0;overflow-x:auto}p{margin:0}main{overflow-wrap:anywhere}\n.sheet{width:var(--paper-width);min-height:var(--paper-height);padding:5mm;margin:0 auto;background:white;box-shadow:0 2px 8px #0002}\n.label{text-transform:uppercase;color:var(--ink);font-weight:700;font-size:6.8pt;line-height:1.2;margin-bottom:1mm}\n.receipt-header{border-top:0.65mm solid var(--ink);border-bottom:0.2mm solid var(--rule);padding:2mm 0 3mm;display:flex;justify-content:space-between;align-items:center;gap:2mm;break-inside:avoid}\n.brand{display:flex;align-items:center;gap:2mm;min-width:0}.brand svg{width:11mm;height:11mm;flex:none}.mono .brand circle{fill:#000}.brand strong{color:var(--ink);font-size:11pt}.brand span,.meta span{display:block;font-size:6.5pt;text-transform:uppercase;font-weight:600;color:var(--muted);margin-top:1mm}.meta{text-align:right;font-size:7.5pt;flex:none}\n.client{padding:2.5mm 0;display:flex;justify-content:space-between;gap:3mm;break-inside:avoid}.client-name{font-weight:700;font-size:11pt}.client-phone{font-size:9pt;font-weight:600}.client>div{min-width:0}\ntable{width:100%;border-collapse:collapse;table-layout:fixed;margin:1mm 0 2mm}thead{display:table-header-group}th{background:var(--tint);font-size:6.5pt;text-transform:uppercase;color:var(--ink);font-weight:700;text-align:left;padding:1.8mm 1.2mm;border-bottom:0.2mm solid var(--rule)}td{padding:2mm 1.2mm;border-bottom:0.2mm solid var(--rule);vertical-align:top;font-size:9pt}tr{break-inside:avoid;page-break-inside:avoid}.model{display:flex;flex-wrap:wrap;align-items:baseline;gap:1mm}.size,.composition,.inline-qty{font-size:7.5pt;color:var(--muted)}.composition small{display:block;font-size:7pt;overflow-wrap:anywhere}.qty{width:13mm;text-align:center}.amount{width:24mm;text-align:right;font-variant-numeric:tabular-nums;font-weight:700}.inline-qty{display:none}\n.summary{display:flex;justify-content:space-between;align-items:center;gap:2mm;border:0.25mm solid var(--ink);border-radius:1.5mm;padding:2.5mm;break-inside:avoid}.summary strong{font-size:9pt}.summary .total{text-align:right}.total strong{font-size:17pt;color:var(--ink)}footer{color:var(--muted);font-size:7pt;margin-top:2mm;break-inside:avoid}\n.receipt.vertical td{padding:3mm 1.2mm}.receipt.vertical .summary{margin-top:3mm}.receipt.vertical .qty,.receipt.square .qty{display:none}.receipt.vertical .inline-qty,.receipt.square .inline-qty{display:block}.receipt.square .brand svg{width:10mm;height:10mm}.receipt.square td{padding:1.5mm 1mm;font-size:8pt}.receipt.square .size,.receipt.square .composition,.receipt.square .inline-qty{font-size:7pt}.receipt.square .client{padding:2mm 0}.receipt.square .summary{padding:2mm}.receipt.square .total strong{font-size:14pt}.receipt.horizontal .model{gap:2mm}\n.shipping-label{padding:5mm;display:flex;flex-direction:column}.shipping-label section{padding:4mm 4mm 3mm;break-inside:avoid}.shipping-label .destination{border-top:1.2mm solid var(--ink);border-bottom:0.25mm solid var(--ink)}.shipping-label .recipient{border-bottom:0.2mm solid var(--rule)}.shipping-label .dest{font-size:23pt;font-weight:700;color:var(--ink);line-height:1.13;white-space:pre-wrap;overflow-wrap:anywhere}.shipping-label .value{font-size:17pt;font-weight:700;line-height:1.15;white-space:pre-wrap;overflow-wrap:anywhere}.shipping-label .label{font-size:7pt;margin-bottom:2mm}.shipping-label .contact .value{font-size:20pt}.shipping-label.vertical section{padding:7mm 4mm}.shipping-label.horizontal .destination{border-top:0;border-left:1.2mm solid var(--ink)}.shipping-label.horizontal .contact{display:flex;align-items:center;justify-content:space-between;gap:3mm}.shipping-label.horizontal section{padding:3mm 4mm}.shipping-label.square section{padding:3mm 3mm 2mm}.shipping-label.square .dest{font-size:20pt}.shipping-label.square .value{font-size:14pt}.shipping-label.square .contact .value{font-size:17pt}.shipping-label.compact .dest{font-size:15pt}.shipping-label.compact .value{font-size:12pt}.shipping-label.dense .dest{font-size:11pt}.shipping-label.dense .value{font-size:10pt}.shipping-label.dense section{padding:2mm 3mm}.shipping-label.dense .contact .value,.shipping-label.compact .contact .value{font-size:14pt}\n.print-controls{position:sticky;left:0;top:0;width:min(100%,680px);margin:0 auto 12px;padding:12px;background:#fff;border:1px solid #ccc;border-radius:8px;z-index:1}.control-row{display:flex;flex-wrap:wrap;align-items:end;gap:10px}.print-controls label{display:grid;gap:4px;font-size:12px;font-weight:700}.print-controls select,.print-controls button{font:inherit;min-height:40px;padding:6px 10px;border:1px solid #aaa;border-radius:5px;background:#fff;color:#222}.print-controls button{background:#4D3443;color:#fff;border:0;font-weight:700;cursor:pointer}.print-controls p{font-size:11px;color:#555;margin-top:8px;line-height:1.4}\n@media print{html,body{background:white;margin:0;padding:0;overflow:visible;width:auto}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}.print-controls{display:none!important}.sheet{width:auto;min-height:0;padding:0;margin:0;box-shadow:none}.shipping-label{display:flex;justify-content:space-between;min-height:calc(var(--paper-height) - 10.5mm);border:0.25mm solid var(--ink);border-radius:2mm;padding:3mm}.receipt .summary,footer{break-inside:avoid}.receipt tr{break-inside:avoid}.shipping-label.vertical section{padding:7mm 3mm}.shipping-label.dense section{padding:2mm 3mm}}\n@media screen{.shipping-label{outline:0.25mm solid var(--ink);outline-offset:-5mm;border-radius:2mm}.sheet{margin-inline:auto}.shipping-label.vertical{justify-content:space-around}.shipping-label.horizontal,.shipping-label.square{justify-content:space-around}}\n";
function dateLabel(value){
 if(!value)return '';
 const date=new Date(value);
 return Number.isNaN(date.getTime())?'':new Intl.DateTimeFormat('es-BO',{timeZone:'America/La_Paz',day:'2-digit',month:'2-digit',year:'numeric'}).format(date);
}
function render({order,customer,models=[],colors=[]},format){
 if(!order)throw new Error('Pedido no disponible.');
 const mode=order.fulfillment_method;
 if(mode==='legacy')throw new Error('Clasifica el tipo de entrega antes de imprimir.');
 if(!['pickup','shipping'].includes(mode))throw new Error('Modalidad inválida.');
 const key=getFormat(mode,format);
 const recipient=String(order.recipient_name??customer?.name??'').trim();
 const phone=String(order.recipient_phone??customer?.whatsapp??'').trim();
 if(!recipient)throw new Error('El pedido necesita nombre de destinatario.');
 if(mode==='shipping'){
  const destination=normalizeDestination(order.shipping_destination);
  if(!destination||!phone)throw new Error('Para imprimir envío faltan destino o teléfono.');
  const density=destination.length>140||recipient.length>85?' dense':destination.length>80||recipient.length>50?' compact':'';
  const body='<main class="sheet shipping-label '+key+density+'"><section class="destination"><p class="label">Destino</p><p class="dest">'+esc(destination)+
   '</p></section><section class="recipient"><p class="label">Destinatario</p><p class="value">'+esc(recipient)+
   '</p></section><section class="contact"><p class="label">Teléfono</p><p class="value">'+esc(phone)+'</p></section></main>';
  return {key,title:'Etiqueta de envío',body};
 }
 const byModel=new Map(models.map(x=>[x.id,x])),byColor=new Map(colors.map(x=>[x.id,x]));
 const rows=order.lines.map(line=>{
  const m=byModel.get(line.model_id);
  const colorNames=(line.extraColorsSnapshot?.map(c=>c.name)??(line.extraColorIds??[]).map(id=>byColor.get(id)?.name)).filter(Boolean).join(', ');
  const detail=line.dozen_count!=null?portionBreakdown(Number(line.dozen_count),Number(line.extra_units??0)):'Cantidad: '+line.quantity;
  return '<tr><td><div class="model"><strong>'+esc(line.model_name_snapshot??m?.name??'Modelo')+'</strong><span class="size">'+esc(line.size_label_snapshot??m?.size_label??'Única')+'</span></div>'+
   '<div class="composition"><span>'+esc(detail)+'</span>'+(colorNames?'<small>Extras: '+esc(colorNames)+'</small>':'')+
   '</div><small class="inline-qty">'+esc(line.quantity)+' unidades</small></td><td class="qty">'+esc(line.quantity)+'</td><td class="amount">'+
   esc(money(centsFromBs(line.subtotal_bs)))+'</td></tr>';
 }).join('');
 const total=order.lines.reduce((n,line)=>n+centsFromBs(line.subtotal_bs),0n);
 const units=order.lines.reduce((n,line)=>n+Number(line.quantity),0);
 const date=dateLabel(order.confirmed_at??order.created_at);
 const body='<main class="sheet receipt '+key+'"><header class="receipt-header"><div class="brand">'+logo+
  '<div><strong>EVALIA</strong><span>Comprobante de pedido</span></div></div><div class="meta">'+
  (date?'<strong>'+esc(date)+'</strong>':'')+'<span>Retiro local</span></div></header>'+
  '<section class="client"><div><p class="label">Cliente</p><p class="client-name">'+esc(recipient)+'</p></div>'+
  (phone?'<div><p class="label">WhatsApp</p><p class="client-phone">'+esc(phone)+'</p></div>':'')+'</section>'+
  '<table><thead><tr><th>Modelo / talla · composición</th><th class="qty">Und.</th><th class="amount">Importe Bs</th></tr></thead><tbody>'+rows+'</tbody></table>'+
  '<section class="summary"><div><p class="label">Total de prendas</p><strong>'+esc(units)+' unidades</strong></div>'+
  '<div class="total"><p class="label">Total: Bs</p><strong>'+esc(money(total))+'</strong></div></section>'+
  '<footer>Destaca en cada detalle</footer></main>';
 return {key,title:'Comprobante de pedido',body};
}
/** Los datos de envío jamás entran al HTML comercial; el formato solo altera el diseño. */
export function buildOrderPrintHtml(data,{format,monochrome=false}={}){
 const {key,title,body}=render(data,format);
 return '<!doctype html><html lang="es"'+(monochrome?' class="mono"':'')+'><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>'+
  esc(title)+'</title><style id="paper-size">'+pageCss(key)+'</style><style>'+styles+'</style></head><body>'+body+'</body></html>';
}
/** Ventana privada, sin red ni almacenamiento. Imprimir requiere confirmación explícita. */
export function printOrder(data,openWindow){
 const initial=render(data);
 const html=buildOrderPrintHtml(data);
 const popup=openWindow('','_blank','width=810,height=930');
 if(!popup)throw new Error('Habilita las ventanas emergentes de EVALIA para imprimir.');
 popup.opener=null;
 const d=popup.document;
 d.open();d.write(html);d.close();
 const toolbar=d.createElement('div');
 toolbar.className='print-controls';
 toolbar.innerHTML='<div class="control-row"><label>Formato <select aria-label="Formato de impresión"></select></label>'+
  '<label>Acabado <select aria-label="Acabado de impresión"><option value="color">Color</option><option value="mono">Blanco y negro</option></select></label>'+
  '<button type="button">Imprimir</button></div><p>Selecciona el mismo tamaño de papel en la impresora, escala 100 %, sin encabezados ni pies del navegador. '+(data.order.fulfillment_method==='pickup'?'Los pedidos extensos pueden ocupar varias páginas.':'')+'</p>';
 // Opciones estáticas; no se interpola información del comprador en los controles.
 const [size,tone]=toolbar.querySelectorAll('select');
 for(const [key,item] of Object.entries(PRINT_FORMATS)){
  const option=d.createElement('option');option.value=key;option.textContent=item.label;size.append(option);
 }
 size.value=initial.key;
 size.addEventListener('change',()=>{
  const next=render(data,size.value);
  const template=d.createElement('template');template.innerHTML=next.body;
  d.querySelector('main.sheet').replaceWith(template.content);
  d.getElementById('paper-size').textContent=pageCss(next.key);
 });
 tone.addEventListener('change',()=>d.documentElement.classList.toggle('mono',tone.value==='mono'));
 toolbar.querySelector('button').addEventListener('click',()=>{popup.focus();popup.print();});
 d.body.prepend(toolbar);
 popup.focus();
 return true;
}

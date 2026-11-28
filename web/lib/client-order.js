// R2: contrato puro del pedido del cliente (navegador y servidor). El servidor vuelve a validar todo
// con las funciones canónicas (mínimo por modelo, colores ofrecidos, precio esperado y stock).
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const CLIENT_COOKIE_MAX_AGE=180*24*3600;

export function lineProblem(line){
 const dozens=Number(line?.dozens),extras=Array.isArray(line?.extraColorIds)?line.extraColorIds:[];
 if(!Number.isSafeInteger(dozens)||dozens<0||dozens>178956969)return 'Elige cuántas docenas.';
 if(extras.length>11)return 'Máximo 11 unidades adicionales, una por color.';
 if(new Set(extras).size!==extras.length)return 'Cada unidad adicional debe ser de un color distinto.';
 if(dozens===0&&extras.length<6)return 'Sin docenas, elige al menos 6 colores distintos (media docena).';
 return null;
}
export const expectedPrice=price=>{const n=Number(price);return Number.isFinite(n)&&n>0?n.toFixed(2):null;};

export function validateClientOrder(body){
 if(!body||typeof body!=='object'||Array.isArray(body))return null;
 const {lines,method,destination,requestId}=body;
 if(!UUID.test(String(requestId??''))||!['pickup','shipping'].includes(method))return null;
 const dest=typeof destination==='string'?destination.trim():'';
 if(method==='shipping'&&(dest.length<2||dest.length>200))return null;
 if(!Array.isArray(lines)||lines.length<1||lines.length>100)return null;
 const seen=new Set(),clean=[];
 for(const line of lines){
  if(!line||typeof line!=='object'||!UUID.test(String(line.modelId??''))||seen.has(line.modelId))return null;
  if(!Array.isArray(line.extraColorIds)||line.extraColorIds.some(id=>!UUID.test(String(id))))return null;
  if(typeof line.expectedPrice!=='string'||!/^\d{1,10}(\.\d{1,2})?$/.test(line.expectedPrice))return null;
  if(lineProblem(line))return null;
  seen.add(line.modelId);
  clean.push({modelId:line.modelId,dozens:Number(line.dozens),extraColorIds:[...line.extraColorIds],expectedPrice:line.expectedPrice});
 }
 return {lines:clean,method,destination:method==='shipping'?dest:null,requestId};
}

// Mensajes claros para el cliente según el código del servidor (sin detalles internos).
export function clientOrderError(code){
 return {
  '40001':'El precio de algún modelo cambió. Revisa tu pedido actualizado y vuelve a confirmar.',
  '23514':'No hay suficientes prendas de algún modelo. Reduce la cantidad o elige otro.',
  '22023':'Revisa tu pedido: cada modelo necesita al menos una docena o 6 colores distintos.',
  '54000':'Alcanzaste el máximo de pedidos por hoy. Comunícate con EVALIA por WhatsApp.',
  '42501':'Tu enlace ya no es válido. Pide uno nuevo a EVALIA por WhatsApp.',
  '23505':'Este pedido ya se había enviado con otros datos. Actualiza la página.'
 }[code]??'No se pudo registrar el pedido. Intenta nuevamente en unos minutos.';
}

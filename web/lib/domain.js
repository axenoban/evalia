/** Funciones de presentación sin reglas comerciales inventadas; mismo contrato monetario V1. */
export function centsFromBs(value) {
  const raw=String(value??'').trim().replace(',','.');
  if(!/^\d+(?:\.\d{1,2})?$/.test(raw)) throw new Error('Precio en Bs inválido.');
  const [whole,frac='']=raw.split('.');
  const cents=BigInt(whole)*100n+BigInt((frac+'00').slice(0,2));
  if(cents<=0n) throw new Error('El precio debe ser positivo.');
  return cents;
}
export function subtotalCents(priceDozenBs, quantity) {
  if(!Number.isSafeInteger(quantity)||quantity<6) throw new Error('Mínimo 6 unidades por modelo.');
  const scaled=centsFromBs(priceDozenBs)*BigInt(quantity);
  const bs=scaled/1200n, remainder=scaled%1200n;
  return bs*100n+(remainder===600n?50n:remainder>600n?100n:0n);
}
export const formatBs=amount=> {
  const cents=BigInt(amount);
  const sign=cents<0n?'-':'';
  const absolute=cents<0n?-cents:cents;
  return sign+new Intl.NumberFormat('es-BO',{maximumFractionDigits:0}).format(Number(absolute/100n))+','+String(absolute%100n).padStart(2,'0')+' Bs';
};
export function quantityBreakdown(quantity) {
  const n=Number(quantity);
  if(!Number.isSafeInteger(n)||n<0) return 'Cantidad inválida';
  if(n===0) return 'Sin seleccionar';
  const dozens=Math.floor(n/12),rest=n%12,parts=[];
  if(dozens) parts.push(dozens===1?'1 docena':dozens+' docenas');
  if(rest>=6) parts.push('½ docena');
  if(rest%6) parts.push((rest%6)+' '+(rest%6===1?'prenda':'prendas'));
  return parts.join(' + ');
}
export function checkedLines(models, quantities, stock) {
  const lines=[];
  for (const m of models) {
    const raw=String(quantities[m.id]??'0').trim();
    if(!/^\d+$/.test(raw)) throw new Error('Cantidad inválida en '+m.name+'.');
    const qty=Number(raw);
    if(!Number.isSafeInteger(qty)) throw new Error('Cantidad fuera de rango en '+m.name+'.');
    if(qty===0) continue;
    if(qty<6) throw new Error('Mínimo 6 unidades para '+m.name+'.');
    const available=Number(stock[m.id]?.available??0);
    if(stock[m.id]?.blocked) throw new Error('Modelo bloqueado: '+m.name+'.');
    if(qty>available) throw new Error('No hay suficientes prendas disponibles de '+m.name+'.');
    lines.push({modelId:m.id,quantity:qty});
  }
  if(!lines.length) throw new Error('Selecciona al menos un modelo.');
  return lines;
}
export function inventoryTotals(stock) {
  const all=Object.values(stock);
  return all.reduce((o,s)=>({published:o.published+Number(s.on_hand??0),reserved:o.reserved+Number(s.reserved??0),pending:o.pending+Number(s.pending_delivery??0),available:o.available+Number(s.available??0)}),{published:0,reserved:0,pending:0,available:0});
}

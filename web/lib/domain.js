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

/**
 * Captura D2-B: las docenas son surtidas; cada prenda adicional tiene
 * exactamente un color distinto del catálogo de ese mismo modelo.
 * La cantidad se compromete por modelo, nunca por color individual.
 */
export const portionQuantity = (dozens, extraColorIds) =>
  Number(dozens)*12+(extraColorIds?.length??0);

export function portionBreakdown(dozens, extraCount) {
  if (!Number.isSafeInteger(dozens)||dozens<0||
      !Number.isSafeInteger(extraCount)||extraCount<0||extraCount>11)
    return 'Composición inválida';
  const sections=[];
  if(dozens) sections.push(dozens===1?'1 docena surtida':dozens+' docenas surtidas');
  if(extraCount) sections.push(extraCount+' '+(extraCount===1?'prenda con color elegido':'prendas con colores elegidos'));
  return sections.join(' + ')||'Sin cantidades';
}

export function checkedPortions(models, selections, stock, colors) {
  const lines=[];
  const byModel=new Map(models.map(m=>[m.id,m]));
  const byColor=new Map(colors.map(c=>[c.id,c]));
  for (const [id,selection] of Object.entries(selections)) {
    const model=byModel.get(id);
    if(!model) throw new Error('Modelo no registrado o inactivo en la selección.');
    const raw=String(selection?.dozens??'').trim();
    if(!/^(0|[1-9]\d*)$/.test(raw)||raw.length>9)
      throw new Error('Docenas inválidas en '+model.name+'.');
    const dozens=Number(raw);
    if(!Number.isSafeInteger(dozens)||dozens>178956969)
      throw new Error('Número de docenas fuera de rango en '+model.name+'.');
    const colorIds=selection?.extraColorIds;
    if(!Array.isArray(colorIds))
      throw new Error('Falta la selección individual de colores de '+model.name+'.');
    if(colorIds.length>11)
      throw new Error('Máximo 11 prendas adicionales por modelo: '+model.name+'.');
    if(new Set(colorIds).size!==colorIds.length)
      throw new Error('Solo una prenda por color en '+model.name+'.');
    for(const colorId of colorIds) {
      const color=byColor.get(colorId);
      if(!color||!color.is_active||!model.colorIds?.includes(colorId))
        throw new Error('El color seleccionado no está disponible en el catálogo de '+model.name+'.');
    }
    const quantity=portionQuantity(dozens,colorIds);
    if(dozens===0 && colorIds.length<6)
      throw new Error('Sin docena, selecciona de 6 a 11 colores diferentes para '+model.name+'.');
    if(!Number.isSafeInteger(quantity)||quantity<6)
      throw new Error('Cantidad inválida en '+model.name+'.');
    const itemStock=stock[id];
    if(!itemStock||itemStock.blocked)
      throw new Error('El modelo '+model.name+' está bloqueado o sin inventario.');
    if(!Number.isSafeInteger(Number(itemStock.available))||quantity>Number(itemStock.available))
      throw new Error('Stock insuficiente para '+model.name+': hay '+Number(itemStock.available)+' prendas libres.');
    lines.push({modelId:id,dozens,extraColorIds:[...colorIds]});
  }
  if(!lines.length) throw new Error('Agrega al menos un modelo.');
  return lines;
}

/** Display-only formatting for the administrator's available stock and model price.
 * Never derive availability here: SQL / loadWorkspace supply stock.available.
 */
export function formatAvailableDozens(quantity) {
  const units=Number(quantity);
  if(!Number.isSafeInteger(units)||units<0)return 'Cantidad no disponible';
  const dozens=Math.floor(units/12);
  const rest=units%12;
  if(dozens===0)return units+' '+(units===1?'unidad':'unidades');
  return dozens+' doc.'+(rest?' y '+rest+' '+(rest===1?'unidad':'unidades'):'');
}

export function formatModelDozenPrice(price) {
  if(price===null||price===undefined||String(price).trim()==='')return 'Precio no registrado';
  const amount=Number(price);
  if(!Number.isFinite(amount)||amount<=0)return 'Precio no registrado';
  return 'Bs '+new Intl.NumberFormat('es-BO',{maximumFractionDigits:2}).format(amount)+' / docena';
}

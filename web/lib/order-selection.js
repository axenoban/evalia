/** Reglas puras del selector del pedido, sin UI ni efectos secundarios. */
export function canAddModelToOrder(stock,activeColors=0){
 const available=Number(stock?.available);
 return !stock?.blocked && Number.isSafeInteger(available) &&
  (available>=12 || (available>=6 && activeColors>=6));
}
export function initialModelPortion(stock,activeColors=0){
 if(!canAddModelToOrder(stock,activeColors))
  throw new Error('Este modelo necesita una docena disponible o 6 prendas con colores distintos.');
 return {dozens:Number(stock.available)>=12?'1':'0',extraColorIds:[]};
}

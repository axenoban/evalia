export function normalizeDestination(value){return String(value??'').trim().replace(/\s+/g,' ');}
export function validateDelivery(method,destination){
 if(!['pickup','shipping'].includes(method))throw new Error('Selecciona Retiro local o Envío.');
 const dest=normalizeDestination(destination);
 if(method==='shipping'&&(dest.length<2||dest.length>200))
  throw new Error('Para los envíos indica destino (ciudad/departamento/agencia), entre 2 y 200 caracteres.');
 return {method,destination:method==='pickup'?null:dest};
}
export const deliveryLabel=method=>method==='shipping'?'Envío nacional / interdepartamental':method==='pickup'?'Retiro local':'Pendiente de clasificar';

// Transitional full-workspace reader: bounded REST pages, deterministic unique keys and no silent cap.
export const REST_PAGE_SIZE=250;
export async function readAllPages(buildQuery,keys,label,pageSize=REST_PAGE_SIZE){
 if(!Number.isSafeInteger(pageSize)||pageSize<1||pageSize>1000||!keys.length)throw Error('Configuración de paginación inválida');
 const rows=[],seen=new Set();let expected=null;
 while(true){
  const from=rows.length;
  const response=await buildQuery().range(from,from+pageSize-1);
  if(response.error)throw Error(label+': '+response.error.message);
  const {data,count}=response;
  if(!Array.isArray(data)||!Number.isSafeInteger(count)||count<0||data.length>pageSize)throw Error(label+': respuesta de paginación inválida');
  if(expected===null)expected=count;
  if(expected!==count)throw Error(label+': los registros cambiaron durante la lectura. Pulsa Actualizar.');
  if(from+data.length>expected||(!data.length&&from<expected))throw Error(label+': lectura incompleta. Pulsa Actualizar.');
  for(const row of data){
   if(keys.some(k=>row[k]===null||row[k]===undefined))throw Error(label+': falta identificador de registro');
   const key=JSON.stringify(keys.map(k=>row[k]));
   if(seen.has(key))throw Error(label+': los registros cambiaron durante la lectura. Pulsa Actualizar.');
   seen.add(key);rows.push(row);
  }
  if(rows.length===expected)return {data:rows,error:null,count:expected};
 }
}
export function pageOf(rows,requested,size=25){
 if(!Number.isSafeInteger(size)||size<1||!Number.isSafeInteger(requested))throw Error('Página inválida');
 const pages=Math.max(1,Math.ceil(rows.length/size)),page=Math.max(1,Math.min(requested,pages));
 const start=(page-1)*size;
 return {items:rows.slice(start,start+size),page,pages,total:rows.length,first:rows.length?start+1:0,last:Math.min(start+size,rows.length)};
}

import {randomUUID} from 'node:crypto';
import {NextResponse} from 'next/server';
import {orderFromCookie} from '../../../lib/server-private.js';
import {inspectMime,validPaymentAmount,validRequestId} from '../../../lib/portal-media.js';

export const runtime='nodejs';
const maximum=2*1024*1024;
function reply(body,status=200){return NextResponse.json(body,{
 status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}
});}
export async function POST(request){
 try{
  const origin=request.headers.get('origin');
  if(!origin||origin!==new URL(request.url).origin)
   return reply({error:'Solicitud de origen no permitido.'},403);
  const size=Number(request.headers.get('content-length')||0);
  if(size>maximum+65536)return reply({error:'Imagen o formulario demasiado grande.'},413);
  const session=await orderFromCookie();
  if(!session)return reply({error:'El enlace está revocado o el pedido ya fue completado.'},403);
  const {db,hash,order}=session;
  const current=new Date(Date.now()-3600*1000).toISOString();
  const {count,error:limitError}=await db.from('payment_reports')
   .select('id',{head:true,count:'exact'})
   .eq('order_id',order.order_id).eq('origin','client').gte('created_at',current);
  if(limitError)return reply({error:'No se pudo comprobar el límite de avisos.'},503);
  if((count||0)>=5)return reply({error:'Se alcanzó el límite temporal de avisos. Contacta con EVALIA.'},429);
  const fields=await request.formData();
  const amount=String(fields.get('amount')??'').trim();
  const requestId=String(fields.get('requestId')??'');
  const receipt=fields.get('receipt');
  if(!validPaymentAmount(amount)||!validRequestId(requestId)||!receipt||typeof receipt.arrayBuffer!=='function'||
    receipt.size<16||receipt.size>maximum)
   return reply({error:'Importe o archivo inválido. Envía JPG, PNG o WebP de hasta 2 MB.'},400);
  const bytes=Buffer.from(await receipt.arrayBuffer());
  const inspected=inspectMime(bytes);
  if(!inspected||receipt.type!==inspected.mime)
   return reply({error:'El contenido del archivo no coincide con una imagen admitida.'},400);
  const path='receipts/'+order.order_id+'/'+requestId.toLowerCase()+'.'+inspected.ext;
  const {error:uploadError}=await db.storage.from('evalia-receipts').upload(path,bytes,{
   contentType:inspected.mime,upsert:false
  });
  if(uploadError && !String(uploadError.message||'').toLowerCase().includes('already exists'))
   return reply({error:'No fue posible almacenar el comprobante.'},503);
  const {error}=await db.rpc('client_evalia_payment',{
   p_token_hash:hash,p_amount:amount,p_receipt_path:path,p_request_id:requestId
  });
  if(error){
   // Si no se había creado el pago, limpia solo el archivo nuevo.
   if(!uploadError)await db.storage.from('evalia-receipts').remove([path]);
   const denied=/enlace|cerrado|acceso|revocado/i.test(error.message);
   const limited=/límite/i.test(error.message);
   return reply({error:denied?'El enlace ya no está activo.':limited?'Demasiados avisos de pago.':'No fue posible registrar el aviso. Revisa los datos.'},denied?403:limited?429:400);
  }
  return reply({ok:true,status:'pending'},201);
 }catch{
  return reply({error:'No se pudo registrar el aviso. Comprueba la conexión.'},503);
 }
}

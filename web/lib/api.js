import { getSupabase } from './supabase.js';

function unwrap(result,action) {
  if(result.error) throw new Error(action+': '+result.error.message);
  return result.data;
}
const client=()=>{const db=getSupabase();if(!db)throw new Error('Configura las variables públicas de Supabase.');return db;};
export async function authUser(){
  return unwrap(await client().auth.getUser(),'Sesión')?.user??null;
}
export async function adminAllowed(){
  return Boolean(unwrap(await client().rpc('is_evalia_admin'),'Autorización'));
}
export async function signIn(email,password){
  return unwrap(await client().auth.signInWithPassword({email,password}),'Acceso');
}
export async function signOut(){
  return unwrap(await client().auth.signOut(),'Cerrar sesión');
}
export async function loadWorkspace(){
  const db=client();
  const [modelData,colorData,modelColorData,customerData,reservationData,
    reservationLineData,orderData,orderLineData,reservationColorData,orderColorData,revisionData,
    paymentData,paymentReviewData,deliveryData,deliveryLineData,linkData,qrData]=await Promise.all([
    db.from('models').select('id,name,size_label,price_dozen_bs,image_path,is_active,created_at').order('created_at',{ascending:false}),
    db.from('colors').select('id,name,hex_code,is_active').order('name'),
    db.from('model_colors').select('model_id,color_id'),
    db.from('customers').select('id,name,whatsapp,created_at').order('created_at',{ascending:false}),
    db.from('reservations').select('id,customer_id,status,expires_at,review_at,created_at').order('created_at',{ascending:false}).limit(200),
    db.from('reservation_lines').select('id,reservation_id,model_id,quantity,dozen_count,extra_units'),
    db.from('orders').select('id,customer_id,status,origin_reservation_id,confirmed_at').order('confirmed_at',{ascending:false}).limit(200),
    db.from('order_lines').select('id,order_id,model_id,quantity,dozen_count,extra_units,price_dozen_bs,subtotal_bs'),
    db.from('reservation_extra_colors').select('reservation_line_id,color_id,position').order('position'),
    db.from('order_extra_colors').select('order_line_id,color_id,position').order('position'),
    db.from('reservation_revisions').select('reservation_id,created_at,actor_id').order('created_at',{ascending:false}).limit(500),
    db.from('payment_reports').select('id,request_id,order_id,reservation_id,amount_bs,status,origin,note,public_note,receipt_path,created_at,approved_at').order('created_at',{ascending:false}).limit(500),
    db.from('payment_reviews').select('id,report_id,action,note,created_at,actor_id').order('created_at',{ascending:false}).limit(500),
    db.from('deliveries').select('id,order_id,delivered_at,actor_id').order('delivered_at',{ascending:false}).limit(500),
    db.from('delivery_lines').select('delivery_id,order_line_id,order_id,quantity'),
    db.from('order_access_links').select('order_id,issued_at,revoked_at,version'),
    db.from('payment_qr').select('image_path,reusable_verified,updated_at').limit(1)
  ]);
  const models=unwrap(modelData,'Modelos'),colors=unwrap(colorData,'Colores'),
   modelColors=unwrap(modelColorData,'Colores de modelo'),customers=unwrap(customerData,'Clientes'),
   reservations=unwrap(reservationData,'Reservas'),reservationLines=unwrap(reservationLineData,'Líneas de reserva'),
   orders=unwrap(orderData,'Pedidos'),orderLines=unwrap(orderLineData,'Líneas de pedido'),
   reservationColors=unwrap(reservationColorData,'Colores de unidades reservadas'),
   orderColors=unwrap(orderColorData,'Colores de unidades pedidas'),
   revisions=unwrap(revisionData,'Historial de ediciones de reserva'),
   payments=unwrap(paymentData,'Avisos de pago'),paymentReviews=unwrap(paymentReviewData,'Historial de pagos'),
   deliveries=unwrap(deliveryData,'Recogidas'),deliveryLines=unwrap(deliveryLineData,'Prendas recogidas'),
   links=unwrap(linkData,'Enlaces de cliente'),qrSettings=unwrap(qrData,'QR administrativo')?.[0]||null;
  // Cada consulta usa RLS. Refrescar después de toda escritura, sin calcular cupos desde datos del cliente.
  const [stocks,images,financeEntries,deliveryEntries]=await Promise.all([
    Promise.all(models.map(async model=>{
      const result=unwrap(await db.rpc('get_model_stock',{p_model_id:model.id}),'Inventario');
      return [model.id,result];
    })),
    Promise.all(models.map(async model=>{
      if(!model.image_path) return [model.id,null];
      const {data,error}=await db.storage.from('evalia-models').createSignedUrl(model.image_path,3600);
      return [model.id,error?null:data.signedUrl];
    })),
    Promise.all(orders.map(async o=>[o.id,unwrap(await db.rpc('get_evalia_order_finance',{p_order_id:o.id}),'Saldo del pedido')])),
    Promise.all(orders.map(async o=>[o.id,unwrap(await db.rpc('get_evalia_order_delivery',{p_order_id:o.id}),'Retiro del pedido')]))
  ]);
  return {models:models.map(m=>({...m,colorIds:modelColors.filter(x=>x.model_id===m.id).map(x=>x.color_id),imageUrl:images.find(x=>x[0]===m.id)?.[1]})),
   colors,customers,stock:Object.fromEntries(stocks),revisions,payments,paymentReviews,
   deliveries,deliveryLines,links,qrSettings,finances:Object.fromEntries(financeEntries),deliveryStats:Object.fromEntries(deliveryEntries),
   reservations:reservations.map(r=>({...r,lines:reservationLines.filter(x=>x.reservation_id===r.id).map(l=>({...l,
      extraColorIds:reservationColors.filter(c=>c.reservation_line_id===l.id).map(c=>c.color_id)}))})),
   orders:orders.map(o=>({...o,lines:orderLines.filter(x=>x.order_id===o.id).map(l=>({...l,
      extraColorIds:orderColors.filter(c=>c.order_line_id===l.id).map(c=>c.color_id)}))}))};
}
export async function createColor(name,hex){
  return unwrap(await client().from('colors').insert({name,hex_code:hex}).select('id').single(),'Crear color');
}
export async function createCustomer(name,whatsapp){
  return unwrap(await client().from('customers').insert({name,whatsapp}).select('id').single(),'Crear cliente');
}
export async function uploadPhoto(file){
  if(!file)return null;
  const allowed=['image/png','image/jpeg','image/webp'];
  if(!allowed.includes(file.type)||file.size>5*1024*1024)throw new Error('La foto debe ser JPG, PNG o WebP de hasta 5 MB.');
  const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
  const path='models/'+crypto.randomUUID()+'.'+ext;
  unwrap(await client().storage.from('evalia-models').upload(path,file,{contentType:file.type,upsert:false}),'Subir fotografía');
  return path;
}
export async function removePhoto(path){
  if(path)unwrap(await client().storage.from('evalia-models').remove([path]),'Eliminar carga temporal');
}
export async function createModel({name,size,price,colorIds,stockDocenas,imagePath,requestId}){
  return unwrap(await client().rpc('create_evalia_model',{
    p_name:name,p_size:size,p_price:price,p_color_ids:colorIds,
    p_initial_units:stockDocenas*12,p_request_id:requestId,p_image_path:imagePath
  }),'Registrar modelo');
}
export async function adjustStock({modelId,operation,units,version,requestId}){
  return unwrap(await client().rpc('adjust_model_inventory',{
    p_model_id:modelId,p_operation:operation,p_units:units,
    p_expected_version:version,p_request_id:requestId
  }),'Ajustar stock');
}
export async function createReservation(customerId,lines,requestId){
  return unwrap(await client().rpc('create_evalia_reservation',{
    p_customer_id:customerId,p_lines:lines,p_request_id:requestId
  }),'Guardar reserva');
}
export async function createOrder(customerId,lines,requestId){
  return unwrap(await client().rpc('create_evalia_order',{
    p_customer_id:customerId,p_lines:lines,p_request_id:requestId
  }),'Confirmar pedido');
}
export async function confirmReservation(reservationId,requestId){
  return unwrap(await client().rpc('confirm_evalia_reservation',{
    p_reservation_id:reservationId,p_request_id:requestId
  }),'Convertir reserva');
}
export async function reviseReservation(reservationId,lines,requestId){
  return unwrap(await client().rpc('revise_evalia_reservation',{
    p_reservation_id:reservationId,p_lines:lines,p_request_id:requestId
  }),'Editar reserva');
}

/** Declarar dinero informado sin aprobarlo ni modificar el saldo. */
export async function reportPayment({reservationId=null,orderId=null,amount,requestId,note=null}){
 return unwrap(await client().rpc('report_evalia_payment',{
  p_reservation_id:reservationId,p_order_id:orderId,
  p_amount:amount,p_request_id:requestId,p_note:note||null
 }),'Registrar declaración de pago');
}
export async function reviewPayment({reportId,action,requestId,note=null}){
 return unwrap(await client().rpc('review_evalia_payment',{
  p_report_id:reportId,p_action:action,p_request_id:requestId,p_note:note||null
 }),'Verificar pago');
}
export async function recordDelivery({orderId,lines,requestId}){
 return unwrap(await client().rpc('record_evalia_delivery',{
  p_order_id:orderId,p_lines:lines,p_request_id:requestId
 }),'Registrar retiro real');
}
export async function completeOrder({orderId,requestId}){
 return unwrap(await client().rpc('complete_evalia_order',{
  p_order_id:orderId,p_request_id:requestId
 }),'Cerrar pedido');
}

function unwrapStorage(result,action){
 if(result.error)throw new Error(action+': '+result.error.message);
 return result.data;
}
export async function issueOrderLink(orderId){
 const bytes=crypto.getRandomValues(new Uint8Array(32));
 const raw=btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 const hashBytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw)));
 const digest=Array.from(hashBytes,b=>b.toString(16).padStart(2,'0')).join('');
 await unwrap(await client().rpc('issue_evalia_order_link',{
  p_order_id:orderId,p_token_hash:digest
 }),'Emitir enlace privado');
 // El token existe únicamente en memoria de esta pestaña y en el enlace copiado.
 return window.location.origin+'/p/'+raw;
}
export async function revokeOrderLink(orderId){
 return unwrap(await client().rpc('revoke_evalia_order_link',{
  p_order_id:orderId
 }),'Revocar enlace');
}
export async function getPrivateReceiptUrl(path){
 if(!path||!/^receipts\/[0-9a-f-]+\/[0-9a-f-]+\.(jpg|jpeg|png|webp)$/.test(path))
  throw new Error('Ruta de comprobante no válida.');
 return unwrapStorage(await client().storage.from('evalia-receipts')
  .createSignedUrl(path,60),'Consultar comprobante').signedUrl;
}
export async function getAdminQrUrl(path){
 if(!path)return null;
 return unwrapStorage(await client().storage.from('evalia-qr')
  .createSignedUrl(path,120),'Mostrar QR').signedUrl;
}
export async function saveRealQr(file,verified,requestId){
 if(!verified)throw new Error('Antes de compartirlo confirma que el QR bancario es real, vigente y reutilizable.');
 if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5242880||file.size===0)
  throw new Error('El QR debe ser una imagen JPG, PNG o WebP de hasta 5 MB.');
 const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
 const path='qr/'+requestId+'.'+ext;
 const result=await client().storage.from('evalia-qr')
  .upload(path,file,{contentType:file.type,upsert:false});
 if(result.error && !String(result.error.message||'').toLowerCase().includes('already exists'))
  throw new Error('Carga del QR: '+result.error.message);
 try{
  return unwrap(await client().rpc('update_evalia_qr',{
   p_image_path:path,p_verified_reusable:true,p_request_id:requestId
  }),'Actualizar QR de EVALIA');
 }catch(err){
  // No eliminar archivo repetido, podría estar enlazado a un intento anterior.
  if(!result.error)await client().storage.from('evalia-qr').remove([path]);
  throw err;
 }
}

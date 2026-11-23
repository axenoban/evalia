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
    reservationLineData,orderData,orderLineData,reservationColorData,orderColorData]=await Promise.all([
    db.from('models').select('id,name,size_label,price_dozen_bs,image_path,is_active,created_at').order('created_at',{ascending:false}),
    db.from('colors').select('id,name,hex_code,is_active').order('name'),
    db.from('model_colors').select('model_id,color_id'),
    db.from('customers').select('id,name,whatsapp,created_at').order('created_at',{ascending:false}),
    db.from('reservations').select('id,customer_id,status,expires_at,review_at,created_at').order('created_at',{ascending:false}).limit(200),
    db.from('reservation_lines').select('id,reservation_id,model_id,quantity,dozen_count,extra_units'),
    db.from('orders').select('id,customer_id,status,origin_reservation_id,confirmed_at').order('confirmed_at',{ascending:false}).limit(200),
    db.from('order_lines').select('id,order_id,model_id,quantity,dozen_count,extra_units,price_dozen_bs,subtotal_bs'),
    db.from('reservation_extra_colors').select('reservation_line_id,color_id,position').order('position'),
    db.from('order_extra_colors').select('order_line_id,color_id,position').order('position')
  ]);
  const models=unwrap(modelData,'Modelos'),colors=unwrap(colorData,'Colores'),
   modelColors=unwrap(modelColorData,'Colores de modelo'),customers=unwrap(customerData,'Clientes'),
   reservations=unwrap(reservationData,'Reservas'),reservationLines=unwrap(reservationLineData,'Líneas de reserva'),
   orders=unwrap(orderData,'Pedidos'),orderLines=unwrap(orderLineData,'Líneas de pedido'),
   reservationColors=unwrap(reservationColorData,'Colores de unidades reservadas'),
   orderColors=unwrap(orderColorData,'Colores de unidades pedidas');
  // Cada consulta usa RLS. Refrescar después de toda escritura, sin calcular cupos desde datos del cliente.
  const [stocks,images]=await Promise.all([
    Promise.all(models.map(async model=>{
      const result=unwrap(await db.rpc('get_model_stock',{p_model_id:model.id}),'Inventario');
      return [model.id,result];
    })),
    Promise.all(models.map(async model=>{
      if(!model.image_path) return [model.id,null];
      const {data,error}=await db.storage.from('evalia-models').createSignedUrl(model.image_path,3600);
      return [model.id,error?null:data.signedUrl];
    }))
  ]);
  return {models:models.map(m=>({...m,colorIds:modelColors.filter(x=>x.model_id===m.id).map(x=>x.color_id),imageUrl:images.find(x=>x[0]===m.id)?.[1]})),
   colors,customers,stock:Object.fromEntries(stocks),
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

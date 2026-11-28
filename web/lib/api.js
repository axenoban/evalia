import { getSupabase } from './supabase.js';
import { readAllPages } from './workspace-pagination.js';
import { loadOrderPage } from './order-page.js';
import { loadFullWorkspace,loadLightWorkspace } from './workspace-loader.js';

function unwrap(result,action) {
  if(result.error) throw new Error(action+': '+result.error.message);
  return result.data;
}
const client=()=>{const db=getSupabase();if(!db)throw new Error('Configura las variables públicas de Supabase.');return db;};
export async function authUser(){
  const result=await client().auth.getUser();
  if(result.error?.name==='AuthSessionMissingError')return null;
  return unwrap(result,'Sesión')?.user??null;
}
export async function adminAllowed(){
  // R1: el acceso al panel incluye al vendedor; cada operación vuelve a validar su permiso en el servidor.
  return Boolean(unwrap(await client().rpc('is_evalia_staff'),'Autorización'));
}
export async function signIn(email,password){
  return unwrap(await client().auth.signInWithPassword({email,password}),'Acceso');
}
export async function signOut(){
  return unwrap(await client().auth.signOut(),'Cerrar sesión');
}
export const loadWorkspace=(now=Date.now())=>loadFullWorkspace(client(),now);
export const loadWorkspaceLight=(previous,now=Date.now())=>loadLightWorkspace(client(),previous,now);
export async function loadOrdersPage(params){return loadOrderPage(client(),params);}
export async function loadOrderById(id,signal){const result=await loadOrderPage(client(),{archived:false,range:{from:'',to:'',valid:true},page:1,size:10,orderId:id,signal});if(result.view?.items.length!==1||result.view.items[0].id!==id)throw Error('No se encontró el pedido vigente');return result;}
export async function saveColor({id=null,name,hex,active=true,expected=null,requestId}){
 return unwrap(await client().rpc('save_evalia_color',{p_id:id,p_name:name,p_hex:hex,p_active:active,p_expected:expected,p_request_id:requestId}),'Guardar color');
}
export async function createColor(name,hex,requestId){return saveColor({name,hex,requestId});}
export async function editProduct({modelId,name,size,price,colorIds,imagePath,expectedUpdatedAt,requestId}){
 return unwrap(await client().rpc('edit_evalia_product',{p_model_id:modelId,p_name:name,p_size:size,p_price:price,p_colors:colorIds,p_image_path:imagePath,p_expected:expectedUpdatedAt,p_request_id:requestId}),'Editar producto');
}
export async function reactivateProduct({modelId,units,expectedUpdatedAt,requestId}){
 return unwrap(await client().rpc('reactivate_evalia_product',{p_id:modelId,p_units:units,p_expected:expectedUpdatedAt,p_request_id:requestId}),'Reactivar producto');
}
export async function productHistory(id){
 const db=client();
 const [events,old]=await Promise.all([readAllPages(()=>db.from('catalog_change_events').select('request_id,operation,previous_data,new_data,actor_id,created_at',{count:'exact'}).eq('entity_type','model').eq('entity_id',id).order('created_at',{ascending:false}).order('request_id'),['request_id'],'Cambios del catálogo'),readAllPages(()=>db.from('model_catalog_revisions').select('id,request_id,old_price,new_price,old_image_path,new_image_path,actor_id,created_at',{count:'exact'}).eq('model_id',id).order('created_at',{ascending:false}).order('id'),['id'],'Revisiones anteriores')]);
 const current=events.data.map(e=>({...e,source:'integral'})),seen=new Set(current.map(e=>e.request_id));
 return [...current,...old.data.filter(e=>!seen.has(e.request_id)).map(e=>({...e,operation:'price_photo',source:'legacy'}))].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
}
export async function createCustomer({name,whatsapp,method,destination,requestId,confirmDuplicate=false}){
 const result=unwrap(await client().rpc('create_evalia_customer',{
  p_name:name,p_whatsapp:whatsapp,p_method:method,p_destination:destination,
  p_request_id:requestId,p_confirm_duplicate:confirmDuplicate
 }),'Crear cliente');
 if(result?.state==='duplicate'&&Number.isInteger(result.count)&&result.count>0)return result;
 if(result?.state!=='created'||!result.id)throw Error('No se pudo confirmar el alta. Verifica antes de repetir.');
 return result;
}
export async function uploadPhoto(file,requestId=crypto.randomUUID()){
  if(!file)return null;
  const allowed=['image/png','image/jpeg','image/webp'];
  if(!allowed.includes(file.type)||file.size>5*1024*1024||file.size===0)throw new Error('La foto debe ser JPG, PNG o WebP de hasta 5 MB.');
  if(!/^[0-9a-f-]{36}$/i.test(requestId))throw Error('Identificador de carga inválido.');
  const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
  const bytes=await file.arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',bytes);
  const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  const path='models/'+requestId+'-'+hash+'.'+ext;
  const storage=client().storage.from('evalia-models');
  const result=await storage.upload(path,file,{contentType:file.type,upsert:false});
  if(result.error){
   // No aceptar un 409 a ciegas: confirmar que los bytes existentes son los mismos.
   if(!['409','Duplicate'].includes(String(result.error.statusCode??result.error.code))&&!/already exists/i.test(result.error.message||''))unwrap(result,'Subir fotografía');
   const existing=unwrap(await storage.download(path),'Verificar fotografía del intento anterior');
   const prior=await crypto.subtle.digest('SHA-256',await existing.arrayBuffer());
   if(Array.from(new Uint8Array(prior),b=>b.toString(16).padStart(2,'0')).join('')!==hash)throw Error('La fotografía anterior no coincide; revisa antes de reintentar.');
  }
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
/** Cambio de precio/foto solo para futuras ventas; cada actualización queda auditada. */
export async function updateModel({modelId,price,imagePath=null,expectedUpdatedAt,requestId}){
 return unwrap(await client().rpc('update_evalia_model',{
  p_model_id:modelId,p_price:price,p_new_image_path:imagePath,
  p_expected_updated_at:expectedUpdatedAt,p_request_id:requestId
 }),'Actualizar modelo');
}
export async function archiveModel(model){
 return unwrap(await client().rpc('archive_evalia_model',{p_model_id:model.id,p_expected_updated_at:model.updated_at}),'Inhabilitar producto');
}
export async function cleanupReplacedPhoto(path){
 if(!/^models\/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(path))throw Error('Ruta de foto inválida');
 const db=client();
 const refs=unwrap(await db.from('models').select('id').eq('image_path',path).eq('is_active',true).limit(1),'Comprobar referencias');
 if(refs.length)return false;
 await cleanupArchivedPhotos([path]);
 return true;
}
export async function cleanupArchivedPhotos(paths){
 const db=client();
 for(const path of new Set(paths)){
  if(!/^models\/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(path))throw new Error('Ruta de fotografía no válida.');
  unwrap(await db.storage.from('evalia-models').remove([path]),'Eliminar fotografía archivada');
  const removed=unwrap(await db.rpc('finalize_evalia_archived_photo',{p_image_path:path}),'Verificar eliminación');
  if(!removed)throw new Error('La fotografía aún existe o está vinculada a un modelo activo.');
 }
}
export async function setOrderPrepared({orderId,prepared,expectedVersion}){
 return unwrap(await client().rpc('set_evalia_order_prepared',{p_order_id:orderId,p_prepared:prepared,p_expected_version:expectedVersion}),'Actualizar preparación');
}
export async function archiveOrder(orderId,reason){
 return unwrap(await client().rpc('archive_evalia_order',{p_order_id:orderId,p_reason:reason}),'Archivar pedido');
}
export async function updateCustomer({customerId,name,whatsapp,method,destination,expectedUpdatedAt,requestId}){
 return unwrap(await client().rpc('update_evalia_customer_delivery',{
  p_customer_id:customerId,p_name:name,p_whatsapp:whatsapp,
  p_preference:method,p_destination:destination,
  p_expected_updated_at:expectedUpdatedAt,p_request_id:requestId
 }),'Corregir ficha de cliente');
}

export async function adjustStock({modelId,operation,units,version,requestId}){
  return unwrap(await client().rpc('adjust_model_inventory',{
    p_model_id:modelId,p_operation:operation,p_units:units,
    p_expected_version:version,p_request_id:requestId
  }),'Ajustar stock');
}
export async function createOrder(customerId,lines,requestId,delivery){
 const result=await client().rpc('create_evalia_order_delivery',{
  p_customer_id:customerId,p_lines:lines,p_request_id:requestId,
  p_method:delivery.method,p_destination:delivery.destination
 });
 if(result.error){const error=new Error('Confirmar pedido: '+result.error.message);error.code=result.error.code;throw error;}
 if(typeof result.data!=='string'||!(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result.data)))throw Error('No se pudo verificar el identificador del pedido. Reintenta la misma solicitud.');
 return result.data;
}
/** Edición idempotente y auditada: solo pedido activo sin pagos/entregas/enlace. */
export async function reviseOrder({orderId,lines,expectedRevision,requestId}){
 return unwrap(await client().rpc('revise_evalia_order',{
  p_order_id:orderId,p_lines:lines,p_expected_revision:expectedRevision,p_request_id:requestId
 }),'Modificar pedido');
}
export async function updateOrderDelivery({orderId,method,destination,requestId}){
 return unwrap(await client().rpc('update_evalia_order_delivery',{
  p_order_id:orderId,p_method:method,p_destination:destination,
  p_request_id:requestId
 }),'Actualizar destino del pedido');
}
export async function confirmReservation(reservationId,requestId){
  return unwrap(await client().rpc('confirm_evalia_reservation',{
    p_reservation_id:reservationId,p_request_id:requestId
  }),'Convertir reserva');
}

/** Declarar dinero informado sin aprobarlo ni modificar el saldo. */
export async function reportPayment({orderId,amount,requestId,note=null}){
 if(!orderId)throw new Error('Solo se registran avisos de pago de pedidos confirmados.');
 return unwrap(await client().rpc('report_evalia_payment',{
  p_reservation_id:null,p_order_id:orderId,
  p_amount:amount,p_request_id:requestId,p_note:note||null
 }),'Registrar declaración de pago');
}
export async function reviewPayment({reportId,action,requestId,note=null}){
 return unwrap(await client().rpc('review_evalia_payment',{
  p_report_id:reportId,p_action:action,p_request_id:requestId,p_note:note||null
 }),'Verificar pago');
}
/** Pago y/o entrega total confirmados por administrador, operación única e idempotente. */
export async function quickCheckout({orderId,action,requestId,note=null,moneyReceived=false,goodsDelivered=false}){
 return unwrap(await client().rpc('quick_evalia_checkout',{
  p_order_id:orderId,p_action:action,p_request_id:requestId,p_note:note||null,
  p_money_received:moneyReceived,p_goods_delivered:goodsDelivered
 }),'Registrar cobro/entrega express');
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
 if(process.env.NEXT_PUBLIC_EVALIA_STATIC_PREVIEW==='1')
  throw new Error('GitHub Pages no ejecuta las rutas privadas. Para enlaces de clientes se necesita el despliegue completo de Next.js con servidor.');
 const status=await fetch('/api/portal-estado',{cache:'no-store',credentials:'same-origin'});
 const state=await status.json().catch(()=>({ready:false}));
 if(!status.ok||!state.ready)
  throw new Error('El backend privado del cliente no está configurado. Configura SUPABASE_SECRET_KEY solo en el servidor antes de emitir enlaces.');
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
// R2: enlace personal del cliente (solo administradores). Mismo token de 32 bytes; la base guarda solo su hash.
export async function issueCustomerLink(customerId){
 if(process.env.NEXT_PUBLIC_EVALIA_STATIC_PREVIEW==='1')
  throw new Error('GitHub Pages no ejecuta las rutas privadas del cliente.');
 const status=await fetch('/api/portal-estado',{cache:'no-store',credentials:'same-origin'});
 const state=await status.json().catch(()=>({ready:false}));
 if(!status.ok||!state.ready)
  throw new Error('El backend privado del cliente no está configurado. Configura SUPABASE_SECRET_KEY solo en el servidor antes de emitir enlaces.');
 const bytes=crypto.getRandomValues(new Uint8Array(32));
 const raw=btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 const hashBytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw)));
 const digest=Array.from(hashBytes,b=>b.toString(16).padStart(2,'0')).join('');
 const version=unwrap(await client().rpc('issue_evalia_customer_link',{p_customer_id:customerId,p_token_hash:digest}),'Emitir enlace del cliente');
 // El token solo existe en esta pestaña y en el mensaje que el administrador copia.
 return {url:window.location.origin+'/c/'+raw,version};
}
export async function revokeCustomerLink(customerId){
 return unwrap(await client().rpc('revoke_evalia_customer_link',{p_customer_id:customerId}),'Revocar enlace del cliente');
}
// Estado del enlace de todos los clientes en una sola consulta (RLS: solo administradores).
export async function customerLinkStatuses(){
 const {data,error}=await client().from('customer_access_links').select('customer_id,version,issued_at,revoked_at');
 if(error)throw new Error('Estado de enlaces: '+error.message);
 return new Map((data||[]).map(r=>[r.customer_id,r]));
}
export async function customerLinkStatus(customerId){
 const {data,error}=await client().from('customer_access_links').select('version,issued_at,revoked_at').eq('customer_id',customerId).maybeSingle();
 if(error)throw new Error('Estado del enlace: '+error.message);
 return data;
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
export async function saveRealQr(file,verified,requestId,db=client()){
 if(!verified)throw new Error('Antes de compartirlo confirma que el QR bancario es real, vigente y reutilizable.');
 if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5242880||file.size===0)
  throw new Error('El QR debe ser una imagen JPG, PNG o WebP de hasta 5 MB.');
 const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
 const path='qr/'+requestId+'.'+ext;
 const result=await db.storage.from('evalia-qr')
  .upload(path,file,{contentType:file.type,upsert:false});
 if(result.error && !String(result.error.message||'').toLowerCase().includes('already exists'))
  throw new Error('Carga del QR: '+result.error.message);
 try{
  return unwrap(await db.rpc('update_evalia_qr',{
   p_image_path:path,p_verified_reusable:true,p_request_id:requestId
  }),'Actualizar QR de EVALIA');
 }catch(err){
  // Una respuesta perdida no demuestra rollback: preservar archivo hasta conciliación segura.
  throw err;
 }
}
// E3: estadísticas y exportación exclusivas del propietario; el servidor valida rol y MFA (is_evalia_owner).
export async function loadOwnerStats(lower,upper){
  return unwrap(await client().rpc('get_evalia_owner_stats',{p_from:lower,p_to:upper}),'Estadísticas');
}
export async function exportOwnerOrders(lower,upper){
  return unwrap(await client().rpc('export_evalia_orders',{p_from:lower,p_to:upper}),'Exportación');
}

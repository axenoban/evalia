// Lectura del espacio de trabajo sin dependencias de red propias: recibe el cliente Supabase autorizado.
// Toda consulta usa RLS; el navegador nunca decide cupo, saldo ni permisos.
import { assembleWorkspace } from './workspace-assembly.js';
import { readAllPages } from './workspace-pagination.js';
import { loadDashboardOrderLines } from './order-page.js';
import { loadStockBatches,loadModelPhotos } from './product-data.js';
function unwrap(result,action) {
  if(result.error) throw new Error(action+': '+result.error.message);
  return result.data;
}
export async function loadFullWorkspace(db,now=Date.now()){
  const [modelData,colorData,modelColorData,customerData,reservationData,
    reservationLineData,orderData,archivedOrderData,reservationColorData,revisionData,
    paymentData,paymentReviewData,qrData]=await Promise.all([
    readAllPages(()=>db.from('models').select('id,name,size_label,price_dozen_bs,image_path,is_active,created_at,updated_at',{count:'exact'}).order('created_at',{ascending:false}).order('id',{ascending:true}),["id"],'models'),
    readAllPages(()=>db.from('colors').select('id,name,hex_code,is_active,updated_at',{count:'exact'}).order('name').order('id',{ascending:true}),["id"],'colors'),
    readAllPages(()=>db.from('model_colors').select('model_id,color_id',{count:'exact'}).eq('is_offered',true).order('model_id',{ascending:true}).order('color_id',{ascending:true}),["model_id","color_id"],'model_colors'),
    readAllPages(()=>db.from('customers').select('id,name,whatsapp,delivery_preference,shipping_destination,created_at,updated_at',{count:'exact'}).order('created_at',{ascending:false}).order('id',{ascending:true}),["id"],'customers'),
    readAllPages(()=>db.from('reservations').select('id,customer_id,status,expires_at,review_at,created_at',{count:'exact'}).order('created_at',{ascending:false}).order('id',{ascending:true}),["id"],'reservations'),
    readAllPages(()=>db.from('reservation_lines').select('id,reservation_id,model_id,quantity,dozen_count,extra_units,model_name_snapshot,size_label_snapshot',{count:'exact'}).order('id',{ascending:true}),["id"],'reservation_lines'),
    readAllPages(()=>db.from('orders').select('id,customer_id,status,origin_reservation_id,confirmed_at,fulfillment_method,archived_at',{count:'exact'}).is('archived_at',null).order('confirmed_at',{ascending:false}).order('id',{ascending:true}),["id"],'orders'),
    readAllPages(()=>db.from('orders').select('id,customer_id,status,origin_reservation_id,confirmed_at,fulfillment_method,archived_at',{count:'exact'}).not('archived_at','is',null).order('archived_at',{ascending:false}).order('id',{ascending:true}),["id"],'orders'),
    readAllPages(()=>db.from('reservation_extra_colors').select('reservation_line_id,color_id,position,color_name_snapshot,color_hex_snapshot',{count:'exact'}).order('position').order('reservation_line_id',{ascending:true}).order('color_id',{ascending:true}),["reservation_line_id","color_id"],'reservation_extra_colors'),
    readAllPages(()=>db.from('reservation_revisions').select('id,reservation_id,created_at,actor_id',{count:'exact'}).order('created_at',{ascending:false}).order('id',{ascending:true}),["id"],'reservation_revisions'),
    readAllPages(()=>db.from('payment_reports').select('id,request_id,order_id,reservation_id,amount_bs,status,origin,note,public_note,receipt_path,created_at,approved_at',{count:'exact'}).order('created_at',{ascending:false}).order('id',{ascending:true}),["id"],'payment_reports'),
    readAllPages(()=>db.from('payment_reviews').select('id,report_id,action,note,created_at,actor_id',{count:'exact'}).order('created_at',{ascending:false}).order('id',{ascending:true}),["id"],'payment_reviews'),
    db.from('payment_qr').select('image_path,reusable_verified,updated_at').limit(1)
  ]);
  const models=unwrap(modelData,'Modelos'),colors=unwrap(colorData,'Colores'),
   modelColors=unwrap(modelColorData,'Colores de modelo'),customers=unwrap(customerData,'Clientes'),
   reservations=unwrap(reservationData,'Reservas'),reservationLines=unwrap(reservationLineData,'Líneas de reserva'),
   orders=[...unwrap(orderData,'Pedidos'),...unwrap(archivedOrderData,'Pedidos archivados')],
   reservationColors=unwrap(reservationColorData,'Colores de unidades reservadas'),
   revisions=unwrap(revisionData,'Historial de ediciones de reserva'),
   payments=unwrap(paymentData,'Avisos de pago'),paymentReviews=unwrap(paymentReviewData,'Historial de pagos'),
   qrSettings=unwrap(qrData,'QR administrativo')?.[0]||null;
  // Cada consulta usa RLS. Refrescar después de toda escritura, sin calcular cupos desde datos del cliente.
  const [stocks,images,orderLines]=await Promise.all([
    loadStockBatches(db,models),
    loadModelPhotos(db,models),
    loadDashboardOrderLines(db,orders)
  ]);
  // The global workspace retains headers for exact dashboard counts and legacy/payment references.
  // Full order details are loaded only for the selected server page.
  const base={models,modelColors,colors,customers,reservations,reservationLines,reservationColors,orders,orderLines,orderColors:[],revisions,payments,paymentReviews,deliveries:[],deliveryLines:[],links:[],qrSettings,stocks,images,financeEntries:[],deliveryEntries:[]};
  return {...assembleWorkspace(base),base,photoSignedAt:now,loadedAt:now,fullLoadedAt:now};
}
// Actualización liviana (cada minuto): solo lo que cambia con la operación diaria —modelos, colores
// ofrecidos, stock, cabeceras de pedidos, avisos de pago por revisar y líneas del resumen—.
// Clientes, historial de pagos, registros anteriores y QR se reutilizan del último snapshot completo,
// que se repite cada 5 minutos, tras cada escritura y al volver a la pestaña.
export const PHOTO_RESIGN_MS=45*60*1000;
const PENDING_PAYMENT_STATES=['pending','observed'];
export async function loadLightWorkspace(db,previous,now=Date.now()){
  if(!previous?.base)return loadFullWorkspace(db,now);
  const [modelData,modelColorData,orderData,archivedOrderData,pendingPaymentData]=await Promise.all([
    readAllPages(()=>db.from('models').select('id,name,size_label,price_dozen_bs,image_path,is_active,created_at,updated_at',{count:'exact'}).order('created_at',{ascending:false}).order('id',{ascending:true}),["id"],'models'),
    readAllPages(()=>db.from('model_colors').select('model_id,color_id',{count:'exact'}).eq('is_offered',true).order('model_id',{ascending:true}).order('color_id',{ascending:true}),["model_id","color_id"],'model_colors'),
    readAllPages(()=>db.from('orders').select('id,customer_id,status,origin_reservation_id,confirmed_at,fulfillment_method,archived_at',{count:'exact'}).is('archived_at',null).order('confirmed_at',{ascending:false}).order('id',{ascending:true}),["id"],'orders'),
    readAllPages(()=>db.from('orders').select('id,customer_id,status,origin_reservation_id,confirmed_at,fulfillment_method,archived_at',{count:'exact'}).not('archived_at','is',null).order('archived_at',{ascending:false}).order('id',{ascending:true}),["id"],'orders'),
    readAllPages(()=>db.from('payment_reports').select('id,request_id,order_id,reservation_id,amount_bs,status,origin,note,public_note,receipt_path,created_at,approved_at',{count:'exact'}).in('status',PENDING_PAYMENT_STATES).order('created_at',{ascending:false}).order('id',{ascending:true}),["id"],'payment_reports')
  ]);
  const models=unwrap(modelData,'Modelos'),modelColors=unwrap(modelColorData,'Colores de modelo'),
   orders=[...unwrap(orderData,'Pedidos'),...unwrap(archivedOrderData,'Pedidos archivados')],
   pending=unwrap(pendingPaymentData,'Avisos de pago');
  // Los avisos por revisar se reemplazan con la lectura actual; los ya resueltos se conservan del último snapshot completo.
  const pendingIds=new Set(pending.map(p=>p.id));
  const payments=[...pending,...previous.base.payments.filter(p=>!PENDING_PAYMENT_STATES.includes(p.status)&&!pendingIds.has(p.id))]
   .sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))||String(a.id).localeCompare(String(b.id)));
  const resign=now-(previous.photoSignedAt??0)>PHOTO_RESIGN_MS;
  const known=resign?new Map():new Map(previous.models.filter(m=>m.imageUrl&&m.image_path).map(m=>[m.image_path,m.imageUrl]));
  const missing=models.filter(m=>m.is_active&&m.image_path&&!known.has(m.image_path));
  const [stocks,signed,orderLines]=await Promise.all([
    loadStockBatches(db,models),
    loadModelPhotos(db,missing),
    loadDashboardOrderLines(db,orders)
  ]);
  const fresh=new Map(signed);
  const images=models.map(m=>[m.id,m.is_active?(fresh.get(m.id)??known.get(m.image_path)??null):null]);
  const base={...previous.base,models,modelColors,orders,orderLines,payments,stocks,images};
  return {...assembleWorkspace(base),base,photoSignedAt:resign?now:previous.photoSignedAt,loadedAt:now,fullLoadedAt:previous.fullLoadedAt};
}

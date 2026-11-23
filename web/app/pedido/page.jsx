import {orderFromCookie} from '../../lib/server-private.js';
import {ClientPaymentForm} from './ClientPaymentForm.jsx';
import './portal.css';

export const dynamic='force-dynamic';
export const runtime='nodejs';
const money=n=>new Intl.NumberFormat('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2})
 .format(Number(n||0))+' Bs';

export default async function PrivateOrderPage(){
 let session=null;
 try{session=await orderFromCookie();}catch{session=null;}
 if(!session)return <main className="private-portal"><section className="private-card">
  <h1>Este enlace no está disponible</h1>
  <p>Puede haber sido revocado o el pedido ya está completado. Contacta con EVALIA para solicitar un enlace válido.</p>
 </section></main>;
 const {order,db}=session;
 let qr=null;
 if(order.qr_path){
  const {data,error}=await db.storage.from('evalia-qr').createSignedUrl(order.qr_path,120);
  if(!error) qr=data?.signedUrl||null;
 }
 return <main className="private-portal"><div className="private-container">
  <header className="private-brand"><b>EVALIA</b><span>Consulta privada de pedido</span></header>
  <section className="private-card">
   <p className="private-kicker">PEDIDO CONFIRMADO</p>
   <h1>Pedido #{order.reference}</h1>
   <p>Este enlace permite consultar únicamente este pedido y notificar pagos. No sirve para confirmar pagos ni modificar prendas.</p>
   <div className="private-lines">{(order.lines||[]).map((l,i)=><div className="private-line" key={i}>
    <div><strong>{l.model}</strong><small>Talla {l.size} · {l.quantity} prendas
      {l.dozens!==null?' · '+l.dozens+' docenas surtidas':''}
      {Number(l.extras)>0?' + '+l.extras+' extra':''}</small>
      {!!l.colors?.length&&<small>Colores individuales: {l.colors.join(', ')}</small>}
    </div><b>{money(l.subtotal)}</b>
   </div>)}</div>
   <div className="private-balances">
    <div><small>Total del pedido</small><strong>{money(order.total)}</strong></div>
    <div><small>Abonado y aprobado</small><strong>{money(order.approved)}</strong></div>
    <div className="important"><small>Saldo pendiente</small><strong>{money(order.pending)}</strong></div>
   </div>
   {Number(order.excess)>0&&<p>Existe un importe excedente en revisión administrativa.</p>}
  </section>
  <section className="private-card">
   <h2>Realizar pago externo</h2>
   {qr?<div className="portal-qr"><img src={qr} alt="Código QR bancario vigente proporcionado por EVALIA"/>
     <a href={qr} download="evalia-qr.png" referrerPolicy="no-referrer">Descargar QR</a></div>:
    <p>El QR bancario todavía no está disponible. Comunícate con EVALIA para obtener los datos de pago válidos.</p>}
   <h2>Informar un pago</h2>
   <ClientPaymentForm/>
  </section>
  <section className="private-card">
   <h2>Mis avisos de pago</h2>
   {(order.payments||[]).length?(order.payments||[]).map(p=><div key={p.id} className="private-payment">
    <b>{money(p.amount)}</b>
    <span>{ {pending:'Pendiente de verificación',observed:'En observación',rejected:'Rechazado',approved:'Aprobado / recibido'}[p.status]||'En revisión'}</span>
    {!!p.note&&<small>{p.note}</small>}
   </div>):<p>No hay declaraciones de pago para este pedido.</p>}
   <p className="private-footer">Solo los pagos que EVALIA compruebe y apruebe se descuentan del saldo. Si necesitas asistencia, contacta por el canal de WhatsApp habitual.</p>
  </section>
 </div></main>;
}

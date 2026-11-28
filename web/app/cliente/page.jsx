import {customerFromCookie,signCatalogPhotos} from '../../lib/server-private.js';
import {BrandMark} from '../brand.jsx';
import ClientOrderForm from './ClientOrderForm.jsx';
import '../catalogo/storefront.css';

export const dynamic='force-dynamic';
export const runtime='nodejs';
export const metadata={title:'Mis pedidos · EVALIA',robots:{index:false,follow:false}};
const money=n=>new Intl.NumberFormat('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n||0))+' Bs';
const date=v=>new Intl.DateTimeFormat('es-BO',{timeZone:'America/La_Paz',day:'2-digit',month:'short',year:'numeric'}).format(new Date(v));
const STATUS={active:'En curso',completed:'Completado'};

export default async function ClientPortal(){
 let access=null;
 try{access=await customerFromCookie();}catch{access=null;}
 if(!access)return <main className="ev-store"><div className="ev-store-wrap">
  <header className="ev-store-head"><div className="ev-store-brand"><BrandMark/><div><b>EVALIA</b><small>CLIENTES</small></div></div></header>
  <section className="ev-store-intro"><h1>Tu enlace no está activo</h1>
   <p>Abre nuevamente el enlace personal que EVALIA te envió por WhatsApp, o pide uno nuevo. También puedes ver el catálogo.</p></section>
  <a className="ev-store-cta" href="/catalogo">Ver catálogo</a>
 </div></main>;
 const {session}=access;
 const catalog=await signCatalogPhotos(access.db,session.catalog||[]);
 const first=String(session.customer.name||'').trim().split(/\s+/)[0]||'cliente';
 return <main className="ev-store"><div className="ev-store-wrap">
  <header className="ev-store-head">
   <div className="ev-store-brand"><BrandMark/><div><b>EVALIA</b><small>HOLA, {first.toUpperCase()}</small></div></div>
   <form method="post" action="/api/cliente-salir"><button className="ev-store-cta outline" type="submit">Salir de este teléfono</button></form>
  </header>
  <section className="ev-store-section"><h2>Hacer un pedido</h2>
   <ClientOrderForm catalog={catalog} preference={session.customer.delivery_preference} destination={session.customer.shipping_destination}/>
  </section>
  <section className="ev-store-section"><h2>Mis pedidos</h2>
   {session.orders?.length?<div className="ev-orders-list">{session.orders.map(o=><div className="ev-order-item" key={o.reference}>
    <div><b>Pedido #{o.reference}</b><small>{date(o.confirmed_at)} · {o.units} prendas · {o.method==='shipping'?'Envío':'Retiro'}</small>
     <small>{STATUS[o.status]??o.status}{o.status==='active'?(o.prepared?' · Preparado':' · En preparación'):''}</small></div>
    <div style={{textAlign:'right'}}><b>{money(o.total)}</b>{o.status==='active'&&<small>{Number(o.pending)>0?'Saldo: '+money(o.pending):'Pagado'}</small>}</div>
   </div>)}</div>:<p className="ev-cart-note">Todavía no tienes pedidos.</p>}
   <p className="ev-cart-note">Los pagos se informan a EVALIA por WhatsApp; solo los pagos comprobados reducen tu saldo.</p>
  </section>
 </div></main>;
}

import {getServiceDb,signCatalogPhotos,customerFromCookie} from '../../lib/server-private.js';
import {BrandMark} from '../brand.jsx';
import CatalogGrid from './catalog-grid.jsx';
import './storefront.css';

export const dynamic='force-dynamic';
export const runtime='nodejs';
export const metadata={title:'Catálogo · EVALIA',description:'Catálogo mayorista de EVALIA: modelos, tallas, colores y precios por docena.'};

// Número de WhatsApp de la tienda (opcional, configurable en Vercel): solo dígitos con código de país.
function storeWhatsApp(){const n=String(process.env.NEXT_PUBLIC_EVALIA_WHATSAPP||'').replace(/\D/g,'');return n.length>=8&&n.length<=15?n:null;}

export default async function PublicCatalog(){
 let items=[],failed=false,client=null;
 try{
  const db=getServiceDb();
  const {data,error}=await db.rpc('get_evalia_public_catalog');
  if(error)throw error;
  items=await signCatalogPhotos(db,data||[]);
  client=await customerFromCookie(db).catch(()=>null);
 }catch{failed=true;}
 const wa=storeWhatsApp();
 return <main className="ev-store"><div className="ev-store-wrap">
  <header className="ev-store-head">
   <div className="ev-store-brand"><BrandMark/><div><b>EVALIA</b><small>DESTACA EN CADA DETALLE</small></div></div>
   {client?<a className="ev-store-cta" href="/cliente">Hacer mi pedido</a>:
    wa?<a className="ev-store-cta" href={'https://wa.me/'+wa+'?text='+encodeURIComponent('Hola EVALIA, quiero mi enlace personal para hacer pedidos.')} rel="noopener noreferrer">Pedir mi enlace por WhatsApp</a>:null}
  </header>
  <section className="ev-store-intro">
   <h1>Catálogo mayorista</h1>
   <p>Precios por docena. Pedido mínimo por modelo: una docena surtida o media docena (6 colores distintos). {client?'Ya tienes tu enlace activo en este teléfono.':'Para pedir necesitas tu enlace personal, que EVALIA envía por WhatsApp a clientes registrados.'}</p>
  </section>
  {failed?<p className="ev-store-empty">El catálogo no está disponible en este momento. Intenta nuevamente en unos minutos.</p>:<CatalogGrid items={items}/>}
 </div></main>;
}

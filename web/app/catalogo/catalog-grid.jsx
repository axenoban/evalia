import {BrandMark} from '../brand.jsx';

const money=n=>new Intl.NumberFormat('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n||0))+' Bs';
// Tarjetas del catálogo: precio por docena y solo «Disponible/Agotado», nunca la cantidad de stock.
export default function CatalogGrid({items}){
 if(!items.length)return <p className="ev-store-empty">Pronto publicaremos nuevos modelos.</p>;
 return <div className="ev-store-grid">{items.map(m=><article key={m.id} className={'ev-store-card'+(m.available?'':' is-out')}>
  <div className="ev-store-photo">{m.imageUrl?<img src={m.imageUrl} alt={'Modelo '+m.name} loading="lazy"/>:<BrandMark/>}</div>
  <div className="ev-store-body">
   <h2>{m.name}</h2>
   <div className="ev-store-meta"><span>Talla {m.size}</span><span className="ev-store-price">{money(m.price)}<small> /doc.</small></span></div>
   {m.colors?.length>0&&<div className="ev-swatches" aria-label={'Colores: '+m.colors.map(c=>c.name).join(', ')}>{m.colors.map(c=><span key={c.id} className="ev-swatch" title={c.name} style={{background:c.hex}}/>)}</div>}
   <span className={'ev-store-state '+(m.available?'ok':'off')}>{m.available?'● Disponible':'○ Agotado'}</span>
  </div>
 </article>)}</div>;
}

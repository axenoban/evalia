'use client';
import './storefront.css';
// Pantalla de recuperación compartida por /catalogo y /cliente (sin detalles técnicos para el cliente).
export default function StoreError({reset,detail}){
 return <main className="ev-store"><div className="ev-store-wrap">
  <section className="ev-store-section" role="alert">
   <h2>Algo salió mal</h2>
   <p className="ev-cart-note">{detail}</p>
   <div style={{display:'grid',gap:8,marginTop:12}}>
    <button type="button" className="ev-store-cta" onClick={()=>reset()}>Reintentar</button>
    <button type="button" className="ev-store-cta outline" onClick={()=>window.location.reload()}>Recargar página</button>
   </div>
  </section>
 </div></main>;
}

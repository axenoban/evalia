'use client';
import StoreError from '../catalogo/store-error.jsx';
// Red de seguridad del portal del cliente: un fallo inesperado nunca deja una página rota.
export default function ClientError({reset}){return <StoreError reset={reset} detail="Tu pedido no se envió. Toca «Reintentar»; si el problema sigue, escríbenos por WhatsApp."/>;}

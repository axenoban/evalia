import './globals.css';
import './dashboard.css';
import './booking.css';
import './orders.css';
import './toasts.css';
export const metadata={title:'EVALIA · Gestión comercial',description:'Panel operativo de catálogo, clientes y pedidos confirmados.'};
export default function RootLayout({children}){return <html lang="es"><body>{children}</body></html>;}

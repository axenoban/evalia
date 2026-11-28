import {NextResponse} from 'next/server';
import {CUSTOMER_COOKIE} from '../../../lib/server-private.js';

export const runtime='nodejs';
// Olvida el enlace en este teléfono (no lo revoca: el cliente puede volver a abrirlo desde WhatsApp).
export async function POST(request){
  const origin=request.headers.get('origin');
  if(!origin||origin!==new URL(request.url).origin)return new Response('Origen no permitido.',{status:403});
  const redirect=NextResponse.redirect(new URL('/catalogo',request.url),303);
  redirect.cookies.delete(CUSTOMER_COOKIE);
  redirect.headers.set('Cache-Control','no-store');
  return redirect;
}

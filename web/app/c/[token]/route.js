import {NextResponse} from 'next/server';
import {CUSTOMER_COOKIE,customerFromToken} from '../../../lib/server-private.js';
import {orderCookieOptions} from '../../../lib/portal-cookie.js';
import {CLIENT_COOKIE_MAX_AGE} from '../../../lib/client-order.js';

export const runtime='nodejs';
// Enlace personal del cliente: valida el token, lo guarda en cookie httpOnly y redirige sin dejarlo en la URL.
export async function GET(request,{params}){
  const token=(await params).token;
  let session=null;
  try{session=await customerFromToken(token);}catch{session=null;}
  if(!session)return new Response('Enlace no válido o revocado. Pide uno nuevo a EVALIA por WhatsApp.',{
    status:404,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Type':'text/plain; charset=utf-8'}});
  const redirect=NextResponse.redirect(new URL('/cliente',request.url),303);
  redirect.cookies.set(CUSTOMER_COOKIE,token,{...orderCookieOptions(process.env.NODE_ENV==='production'),maxAge:CLIENT_COOKIE_MAX_AGE});
  redirect.headers.set('Referrer-Policy','no-referrer');
  redirect.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
  redirect.headers.set('Cache-Control','private, no-store');
  return redirect;
}

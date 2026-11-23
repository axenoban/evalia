import {NextResponse} from 'next/server';
import {ORDER_COOKIE,orderFromToken} from '../../../lib/server-private.js';
import {orderCookieOptions} from '../../../lib/portal-cookie.js';

export const runtime='nodejs';
export async function GET(request,{params}){
  let session=null;
  try {session=await orderFromToken((await params).token);}catch{session=null;}
  if(!session)return new Response('Enlace no válido o cerrado.',{
    status:404,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
  const redirect=NextResponse.redirect(new URL('/pedido',request.url),303);
  redirect.cookies.set(ORDER_COOKIE,(await params).token,{
    ...orderCookieOptions(process.env.NODE_ENV==='production')
  });
  redirect.headers.set('Referrer-Policy','no-referrer');
  redirect.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
  redirect.headers.set('Cache-Control','private, no-store');
  return redirect;
}

import {orderFromCookie} from '../../../lib/server-private.js';

export const runtime='nodejs';
export async function GET(request){
  let session=null;
  try{session=await orderFromCookie();}catch{return new Response(null,{status:503});}
  if(!session||!session.order.qr_path)return new Response(null,{status:404,headers:{'Cache-Control':'no-store'}});
  const {data,error}=await session.db.storage.from('evalia-qr').download(session.order.qr_path);
  if(error||!data)return new Response(null,{status:404,headers:{'Cache-Control':'no-store'}});
  const pathname=session.order.qr_path;
  const type=pathname.endsWith('.png')?'image/png':pathname.endsWith('.webp')?'image/webp':'image/jpeg';
  const downloadable=new URL(request.url).searchParams.get('download')==='1';
  return new Response(data,{headers:{
   'Content-Type':type,'Cache-Control':'private, no-store, max-age=0',
   'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff',
   'Content-Disposition':downloadable?'attachment; filename="evalia-qr.'+(type==='image/png'?'png':type==='image/webp'?'webp':'jpg')+'"':'inline'
  }});
}

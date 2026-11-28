import {createClient} from '@supabase/supabase-js';
import {tokenDigest} from './portal-token.js';
import {cookies} from 'next/headers';

export const ORDER_COOKIE='evalia_order_access';

export function getServiceDb() {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('No se ha configurado el backend seguro de EVALIA.');
  // IMPORTANTE: esta función solo se importa desde archivos del servidor.
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function orderFromToken(token,db=getServiceDb()){
  const hash=tokenDigest(token);
  if(!hash)return null;
  const {data,error}=await db.rpc('client_evalia_order',{p_token_hash:hash});
  if(error||!data||data.status!=='active')return null;
  return {db,hash,order:data};
}
export async function orderFromCookie(db=getServiceDb()){
  const jar=await cookies();
  return orderFromToken(jar.get(ORDER_COOKIE)?.value,db);
}

// R2: enlace personal del cliente (cookie httpOnly; el servidor solo conoce el hash).
export const CUSTOMER_COOKIE='evalia_customer_access';
export async function customerFromToken(token,db=getServiceDb()){
  const hash=tokenDigest(token);
  if(!hash)return null;
  const {data,error}=await db.rpc('client_evalia_customer_session',{p_token_hash:hash});
  if(error||!data?.customer)return null;
  return {db,hash,session:data};
}
export async function customerFromCookie(db=getServiceDb()){
  const jar=await cookies();
  return customerFromToken(jar.get(CUSTOMER_COOKIE)?.value,db);
}
// Firma por lote las fotos privadas de productos activos (1 h). Sin foto: null.
export async function signCatalogPhotos(db,items){
  const paths=[...new Set((items||[]).map(i=>i.image_path).filter(Boolean))];
  const urls=new Map();
  for(let i=0;i<paths.length;i+=100){
    const {data,error}=await db.storage.from('evalia-models').createSignedUrls(paths.slice(i,i+100),3600);
    if(!error)for(const row of data??[])if(row.path&&row.signedUrl&&!row.error)urls.set(row.path,row.signedUrl);
  }
  return (items||[]).map(({image_path,...item})=>({...item,imageUrl:image_path?urls.get(image_path)??null:null}));
}

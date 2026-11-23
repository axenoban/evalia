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

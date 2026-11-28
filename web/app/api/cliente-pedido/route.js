import {NextResponse} from 'next/server';
import {customerFromCookie} from '../../../lib/server-private.js';
import {validateClientOrder,clientOrderError} from '../../../lib/client-order.js';

export const runtime='nodejs';
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
export async function POST(request){
 try{
  const origin=request.headers.get('origin');
  if(!origin||origin!==new URL(request.url).origin)return reply({error:'Solicitud de origen no permitido.'},403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'Formato inválido.'},415);
  const raw=await request.text();
  if(raw.length>32768)return reply({error:'Pedido demasiado grande.'},413);
  let body;try{body=validateClientOrder(JSON.parse(raw));}catch{body=null;}
  if(!body)return reply({error:clientOrderError('22023')},400);
  const access=await customerFromCookie();
  if(!access)return reply({error:clientOrderError('42501')},403);
  const {data,error}=await access.db.rpc('create_evalia_client_order',{p_token_hash:access.hash,p_lines:body.lines,
   p_request_id:body.requestId,p_method:body.method,p_destination:body.destination});
  if(error)return reply({error:clientOrderError(error.code),code:error.code},error.code==='42501'?403:409);
  return reply({reference:data?.reference??null});
 }catch{return reply({error:clientOrderError('')},503);}
}

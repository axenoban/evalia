import {NextResponse} from 'next/server';
import {getServiceDb} from '../../../lib/server-private.js';

export const runtime='nodejs';
export async function GET(){
 let ready=false;
 try{
  const db=getServiceDb();
  const {error}=await db.from('payment_qr').select('id').limit(1);
  ready=!error;
 }catch{ready=false;}
 return NextResponse.json({ready},{
  status:ready?200:503,headers:{'Cache-Control':'private, no-store'}
 });
}

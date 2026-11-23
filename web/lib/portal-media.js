/** Comprobación por firma binaria, no solo por extensión o MIME declarado. */
export function inspectMime(input){
 const bytes=Buffer.from(input);
 if(bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)
  return {mime:'image/jpeg',ext:'jpg'};
 if(bytes.length>=8&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))
  return {mime:'image/png',ext:'png'};
 if(bytes.length>=12&&bytes.subarray(0,4).toString()==='RIFF'&&
  bytes.subarray(8,12).toString()==='WEBP')
  return {mime:'image/webp',ext:'webp'};
 return null;
}
export function validPaymentAmount(value){
 const raw=String(value||'').trim();
 if(!/^\d+(?:\.\d{1,2})?$/.test(raw))return false;
 const [whole,frac='']=raw.split('.');
 const cents=BigInt(whole)*100n+BigInt((frac+'00').slice(0,2));
 return cents>0n && cents<=99999999999999n;
}
export const validRequestId=value=>typeof value==='string'&&
 /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);

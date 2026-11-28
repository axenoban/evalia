// Contratos puros compartidos: no contiene claves, tokens ni información de cuentas.
export function validEmail(value){
 const email=typeof value==='string'?value.trim().toLowerCase():'';
 return email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?email:null;
}
export function validUserId(value){return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);}
export function accountOrigin(env){
 const raw=env.EVALIA_ADMIN_ORIGIN || (env.VERCEL_ENV==='production'&&env.VERCEL_PROJECT_PRODUCTION_URL?'https://'+env.VERCEL_PROJECT_PRODUCTION_URL:env.VERCEL_BRANCH_URL?'https://'+env.VERCEL_BRANCH_URL:env.NODE_ENV!=='production'?'http://localhost:3000':'');
 try{const u=new URL(raw);return (u.protocol==='https:'||(env.NODE_ENV!=='production'&&u.protocol==='http:'&&u.hostname==='localhost'))&&u.origin===raw.replace(/\/$/,'')?u.origin:null;}catch{return null;}
}
export const INVITE_ROLES=Object.freeze(['operator','seller']);
export function accountAction(body){
 if(!body||typeof body!=='object'||Array.isArray(body))return null;
 if(body.action==='invite'&&Object.keys(body).every(k=>['action','email','role'].includes(k))){
  // R1: una invitación solo puede crear Administrador (operator) o Vendedor (seller), nunca propietario.
  if('role' in body&&!INVITE_ROLES.includes(body.role))return null;
  const email=validEmail(body.email);if(!email)return null;
  return 'role' in body?{action:'invite',email,role:body.role}:{action:'invite',email};
 }
 if(body.action==='recovery'&&Object.keys(body).every(k=>['action','userId'].includes(k))&&validUserId(body.userId))return {action:'recovery',userId:body.userId};
 return null;
}
export function passwordValid(value){return typeof value==='string'&&Array.from(value).length>=8&&value.length<=128;}
export function accountFragment(hash){
 const p=new URLSearchParams(String(hash||'').replace(/^#/,''));
 const type=p.get('type'),access_token=p.get('access_token'),refresh_token=p.get('refresh_token');
 return ['invite','recovery'].includes(type)&&access_token&&refresh_token?{access_token,refresh_token}:null;
}

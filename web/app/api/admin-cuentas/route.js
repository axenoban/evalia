import {createClient} from '@supabase/supabase-js';
import {getServiceDb} from '../../../lib/server-private.js';
import {accountOrigin,accountAction} from '../../../lib/admin-account-contract.js';
export const runtime='nodejs';
const response=(status,message)=>Response.json({message},{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
export async function POST(request){
 const origin=accountOrigin(process.env);
 if(!origin)return response(503,'Falta configurar el dominio seguro de EVALIA.');
 if(request.headers.get('origin')!==origin)return response(403,'Origen no autorizado.');
 const match=/^Bearer ([^\s]+)$/.exec(request.headers.get('authorization')||'');
 if(!match)return response(401,'Inicia sesión.');
 if(!request.headers.get('content-type')?.startsWith('application/json'))return response(415,'Formato inválido.');
 let action;
 try{const raw=await request.text();if(raw.length>2048)return response(413,'Solicitud demasiado grande.');action=accountAction(JSON.parse(raw));}catch{return response(400,'Solicitud inválida.');}
 if(!action)return response(400,'Solicitud inválida.');
 try{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key)return response(503,'Servicio de cuentas no configurado.');
  const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,flowType:'implicit'}};
  const scoped=createClient(url,key,{...options,global:{headers:{Authorization:'Bearer '+match[1]}}});
  const verified=await scoped.auth.getUser(match[1]);
  if(verified.error||!verified.data.user)return response(401,'Sesión inválida.');
  const permission=await scoped.rpc('can_manage_evalia_accounts');
  if(permission.error||permission.data!==true)return response(403,'Solo el propietario con contraseña confirmada recientemente puede realizar esta operación.');
  const actor=verified.data.user.id,service=getServiceDb(),redirectTo=origin+'/cuenta';
  if(action.action==='invite'){
   const invited=await service.auth.admin.inviteUserByEmail(action.email,{redirectTo});
   if(invited.error||!invited.data.user)return response(409,'No se pudo enviar la invitación. Verifica el correo, si ya está registrado y la configuración de envío.');
   const registration=await service.rpc('register_evalia_member',{p_actor:actor,p_target:invited.data.user.id,p_role:action.role??'operator'});
   if(registration.error||registration.data!==true)return response(503,'La invitación no quedó autorizada. No concede acceso; requiere revisión técnica.');
   return response(200,'Invitación enviada al correo del nuevo '+((action.role??'operator')==='seller'?'vendedor':'administrador')+'.');
  }
  const list=await scoped.rpc('list_evalia_admins');
  const target=list.error?null:list.data?.find(u=>u.user_id===action.userId&&u.active);
  if(!target?.email)return response(404,'Cuenta administrativa activa no encontrada.');
  // Cliente público aislado: Supabase envía el enlace al dueño del correo, nunca a quien solicita.
  const mailer=createClient(url,key,options);
  const reset=await mailer.auth.resetPasswordForEmail(target.email,{redirectTo});
  if(reset.error)return response(503,'No se pudo solicitar el correo de recuperación. Revisa el servicio de correo.');
  const audit=await service.rpc('log_evalia_recovery',{p_actor:actor,p_target:target.user_id});
  if(audit.error)return response(503,'Se solicitó el correo, pero falta registrar la auditoría. Requiere revisión técnica.');
  return response(200,'Recuperación solicitada. Solo el titular del correo recibirá el enlace.');
 }catch{return response(503,'Servicio de cuentas temporalmente no disponible.');}
}

import {mfaNextStep,normalizeTotp} from './mfa-flow.js';

async function checkIdentity(db,expected){
 const {data,error}=await db.auth.getUser();
 if(error||data?.user?.id!==expected)throw Error('La sesión cambió. Inicia sesión nuevamente.');
}
export async function inspectAdminMfa(db,expected){
 await checkIdentity(db,expected);
 const profile=await db.from('admin_profiles').select('role,active').eq('user_id',expected).maybeSingle();
 if(profile.error)throw Error('No se pudo verificar el perfil administrativo.');
 if(!profile.data?.active)return {step:'denied',factors:[]};
 const [aal,list]=await Promise.all([db.auth.mfa.getAuthenticatorAssuranceLevel(),db.auth.mfa.listFactors()]);
 if(aal.error||list.error)throw Error('No se pudo verificar la seguridad de la sesión.');
 await checkIdentity(db,expected);
 const factors=list.data?.all;
 return {step:mfaNextStep(profile.data,aal.data,factors),factors:Array.isArray(factors)?factors.filter(f=>f.status==='verified'&&f.factor_type==='totp'):[]};
}
export async function enrollAdminTotp(db,expected){
 await checkIdentity(db,expected);
 const {data,error}=await db.auth.mfa.enroll({factorType:'totp',friendlyName:'EVALIA '+new Date().toISOString()});
 if(error||!data?.id||!data.totp?.secret)throw Error('No se pudo preparar el autenticador.');
 await checkIdentity(db,expected);
 // Mostrar clave manual; no renderizar SVG/HTML recibido ni guardar el secreto en disco.
 return {id:data.id,secret:data.totp.secret};
}
export async function verifyAdminTotp(db,expected,factorId,value){
 const code=normalizeTotp(value);
 if(!code||!factorId)throw Error('Introduce los seis dígitos del autenticador.');
 await checkIdentity(db,expected);
 const {error}=await db.auth.mfa.challengeAndVerify({factorId,code});
 if(error)throw Error('Código incorrecto o vencido. Inténtalo nuevamente.');
 await checkIdentity(db,expected);
 const state=await inspectAdminMfa(db,expected);
 if(state.step!=='check-server')throw Error('No se pudo confirmar el segundo factor.');
}

// Una sesión efímera no reemplaza la sesión del panel ni persiste sus credenciales.
export async function withOwnerReauthentication(db,password,value,operation){
 const code=normalizeTotp(value);
 if(typeof password!=='string'||!password||!code)throw Error('Confirma tu contraseña y los seis dígitos del autenticador.');
 const current=await db.auth.getUser(),user=current.data?.user;
 if(current.error||!user?.email)throw Error('No se pudo confirmar la identidad.');
 const {createClient}=await import('@supabase/supabase-js');
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)throw Error('Autenticación no configurada.');
 const scoped=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'evalia-reauth-'+crypto.randomUUID()}});
 try{
  const auth=await scoped.auth.signInWithPassword({email:user.email,password});
  if(auth.error||auth.data?.user?.id!==user.id)throw Error('No se pudo confirmar tu contraseña.');
  const factors=await scoped.auth.mfa.listFactors();
  if(factors.error)throw Error('No se pudo consultar tu autenticador.');
  const factor=factors.data?.totp?.find(f=>f.status==='verified');
  if(!factor)throw Error('Configura primero un autenticador TOTP.');
  await verifyAdminTotp(scoped,user.id,factor.id,code);
  const permission=await scoped.rpc('can_manage_evalia_accounts');
  if(permission.error||permission.data!==true)throw Error('Reautenticación de propietario requerida.');
  await checkIdentity(db,user.id);
  const session=await scoped.auth.getSession();
  if(session.error||!session.data?.session?.access_token)throw Error('No se pudo obtener la sesión de verificación.');
  return await operation(scoped,session.data.session.access_token);
 }finally{
  // Nunca cerrar globalmente las sesiones del propietario.
  await scoped.auth.signOut({scope:'local'}).catch(()=>{});
 }
}

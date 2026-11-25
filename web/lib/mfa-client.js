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

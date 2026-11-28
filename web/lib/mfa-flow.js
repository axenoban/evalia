// E1-04: estado de presentación, NO autorización. La BD y la API deben
// autorizar de nuevo cada acceso. No recibe ni persiste contraseñas, OTP o secretos.
export function mfaNextStep(profile,assurance,factors){
 if(!profile?.active||!['owner','operator','seller'].includes(profile.role))return 'denied';
 if(!assurance||!['aal1','aal2'].includes(assurance.currentLevel)||!['aal1','aal2'].includes(assurance.nextLevel)||!Array.isArray(factors))return 'unavailable';
 const verified=factors.filter(f=>f?.status==='verified');
 const totp=verified.some(f=>f.factor_type==='totp'&&typeof f.id==='string'&&f.id.length>0);
 if(verified.length>0&&!totp)return 'unsupported-factor';
 if(assurance.currentLevel==='aal2'&&totp)return 'check-server';
 if(totp)return 'challenge';
 // No tratar una discrepancia (factor todavía no visible, sesión antigua)
 // como permiso para entrar sin segundo factor.
 if(assurance.nextLevel==='aal2')return 'unavailable';
 if(profile.role==='owner')return 'enroll';
 if(assurance.currentLevel==='aal2')return 'unavailable';
 return 'check-server';
}
export function normalizeTotp(value){
 // Solo seis dígitos ASCII, no números JS (se conservarían mal ceros iniciales).
 const code=typeof value==='string'?value.trim():'';
 return /^[0-9]{6}$/.test(code)?code:null;
}

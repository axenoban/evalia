'use client';
import {useEffect,useRef,useState} from 'react';
import {createClient} from '@supabase/supabase-js';
import {accountFragment,passwordValid,validEmail} from '../../lib/admin-account-contract.js';

export default function Cuenta(){
 const client=useRef(null),started=useRef(false);
 const [mode,setMode]=useState('loading'),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 useEffect(()=>{
  if(started.current)return;started.current=true;
  const credentials=accountFragment(window.location.hash);
  window.history.replaceState(null,'',window.location.pathname);
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key){setError('El acceso no está configurado.');setMode('unavailable');return;}
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,flowType:'implicit',storageKey:'evalia-account-ephemeral'}});
  client.current=db;
  if(!credentials){setMode('request');return;}
  (async()=>{
   try{
    const result=await db.auth.setSession(credentials);
    if(result.error)throw Error();
    const user=await db.auth.getUser();
    if(user.error||!user.data.user?.email_confirmed_at)throw Error();
    const allowed=await db.rpc('is_evalia_admin');
    if(allowed.error||allowed.data!==true)throw Error();
    setMode('password');
   }catch{await db.auth.signOut({scope:'local'}).catch(()=>{});setError('El enlace es inválido, venció o la cuenta no está autorizada. Solicita uno nuevo.');setMode('request');}
  })();
 },[]);
 async function requestReset(e){
  e.preventDefault();if(busy)return;
  const email=validEmail(new FormData(e.currentTarget).get('email'));
  if(!email)return;
  setBusy(true);setError('');setMessage('');
  try{
   const result=await client.current.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/cuenta'});
   if(result.error)throw Error();
   setMessage('Si la cuenta es válida, recibirás un enlace privado en tu correo.');
  }catch{setError('No se pudo solicitar el correo. Inténtalo más tarde.');}
  finally{setBusy(false);}
 }
 async function savePassword(e){
  e.preventDefault();if(busy)return;
  const form=e.currentTarget,values=new FormData(form),password=values.get('password');
  if(!passwordValid(password)||password!==values.get('confirmation')){setError('Usa al menos 8 caracteres y confirma la misma contraseña.');return;}
  setBusy(true);setError('');
  try{
   const db=client.current;
   const changed=await db.auth.updateUser({password});
   if(changed.error)throw Error();
   form.reset();
   setMode('done');
   const signedOut=await db.auth.signOut({scope:'global'});
   if(signedOut.error)setMessage('Contraseña actualizada. No se pudo confirmar la revocación de otras sesiones; contacta al propietario.');
   else setMessage('Contraseña actualizada. Inicia sesión con tu nueva contraseña.');
  }catch{setError('No se pudo actualizar la contraseña. Revisa el enlace y los requisitos de seguridad.');}
  finally{setBusy(false);}
 }
 return <main className="login-screen"><section className="login-card">
  <div className="brand brand-large"><span className="brand-icon">E</span><div><b>EVALIA</b><small>SEGURIDAD DE CUENTA</small></div></div>
  <h1>{mode==='password'?'Define tu contraseña':mode==='done'?'Cuenta actualizada':'Recupera tu acceso'}</h1>
  {mode==='loading'&&<p role="status">Verificando enlace privado…</p>}
  {mode==='request'&&<form method="post" onSubmit={requestReset}>
   <p className="description">Solo cuentas administrativas existentes. No se permite registro público.</p>
   <label className="field"><span className="field-label">Tu correo</span><input type="email" name="email" autoComplete="username" required maxLength={254}/></label>
   <button className="button button-primary full" type="submit" disabled={busy}>Enviar enlace de recuperación</button>
  </form>}
  {mode==='password'&&<form method="post" onSubmit={savePassword}>
   <p className="description">La contraseña es personal. Nadie en EVALIA puede consultarla. Utiliza al menos 8 caracteres.</p>
   <label className="field"><span className="field-label">Nueva contraseña</span><input name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password"/></label>
   <label className="field"><span className="field-label">Confirmar contraseña</span><input name="confirmation" type="password" required minLength={8} maxLength={128} autoComplete="new-password"/></label>
   <button className="button button-primary full" type="submit" disabled={busy}>Guardar mi contraseña</button>
  </form>}
  {error&&<p className="form-error" role="alert">{error}</p>}{message&&<p role="status" className="small-note">{message}</p>}
  <a className="button button-outline full" href="/">Volver al acceso</a>
 </section></main>;
}

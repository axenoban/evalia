'use client';
import {useEffect,useRef,useState} from 'react';
import {enrollAdminTotp,verifyAdminTotp} from '../lib/mfa-client.js';
import {BrandMark} from './brand.jsx';

export default function MfaGate({db,identity,step,factors,onVerified,onCancel}){
 const [factor,setFactor]=useState(null),[selected,setSelected]=useState(factors[0]?.id||'');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const active=useRef(false);
 useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 async function enroll(){
  if(busy)return;setBusy(true);setError('');
  try{const result=await enrollAdminTotp(db,identity);if(active.current)setFactor(result);}
  catch(e){if(active.current)setError(e.message);}
  finally{if(active.current)setBusy(false);}
 }
 async function submit(e){
  e.preventDefault();if(busy)return;
  const form=e.currentTarget,code=new FormData(form).get('code');
  form.reset();setBusy(true);setError('');
  try{
   await verifyAdminTotp(db,identity,factor?.id||selected,code);
   if(active.current){setFactor(null);await onVerified(identity);}
  }catch(e){if(active.current)setError(e.message);}
  finally{if(active.current)setBusy(false);}
 }
 return <main className="login-screen"><section className="login-card">
  <div className="brand brand-large"><BrandMark/><div><b>EVALIA</b><small>GESTIÓN COMERCIAL</small></div></div>
  <p className="eyebrow">SEGURIDAD ADMINISTRATIVA</p>
  <h1>{step==='enroll'?'Configura tu autenticador':'Verificación en dos pasos'}</h1>
  {step==='enroll'&&!factor?<><p>Usa una aplicación de autenticación TOTP. Guarda tu método de recuperación en un lugar privado.</p>
   <button className="button button-primary full" disabled={busy} onClick={enroll}>Preparar autenticador</button></>:null}
  {factor&&<><p>Añade una cuenta TOTP de seis dígitos en tu aplicación de autenticación usando esta clave manual. No la compartas ni hagas capturas.</p>
   <code style={{overflowWrap:'anywhere',userSelect:'all'}}>{factor.secret}</code></>}
  {step==='challenge'||factor?<form method="post" onSubmit={submit}>
   {step==='challenge'&&factors.length>1&&<label className="field"><span className="field-label">Autenticador</span><select value={selected} onChange={e=>setSelected(e.target.value)} disabled={busy}>{factors.map((f,i)=><option key={f.id} value={f.id}>{f.friendly_name||'Autenticador '+(i+1)}</option>)}</select></label>}
   <label className="field"><span className="field-label">Código de seis dígitos</span><input name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required disabled={busy}/></label>
   <button className="button button-primary full" disabled={busy} type="submit">{busy?'Verificando…':'Verificar código'}</button>
  </form>:null}
  {error&&<p className="form-error" role="alert">{error}</p>}
  <button className="button button-outline full" disabled={busy} onClick={()=>{setFactor(null);onCancel();}}>Cerrar sesión</button>
 </section></main>;
}

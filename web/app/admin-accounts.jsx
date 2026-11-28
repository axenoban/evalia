'use client';
import {useEffect,useState} from 'react';
import {getSupabase} from '../lib/supabase.js';
import {validEmail} from '../lib/admin-account-contract.js';
import {withOwnerReauthentication} from '../lib/mfa-client.js';

const ROLE_LABELS={owner:'Administrador global',operator:'Administrador',seller:'Vendedor'};
const ROLE_HELP={operator:'Productos, pedidos, cobros y entregas.',seller:'Registra clientes y pedidos, informa pagos y consulta pedidos.'};
export default function AdminAccounts(){
 const [accounts,setAccounts]=useState([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [action,setAction]=useState(null),[error,setError]=useState(''),[message,setMessage]=useState('');
 async function reload(){
  const {data,error}=await getSupabase().rpc('list_evalia_admins');
  if(error)throw Error('No se pudieron consultar las cuentas administrativas.');
  setAccounts(data||[]);
 }
 useEffect(()=>{reload().catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
 function prepare(e){
  e.preventDefault();const values=new FormData(e.currentTarget),email=validEmail(values.get('email')),role=values.get('role')==='seller'?'seller':'operator';
  if(email){setError('');setMessage('');setAction({action:'invite',email,role});e.currentTarget.reset();}
 }
 async function execute(e){
  e.preventDefault();if(busy||!action)return;
  const form=e.currentTarget,values=new FormData(form),password=values.get('password'),code=values.get('code');
  form.reset();
  setBusy(true);setError('');setMessage('');
  try{
   await withOwnerReauthentication(getSupabase(),password,code,async(db,accessToken)=>{
    if(action.action==='role'){
     const {error}=await db.rpc('set_evalia_member_role',{p_target:action.userId,p_role:action.role});
     if(error)throw Error('No se pudo cambiar el rol.');
     setMessage('Rol actualizado a '+ROLE_LABELS[action.role]+'. Aplica en su próxima actualización de datos.');
    }else if(action.action==='state'){
     const {error}=await db.rpc('set_evalia_operator_active',{p_target:action.userId,p_active:action.active});
     if(error)throw Error('No se pudo cambiar el acceso.');
     setMessage(action.active?'Acceso reactivado.':'Acceso suspendido.');
    }else{
     const body=action.action==='invite'?{action:'invite',email:action.email,role:action.role}:{action:'recovery',userId:action.userId};
     const res=await fetch('/api/admin-cuentas',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+accessToken},body:JSON.stringify(body),cache:'no-store'});
     const result=await res.json();
     if(!res.ok)throw Error(result.message||'No se pudo realizar la operación.');
     setMessage(result.message);
    }
   });
   setAction(null);await reload();
  }catch(e){setError(e.message||'No se pudo realizar la operación.');}
  finally{form.reset();setBusy(false);}
 }
 return <section className="surface pad">
  <h1>Usuarios y seguridad</h1>
  <p className="small-note">Solo el propietario puede administrar accesos. Cada usuario recibe sus enlaces en su correo personal; no se muestran contraseñas ni enlaces de recuperación.</p>
  <form onSubmit={prepare} method="post" className="money-form">
   <h2>Invitar usuario</h2>
   <fieldset className="ev-role-choice"><legend className="field-label">Rol</legend>{['operator','seller'].map(r=><label key={r} className="ev-role-option"><input type="radio" name="role" value={r} defaultChecked={r==='operator'}/><span><b>{ROLE_LABELS[r]}</b><small>{ROLE_HELP[r]}</small></span></label>)}</fieldset>
   <label className="field"><span className="field-label">Correo del nuevo usuario</span><input name="email" type="email" autoComplete="off" required maxLength={254} placeholder="correo@ejemplo.com"/></label>
   <button className="button button-primary" disabled={busy||!!action} type="submit">Enviar invitación privada</button>
  </form>
  {action&&<form method="post" onSubmit={execute} className="surface pad">
   <h3>Confirma tu identidad</h3>
   <p className="small-note">{action.action==='invite'?'Invitar a '+action.email+' como '+ROLE_LABELS[action.role]:action.action==='role'?'Cambiar a '+action.email+' al rol '+ROLE_LABELS[action.role]:action.action==='recovery'?'Enviar recuperación al correo de '+action.email:(action.active?'Reactivar ':'Suspender ')+action.email}</p>
   <label className="field"><span className="field-label">Tu contraseña de propietario</span><input name="password" type="password" autoComplete="current-password" required/></label>
   <label className="field"><span className="field-label">Código del autenticador</span><input name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required/></label>
   <div className="form-actions"><button className="button button-primary" disabled={busy} type="submit">Confirmar operación</button>
   <button className="button button-outline" disabled={busy} type="button" onClick={()=>{setAction(null);setError('');}}>Cancelar</button></div>
  </form>}
  {error&&<p className="form-error" role="alert">{error}</p>}{message&&<p role="status" className="small-note">{message}</p>}
  <h2>Usuarios del panel</h2>{loading&&<p role="status">Consultando cuentas…</p>}
  <div className="record-list">{accounts.map(a=><article className="record" key={a.user_id}>
   <header className="record-head"><div><h3>{a.email}</h3><small>{ROLE_LABELS[a.role]??a.role} · {a.active?(a.confirmed?'Activo':'Invitación pendiente'):'Suspendido'}</small></div></header>
   <div className="form-actions">
    {a.active&&<button className="button button-outline" type="button" disabled={busy||!!action} onClick={()=>setAction({action:'recovery',userId:a.user_id,email:a.email})}>Enviar enlace de recuperación</button>}
    {(a.role==='operator'||a.role==='seller')&&a.active&&<button className="button button-outline" type="button" disabled={busy||!!action} onClick={()=>setAction({action:'role',userId:a.user_id,role:a.role==='operator'?'seller':'operator',email:a.email})}>{a.role==='operator'?'Cambiar a Vendedor':'Cambiar a Administrador'}</button>}
    {(a.role==='operator'||a.role==='seller')&&<button className="button button-outline" type="button" disabled={busy||!!action} onClick={()=>setAction({action:'state',userId:a.user_id,active:!a.active,email:a.email})}>{a.active?'Suspender acceso':'Reactivar acceso'}</button>}
   </div>
  </article>)}</div>
 </section>;
}

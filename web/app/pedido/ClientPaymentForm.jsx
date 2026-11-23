'use client';

import {useRef,useState} from 'react';
import {useRouter} from 'next/navigation';

export function ClientPaymentForm(){
  const [amount,setAmount]=useState(''),[file,setFile]=useState(null);
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const requestId=useRef(null),fileInput=useRef(null);
  const router=useRouter();
  async function send(e){
    e.preventDefault();setMessage('');
    if(!file){setMessage('Adjunta una imagen de tu comprobante.');return;}
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2097152||file.size<16){
      setMessage('El comprobante debe ser una imagen JPG, PNG o WebP de máximo 2 MB.');return;
    }
    if(!requestId.current)requestId.current=crypto.randomUUID();
    const form=new FormData();
    form.set('amount',amount.trim().replace(',','.'));
    form.set('receipt',file);
    form.set('requestId',requestId.current);
    setBusy(true);
    try{
      const response=await fetch('/api/cliente-pago',{method:'POST',body:form,credentials:'same-origin',cache:'no-store'});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'No se pudo registrar el aviso.');
      setMessage('Aviso registrado. PENDIENTE de comprobación administrativa; no reduce tu saldo todavía.');
      requestId.current=null;setAmount('');setFile(null);
      if(fileInput.current)fileInput.current.value='';
      router.refresh();
    }catch(err){setMessage(err.message);}
    finally{setBusy(false);}
  }
  return <form className="client-payment-form" onSubmit={send}>
    <label>Importe informado (Bs)
      <input name="amount" inputMode="decimal" required value={amount}
       pattern="^[0-9]+([.,][0-9]{1,2})?$" placeholder="Ej. 120,50"
       onChange={e=>{setAmount(e.target.value);requestId.current=null;}}/>
    </label>
    <label>Captura del comprobante
      <input ref={fileInput} type="file" name="receipt" required accept="image/jpeg,image/png,image/webp"
       onChange={e=>{setFile(e.target.files?.[0]||null);requestId.current=null;}}/>
    </label>
    <p>JPG, PNG o WebP · máximo 2 MB. El envío no confirma que EVALIA haya recibido el dinero.</p>
    <button type="submit" disabled={busy||!file||!amount.trim()}>{busy?'Enviando…':'Informar pago para verificación'}</button>
    {message&&<p role="status" className="portal-message">{message}</p>}
  </form>;
}

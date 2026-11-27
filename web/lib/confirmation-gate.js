// At most one pending operation. Cancellation never authorizes a mutation.
export function createConfirmationGate(publish){
 let pending=null;
 function settle(result){
  const current=pending;
  if(!current)return false;
  pending=null;publish(null);current.resolve(result);return true;
 }
 return {
  request(options){
   if(pending)return Promise.resolve(null);
   return new Promise(resolve=>{pending={options,resolve};publish(options);});
  },
  confirm(reason=''){
   if(!pending)return false;
   const text=String(reason).trim();
   if(pending.options.reasonRequired&&(!text||text.length>300))return false;
   return settle({confirmed:true,reason:text});
  },
  cancel(){return settle(null);}
 };
}

// Comparación conservadora: solo se equipara prefijo boliviano si queda un teléfono de 8 dígitos.
export function normalizedWhatsApp(value){
 const digits=String(value??'').replace(/[^0-9]/g,'');
 if(digits.length===13&&digits.startsWith('00591'))return digits.slice(5);
 if(digits.length===11&&digits.startsWith('591'))return digits.slice(3);
 return digits;
}
export function matchingCustomers(customers,phone,excludeId=null){
 const key=normalizedWhatsApp(phone);
 if(!key)return [];
 return customers.filter(c=>c.id!==excludeId&&normalizedWhatsApp(c.whatsapp)===key);
}

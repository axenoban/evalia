import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizedWhatsApp,matchingCustomers} from '../web/lib/customer-duplicates.js';
test('normaliza formato y prefijo boliviano sin truncar otros números',()=>{
 for(const n of ['70000109','+591 7000-0109','00591 70000109'])assert.equal(normalizedWhatsApp(n),'70000109');
 assert.equal(normalizedWhatsApp('+55 70000109'),'5570000109');
 assert.equal(normalizedWhatsApp('5911234567'),'5911234567');
});
test('no confunde ficha propia ni teléfonos sin dígitos',()=>{
 const clients=[{id:'a',whatsapp:'70000109'},{id:'b',whatsapp:'+59170000109'},{id:'c',whatsapp:'x'}];
 assert.deepEqual(matchingCustomers(clients,'0059170000109','a').map(c=>c.id),['b']);
 assert.deepEqual(matchingCustomers(clients,'x'),[]);
});
test('alta conserva request en reintento y exige confirmación de coincidencia',()=>{
 const page=readFileSync(new URL('../web/app/page.jsx',import.meta.url),'utf8');
 const form=page.slice(page.indexOf('function ClientForm('),page.indexOf('function DashboardProductCard('));
 assert.match(form,/if\(!requestId\.current\)requestId\.current=uuid\(\)/);
 assert.match(form,/confirmDuplicate:duplicateConfirmed/);
 assert.match(form,/ok\?\.state==='duplicate'/);
 assert.match(form,/if\(ok===true\)/);
});
test('edición de foto no elimina carga con resultado incierto',()=>{
 const page=readFileSync(new URL('../web/app/page.jsx',import.meta.url),'utf8');
 const edit=page.slice(page.indexOf('const saveModelEdit='),page.indexOf('async function archiveProduct('));
 assert.match(edit,/uploadPhoto\(params\.photo,params\.requestId\)/);
 assert.doesNotMatch(edit,/removePhoto/);
});

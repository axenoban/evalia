import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {searchKey,matchesSearch} from '../web/lib/search-text.js';
import {findBookingCustomers} from '../web/lib/booking-review.js';
import {productPriceOptions,PRICE_OPTION_LIMIT} from '../web/lib/product-data.js';

const page=readFileSync(new URL('../web/app/page.jsx',import.meta.url),'utf8');
const section=name=>page.slice(page.indexOf('function '+name+'('),page.indexOf('\nfunction ',page.indexOf('function '+name+'(')+10));

test('búsqueda tolerante a tildes, mayúsculas y espacios sin alterar el texto original',()=>{
 assert.equal(searchKey('  José   MARÍA '),'jose maria');
 assert.equal(matchesSearch('Blusa Ñandú XL','nandu'),true);
 assert.equal(matchesSearch('Blusa Princesa M','princesa  m'),true);
 assert.equal(matchesSearch('Blusa Princesa M','vestido'),false);
 assert.equal(matchesSearch('Cualquier texto',''),true);
 const customers=[{id:'1',name:'José Pérez',whatsapp:'+591 700-11122'},{id:'2',name:'Ana',whatsapp:'71234567'}];
 assert.deepEqual(findBookingCustomers(customers,'jose').map(c=>c.id),['1']);
 assert.deepEqual(findBookingCustomers(customers,'70011122').map(c=>c.id),['1']);
 assert.equal(findBookingCustomers(customers,'').length,2);
});
test('catálogo, clientes y edición de pedido usan la misma búsqueda normalizada',()=>{
 assert.match(section('Catalog'),/matchesSearch\(m\.name\+' '\+m\.size_label,search\)/);
 assert.match(section('ClientPanel'),/findBookingCustomers\(data\.customers,search\)/);
 assert.match(section('OrderEditPanel'),/matchesSearch\(m\.name\+' '\+m\.size_label,search\)/);
 assert.match(section('BookingPanel'),/matchesSearch\(m\.name\+' '\+m\.size_label,productSearch\)/);
});
test('precios sugeridos limitados: actual primero, luego misma talla, sin perder escritura libre',()=>{
 const models=[...Array(10)].map((_,i)=>({size_label:i<3?'M':'XL',price_dozen_bs:String(300+i*10)}));
 const options=productPriceOptions(models,'M',555);
 assert.equal(PRICE_OPTION_LIMIT,6);
 assert.equal(options.length,6);
 assert.deepEqual(options.slice(0,4),['555','300','310','320']);
 assert.match(section('ModelForm'),/customLabel="Otro precio"/);
});
test('las unidades adicionales se describen como una prenda por color, máximo 11',()=>{
 const editor=section('PortionEditor');
 assert.doesNotMatch(page,/unidades por color/);
 assert.match(editor,/hasta 11 unidades, una por color/);
 assert.match(editor,/1 por color/);
});
test('aprobar o rechazar un pago exige confirmación con cliente e importe; observar no mueve dinero',()=>{
 const review=section('PaymentReview');
 assert.match(review,/action!=='observe'/);
 assert.match(review,/severity:approve\?'critical':'warning'/);
 assert.match(review,/label:'Importe',value:formatBs\(centsFromBs\(p\.amount_bs\)\)/);
 assert.match(review,/if\(!confirmed\)return;/);
 assert.doesNotMatch(review,/onClick=\{\(\)=>onReview\(/);
 assert.match(review,/paymentStatusLabels\[p\.status\]/);
 assert.match(review,/paymentReviewLabels\[v\.action\]/);
 assert.doesNotMatch(review,/>\{p\.status\}</);
});
test('formularios explican por qué no avanzan en vez de ignorar el envío',()=>{
 const payment=section('PaymentForm'),delivery=section('DeliveryForm');
 assert.match(payment,/setFormError\('Escribe un importe mayor a cero/);
 assert.match(delivery,/puedes registrar como máximo/);
 assert.match(delivery,/Indica al menos una prenda retirada/);
 assert.doesNotMatch(delivery,/if\(!selected\.length\)return;/);
 assert.match(section('ReactivateForm'),/Reintentar limpieza/);
 assert.match(section('ModelForm'),/Sin cambios por guardar/);
});
test('encabezados uniformes conservan el aviso de conciliación manual',()=>{
 assert.match(page,/title="Clientes"\/>/);
 assert.match(page,/title="Pagos"\/>/);
 assert.match(section('PaymentReview'),/<strong>no confirma<\/strong> dinero ingresado/);
});

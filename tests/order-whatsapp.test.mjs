import test from 'node:test';
import assert from 'node:assert/strict';
import {buildOrderWhatsAppMessage} from '../web/lib/order-whatsapp.js';

const token='a'.repeat(43), url='https://evalia.example/p/'+token;
const modelA={id:'m1',name:'Blusa princesa',size_label:'Única'};
const modelB={id:'m2',name:'Blusa tulipán',size_label:'XL'};
const colors=[{id:'c1',name:'Rosa'},{id:'c2',name:'Verde'}];
const order={id:'order1',status:'active',lines:[
 {model_id:'m1',quantity:14,dozen_count:1,extra_units:2,extraColorIds:['c1','c2'],subtotal_bs:'420.00'},
 {model_id:'m2',quantity:6,dozen_count:0,extra_units:6,extraColorIds:[],subtotal_bs:'180.50'}
]};
test('Mensaje confirmado incluye modelos, colores adicionales, total y enlace, sin prometer pago',()=>{
 const txt=buildOrderWhatsAppMessage({order,customer:{name:'María'},models:[modelA,modelB],colors,finance:{approved:100,pending:500.5},url});
 assert.match(txt,/Hola, María\./);
 assert.match(txt,/Blusa princesa/);assert.match(txt,/Blusa tulipán/);
 assert.match(txt,/1 docena surtida/);assert.match(txt,/Colores individuales: Rosa, Verde/);
 assert.match(txt,/Total del pedido: 600,50 Bs/);
 assert.match(txt,/Pagos aprobados: 100,00 Bs/);
 assert.match(txt,/Saldo pendiente: 500,50 Bs/);
 assert.ok(txt.includes(url));
 assert.match(txt,/Referencia: order1/);
 assert.match(txt,/sujetos a verificación/);
 assert.doesNotMatch(txt,/pago recibido|pago confirmado|reserva/i);
});
test('Sin finance disponible no inventa saldo ni abonos',()=>{
 const txt=buildOrderWhatsAppMessage({order,models:[modelA,modelB],colors,url});
 assert.doesNotMatch(txt,/Pagos aprobados:|Saldo pendiente:/);
 assert.match(txt,/Total del pedido: 600,50 Bs/);
});
test('Enlace inválido o pedido cerrado no genera mensaje con capacidad',()=>{
 assert.throws(()=>buildOrderWhatsAppMessage({order:{...order,status:'completed'},url,models:[modelA,modelB]}),/pedido activo/);
 assert.throws(()=>buildOrderWhatsAppMessage({order,url:'http://external.example/p/'+token,models:[modelA,modelB]}),/HTTPS/);
 assert.throws(()=>buildOrderWhatsAppMessage({order,url:'https://evalia.example/p/no-token',models:[modelA,modelB]}),/ruta del enlace/);
 assert.throws(()=>buildOrderWhatsAppMessage({order,url:url+'?tracking=1',models:[modelA,modelB]}),/ruta del enlace/);
});
test('Los datos de modelos no inyectan líneas o formato WhatsApp',()=>{
 const altered={...order,lines:[{...order.lines[0]}]};
 const txt=buildOrderWhatsAppMessage({order:altered,models:[{...modelA,name:'Camiseta*\n_Código' }],url});
 assert.match(txt,/Camiseta Código/);
 assert.doesNotMatch(txt,/Camiseta\*|\n_Código/);
});

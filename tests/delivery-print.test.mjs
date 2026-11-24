import test from 'node:test';
import assert from 'node:assert/strict';
import {validateDelivery} from '../web/lib/delivery.js';
import {buildOrderPrintHtml,PRINT_FORMATS,printOrder} from '../web/lib/order-print.js';
const order={fulfillment_method:'pickup',recipient_name:'María <Test>',recipient_phone:'70012345',shipping_destination:null,
 lines:[{model_id:'m1',quantity:12,dozen_count:1,extra_units:0,extraColorIds:[],subtotal_bs:'360.00'}]};
test('envío exige destino y retiro no',()=>{
 assert.deepEqual(validateDelivery('pickup','irrelevante'),{method:'pickup',destination:null});
 assert.deepEqual(validateDelivery('shipping',' La Paz / Terminal '),{method:'shipping',destination:'La Paz / Terminal'});
 assert.throws(()=>validateDelivery('shipping',' '),/destino/);
 assert.throws(()=>validateDelivery('unclassified',''),/Selecciona/);
});
test('etiqueta de envío contiene únicamente nombre, teléfono y destino, no mercancía',()=>{
 const markup=buildOrderPrintHtml({order:{...order,fulfillment_method:'shipping',shipping_destination:'Tarija - Terminal'},
  models:[{id:'m1',name:'Blusa secreta',size_label:'XL'}]});
 for(const word of ['Blusa secreta','360,00','Producto','Prendas','Total:','pedido','12 prendas','XL'])assert.equal(markup.includes(word),false,word);
 for(const word of ['Tarija - Terminal','70012345','María &lt;Test&gt;'])assert.ok(markup.includes(word),word);
});
test('retiro local incluye detalle y total',()=>{
 const markup=buildOrderPrintHtml({order,models:[{id:'m1',name:'Blusa princesa',size_label:'Única'}]});
 for(const word of ['Blusa princesa','360,00','María &lt;Test&gt;','12','Total:'])assert.ok(markup.includes(word),word);
 assert.ok(markup.includes('70012345')); // WhatsApp del pedido en comprobante interno, aprobado visualmente.
});
test('pedido histórico no se imprime como local automáticamente',()=>{
 assert.throws(()=>buildOrderPrintHtml({order:{...order,fulfillment_method:'legacy'}}),/Clasifica/);
});
test('destino malicioso se escapa',()=>{
 const markup=buildOrderPrintHtml({order:{...order,fulfillment_method:'shipping',shipping_destination:'<script>alert(1)</script>'}});
 assert.ok(markup.includes('&lt;script&gt;'));
 assert.ok(!markup.includes('<script>'));
});

test('los seis formatos respetan medidas exactas y privacidad',()=>{
 for(const [format,{width,height}] of Object.entries(PRINT_FORMATS)){
  for(const mode of ['pickup','shipping']){
   const markup=buildOrderPrintHtml({order:{...order,fulfillment_method:mode,shipping_destination:'Sucre',created_at:'2026-11-23T23:00:00Z',portal_token:'SECRET-TOKEN'},models:[{id:'m1',name:'MODELO-PRIVADO',size_label:'XL'}]},{format,monochrome:true});
   assert.ok(markup.includes('@page{size:'+width+'mm '+height+'mm;margin:5mm}'));
   assert.ok(markup.includes('class="mono"'));
   assert.ok(!markup.includes('SECRET-TOKEN'));
   if(mode==='shipping'){
    for(const value of ['MODELO-PRIVADO','360,00','<table','<svg','EVALIA','23/11/2026'])assert.ok(!markup.includes(value),value);
   }else{
    for(const value of ['MODELO-PRIVADO','360,00','<table','<svg','EVALIA','23/11/2026'])assert.ok(markup.includes(value),value);
   }
  }
 }
});
test('por defecto retiro vertical y envío cuadrado; formatos arbitrarios rechazados',()=>{
 assert.ok(buildOrderPrintHtml({order}).includes('@page{size:100mm 150mm'));
 assert.ok(buildOrderPrintHtml({order:{...order,fulfillment_method:'shipping',shipping_destination:'Sucre'}}).includes('@page{size:100mm 100mm'));
 assert.throws(()=>buildOrderPrintHtml({order},{format:'constructor'}),/Formato/);
 assert.throws(()=>buildOrderPrintHtml({order},{format:'A4'}),/Formato/);
});
test('texto largo y extras se conservan sin truncamiento, totales históricos y cabecera repetible',()=>{
 const name='Nombre de modelo muy largo '.repeat(5).trim();
 const lines=Array.from({length:18},()=>({...order.lines[0],extraColorIds:['c1'],subtotal_bs:'190.50'}));
 const markup=buildOrderPrintHtml({order:{...order,lines},models:[{id:'m1',name,size_label:'Única'}],colors:[{id:'c1',name:'Marfil & negro'}]},{format:'square'});
 assert.equal((markup.match(/<tr>/g)||[]).length,19);
 assert.ok(markup.includes(name));assert.ok(markup.includes('Marfil &amp; negro'));
 assert.ok(markup.includes('3.429,00'));assert.ok(markup.includes('216 unidades'));
 assert.ok(markup.includes('display:table-header-group'));assert.ok(!markup.includes('text-overflow:ellipsis'));
});
test('ventana bloqueada conserva diagnóstico',()=>{
 assert.throws(()=>printOrder({order},()=>null),/ventanas emergentes/);
});

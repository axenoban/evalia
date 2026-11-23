import test from 'node:test';
import assert from 'node:assert/strict';
import {validateDelivery} from '../web/lib/delivery.js';
import {buildOrderPrintHtml} from '../web/lib/order-print.js';
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
 assert.ok(!markup.includes('70012345'));
});
test('pedido histórico no se imprime como local automáticamente',()=>{
 assert.throws(()=>buildOrderPrintHtml({order:{...order,fulfillment_method:'legacy'}}),/Clasifica/);
});
test('destino malicioso se escapa',()=>{
 const markup=buildOrderPrintHtml({order:{...order,fulfillment_method:'shipping',shipping_destination:'<script>alert(1)</script>'}});
 assert.ok(markup.includes('&lt;script&gt;'));
 assert.ok(!markup.includes('<script>'));
});

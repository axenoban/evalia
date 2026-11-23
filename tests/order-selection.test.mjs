import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {canAddModelToOrder,initialModelPortion} from '../web/lib/order-selection.js';

test('Modelo con una docena se añade y despliega su editor en el pedido',()=>{
 assert.equal(canAddModelToOrder({available:12,blocked:false},0),true);
 assert.deepEqual(initialModelPortion({available:12,blocked:false},0),{dozens:'1',extraColorIds:[]});
});
test('Pedido sin docenas permite 6-11 colores distintos con stock apto',()=>{
 assert.equal(canAddModelToOrder({available:6,blocked:false},6),true);
 assert.deepEqual(initialModelPortion({available:6,blocked:false},6),{dozens:'0',extraColorIds:[]});
 assert.equal(canAddModelToOrder({available:11,blocked:false},5),false);
});
test('Inventario bloqueado o insuficiente no habilita selección',()=>{
 assert.equal(canAddModelToOrder({available:48,blocked:true},13),false);
 assert.equal(canAddModelToOrder({available:5,blocked:false},13),false);
 assert.throws(()=>initialModelPortion({available:0,blocked:false},13),/necesita una docena/);
});
test('Selector completo no contiene sombreado local de stock ni botón anidado',()=>{
 const page=readFileSync(new URL('../web/app/page.jsx',import.meta.url),'utf8');
 const from=page.indexOf('function BookingPanel('),to=page.indexOf('function LineComposition(',from);
 assert.ok(from>0&&to>from);
 const booking=page.slice(from,to);
 assert.doesNotMatch(booking,/const stock\s*=\s*stock\[/);
 assert.match(booking,/initialModelPortion\(modelStock,colorCount\)/);
 assert.match(booking,/className="picker-item picker-add"/);
 assert.match(booking,/aria-label=\{'Agregar '/);
 assert.match(booking,/OrderStepHeader/);
 assert.match(booking,/order-progress/);
 assert.match(booking,/onOrder\(customerId,lines,requestId.current,delivery\)/);
});

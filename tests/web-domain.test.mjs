import test from 'node:test';
import assert from 'node:assert/strict';
import {centsFromBs,subtotalCents,formatBs,quantityBreakdown,checkedLines,inventoryTotals} from '../web/lib/domain.js';

test('precio exacto del modelo conserva .50 y calcula cantidad superior a docena',()=>{
  assert.equal(subtotalCents('381.00',6),19050n);
  assert.equal(subtotalCents('380.00',7),22200n);
  assert.equal(subtotalCents('420.00',19),66500n);
  assert.equal(subtotalCents('381.00',18),57150n);
  assert.equal(formatBs(subtotalCents('381.00',6)),'190,50 Bs');
});
test('la cantidad puede visualizarse como docenas, medias y prendas',()=>{
  assert.equal(quantityBreakdown(6),'½ docena');
  assert.equal(quantityBreakdown(12),'1 docena');
  assert.equal(quantityBreakdown(19),'1 docena + ½ docena + 1 prenda');
  assert.equal(quantityBreakdown(25),'2 docenas + 1 prenda');
});
test('cada modelo conserva su mínimo y no se seleccionan colores de pedido',()=>{
 const models=[{id:'a',name:'A'},{id:'b',name:'B'}];
 const stock={a:{available:12},b:{available:50}};
 assert.throws(()=>checkedLines(models,{a:'5',b:'6'},stock),/Mínimo 6/);
 assert.deepEqual(checkedLines(models,{a:'12',b:'6'},stock),
  [{modelId:'a',quantity:12},{modelId:'b',quantity:6}]);
 assert.throws(()=>checkedLines(models,{a:'13',b:'0'},stock),/suficientes/);
});
test('S, R, P y A se muestran separados',()=>{
 assert.deepEqual(inventoryTotals({m:{on_hand:72,reserved:12,pending_delivery:24,available:36}}),
  {published:72,reserved:12,pending:24,available:36});
});
test('moneda exacta y cantidad inválida rechazada',()=>{
 assert.equal(centsFromBs('380,50'),38050n);
 assert.throws(()=>centsFromBs('380.123'),/inválido/);
 assert.throws(()=>subtotalCents('420.00',5),/Mínimo 6/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../web/app/page.jsx',import.meta.url),'utf8');
const layout=readFileSync(new URL('../web/app/layout.jsx',import.meta.url),'utf8');
const style=readFileSync(new URL('../web/app/orders.css',import.meta.url),'utf8');
const start=page.indexOf('function Orders(');
const end=page.indexOf('\nfunction ',start+10);
assert.ok(start>0&&end>start,'se debe conservar el componente Orders');
const orders=page.slice(start,end);

test('listado de pedidos usa acordeones nativos cerrados de inicio',()=>{
 assert.match(orders,/<details className="record order-record ev-order-accordion" key=\{o.id\} name="evalia-orders">/);
 assert.match(orders,/<summary className="ev-order-summary">/);
 assert.doesNotMatch(orders,/<details className="record order-record ev-order-accordion"[^>]*\bopen=/);
 assert.match(orders,/customer\?\.name/);
 assert.match(orders,/displayDate\(o.confirmed_at\)/);
 assert.match(orders,/formatBs\(total\)/);
 assert.match(orders,/<Status value=\{o.status\}\/>/);
});
test('detalle abierto mantiene todos los módulos operativos anteriores',()=>{
 for(const fragment of [
  '<LegacyCommitments','<LineComposition','<OrderQuickActions','<OrderDeliveryEditor',
  '<PaymentHistory','<PaymentForm','<DeliveryForm','<OrderLinkPanel',
  'onReport','onDeliver','onComplete(o.id)','onQuick','onIssueLink','onRevokeLink',
  'onUpdateFulfillment','onPrint(o,customer)','busy||Number(finance.pending)!==0'
 ])assert.ok(orders.includes(fragment),'falta función '+fragment);
});
test('operaciones secundarias están plegadas sin deshabilitar el flujo express',()=>{
 assert.match(orders,/<details className="ev-order-management"/);
 assert.match(orders,/<details className="order-advanced"/);
 assert.match(orders,/o.status==='active'&&<OrderQuickActions/);
 assert.match(orders,/o.status==='active'&&<button className="button button-primary" type="button"/);
});
test('modalidad de entrega e impresión conservan condiciones y etiqueta anterior',()=>{
 assert.match(orders,/o.fulfillment_method!=='legacy'&&<button type="button" className="button button-primary"/);
 assert.match(orders,/o.fulfillment_method==='shipping'\?'Imprimir etiqueta de envío':'Imprimir detalle y total'/);
 assert.match(orders,/o.status==='active'&&<details className="order-delivery-details"/);
});
test('estilos se aíslan del resto del panel y son responsive',()=>{
 assert.match(layout,/import '\.\/orders\.css';/);
 assert.match(style,/\.ev-order-accordion-list\{/);
 assert.match(style,/\.ev-order-accordion\[open\]/);
 assert.match(style,/@media\(max-width:780px\)/);
 assert.match(style,/@media\(max-width:410px\)/);
 assert.match(style,/\.ev-order-stat-strip\{/);
});

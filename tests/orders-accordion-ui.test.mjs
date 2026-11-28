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
 assert.match(orders,/<details className="record order-record ev-order-accordion" key=\{o.id\} name="evalia-orders" open=\{focusOrder===o.id\?true:undefined\} data-order-status=\{o.status\}>/);
 assert.match(orders,/<summary className="ev-order-summary">/);
 assert.match(orders,/open=\{focusOrder===o.id\?true:undefined\}/);
 assert.match(page,/\[focusOrder,setFocusOrder\]=useState\(null\)/);
 assert.match(orders,/customer\?\.name/);
 assert.match(orders,/displayDate\(o.confirmed_at\)/);
 assert.match(orders,/formatBs\(total\)/);
 assert.match(orders,/<Status value=\{o.status\}\/>/);
});
test('detalle abierto mantiene todos los módulos operativos anteriores',()=>{
 for(const fragment of [
  '<LegacyCommitments','<LineComposition','<OrderQuickActions','<OrderDeliveryEditor',
  '<PaymentHistory','<PaymentForm','<OrderLinkPanel',
  'onReport','onComplete(o.id)','onQuick','onIssueLink','onRevokeLink',
  'onUpdateFulfillment','onPrint(o,customer)','pageBusy||Number(finance.pending)!==0'
 ])assert.ok(orders.includes(fragment),'falta función '+fragment);
 assert.match(orders,/const pageBusy=busy\|\|list.loading\|\|Boolean\(list.error\)/);
 assert.match(orders,/disabled=\{pageBusy\|\|Number\(finance.pending\)!==0\|\|Number\(finance.excess\)!==0\|\|Number\(delivery.remaining\)!==0\}/);
});
test('operaciones secundarias están plegadas sin deshabilitar el flujo express',()=>{
 assert.match(orders,/<details className="ev-order-management"/);
 assert.match(orders,/<details className="order-advanced"/);
 assert.match(orders,/<details className="ev-order-link-details"/);
 assert.match(orders,/<details className="ev-order-print-details"/);
 assert.match(orders,/o.status==='active'&&<OrderQuickActions/);
 assert.match(orders,/o.status==='active'&&<button className="button button-primary" type="button"/);
});
test('modalidad de entrega e impresión conservan condiciones y etiqueta anterior',()=>{
 assert.match(orders,/o.fulfillment_method!=='legacy'&&<button type="button" className="button button-primary"/);
 assert.match(orders,/o.fulfillment_method==='shipping'\?'Vista previa de etiqueta de envío':'Vista previa del comprobante'/);
 assert.match(orders,/o.status==='active'&&<details className="order-delivery-details"/);
});
test('estilos se aíslan del resto del panel y son responsive',()=>{
 assert.match(layout,/import '\.\/orders\.css';/);
 assert.match(style,/\.ev-order-accordion-list\{/);
 assert.match(style,/\.ev-order-accordion\[open\]/);
 assert.match(style,/@media\(max-width:780px\)/);
 assert.match(style,/@media\(max-width:410px\)/);
 assert.match(style,/\.ev-order-finance-brief\{/);
});

test('entregas parciales desaparecen del listado, sin borrar lógica de base ni cierre total',()=>{
 assert.doesNotMatch(orders,/<DeliveryForm\b/);
 assert.doesNotMatch(orders,/Retiradas físicas|Prendas entregadas|entregas parciales/i);
 assert.match(page,/function DeliveryForm\(/); // preserva compatibilidad, aunque no se invoca desde Pedidos
 assert.match(page,/onDeliver=\{deliver\}/); // el backend autorizado no se modifica
 assert.match(orders,/<OrderQuickActions\b/);
 const quickStart=page.indexOf('function OrderQuickActions(');
 const quickEnd=page.indexOf('\nfunction ',quickStart+10);
 const quick=page.slice(quickStart,quickEnd);
 assert.match(quick,/onQuick\(\{orderId:order.id,action/);
 assert.match(quick,/run\('pay_deliver'\)/);
 assert.match(quick,/run\('deliver'\)/);
 assert.doesNotMatch(quick,/entregas parciales siguen disponibles/);
});

test('no repite el total ni los importes por docena en líneas de una docena',()=>{
 assert.equal((orders.match(/>\{formatBs\(total\)\}<\/strong>/g)||[]).length,1);
 assert.match(orders,/facts:\[\{label:'Cliente',value:customer\?\.name\|\|'Cliente'\},\{label:'Total',value:formatBs\(total\)\}\],reasonRequired:true/);
 assert.doesNotMatch(orders,/<footer className="order-total"/);
 assert.match(orders,/Number\(l.quantity\)!==12&&<small>/);
 assert.doesNotMatch(orders,/Talla \{m\?\.size_label\|\|'—'\} · \{rup\(l.quantity\)\} prendas/);
 assert.match(orders,/<LineComposition line=\{l\}/);
});

test('muestra únicamente el dato de pago útil y oculta destinos e impresión por defecto',()=>{
 assert.match(orders,/o.status==='active'&&<div className="ev-order-finance-brief"/);
 assert.match(orders,/amountCents\(finance.pending\)>0n/);
 assert.match(orders,/amountCents\(finance.approved\)>0n/);
 assert.match(orders,/<details className="ev-order-print-details"/);
 assert.match(orders,/<details className="ev-order-link-details"/);
 assert.doesNotMatch(orders,/ev-order-stat-strip|Abonado y aprobado|Prendas entregadas/);
 assert.match(orders,/o.fulfillment_method==='legacy'/);
 assert.match(orders,/onPrint\(o,customer\)/);
});

test('pedidos prioriza listado, encabezado breve y acceso al archivo al final',()=>{
 assert.match(orders,/const \[showArchived,setShowArchived\]=useState\(false\)/);
 assert.match(orders,/<header className="ev-orders-heading"><p className="eyebrow">\{showArchived\?'HISTORIAL COMERCIAL':'PEDIDOS CONFIRMADOS'\}<\/p><h1>\{showArchived\?'Pedidos archivados':'Pedidos'\}<\/h1><\/header>/);
 assert.doesNotMatch(orders,/Desglose de pedidos|Abre un pedido para consultar|description=/);
 const filters=orders.indexOf('<RecordListControls');
 const records=orders.indexOf('aria-label="Lista de pedidos"');
 const pager=orders.indexOf('<ListPager');
 const archive=orders.indexOf('<nav className="ev-order-archive-toolbar"');
 assert.ok(filters>=0&&filters<records&&records<pager&&pager<archive);
 assert.match(orders,/aria-pressed=\{!showArchived\}/);
 assert.match(orders,/aria-pressed=\{showArchived\}/);
 assert.match(orders,/setShowArchived\(archived\);list.setPage\(1\)/);
 assert.match(orders,/Pedidos vigentes e historial/);
 assert.match(style,/\.ev-order-archive-toolbar\{[^}]*margin:20px 0 0/);
});

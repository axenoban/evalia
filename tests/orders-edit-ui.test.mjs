import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../web/app/page.jsx',import.meta.url),'utf8');
const api=readFileSync(new URL('../web/lib/api.js',import.meta.url),'utf8');
const style=readFileSync(new URL('../web/app/orders.css',import.meta.url),'utf8');
const toastCss=readFileSync(new URL('../web/app/toasts.css',import.meta.url),'utf8');
const orders=page.slice(page.indexOf('function Orders('),page.indexOf('\nfunction ',page.indexOf('function Orders(')+10));
const editor=page.slice(page.indexOf('function OrderEditPanel('),page.indexOf('\nfunction ',page.indexOf('function OrderEditPanel(')+10));

test('tarjetas completadas con tratamiento suave distinto de activas y talla resumida',()=>{
 assert.match(orders,/data-order-status=\{o.status\}/);
 assert.match(orders,/new Set\(o.lines.map/);
 assert.match(orders,/sizes.length===1\?'Talla ':'Tallas '/);
 assert.match(style,/\[data-order-status="completed"\]/);
 assert.match(style,/\.ev-order-identification strong\{font-size:16px\}/);
});
test('notificaciones flotantes autocerrables sin desplazar el contenido',()=>{
 assert.match(page,/function ToastNotifications\(/);
 assert.match(page,/setTimeout\(onCloseMessage,6000\)/);
 assert.match(page,/setTimeout\(onCloseError,9000\)/);
 assert.match(page,/aria-label="Cerrar notificación de error"/);
 assert.match(page,/aria-label="Cerrar notificación de éxito"/);
 assert.match(toastCss,/position:fixed/);
 assert.match(toastCss,/env\(safe-area-inset-bottom\)/);
 assert.doesNotMatch(page,/\{message&&<Notice type="success"/);
});
test('la edición usa la RPC revisada e impide cobrar o editar un pedido cerrado desde la UI',()=>{
 assert.match(api,/export async function reviseOrder\(/);
 assert.match(api,/rpc\('revise_evalia_order'/);
 assert.match(api,/p_expected_revision:expectedRevision/);
 const orderApi=readFileSync(new URL('../web/lib/order-page.js',import.meta.url),'utf8');
 const columns=orderApi.match(/ORDER_COLUMNS='([^']+)'/)?.[1].split(',')??[];
 assert.ok(columns.includes('revision'),'the server page must select the revision');
 assert.match(orderApi,/db\.from\('orders'\)\.select\(ORDER_COLUMNS,\{count:'exact'\}\)/);
 assert.match(orderApi,/archived\?q\.not\('archived_at','is',null\):q\.is\('archived_at',null\)/);
 assert.match(orderApi,/revision:o\.revision\?\?null/);
 assert.match(orders,/useServerOrderList\(workspace,showArchived\)/);
 assert.doesNotMatch(api,/revisionMap|revisionResponse/);
 assert.match(orders,/!Number\.isSafeInteger\(o.revision\)/);
 const assembly=readFileSync(new URL('../web/lib/workspace-assembly.js',import.meta.url),'utf8');
 assert.match(assembly,/revision:o\.revision\?\?null/);
 assert.match(orders,/o.status!=='active'\?'El pedido está completado'/);
 assert.match(orders,/relatedPayments.length\?'Tiene movimientos o avisos de pago'/);
 assert.match(orders,/data.links.some/);
 assert.match(orders,/onEdit\(params\)/);
 assert.match(page,/onEdit=\{editOrder\}/);
});
test('composición de edición reutiliza validación de stock y mantiene precios congelados',()=>{
 assert.match(editor,/checkedPortions\(models,portions,effectiveStock,data.colors\)/);
 assert.match(editor,/original.get\(m.id\)\?\.price_dozen_bs\?\?m.price_dozen_bs/);
 assert.match(editor,/initialModelPortion\(/);
 assert.match(editor,/<PortionEditor/);
 assert.match(editor,/expectedRevision:order.revision/);
 assert.match(editor,/window.confirm\(/);
 assert.match(style,/\.ev-order-edit-panel/);
});
test('la impresión no se altera y el pedido histórico sigue visible',()=>{
 assert.match(orders,/onPrint\(o,customer\)/);
 assert.match(orders,/<LegacyCommitments/);
 assert.match(orders,/<OrderQuickActions/);
 assert.match(orders,/<OrderLinkPanel/);
});

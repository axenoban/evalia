import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=read('web/app/page.jsx'),controls=read('web/app/record-list-controls.jsx');
const css={orders:read('web/app/orders.css'),dashboard:read('web/app/dashboard.css'),globals:read('web/app/globals.css'),list:read('web/app/record-list-controls.css')};
const section=name=>page.slice(page.indexOf('function '+name+'('),page.indexOf('\nfunction ',page.indexOf('function '+name+'(')+10));

test('B1: la barra de siguiente paso reutiliza las mismas condiciones y la confirmación crítica',()=>{
 const quick=section('OrderQuickActions'),orders=section('Orders');
 assert.match(quick,/compact=false/);
 const compact=quick.slice(quick.indexOf('if(compact)'),quick.indexOf('return <section className="express-checkout"'));
 assert.match(compact,/canPay&&remaining>0&&<button[^>]*onClick=\{\(\)=>run\('pay_deliver'\)\}/);
 assert.match(compact,/canPay&&<button[^\n]*?onClick=\{\(\)=>run\('pay'\)\}/);
 assert.match(compact,/canDeliver&&<button[^>]*onClick=\{\(\)=>run\('deliver'\)\}/);
 assert.match(compact,/pendingEvidence&&/);assert.match(compact,/excess>0n&&/);
 // La única ruta de escritura sigue siendo run() con su confirmación crítica.
 assert.equal((quick.match(/onQuick\(/g)||[]).length,1);
 assert.match(quick,/severity:'critical',title:action==='pay'/);
 // Solo una instancia por pedido: compacta arriba, ya no la versión extensa dentro de «Cobro y cierre».
 assert.equal((orders.match(/<OrderQuickActions\b/g)||[]).length,1);
 assert.match(orders,/<OrderQuickActions compact order=\{o\}/);
});
test('B1: orden del detalle — acciones principales arriba y anulación al final',()=>{
 const orders=section('Orders');
 const next=orders.indexOf('className="ev-order-next"'),models=orders.indexOf('className="ev-order-model-section"');
 const more=orders.indexOf('<details className="ev-order-more">'),archive=orders.indexOf('Anular y ocultar pedido');
 const edit=orders.indexOf('✎ Editar pedido'),repeat=orders.indexOf('Repetir como nuevo pedido');
 assert.ok(next>0&&next<models&&models<more,'barra antes de modelos y «Más acciones» al final');
 assert.ok(more<edit&&more<repeat&&more<archive,'editar, repetir y anular dentro de «Más acciones»');
 assert.match(orders,/disabled=\{pageBusy\|\|!canArchive\}/);
 assert.match(orders,/o\.status!=='voided'&&o\.fulfillment_method!=='legacy'&&<button type="button" className="button button-outline" disabled=\{pageBusy\} onClick=\{\(\)=>onPrint\(o,customer\)\}>/);
 assert.match(orders,/open=\{linkOpen===o\.id\}/);
});
test('B2: el resumen abre pedido o agrega el modelo al borrador sin borrar lo elegido',()=>{
 const start=page.slice(page.indexOf('function startOrderWithModel('),page.indexOf('\n }\n',page.indexOf('function startOrderWithModel('))+4);
 assert.match(start,/if\(!canAddModelToOrder\(stock,activeColors\)\)\{navigate\('catalog'\);return;\}/);
 assert.match(start,/if\(bookingDraft\.attempt\)\{setTab\('booking'\);return;\}/);
 assert.match(start,/Object\.hasOwn\(base\.portions,model\.id\)\?base:\{\.\.\.base,portions:\{\.\.\.base\.portions,\[model\.id\]:portion\}\}/);
 assert.doesNotMatch(start,/createOrder|onOrder\(/);
 assert.match(page,/onClick=\{\(\)=>onOpenOrder\(o\.id\)\}/);
 assert.match(page,/onStartOrder=\{startOrderWithModel\} onOpenOrder=\{viewOrder\}/);
 assert.match(css.dashboard,/\.ev-card-stretch::after\{content:'';position:absolute;inset:0/);
 assert.match(css.dashboard,/:has\(\.ev-card-stretch:focus-visible\)/);
});
test('B3: menú móvil de 5 accesos legibles, táctiles y cerrable con Escape',()=>{
 const nav=section('MobileNav');
 assert.match(nav,/e\.key==='Escape'/);
 assert.match(nav,/aria-expanded=\{open\}/);
 assert.match(nav,/'Más'/);
 assert.doesNotMatch(css.globals,/mobile-nav-owner/);
 assert.match(css.globals,/\.mobile-nav small\{font-size:11px/);
 assert.match(css.globals,/min-height:48px/);
 assert.match(css.globals,/\.ev-mobile-more-menu button\{[^}]*min-height:44px/);
});
test('B4: filtros plegables solo en móvil y preferencia de página protegida',()=>{
 assert.match(controls,/const SIZE_KEY='evalia:registros-por-pagina'/);
 assert.match(controls,/try\{const n=Number\(window\.localStorage\.getItem\(SIZE_KEY\)\);return PAGE_SIZES\.includes\(n\)\?n:null;\}catch\{return null;\}/);
 assert.match(controls,/rememberSize\(value\)/);
 assert.match(controls,/aria-expanded=\{open\|\|!list\.range\.valid\}/);
 assert.match(css.list,/\.ev-list-filters \.ev-list-filters-toggle\{display:none\}/);
 assert.match(css.list,/\.ev-list-filters \.ev-list-filters-toggle\{display:inline-flex;min-height:44px/);
 assert.match(css.list,/@media\(max-width:620px\)\{[\s\S]*\.ev-list-filters:not\(\.is-open\) \.ev-list-controls\{display:none\}/);
});
test('B1/B4: estilos responsive con objetivos táctiles en móvil y PC',()=>{
 assert.match(css.orders,/\.ev-next-step-actions>\.button\{flex:1 1 200px;min-height:48px/);
 assert.match(css.orders,/@media\(max-width:620px\)\{[\s\S]*\.ev-next-step-actions>\.button,\.ev-next-step-secondary \.button\{flex:1 1 100%;width:100%\}/);
});

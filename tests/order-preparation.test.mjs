import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('preparación rápida sin abrir acordeón y solo para pedidos activos',()=>{
 const page=read('web/app/page.jsx');
 assert.match(page,/o.status==='active'&&!o.archived_at\?<button type="button" className="ev-preparation-toggle"/);
 assert.match(page,/e.preventDefault\(\);e.stopPropagation\(\);onPreparation\(o\)/);
 assert.match(page,/prepared:!o.prepared_at,expectedVersion:o.preparation_version/);
 assert.match(page,/Marcar preparado/);assert.match(page,/Deshacer/);
});
test('lectura y escritura persistentes con RPC versionada y colores separados',()=>{
 const api=read('web/lib/api.js');const css=read('web/app/orders.css');
 const pageApi=read('web/lib/order-page.js');
 const columns=pageApi.match(/ORDER_COLUMNS='([^']+)'/)?.[1].split(',')??[];
 for(const column of ['archive_reason','prepared_at','preparation_version','revision'])assert.ok(columns.includes(column));
 assert.match(pageApi,/db\.from\('orders'\)\.select\(ORDER_COLUMNS,\{count:'exact'\}\)/);
 assert.match(pageApi,/archived\?q\.not\('archived_at','is',null\):q\.is\('archived_at',null\)/);
 assert.match(api,/rpc\('set_evalia_order_prepared'/);
 assert.match(css,/data-prepared="true"/);
 assert.match(css,/min-height:44px/);
 assert.match(css,/data-order-status="completed"/);
});

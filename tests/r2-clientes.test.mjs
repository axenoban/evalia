import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateClientOrder,lineProblem,expectedPrice,clientOrderError,CLIENT_COOKIE_MAX_AGE} from '../web/lib/client-order.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const line=(over={})=>({modelId:id(1),dozens:1,extraColorIds:[],expectedPrice:'380.00',...over});

test('reglas del pedido del cliente: docenas surtidas, 0–11 colores distintos, mínimo 6 sin docena',()=>{
 assert.equal(lineProblem({dozens:1,extraColorIds:[]}),null);
 assert.equal(lineProblem({dozens:0,extraColorIds:[id(1),id(2),id(3),id(4),id(5),id(6)]}),null);
 assert.match(lineProblem({dozens:0,extraColorIds:[id(1)]}),/al menos 6/);
 assert.match(lineProblem({dozens:1,extraColorIds:[id(1),id(1)]}),/distinto/);
 assert.match(lineProblem({dozens:1,extraColorIds:Array.from({length:12},(_,i)=>id(i+1))}),/Máximo 11/);
 assert.equal(expectedPrice(420),'420.00');assert.equal(expectedPrice('381.5'),'381.50');assert.equal(expectedPrice(0),null);
});
test('validación estricta del cuerpo antes de llegar al servidor',()=>{
 const ok={requestId:id(9),method:'shipping',destination:' Santa Cruz ',lines:[line()]};
 assert.deepEqual(validateClientOrder(ok),{requestId:id(9),method:'shipping',destination:'Santa Cruz',lines:[line()]});
 assert.equal(validateClientOrder({...ok,method:'pickup',destination:'x'}).destination,null);
 for(const bad of [{...ok,requestId:'x'},{...ok,method:'delivery'},{...ok,destination:'a'},{...ok,lines:[]},
  {...ok,lines:[line(),line()]},{...ok,lines:[line({expectedPrice:380})]},{...ok,lines:[line({dozens:0})]},
  {...ok,lines:[line({modelId:'1;drop'})]},{...ok,lines:[line({extraColorIds:['x']})]},null,[]])
  assert.equal(validateClientOrder(bad),null);
 assert.match(clientOrderError('40001'),/precio/);assert.match(clientOrderError('54000'),/máximo/);
 assert.match(clientOrderError('zzz'),/No se pudo/);
 assert.equal(CLIENT_COOKIE_MAX_AGE,180*24*3600);
});
test('rutas del cliente: cookie httpOnly, origen verificado y solo hash al servidor',()=>{
 const link=read('web/app/c/[token]/route.js');
 assert.match(link,/customerFromToken\(token\)/);
 assert.match(link,/orderCookieOptions\(process\.env\.NODE_ENV==='production'\),maxAge:CLIENT_COOKIE_MAX_AGE/);
 assert.match(link,/redirect\(new URL\('\/cliente',request\.url\),303\)/);
 const order=read('web/app/api/cliente-pedido/route.js');
 assert.match(order,/origin!==new URL\(request\.url\)\.origin/);
 assert.match(order,/raw\.length>32768/);
 assert.match(order,/rpc\('create_evalia_client_order',\{p_token_hash:access\.hash/);
 const server=read('web/lib/server-private.js');
 assert.match(server,/rpc\('client_evalia_customer_session',\{p_token_hash:hash\}\)/);
 assert.doesNotMatch(read('web/app/cliente/ClientOrderForm.jsx'),/SUPABASE|getServiceDb|token/i);
});
test('catálogo público con precios y sin cantidades de stock; servidor sin acceso anónimo',()=>{
 const grid=read('web/app/catalogo/catalog-grid.jsx');
 assert.match(grid,/m\.available\?'● Disponible':'○ Agotado'/);
 assert.match(grid,/money\(m\.price\)/);
 // Ningún campo numérico de inventario se lee en la tarjeta (los comentarios no cuentan).
 assert.doesNotMatch(grid,/m\.(on_hand|stock|available_units|pending_delivery|reserved)\b/);
 const sql=read('supabase/migrations/20261128160000_r2_clientes_catalogo.sql');
 assert.doesNotMatch(sql,/grant execute[^;]*to (anon|public)/i);
 assert.match(sql,/to service_role;\s*$/);
 assert.match(sql,/>=5 then\s+raise exception 'Alcanzaste el máximo de 5 pedidos en 24 horas/);
 assert.match(sql,/evalia_security\.client_order_allowed\('\|\|v_arg\|\|'\)/);
 assert.match(read('supabase/tests/098_r2_clientes_catalogo.sql'),/catalog never exposes stock quantities/);
});
test('regresión: «Sin docena» con pocos colores no rompe la página (subtotal solo con línea válida)',async()=>{
 const {subtotalCents}=await import('../web/lib/domain.js');
 // Toda línea sin problema tiene ≥6 prendas, que es lo que exige subtotalCents.
 for(let dozens=0;dozens<=2;dozens++)for(let n=0;n<=11;n++){
  const extras=Array.from({length:n},(_,i)=>id(i+1));
  if(!lineProblem({dozens,extraColorIds:extras}))assert.doesNotThrow(()=>subtotalCents('380',dozens*12+n));
 }
 assert.throws(()=>subtotalCents('380',3));
 const form=read('web/app/cliente/ClientOrderForm.jsx');
 assert.match(form,/subtotal:model&&!problem\?subtotalCents\(model\.price,units\):0n/);
 for(const p of ['web/app/cliente/error.jsx','web/app/catalogo/error.jsx'])assert.match(read(p),/^'use client'/);
 assert.match(read('web/app/catalogo/store-error.jsx'),/onClick=\{\(\)=>reset\(\)\}>Reintentar/);
});
test('panel: compartir catálogo público y estado del enlace visible por cliente',()=>{
 const page=read('web/app/page.jsx');
 assert.match(page,/window\.location\.origin\+'\/catalogo'/);
 assert.match(page,/'https:\/\/wa\.me\/\?text='\+encodeURIComponent\(message\)/);
 assert.match(page,/<CatalogShare onOpenCustomers=\{canManage\?/);
 assert.match(page,/customerLinkStatuses\(\)\.then/);
 assert.match(page,/'🔗 Enlace activo'/);
 assert.match(read('web/lib/api.js'),/from\('customer_access_links'\)\.select\('customer_id,version,issued_at,revoked_at'\)/);
});

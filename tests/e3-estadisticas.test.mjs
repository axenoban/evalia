import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {statsRange,ordersCsv,csvFileName,barScale,boliviaStamp,MAX_STATS_DAYS} from '../web/lib/owner-stats.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('periodos en días de Bolivia con límites semiabiertos y validación',()=>{
 const now=new Date('2026-11-28T02:30:00Z'); // 27-11 22:30 en Bolivia
 assert.deepEqual(statsRange('today','','',now).from,'2026-11-27');
 const month=statsRange('month','','',now);
 assert.equal(month.from,'2026-11-01');assert.equal(month.lower,'2026-11-01T04:00:00.000Z');assert.equal(month.upper,'2026-11-28T04:00:00.000Z');
 assert.equal(statsRange('year','','',now).from,'2026-01-01');
 assert.equal(statsRange('week','','',now).from,'2026-11-21');
 assert.equal(statsRange('custom','2026-11-10','2026-11-01',now).valid,false);
 assert.equal(statsRange('custom','','2026-11-01',now).valid,false);
 assert.equal(statsRange('custom','2020-01-01','2026-11-01',now).valid,false);
 assert.equal(MAX_STATS_DAYS,1830);
});
test('CSV para Excel: BOM, separador ;, coma decimal, hora de Bolivia y sin inyección de fórmulas',()=>{
 const csv=ordersCsv([{reference:'abcd1234',confirmed_at:'2026-11-10T15:00:00Z',status:'active',customer:'=HYPERLINK("x")',whatsapp:'+59170000000',
  fulfillment:'shipping',destination:'La Paz; zona "Sur"',model:'Blusa',size:'M',dozens:1,extra_units:6,units:18,price_dozen_bs:'381',subtotal_bs:'571.50'}]);
 assert.ok(csv.startsWith('﻿Pedido;Confirmado (Bolivia);'));
 const row=csv.split('\r\n')[1];
 assert.match(row,/^abcd1234;2026-11-10 11:00;Activo;/);
 assert.match(row,/;"'=HYPERLINK\(""x""\)";'\+59170000000;Envío;"La Paz; zona ""Sur""";Blusa;M;1;6;18;381,00;571,50$/);
 assert.equal(csvFileName({from:'2026-11-01',to:'2026-11-27'}),'evalia-pedidos_2026-11-01_2026-11-27.csv');
 assert.equal(boliviaStamp('2026-11-28T03:59:00Z'),'2026-11-27 23:59');
});
test('escala de barras de una serie sin dividir por cero',()=>{
 assert.equal(barScale([0,0])(0),0);
 const s=barScale([50,200]);assert.equal(s(200),1);assert.equal(s(50),0.25);
});
test('E3 solo propietario: servidor, menú y ruta; lectura sin escrituras',()=>{
 const sql=read('supabase/migrations/20261128100000_e3_owner_stats.sql');
 assert.equal((sql.match(/if not public\.is_evalia_owner\(\) then/g)||[]).length,2);
 assert.match(sql,/revoke all on function public\.get_evalia_owner_stats\(timestamptz,timestamptz\) from public,anon,service_role;/);
 assert.match(sql,/revoke all on function public\.export_evalia_orders\(timestamptz,timestamptz\) from public,anon,service_role;/);
 assert.doesNotMatch(sql,/\b(insert into|update public|delete from)\b/i);
 assert.match(sql,/o\.status in \('active','completed'\)/);
 assert.match(sql,/p\.status='approved' and p\.approved_at>=p_from/);
 const page=read('web/app/page.jsx');
 assert.match(page,/tab==='stats'\?\(owner\?<OwnerStats\/>:/);
 const ui=read('web/app/owner-stats.jsx');
 // Decisión del propietario (28-11-2026): ventas físicas registradas en stock, estimadas a precio lista.
 assert.match(ui,/Ventas físicas: monto estimado a precio lista según los registros de stock \(no es cobro verificado\)\. No incluye ganancias\./);
 assert.match(ui,/<details className="ev-series-table">/);
 assert.match(read('web/app/layout.jsx'),/import '\.\/owner-stats\.css';/);
 assert.match(read('supabase/tests/096_e3_owner_stats.sql'),/operator cannot read statistics/);
});

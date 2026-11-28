import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stockProjection} from '../web/lib/product-data.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('corregir disponibles: la cantidad son las prendas libres y las comprometidas se suman solas',()=>{
 // Caso de la captura del propietario: 32 publicadas, 12 comprometidas, 20 libres.
 const stock={on_hand:32,reserved:0,pending_delivery:12,blocked:false};
 assert.deepEqual(stockProjection(stock,'set_available','12','units'),{units:12,committed:12,target:24,available:12,valid:true});
 assert.deepEqual(stockProjection(stock,'set_available','2','dozens'),{units:24,committed:12,target:36,available:24,valid:true});
 assert.deepEqual(stockProjection(stock,'set_available','0','units'),{units:0,committed:12,target:12,available:0,valid:true});
 assert.equal(stockProjection(stock,'set_available','','units').valid,false);
 assert.equal(stockProjection(stock,'set_available','-1','units').valid,false);
 assert.equal(stockProjection(stock,'set_available','1.5','dozens').valid,false);
 // Un modelo en revisión también se puede corregir (solo la venta física queda bloqueada).
 assert.equal(stockProjection({...stock,blocked:true},'set_available','5','units').valid,true);
});
test('la interfaz usa la operación de disponibles y el servidor calcula el total bajo bloqueo',()=>{
 const page=read('web/app/page.jsx');
 assert.match(page,/\['set_available','= Corregir disponibles'\]/);
 assert.doesNotMatch(page,/'= Corregir total'/);
 assert.match(page,/Prendas disponibles para ofrecer/);
 const sql=read('supabase/migrations/20261128210000_stock_corregir_disponibles.sql');
 assert.match(sql,/check \(operation in \('add','physical_sale','set_total','set_available'\)\)/);
 assert.match(sql,/elsif p_operation='set_available' then\s+v_target:=p_units::bigint\+v_reserved\+v_pending;/);
 assert.ok(sql.indexOf('for update')<sql.indexOf("v_target:=p_units::bigint+v_reserved+v_pending"),'el compromiso se calcula con la fila bloqueada');
 assert.match(read('supabase/tests/099_stock_corregir_disponibles.sql'),/al anular, las comprometidas vuelven a disponibles/);
});

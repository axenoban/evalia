import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stockProjection} from '../web/lib/product-data.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

// Decisión del propietario (28-11-2026): se cuentan las prendas libres que quedan; lo que falta se vendió en físico.
// Publicadas = stock en mano + vendidas y solo sube con prendas nuevas. Disponibles = Publicadas - Vendidas - Comprometidas.
const stock={on_hand:32,reserved:0,pending_delivery:12,physical_sold:0,delivered:0,published:32,blocked:false};

test('registrar disponibles: si bajan es venta física y publicadas no cambia',()=>{
 const p=stockProjection(stock,'set_available','12','units');
 assert.deepEqual([p.target,p.available,p.change,p.sold,p.published,p.valid],[24,12,-8,8,32,true]);
 assert.equal(stockProjection(stock,'set_available','0','units').sold,20,'agotado = todo lo libre se vendió');
 assert.equal(stockProjection(stock,'set_available','0','units').published,32);
});
test('registrar disponibles: si suben son prendas nuevas y vendidas no cambia',()=>{
 const p=stockProjection(stock,'set_available','30','units');
 assert.deepEqual([p.target,p.available,p.change,p.sold,p.published],[42,30,10,0,42]);
 assert.equal(stockProjection(stock,'set_available','20','units').change,0,'mismo número: sin cambios');
});
test('venta física, añadir y corregir error de carga',()=>{
 const after={...stock,on_hand:24,physical_sold:8,published:32};
 const sale=stockProjection(after,'physical_sale','2','units');
 assert.deepEqual([sale.available,sale.sold,sale.published],[10,10,32]);
 const add=stockProjection(after,'add','1','dozens');
 assert.deepEqual([add.available,add.sold,add.published],[24,8,44]);
 const fix=stockProjection(after,'correct_published','30','units');
 assert.deepEqual([fix.target,fix.available,fix.sold,fix.published,fix.valid],[22,10,8,30,true],'corregir no cuenta como venta');
 assert.equal(stockProjection(after,'correct_published','19','units').valid,false,'no puede quedar por debajo de vendidas + comprometidas');
 assert.equal(stockProjection(after,'set_available','-1','units').valid,false);
 assert.equal(stockProjection(after,'set_available','1.5','dozens').valid,false);
 assert.equal(stockProjection({...after,blocked:true},'set_available','5','units').valid,true);
});
test('interfaz y servidor: operaciones, confirmación y cálculo bajo bloqueo',()=>{
 const page=read('web/app/page.jsx');
 assert.match(page,/\['set_available','= Registrar disponibles'\],\['correct_published','✎ Corregir error de carga'\]/);
 assert.match(page,/<small>Publicadas<\/small><b>\{rup\(stock\.published\?\?stock\.on_hand\)\}<\/b><\/div><div><small>Vendidas<\/small>/);
 assert.match(page,/operation==='correct_published'&&!await ask\(/);
 const sql=read('supabase/migrations/20261128220000_stock_ventas_fisicas.sql');
 assert.match(sql,/check \(operation in \('add','physical_sale','set_total','set_available','correct_published'\)\)/);
 assert.match(sql,/elsif p_operation='correct_published' then[\s\S]*?v_target:=p_units::bigint-v_delivered-v_physical;/);
 assert.match(sql,/e\.operation in \('physical_sale','set_available'\) and e\.delta_units<0/);
 assert.match(sql,/'published',v_stock\.on_hand\+v_physical\+v_delivered/);
 assert.ok(sql.indexOf('for update')<sql.indexOf('v_target:=p_units::bigint+v_reserved+v_pending'),'el compromiso se calcula con la fila bloqueada');
 assert.match(read('supabase/tests/100_stock_ventas_fisicas.sql'),/publicadas se mantiene: las prendas no desaparecen/);
 assert.match(read('web/lib/excel-workbook.js'),/'Ventas físicas estimadas'/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {checkedPortions,portionQuantity,portionBreakdown,subtotalCents,formatBs} from '../web/lib/domain.js';

const model=id=>({id,name:'Modelo '+id,colorIds: id==='a'?
 ['a1','a2','a3','a4','a5','a6','a7','a8','a9','a10','a11','a12','a13']:
 ['b1','b2','b3','b4','b5','b6','b7','b8','b9','b10','b11']});
const models=[model('a'),model('b')];
const colors=[...models[0].colorIds,...models[1].colorIds].map(id=>({id,name:id,is_active:true}));
const stock={a:{available:72,on_hand:72,reserved:0,pending_delivery:0},b:{available:24,on_hand:24,reserved:0,pending_delivery:0}};
const extras=n=>models[0].colorIds.slice(0,n);
const base=(count,selected)=>({a:{dozens:String(count),extraColorIds:selected}});

test('docena completa sin prendas adicionales',()=>{
 const lines=checkedPortions(models,base(1,[]),stock,colors);
 assert.deepEqual(lines,[{modelId:'a',dozens:1,extraColorIds:[]}]);
 assert.equal(portionQuantity(1,[]),12);
 assert.equal(portionBreakdown(1,0),'1 docena surtida');
});
test('una docena + una prenda específica de color',()=>{
 assert.equal(portionQuantity(1,extras(1)),13);
 assert.deepEqual(checkedPortions(models,base(1,extras(1)),stock,colors)[0].extraColorIds,['a1']);
});
test('una docena + once adicionales (máximo)',()=>{
 assert.equal(portionQuantity(1,extras(11)),23);
 assert.equal(checkedPortions(models,base(1,extras(11)),stock,colors)[0].extraColorIds.length,11);
});
test('dos docenas + once extras permiten cantidades superiores a docena',()=>{
 assert.equal(portionQuantity(2,extras(11)),35);
 assert.match(portionBreakdown(2,11),/2 docenas surtidas/);
});
test('cero docenas + seis colores diferentes es válido',()=>{
 const result=checkedPortions(models,base(0,extras(6)),stock,colors);
 assert.equal(result.length,1);
 assert.equal(portionQuantity(result[0].dozens,result[0].extraColorIds),6);
});
test('cero docenas + once colores diferentes es válido',()=>{
 const result=checkedPortions(models,base(0,extras(11)),stock,colors);
 assert.equal(result[0].extraColorIds.length,11);
});
test('cero docenas + cinco colores no alcanza mínimo mayorista por modelo',()=>{
 assert.throws(()=>checkedPortions(models,base(0,extras(5)),stock,colors),/6 a 11/);
});
test('no se pueden elegir 12 prendas adicionales, aunque el catálogo tenga 13 colores',()=>{
 assert.throws(()=>checkedPortions(models,base(1,extras(12)),stock,colors),/Máximo 11/);
 assert.throws(()=>checkedPortions(models,base(0,extras(12)),stock,colors),/Máximo 11/);
});
test('un color solo puede escogerse una vez por modelo',()=>{
 assert.throws(()=>checkedPortions(models,base(0,['a1','a1','a2','a3','a4','a5']),stock,colors),/una prenda por color/);
});
test('el color de otro modelo no puede seleccionarse en una línea',()=>{
 assert.throws(()=>checkedPortions(models,base(1,['b1']),stock,colors),/no está disponible/);
});
test('el color inactivo no puede seleccionarse aunque esté asignado al modelo',()=>{
 const inactive=colors.map(c=>({...c,is_active:c.id!=='a1'}));
 assert.throws(()=>checkedPortions(models,base(1,['a1']),stock,inactive),/no está disponible/);
});
test('colores sin docena son independientes para cada modelo del carrito',()=>{
 const values={a:{dozens:'0',extraColorIds:extras(6)},b:{dozens:'0',extraColorIds:models[1].colorIds.slice(0,7)}};
 const lines=checkedPortions(models,values,stock,colors);
 assert.equal(lines.length,2);
 assert.equal(lines[0].extraColorIds.length,6);
 assert.equal(lines[1].extraColorIds.length,7);
});
test('varios modelos con una docena y media individual cada uno',()=>{
 const values={a:{dozens:'1',extraColorIds:extras(6)},b:{dozens:'1',extraColorIds:[]}};
 const lines=checkedPortions(models,values,stock,colors);
 assert.equal(lines.length,2);
 assert.equal(portionQuantity(lines[0].dozens,lines[0].extraColorIds),18);
 assert.equal(portionQuantity(lines[1].dozens,lines[1].extraColorIds),12);
});
test('stock A global impide añadir extras por encima del cupo libre',()=>{
 const low={...stock,a:{...stock.a,available:13}};
 assert.throws(()=>checkedPortions(models,base(1,extras(2)),low,colors),/Stock insuficiente/);
});
test('stock insuficiente en segundo modelo rechaza toda la operación',()=>{
 const low={...stock,b:{...stock.b,available:5}};
 const values={a:{dozens:'1',extraColorIds:[]},b:{dozens:'0',extraColorIds:models[1].colorIds.slice(0,6)}};
 assert.throws(()=>checkedPortions(models,values,low,colors),/Stock insuficiente/);
});
test('stock bloqueado impide reservar aunque haya unidades',()=>{
 const blocked={...stock,a:{...stock.a,blocked:true}};
 assert.throws(()=>checkedPortions(models,base(1,[]),blocked,colors),/bloqueado/);
});
test('no se permiten docenas negativas, fraccionarias ni exponentes',()=>{
 for(const invalid of ['-1','1.5','1e2','', 'abc'])
 assert.throws(()=>checkedPortions(models,base(invalid,[]),stock,colors),/Docenas inválidas/);
});
test('sin modelos en el carrito no guarda reserva ni pedido',()=>{
 assert.throws(()=>checkedPortions(models,{},stock,colors),/Agrega al menos un modelo/);
});
test('subtotales multímodelo se redondean por modelo, conservan medio boliviano',()=>{
 const first=subtotalCents('381.00',6),second=subtotalCents('420.00',12);
 assert.equal(first,19050n);
 assert.equal(second,42000n);
 assert.equal(formatBs(first+second),'610,50 Bs');
});
test('orden y colores elegidos se conservan para enviar a SQL',()=>{
 const chosen=['a7','a2','a11'];
 assert.deepEqual(checkedPortions(models,base(2,chosen),stock,colors)[0].extraColorIds,chosen);
});

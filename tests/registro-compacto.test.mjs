import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {canAddModelToOrder,initialModelPortion} from '../web/lib/order-selection.js';
import {checkedPortions} from '../web/lib/domain.js';

const page=readFileSync(new URL('../web/app/page.jsx',import.meta.url),'utf8');
const style=readFileSync(new URL('../web/app/booking.css',import.meta.url),'utf8');
const portionStart=page.indexOf('function PortionEditor(');
const portionEnd=page.indexOf('\nfunction ',portionStart+10);
assert.ok(portionStart>0&&portionEnd>portionStart,'PortionEditor debe existir en el módulo');
const portion=page.slice(portionStart,portionEnd);
const register=page.slice(page.indexOf('function BookingPanel('),page.indexOf('function LineComposition('));

test('el progreso compacto informa etapa actual sin ocultar las secciones del registro',()=>{
 assert.match(register,/order-progress ev-order-progress/);
 assert.match(register,/role="progressbar"/);
 assert.match(register,/aria-valuenow=\{stage\}/);
 assert.match(register,/OrderStepHeader number=\{1\}/);
 assert.match(register,/OrderStepHeader number=\{2\}/);
 assert.match(register,/OrderStepHeader number=\{3\}/);
});

test('selector de cliente conserva búsqueda, selección y entrega predeterminada',()=>{
 assert.match(register,/aria-autocomplete="list"/);
 assert.match(register,/role="listbox"/);
 assert.match(register,/role="option"/);
 assert.match(register,/c\.name\+' '\+c\.whatsapp/);
 assert.match(register,/setMethod\(customer\.delivery_preference==='unclassified'\?'':/);
 assert.match(register,/setDestination\(customer\.shipping_destination\?\?''\)/);
 assert.match(register,/setCustomerListOpen\(true\)/);
 assert.match(register,/onCreateClient\(payload\)/);
});

test('modelo agregado mantiene docenas visibles y unidades opcionales desplegables',()=>{
 assert.match(register,/initialModelPortion\(modelStock,colorCount\)/);
 assert.match(register,/className="picker-item picker-add"/);
 assert.match(portion,/aria-label=\{'Docenas de '\+model\.name\}/);
 assert.match(portion,/showExtras=extrasOpen\|\|noDozen/);
 assert.match(portion,/aria-expanded=\{showExtras\}/);
 assert.match(portion,/hidden=\{!showExtras\}/);
 assert.match(portion,/onChange\(\{\.\.\.selection,extraColorIds:\[\.\.\.extras,id\]\}\)/);
 assert.match(portion,/max=\{Math\.min\(maximumDozens,178956969\)\}/);
});

test('media docena conserva exigencia canónica de seis colores distintos',()=>{
 const colors=Array.from({length:7},(_,i)=>({id:'c'+i,is_active:true,name:'Color '+i}));
 const models=[{id:'m',name:'Modelo',colorIds:colors.map(c=>c.id)}];
 const stock={m:{available:11,blocked:false}};
 assert.deepEqual(initialModelPortion(stock.m,7),{dozens:'0',extraColorIds:[]});
 assert.equal(canAddModelToOrder(stock.m,5),false);
 assert.throws(()=>checkedPortions(models,{m:{dozens:'0',extraColorIds:colors.slice(0,5).map(c=>c.id)}},stock,colors),/6 a 11/);
 const lines=checkedPortions(models,{m:{dozens:'0',extraColorIds:colors.slice(0,6).map(c=>c.id)}},stock,colors);
 assert.equal(lines[0].dozens,0);
 assert.equal(lines[0].extraColorIds.length,6);
});

test('confirmación y validaciones de envío continúan conectadas',()=>{
 assert.match(register,/checkedPortions\(models,portions,stock,data\.colors\)/);
 assert.match(register,/validateDelivery\(method,destination\)/);
 assert.match(register,/onOrder\(customerId,lines,requestId\.current,delivery\)/);
 assert.match(register,/disabled=\{busy\|\|!clientReady\|\|!productsReady\|\|!deliveryReady\}/);
 assert.match(register,/setMethod\(e\.target\.value\)/);
 assert.match(register,/method==='shipping'/);
});

test('la vista compacta mantiene lista vertical y color oculto hasta pedir unidades',()=>{
 assert.match(style,/\.ev-booking \.product-picker\{/);
 assert.match(style,/\.ev-portion-primary\{/);
 assert.match(style,/\.ev-booking \.ev-extra-colors\[hidden\]/);
 assert.match(style,/@media\(max-width:700px\)/);
});

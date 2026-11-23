import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {formatAvailableDozens,formatModelDozenPrice} from '../web/lib/dashboard-presentation.js';

test('el stock libre se expresa por docenas y unidades, sin redondear',()=>{
 assert.equal(formatAvailableDozens(0),'0 unidades');
 assert.equal(formatAvailableDozens(1),'1 unidad');
 assert.equal(formatAvailableDozens(6),'6 unidades');
 assert.equal(formatAvailableDozens(8),'8 unidades');
 assert.equal(formatAvailableDozens(12),'1 doc.');
 assert.equal(formatAvailableDozens(72),'6 doc.');
 assert.equal(formatAvailableDozens(66),'5 doc. y 6 unidades');
 assert.equal(formatAvailableDozens(25),'2 doc. y 1 unidad');
 assert.equal(formatAvailableDozens(-1),'Cantidad no disponible');
 assert.equal(formatAvailableDozens(NaN),'Cantidad no disponible');
 assert.equal(formatAvailableDozens(1.5),'Cantidad no disponible');
});

test('los precios mostrados proceden del propio modelo',()=>{
 assert.match(formatModelDozenPrice(360),/^Bs 360 \/ docena$/);
 assert.match(formatModelDozenPrice(381),/^Bs 381 \/ docena$/);
 assert.equal(formatModelDozenPrice(null),'Precio no registrado');
 assert.equal(formatModelDozenPrice(''),'Precio no registrado');
 assert.equal(formatModelDozenPrice(0),'Precio no registrado');
});

test('dashboard consume disponibilidad libre y no altera la gestión de pedidos',()=>{
 const page=readFileSync(new URL('../web/app/page.jsx',import.meta.url),'utf8');
 const dashboard=page.slice(page.indexOf('function DashboardProductCard'),page.indexOf('function StockTable('));
 assert.match(dashboard,/formatAvailableDozens\(stock\?\.available\?\?0\)/);
 assert.match(dashboard,/formatModelDozenPrice\(model\.price_dozen_bs\)/);
 assert.match(dashboard,/data\.orders\.filter\(o=>o\.status==='active'\)/);
 assert.match(page,/MENU\.map\(\(\[id,label,sign\]\)=>/);
});

test('la presentación incorpora carrusel accesible y cuadrícula móvil de dos columnas',()=>{
 const css=readFileSync(new URL('../web/app/dashboard.css',import.meta.url),'utf8');
 const layout=readFileSync(new URL('../web/app/layout.jsx',import.meta.url),'utf8');
 assert.match(css,/\.ev-model-track\{display:grid;grid-auto-flow:column/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:740px\)/);
 assert.match(layout,/import '\.\/dashboard\.css'/);
});

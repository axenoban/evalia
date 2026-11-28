import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {formatAvailableDozens,formatModelDozenPrice,countModelsWithStock} from '../web/lib/dashboard-presentation.js';

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
 assert.match(dashboard,/data\.orders\.filter\(o=>o\.status==='active'&&!o\.archived_at\)/);
 // Estadísticas y Usuarios solo se agregan al menú del propietario (D07).
 assert.match(page,/const menu=owner\?\[\.\.\.MENU,\['stats','Estadísticas','▥'\],\['security','Usuarios','⚙'\]\]:seller\?MENU\.filter\(\(\[id\]\)=>SELLER_TABS\.includes\(id\)\):MENU;/);
 assert.match(page,/const SELLER_TABS=\['home','booking','orders','customers'\];/);
 // El menú móvil recibe el menú completo: 4 accesos directos y «Más» con el resto; ninguna sección queda inaccesible.
 assert.match(page,/<MobileNav menu=\{menu\} tab=\{tab\} onNavigate=\{navigate\}\/>/);
 assert.match(page,/const MOBILE_PRIMARY=\['home','catalog','booking','orders'\];/);
 assert.match(page,/const secondary=menu\.filter\(\(\[id\]\)=>!MOBILE_PRIMARY\.includes\(id\)\);/);
 assert.match(page,/secondary\.map\(\(\[id,label\]\)=>/);
 assert.match(page,/menu\.map\(\(\[id,label,symbol\]\)=>/);
 for(const id of ['home','catalog','booking','orders','payments','customers']) assert.match(page,new RegExp("\\['"+id+"',"));
});

test('la presentación incorpora carrusel accesible y cuadrícula móvil de dos columnas',()=>{
 const css=readFileSync(new URL('../web/app/dashboard.css',import.meta.url),'utf8');
 const layout=readFileSync(new URL('../web/app/layout.jsx',import.meta.url),'utf8');
 assert.match(css,/\.ev-model-track\{display:grid;grid-auto-flow:column/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:740px\)/);
 assert.match(layout,/import '\.\/dashboard\.css'/);
});

test('modelos con stock cuenta modelos activos distintos con disponibilidad positiva verificada',()=>{
 const models=['a','b','c','d','e','f','a'].map(id=>({id,is_active:id!=='e'}));
 const stock={a:{available:12},b:{available:0},c:{available:24,blocked:true},d:{available:'6'},e:{available:36}};
 assert.equal(countModelsWithStock(models,stock),2);
 assert.equal(countModelsWithStock([{id:'a',is_active:true}],{a:{available:-1}}),0);
 assert.equal(countModelsWithStock([{id:'a',is_active:true}],{a:{available:1.5}}),0);
 assert.equal(countModelsWithStock([],{}),0);
});
test('dashboard prioriza dos indicadores, modelos y después las acciones y secciones de apoyo',()=>{
 const page=readFileSync(new URL('../web/app/page.jsx',import.meta.url),'utf8');
 const dashboard=page.slice(page.indexOf('function Dashboard('),page.indexOf('\nfunction ',page.indexOf('function Dashboard(')+10));
 assert.equal((dashboard.match(/<SummaryCard /g)||[]).length,2);
 assert.match(dashboard,/label="Pedidos pendientes" value=\{activeOrders.length\}/);
 assert.match(dashboard,/label="Modelos con stock" value=\{modelsWithStock\}/);
 assert.match(dashboard,/countModelsWithStock\(activeModels,data.stock\)/);
 assert.match(dashboard,/const \[showOlder,setShowOlder\]=useState\(true\)/);
 assert.doesNotMatch(dashboard,/description=|<p>Modelos recientes|<p>Compras confirmadas|<p>Declaraciones pendientes/);
 const kpi=dashboard.indexOf('ev-overview'),catalog=dashboard.indexOf('ev-zone ev-zone-catalog'),actions=dashboard.indexOf('ev-dashboard-actions'),support=dashboard.indexOf('ev-support-grid');
 assert.ok(kpi>=0&&kpi<catalog&&catalog<actions&&actions<support);
 assert.match(dashboard,/onClick=\{\(\)=>setTab\('booking'\)\}/);
 assert.match(dashboard,/onClick=\{\(\)=>setTab\('catalog'\)\}/);
 assert.match(dashboard,/onClick=\{\(\)=>setTab\('orders'\)\}/);
 assert.match(dashboard,/onClick=\{\(\)=>setTab\('payments'\)\}/);
 assert.match(dashboard,/<Notice type="error">/);
});

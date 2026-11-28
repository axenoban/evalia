import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildOrderPageQuery,loadOrderPage,CUSTOMER_FILTER_LIMIT} from '../web/lib/order-page.js';
import {loadFullWorkspace,loadLightWorkspace,PHOTO_RESIGN_MS} from '../web/lib/workspace-loader.js';
import {createConfirmationGate} from '../web/lib/confirmation-gate.js';
const all={from:'',to:'',valid:true};
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

// Cliente simulado: aplica filtros simples, cuenta solicitudes REST, RPC y firmas de Storage.
function mockDb(tables){
 const log=[];
 class Q{
  constructor(t){this.t=t;this.p=[];this.s=0;this.e=Infinity;}
  select(){return this;} order(){return this;} limit(){return this;} abortSignal(){return this;}
  eq(k,v){this.p.push(r=>r[k]===v);return this;} is(k,v){this.p.push(r=>r[k]===v);return this;}
  not(k,_,v){this.p.push(r=>r[k]!==v);return this;} in(k,v){this.p.push(r=>v.includes(r[k]));return this;}
  gte(){return this;} lt(){return this;}
  range(a,b){this.s=a;this.e=b;return this;}
  then(res,rej){log.push('rest:'+this.t);const rows=(tables[this.t]??[]).filter(r=>this.p.every(f=>f(r)));return Promise.resolve({data:rows.slice(this.s,this.e+1),count:rows.length,error:null}).then(res,rej);}
 }
 return {log,from:t=>new Q(t),
  rpc:(name,{p_ids})=>{log.push('rpc:'+name);return Promise.resolve({data:Object.fromEntries(p_ids.map(id=>[id,{available:12,on_hand:12,reserved:0,pending_delivery:0}])),error:null});},
  storage:{from:()=>({createSignedUrls:async paths=>{log.push('sign:'+paths.length);return {data:paths.map(path=>({path,signedUrl:'https://firma/'+path})),error:null};}})}};
}
function fixture({models=60,customers=600,orders=900}={}){
 return {
  models:Array.from({length:models},(_,i)=>({id:'m'+i,name:'Modelo '+i,size_label:'M',price_dozen_bs:'380',image_path:'models/'+i+'.jpg',is_active:true,created_at:'2026-11-'+String(1+i%27).padStart(2,'0')})),
  colors:[{id:'c1',name:'Negro',hex_code:'#000000',is_active:true}],
  model_colors:Array.from({length:models},(_,i)=>({model_id:'m'+i,color_id:'c1'})),
  customers:Array.from({length:customers},(_,i)=>({id:'k'+i,name:'Cliente '+i,whatsapp:'7000'+i})),
  orders:Array.from({length:orders},(_,i)=>({id:'o'+i,customer_id:'k'+(i%customers),status:i%3?'completed':'active',archived_at:i%10===0?'2026-11-20':null,confirmed_at:'2026-11-'+String(1+i%27).padStart(2,'0')})),
  payment_reports:Array.from({length:orders},(_,i)=>({id:'p'+i,order_id:'o'+i,status:i%7===0?'pending':'approved',amount_bs:'100',created_at:'2026-11-'+String(1+i%27).padStart(2,'0')})),
  payment_reviews:Array.from({length:orders},(_,i)=>({id:'r'+i,report_id:'p'+i,action:'approve',created_at:'2026-11-20'})),
  reservations:[],reservation_lines:[],reservation_extra_colors:[],reservation_revisions:[],order_lines:[],payment_qr:[]
 };
}

test('C2: la búsqueda por cliente filtra en el servidor, con límite y resultado vacío sin consultar',async()=>{
 const tables={orders:[{id:'a',customer_id:'k1',archived_at:null,confirmed_at:'2026-11-02'},{id:'b',customer_id:'k2',archived_at:null,confirmed_at:'2026-11-01'}]};
 const db=mockDb(tables);
 const q=buildOrderPageQuery({from:t=>db.from(t)},{archived:false,range:all,page:1,size:25,customerIds:['k1']});
 const result=await q;
 assert.deepEqual(result.data.map(o=>o.id),['a']);
 assert.equal(CUSTOMER_FILTER_LIMIT,100);
 assert.throws(()=>buildOrderPageQuery(db,{archived:false,range:all,page:1,size:25,customerIds:Array(101).fill('x')}),/inválido/);
 assert.throws(()=>buildOrderPageQuery(db,{archived:false,range:all,page:1,size:25,customerIds:[]}),/inválido/);
 const empty=mockDb({});
 const none=await loadOrderPage(empty,{archived:false,range:all,page:1,size:25,customerIds:[]});
 assert.equal(none.view.total,0);assert.equal(empty.log.length,0);
 assert.deepEqual(await loadOrderPage(empty,{archived:false,range:all,page:3,size:25,customerIds:[]}),{redirect:1});
 const page=read('web/app/page.jsx');
 assert.match(page,/findBookingCustomers\(workspace\.customers,query\)/);
 assert.match(page,/window\.setTimeout\(\(\)=>setQuery\(search\.trim\(\)\),300\)/);
 assert.match(page,/aria-label="Buscar pedidos por cliente"/);
});

test('C3: la actualización liviana reduce solicitudes y conserva el mismo resultado operativo',async()=>{
 const tables=fixture(),now=1_000_000;
 const fullDb=mockDb(tables);
 const full=await loadFullWorkspace(fullDb,now);
 const lightDb=mockDb(tables);
 const light=await loadLightWorkspace(lightDb,full,now+60_000);
 // Mismos modelos, stock, pedidos y clientes visibles; avisos pendientes iguales.
 assert.deepEqual(light.models.map(m=>[m.id,m.imageUrl]),full.models.map(m=>[m.id,m.imageUrl]));
 assert.deepEqual(light.stock,full.stock);
 assert.deepEqual(light.orders.map(o=>o.id),full.orders.map(o=>o.id));
 assert.equal(light.customers,full.customers);
 const pending=w=>w.payments.filter(p=>p.status==='pending').map(p=>p.id).sort();
 assert.deepEqual(pending(light),pending(full));
 assert.equal(light.payments.length,full.payments.length);
 // Sin descargar clientes, historial de pagos ni revisiones; sin volver a firmar fotos vigentes.
 for(const table of ['customers','payment_reviews','colors','reservations','payment_qr'])assert.ok(!lightDb.log.includes('rest:'+table),table);
 assert.ok(!lightDb.log.some(x=>x.startsWith('sign:')));
 assert.ok(lightDb.log.length<fullDb.log.length/2,`liviana ${lightDb.log.length} vs completa ${fullDb.log.length}`);
 // Fotos: se vuelven a firmar antes de que caduquen (1 h).
 const later=mockDb(tables);
 await loadLightWorkspace(later,light,now+PHOTO_RESIGN_MS+1);
 assert.ok(later.log.some(x=>x.startsWith('sign:')));
});

test('C3: un aviso aprobado en otra sesión deja de figurar como pendiente en la lectura liviana',async()=>{
 const tables=fixture({models:3,customers:5,orders:14}),now=5;
 const full=await loadFullWorkspace(mockDb(tables),now);
 tables.payment_reports=tables.payment_reports.map(p=>p.id==='p0'?{...p,status:'approved'}:p);
 const light=await loadLightWorkspace(mockDb(tables),full,now+1);
 assert.ok(!light.payments.some(p=>p.id==='p0'&&p.status==='pending'));
 assert.ok(light.payments.some(p=>p.id==='p7'&&p.status==='pending'));
});

test('C1: confirmación abierta detectable y el refresco automático no la cierra',()=>{
 let shown=null;const gate=createConfirmationGate(v=>{shown=v;});
 assert.equal(gate.isPending(),false);
 gate.request({title:'x'});assert.equal(gate.isPending(),true);assert.ok(shown);
 gate.cancel();assert.equal(gate.isPending(),false);
 const page=read('web/app/page.jsx'),controls=read('web/app/record-list-controls.jsx');
 assert.match(page,/const light=reason==='timer'&&Date\.now\(\)-loadedAt<FULL_REFRESH_MS;/);
 assert.match(page,/const FULL_REFRESH_MS=5\*60\*1000;/);
 assert.match(page,/refresh\(\{background:true,light\}\)/);
 // Escrituras y actualización manual siguen siendo completas y bloqueantes.
 assert.match(read('web/lib/write-confirmation.js'),/await refresh\(\);/);
 assert.match(page,/try\{await refresh\(\);if\(authorizedUser\.current===actor\)setMessage\('Datos actualizados\.'\);\}/);
 assert.match(controls,/workspace\?\.refreshKind==='background'&&prior\.workspace\?\.blockingSeq===workspace\.blockingSeq/);
});

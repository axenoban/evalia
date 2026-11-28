import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dateBounds,buildOrderPageQuery,serverPageView,loadOrderPage,loadDashboardOrderLines} from '../web/lib/order-page.js';
const all={from:'',to:'',valid:true};
function mockDb(tables={},rpcResults={}){
 const calls=[];
 class Query{
  constructor(table){this.table=table;this.pred=[];this.orders=[];this.start=0;this.end=Infinity;calls.push(this);}
  select(columns,options){this.columns=columns;this.options=options;return this;}
  is(k,v){this.pred.push(['is',k,v]);return this;}
  not(k,op,v){assert.equal(op,'is');this.pred.push(['not',k,v]);return this;}
  gte(k,v){this.pred.push(['gte',k,v]);return this;}
  lt(k,v){this.pred.push(['lt',k,v]);return this;}
  in(k,values){this.pred.push(['in',k,values]);return this;}
  order(k,{ascending}){this.orders.push([k,ascending]);return this;}
  range(a,b){this.start=a;this.end=b;return this;}
  abortSignal(signal){this.signal=signal;return this;}
  then(resolve,reject){
   return Promise.resolve().then(()=>{
    if(this.signal?.aborted)return {error:{message:'cancelado'},data:null,count:null};
    if(this.table.startsWith('rpc:'))return {data:rpcResults[this.table]?.[this.id]??{pending:0,remaining:0},error:null};
    let rows=(tables[this.table]??[]).filter(row=>this.pred.every(([op,k,v])=>op==='is'?row[k]===v:op==='not'?row[k]!==v:op==='gte'?row[k]>=v:op==='lt'?row[k]<v:v.includes(row[k])));
    rows=rows.sort((a,b)=>{for(const [k,asc] of this.orders){if(a[k]===b[k])continue;return (a[k]>b[k]?1:-1)*(asc?1:-1);}return 0;});
    return {data:rows.slice(this.start,this.end+1),count:rows.length,error:null};
   }).then(resolve,reject);
  }
 }
 return {calls,from:t=>new Query(t),rpc:(n,{p_order_id})=>{const q=new Query('rpc:'+n);q.id=p_order_id;return q;}};
}
test('server filters convert inclusive Bolivia calendar range to half-open UTC bounds',()=>{
 assert.deepEqual(dateBounds({from:'2026-11-27',to:'2026-11-27',valid:true}),{lower:'2026-11-27T04:00:00.000Z',upper:'2026-11-28T04:00:00.000Z'});
 assert.deepEqual(dateBounds(all),{lower:null,upper:null});
 assert.throws(()=>dateBounds({from:'2026-11-28',to:'2026-11-27',valid:true}),/inválido/);
 assert.throws(()=>dateBounds({from:'2026-02-30',to:'',valid:true}),/inválido/);
});
test('server query applies archive category, date bounds, stable sorting, exact count and inclusive range',()=>{
 const db=mockDb(),signal=new AbortController().signal;
 const q=buildOrderPageQuery(db,{archived:true,range:{from:'2026-11-01',to:'2026-11-30',valid:true},page:3,size:25,signal});
 assert.deepEqual(q.pred,[['not','archived_at',null],['gte','archived_at','2026-11-01T04:00:00.000Z'],['lt','archived_at','2026-12-01T04:00:00.000Z']]);
 assert.deepEqual(q.orders,[['archived_at',false],['id',true]]);assert.deepEqual(q.options,{count:'exact'});
 assert.deepEqual([q.start,q.end],[50,74]);assert.equal(q.signal,signal);
 assert.throws(()=>buildOrderPageQuery(db,{archived:false,range:all,page:1,size:999}),/inválida/);
});
test('count shrink redirects and partial pages cannot masquerade as complete',()=>{
 assert.deepEqual(serverPageView([],12,3,10),{redirect:2});
 assert.deepEqual(serverPageView([],0,1,10),{items:[],total:0,page:1,pages:1,first:0,last:0});
 assert.throws(()=>serverPageView([{id:'a'}],12,1,10),/incompleta/);
 assert.throws(()=>serverPageView([{id:'a'},{id:'a'}],2,1,10),/incompleta/);
});
test('order pages hydrate only selected IDs with exact revisions, historical colors and legacy payments',async()=>{
 const orders=Array.from({length:26},(_,i)=>({id:'o'+String(i).padStart(2,'0'),customer_id:'c'+i,status:'active',archived_at:null,confirmed_at:'2026-11-27T06:00:00.000Z',revision:i,origin_reservation_id:i===10?'legacy':null}));
 const db=mockDb({orders,order_lines:orders.map(o=>({id:'l'+o.id,order_id:o.id,quantity:12})),order_extra_colors:[{order_line_id:'lo10',color_id:'red',position:1}],customers:orders.map(o=>({id:o.customer_id})),payment_reports:[{id:'p1',order_id:'o10',reservation_id:null,created_at:'2026-11-27'},{id:'p2',order_id:null,reservation_id:'legacy',created_at:'2026-11-26'},{id:'unrelated',order_id:'o01',reservation_id:null,created_at:'2026-11-26'}],deliveries:[],delivery_lines:[],order_access_links:[]});
 const result=await loadOrderPage(db,{archived:false,range:all,page:2,size:10});
 assert.equal(result.view.total,26);assert.equal(result.view.first,11);assert.equal(result.view.last,20);
 assert.deepEqual(result.view.items.map(o=>o.id),orders.slice(10,20).map(o=>o.id));
 assert.equal(result.view.items[0].revision,10);assert.deepEqual(result.view.items[0].lines[0].extraColorIds,['red']);
 assert.deepEqual(result.details.payments.map(p=>p.id),['p1','p2']);
 assert.equal(Object.keys(result.details.finances).length,10);
 const rpc=db.calls.filter(q=>q.table.startsWith('rpc:'));
 assert.equal(rpc.length,20);assert.ok(rpc.every(q=>orders.slice(10,20).some(o=>o.id===q.id)));
 for(const q of db.calls.filter(q=>q.table!=='orders'&&!q.table.startsWith('rpc:')))assert.ok(q.pred.some(([op])=>op==='in'));
});
test('dashboard requests lines for at most five active nonarchived orders, never every order detail',async()=>{
 const orders=Array.from({length:12},(_,i)=>({id:'o'+i,status:i===0?'completed':'active',archived_at:i===1?'date':null}));
 const db=mockDb({order_lines:orders.map(o=>({id:'l'+o.id,order_id:o.id,quantity:12}))});
 const lines=await loadDashboardOrderLines(db,orders);
 assert.deepEqual(lines.map(l=>l.order_id),['o2','o3','o4','o5','o6']);
 const api=readFileSync(new URL('../web/lib/workspace-loader.js',import.meta.url),'utf8');
 const workspace=api.slice(api.indexOf('export async function loadFullWorkspace'),api.indexOf('// Actualización liviana'));
 assert.match(workspace,/loadDashboardOrderLines\(db,orders\)/);
 assert.doesNotMatch(workspace,/get_evalia_order_(finance|delivery)/);
 assert.doesNotMatch(workspace,/db\.from\('(?:order_lines|order_extra_colors|deliveries|delivery_lines|order_access_links)'\)/);
});

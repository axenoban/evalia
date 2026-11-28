import test from 'node:test';
import assert from 'node:assert/strict';
import {indexBy,assembleWorkspace} from '../web/lib/workspace-assembly.js';

function fixture(overrides={}){
 return {models:[],modelColors:[],colors:[],customers:[],reservations:[],reservationLines:[],reservationColors:[],orders:[],orderLines:[],orderColors:[],revisions:[],payments:[],paymentReviews:[],deliveries:[],deliveryLines:[],links:[],qrSettings:null,stocks:[],images:[],financeEntries:[],deliveryEntries:[],...overrides};
}
test('relationship index preserves ordering and duplicate rows without mutating input',()=>{
 const rows=[{id:'a',v:1},{id:'b',v:2},{id:'a',v:3},{id:'a',v:3}];
 const before=structuredClone(rows),indexed=indexBy(rows,'id');
 assert.deepEqual(indexed.get('a'),[rows[0],rows[2],rows[3]]);
 assert.deepEqual(indexed.get('b'),[rows[1]]);
 assert.deepEqual(rows,before);
});
test('empty workspace retains prior data contract',()=>{
 assert.deepEqual(assembleWorkspace(fixture()),{models:[],colors:[],customers:[],stock:{},revisions:[],payments:[],paymentReviews:[],deliveries:[],deliveryLines:[],links:[],qrSettings:null,finances:{},deliveryStats:{},reservations:[],orders:[]});
});
test('workspace joins models, reservations and orders preserving order and historical prices',()=>{
 const input=fixture({
  models:[{id:'m1',price_dozen_bs:380},{id:'m2'}],modelColors:[{model_id:'m1',color_id:'c2'},{model_id:'m1',color_id:'c1'}],images:[['m1','signed'],['m2',null]],
  reservations:[{id:'r1'}],reservationLines:[{id:'rl',reservation_id:'r1',quantity:6}],reservationColors:[{reservation_line_id:'rl',color_id:'c2'}],
  orders:[{id:'o2',revision:4,archived_at:'date'},{id:'o1',revision:0},{id:'o3'}],
  orderLines:[{id:'l1',order_id:'o1',price_dozen_bs:360,quantity:12},{id:'l2',order_id:'o2',quantity:6},{id:'l3',order_id:'o1',quantity:6}],
  orderColors:[{order_line_id:'l3',color_id:'c2'},{order_line_id:'l3',color_id:'c1'}],
  stocks:[['m1',{available:72}]],financeEntries:[['o1',{balance:90}]],deliveryEntries:[['o1',{pending:6}]],payments:[{id:'p1'}]
 });
 const before=structuredClone(input),result=assembleWorkspace(input);
 assert.deepEqual(result.models,[{id:'m1',price_dozen_bs:380,colorIds:['c2','c1'],imageUrl:'signed'},{id:'m2',colorIds:[],imageUrl:null}]);
 assert.deepEqual(result.reservations,[{id:'r1',lines:[{id:'rl',reservation_id:'r1',quantity:6,extraColorIds:['c2']}]}]);
 assert.deepEqual(result.orders.map(o=>[o.id,o.revision]),[['o2',4],['o1',0],['o3',null]]);
 assert.deepEqual(result.orders[1].lines,[{...input.orderLines[0],extraColorIds:[]},{...input.orderLines[2],extraColorIds:['c2','c1']}]);
 assert.deepEqual(result.orders[2].lines,[]);
 assert.deepEqual(result.stock,{m1:{available:72}});
 assert.deepEqual(result.finances,{o1:{balance:90}});
 assert.deepEqual(result.deliveryStats,{o1:{pending:6}});
 assert.deepEqual(result.payments,input.payments);
 assert.deepEqual(input,before);
});
test('assembly retains all 10000 provided orders and 5000 customers, including archived revisions',()=>{
 const orders=Array.from({length:10000},(_,i)=>({id:'o'+i,revision:i,archived_at:i%2?'date':null}));
 const customers=Array.from({length:5000},(_,i)=>({id:'c'+i}));
 const orderLines=orders.map(o=>({id:'l'+o.id,order_id:o.id,quantity:12}));
 const orderColors=orderLines.map(l=>({order_line_id:l.id,color_id:'c1'}));
 const result=assembleWorkspace(fixture({orders,customers,orderLines,orderColors}));
 assert.equal(result.orders.length,10000);assert.equal(result.customers.length,5000);
 assert.equal(result.orders[9999].revision,9999);
 assert.deepEqual(result.orders[9999].lines,[{...orderLines[9999],extraColorIds:['c1']}]);
});

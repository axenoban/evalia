import test from 'node:test';
import assert from 'node:assert/strict';
import {readAllPages,pageOf} from '../web/lib/workspace-pagination.js';

function source(rows,cap=Infinity){
 const requests=[];
 return {requests,query:()=>({range:async (from,to)=>{
  requests.push([from,to]);
  return {data:rows.slice(from,Math.min(to+1,from+cap)),count:rows.length,error:null};
 }})};
}
test('REST pages recover all rows beyond old caps, respecting lower server limit',async()=>{
 const rows=Array.from({length:1001},(_,id)=>({id}));
 const s=source(rows,73);
 assert.deepEqual((await readAllPages(s.query,['id'],'test')).data,rows);
 assert.equal(s.requests[1][0],73);
});
test('empty and exact-sized results need no redundant request',async()=>{
 for(const n of [0,250]){
  const s=source(Array.from({length:n},(_,id)=>({id})));
  assert.equal((await readAllPages(s.query,['id'],'test')).count,n);
  assert.equal(s.requests.length,1);
 }
});
test('composite keys preserve different colors and reject duplicate pairs',async()=>{
 const rows=[{model_id:'m',color_id:'a'},{model_id:'m',color_id:'b'}];
 assert.deepEqual((await readAllPages(source(rows).query,['model_id','color_id'],'test',1)).data,rows);
 await assert.rejects(readAllPages(source([...rows,rows[0]]).query,['model_id','color_id'],'test',1),/cambiaron/);
});
test('count drift, empty intermediate page, and API failures fail closed',async()=>{
 let i=0;
 await assert.rejects(readAllPages(()=>({range:async()=>({data:[{id:++i}],count:i===1?2:3})}),['id'],'test',1),/cambiaron/);
 await assert.rejects(readAllPages(()=>({range:async()=>({data:[],count:2})}),['id'],'test',1),/incompleta/);
 await assert.rejects(readAllPages(()=>({range:async()=>({error:{message:'denegado'}})}),['id'],'test'),/denegado/);
 await assert.rejects(readAllPages(()=>({range:async()=>({data:[{id:1}],count:null})}),['id'],'test'),/inválida/);
});
test('UI page 25, final partial page, shrinking and empty lists',()=>{
 const rows=Array.from({length:51},(_,i)=>i);
 assert.deepEqual(pageOf(rows,2),{items:rows.slice(25,50),page:2,pages:3,total:51,first:26,last:50});
 assert.deepEqual(pageOf(rows,3).items,[50]);
 assert.equal(pageOf(rows.slice(0,3),3).page,1);
 assert.deepEqual(pageOf([],2),{items:[],page:1,pages:1,total:0,first:0,last:0});
});

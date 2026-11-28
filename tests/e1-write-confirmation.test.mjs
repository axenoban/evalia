import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {writeThenRefresh,CONFIRMED_REFRESH_WARNING} from '../web/lib/write-confirmation.js';
test('escritura confirmada y recarga correcta devuelven el resultado',async()=>{
 const events=[];
 const result=await writeThenRefresh(async()=>{events.push('write');return 'id';},async()=>{events.push('refresh');});
 assert.deepEqual(result,{confirmed:true,refreshed:true,value:'id'});
 assert.deepEqual(events,['write','refresh']);
});
test('error de recarga después de escritura confirmada nunca transforma éxito en fallo',async()=>{
 let writes=0;const error=new Error('offline');
 const result=await writeThenRefresh(async()=>{writes++;return 'id';},async()=>{throw error;});
 assert.deepEqual(result,{confirmed:true,refreshed:false,value:'id',refreshError:error});
 assert.equal(writes,1);
 assert.match(CONFIRMED_REFRESH_WARNING,/No vuelvas a registrarla/);
});
test('escritura rechazada o de resultado desconocido no se declara confirmada ni se reintenta',async()=>{
 const error=new Error('network');let writes=0,reads=0;
 const result=await writeThenRefresh(async()=>{writes++;throw error;},async()=>{reads++;});
 assert.deepEqual(result,{confirmed:false,error});
 assert.equal(writes,1);assert.equal(reads,0);
});
test('mutación administrativa y creación de enlace emplean el contrato y no entregan enlace tras cambiar identidad',()=>{
 const page=readFileSync(new URL('../web/app/page.jsx',import.meta.url),'utf8');
 const mutation=page.slice(page.indexOf(' async function mutation('),page.indexOf(' async function addModel('));
 assert.match(mutation,/await writeThenRefresh\(fn,refresh\)/);
 assert.match(mutation,/if\(!result\.confirmed\)/);
 assert.match(mutation,/if\(!result\.refreshed\)setError\(CONFIRMED_REFRESH_WARNING\)/);
 assert.match(mutation,/return true/);
 const issue=page.slice(page.indexOf(' async function issueLink('),page.indexOf(' const revokeLink='));
 assert.match(issue,/await writeThenRefresh\(\(\)=>issueOrderLink\(orderId\),refresh\)/);
 assert.match(issue,/authorizedUser\.current!==actor/);
 assert.match(issue,/!result\.refreshed/);
});

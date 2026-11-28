import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {backupName,expiredBackups,objectFile,validateSource,sameInventory,hashFile} from '../ops/backup/backup.mjs';
import {verifyExtracted} from '../ops/backup/verify.mjs';
test('retención 30 días: solo nombres propios y fecha UTC',()=>{
 const now=Date.parse('2026-11-25T18:00:00Z');
 const old=backupName(new Date(now-30*86400000),'deadbeef');
 const fresh=backupName(new Date(now-29*86400000),'cafebabe');
 assert.equal(old,'evalia-2026-10-26T180000Z-deadbeef.tar.gz.age');
 assert.deepEqual(expiredBackups([old,fresh,'otro.tar.gz.age',old+'.partial'],now),[old]);
});
test('fuente exacta, conexión TLS de sesión, rechazo de otros proyectos y puertos',()=>{
 const p='abcdefghijklmnopqrst',url='postgresql://postgres.'+p+':test@aws-0-test.pooler.supabase.com:5432/postgres?sslmode=require';
 const s='https://'+p+'.storage.supabase.co/storage/v1/s3';
 assert.doesNotThrow(()=>validateSource(p,url,s));
 assert.throws(()=>validateSource(p,url.replace('5432','6543'),s));
 assert.throws(()=>validateSource(p,url.replace('sslmode=require','sslmode=disable'),s));
 assert.throws(()=>validateSource(p,url,'https://other.supabase.co/storage/v1/s3'));
});
test('clave peligrosa no determina ruta local e inventario detecta modificaciones',()=>{
 assert.match(objectFile('bucket','../../private'),/^objects\/[a-f0-9]{64}$/);
 assert.notEqual(objectFile('a','b/c'),objectFile('a/b','c'));
 const a={bucket:'a',key:'x',size:1,etag:'a',lastModified:'t'},b={...a,key:'y'};
 assert.equal(sameInventory([a,b],[b,a]),true);
 assert.equal(sameInventory([a],[{...a,etag:'b'}]),false);
});
test('manifiesto verifica todos los archivos y rechaza corrupción o rutas ajenas',async()=>{
 const root=await mkdtemp(join(tmpdir(),'evalia-test-'));
 try{
  await mkdir(join(root,'objects'));
  const buckets=['evalia-models','evalia-qr','evalia-receipts'],sql=[];
  for(const path of ['roles.sql','schema.sql','data.sql','history_schema.sql','history_data.sql']){
   await writeFile(join(root,path),'synthetic');
   sql.push({path,size:9,sha256:await hashFile(join(root,path))});
  }
  const bucket=buckets[0],key='models/test.png',path=objectFile(bucket,key);
  await writeFile(join(root,path),'abc');
  const m={format:1,project:'synthetic',createdAt:'2026-11-25T00:00:00Z',buckets,sql,objects:[{bucket,key,path,size:3,sha256:await hashFile(join(root,path))}]};
  const save=()=>writeFile(join(root,'manifest.json'),JSON.stringify(m));
  await save();
  assert.deepEqual(await verifyExtracted(root),{project:'synthetic',sql:5,objects:1});
  await writeFile(join(root,path),'bad');
  await assert.rejects(verifyExtracted(root),/Integridad/);
  m.objects[0].path='../outside';await save();
  await assert.rejects(verifyExtracted(root),/Ruta/);
 }finally{await rm(root,{recursive:true,force:true});}
});

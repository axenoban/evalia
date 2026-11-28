import {readFile,stat,lstat,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {objectFile,hashFile} from './backup.mjs';
const SQL=['roles.sql','schema.sql','data.sql','history_schema.sql','history_data.sql'];
export async function verifyExtracted(root){
 const m=JSON.parse(await readFile(join(root,'manifest.json'),'utf8'));
 if(m.format!==1||!Array.isArray(m.sql)||!Array.isArray(m.objects)||!Array.isArray(m.buckets)||!m.project||!Number.isFinite(Date.parse(m.createdAt)))throw Error('Manifiesto inválido');
 if(m.sql.length!==SQL.length||SQL.some(p=>!m.sql.some(s=>s.path===p)))throw Error('Faltan dumps obligatorios');
 for(const b of ['evalia-models','evalia-qr','evalia-receipts'])if(!m.buckets.includes(b))throw Error('Falta bucket obligatorio');
 const seen=new Set();
 for(const row of m.objects){
  if(!m.buckets.includes(row.bucket)||typeof row.key!=='string'||row.path!==objectFile(row.bucket,row.key))throw Error('Ruta de objeto inválida');
 }
 for(const row of [...m.sql,...m.objects]){
  if(seen.has(row.path)||!Number.isSafeInteger(row.size)||row.size<0||!(/^[a-f0-9]{64}$/.test(row.sha256)))throw Error('Manifiesto duplicado o inválido');
  seen.add(row.path);
  const p=join(root,row.path),info=await lstat(p);
  if(!info.isFile()||info.size!==row.size||await hashFile(p)!==row.sha256)throw Error('Integridad de respaldo incorrecta');
 }
 const actual=await readdir(join(root,'objects'));
 if(actual.length!==m.objects.length||actual.some(n=>!seen.has('objects/'+n)))throw Error('Inventario de objetos no coincide');
 return {project:m.project,sql:m.sql.length,objects:m.objects.length};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 verifyExtracted(resolve(process.argv[2]||'.')).then(r=>console.log('OK: integridad verificada; SQL='+r.sql+'; objetos='+r.objects)).catch(()=>{console.error('FALLO: respaldo no verificado');process.exitCode=1;});
}

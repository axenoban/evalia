// E1-01: ejecutor local, sin dependencias npm ni credenciales en Git.
import {spawnSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir, mkdtemp, readdir, readFile, rename, rm, stat, writeFile, realpath} from 'node:fs/promises';
import {resolve,join,relative,isAbsolute,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const DAY=86400000;
const PATTERN=/^evalia-\d{4}-\d{2}-\d{2}T\d{6}Z-[a-f0-9]{8}\.tar\.gz\.age$/;
export function backupName(date=new Date(),id=randomUUID()){
 return 'evalia-'+date.toISOString().replace(/:/g,'').replace(/\.\d{3}Z$/,'Z')+'-'+id.slice(0,8)+'.tar.gz.age';
}
export function expiredBackups(names,now=Date.now()){
 return names.filter(name=>{
  if(!PATTERN.test(name))return false;
  const ts=name.slice(7,24);
  const t=Date.parse(ts.slice(0,13)+':'+ts.slice(13,15)+':'+ts.slice(15,17)+'Z');
  return Number.isFinite(t)&&now-t>=30*DAY;
 });
}
export function objectFile(bucket,key){
 return 'objects/'+createHash('sha256').update(JSON.stringify([bucket,key])).digest('hex');
}
export function validateSource(project,db,endpoint){
 if(!/^[a-z0-9]{20}$/.test(project))throw Error('Referencia de proyecto inválida');
 const u=new URL(db),s=new URL(endpoint);
 const direct=u.hostname==='db.'+project+'.supabase.co'&&decodeURIComponent(u.username)==='postgres';
 const pool=u.hostname.endsWith('.pooler.supabase.com')&&decodeURIComponent(u.username)==='postgres.'+project;
 if(!['postgres:','postgresql:'].includes(u.protocol)||(!direct&&!pool)||u.port!=='5432'||u.pathname!=='/postgres'||!u.password||!['require','verify-ca','verify-full'].includes(u.searchParams.get('sslmode')))
  throw Error('Usa conexión directa o session pooler del proyecto esperado, puerto 5432 y TLS');
 if(s.protocol!=='https:'||![project+'.supabase.co',project+'.storage.supabase.co'].includes(s.hostname)||s.pathname!=='/storage/v1/s3'||s.search||s.hash||s.username||s.password||s.port)
  throw Error('Endpoint S3 no corresponde al proyecto esperado');
}
function inside(child,parent){
 const p=relative(parent,child);return p===''||(!p.startsWith('..'+sep)&&p!=='..'&&!isAbsolute(p));
}
export async function hashFile(path){
 const h=createHash('sha256');
 for await(const chunk of createReadStream(path))h.update(chunk);
 return h.digest('hex');
}
function run(program,args,label,{capture=false,env=process.env}={}){
 // Nunca imprimir argumentos, stdout ni stderr de herramientas con secretos.
 const r=spawnSync(program,args,{encoding:'utf8',env,windowsHide:true,maxBuffer:32*1024*1024,timeout:30*60*1000});
 if(r.error||r.status!==0)throw Error(label+' falló; revisar configuración local (salida omitida por seguridad)');
 return capture?r.stdout:undefined;
}
export function canonicalInventory(rows){
 return rows.map(({bucket,key,size,etag,lastModified})=>({bucket,key,size,etag,lastModified})).sort((a,b)=>JSON.stringify([a.bucket,a.key]).localeCompare(JSON.stringify([b.bucket,b.key]),'en'));
}
export function sameInventory(a,b){
 return JSON.stringify(canonicalInventory(a))===JSON.stringify(canonicalInventory(b));
}
async function main(){
 const {EVALIA_BACKUP_PROJECT:project,EVALIA_BACKUP_DB_URL:db,EVALIA_BACKUP_S3_ENDPOINT:endpoint,EVALIA_BACKUP_S3_REGION:region,EVALIA_BACKUP_S3_PROFILE:profile,EVALIA_BACKUP_RECIPIENT:recipient,EVALIA_BACKUP_DEST:destRaw,EVALIA_BACKUP_STAGE:stageRaw}=process.env;
 if(![project,db,endpoint,region,profile,recipient,destRaw,stageRaw].every(Boolean))throw Error('Configuración incompleta; consultar docs/60_RESPALDO_RECUPERACION.md');
 validateSource(project,db,endpoint);
 if(!/^age1[0-9a-z]+$/.test(recipient))throw Error('Se requiere destinatario público age');
 if(!isAbsolute(destRaw)||!isAbsolute(stageRaw))throw Error('Se requieren rutas absolutas');
 const repo=await realpath(fileURLToPath(new URL('../../',import.meta.url)));
 const dest=await realpath(destRaw),stage=await realpath(stageRaw);
 if(inside(dest,repo)||inside(stage,repo)||inside(stage,dest)||inside(dest,stage))throw Error('Destino y staging deben ser externos al repositorio y separados');
 const lock=join(dest,'.evalia-backup.lock');
 await mkdir(lock); // no ejecuciones concurrentes; no borrar bloqueo de otro proceso
 let work,partial;
 try{
  work=await mkdtemp(join(stage,'evalia-'));
  const payload=join(work,'payload');await mkdir(payload);await mkdir(join(payload,'objects'));
  const awsEnv={...process.env,AWS_PAGER:'',AWS_CLI_AUTO_PROMPT:'off'};
  delete awsEnv.EVALIA_BACKUP_DB_URL;
  // Evitar credenciales AWS ambiente que anulen el perfil exclusivo.
  for(const k of ['AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY','AWS_SESSION_TOKEN','AWS_SECURITY_TOKEN','AWS_DEFAULT_PROFILE','AWS_PROFILE'])delete awsEnv[k];
  const aws=(args,label)=>JSON.parse(run('aws',['--profile',profile,'--endpoint-url',endpoint,'--region',region,'--output','json',...args],label,{capture:true,env:awsEnv})||'{}');
  const list=()=>{
   const names=(aws(['s3api','list-buckets'],'Listar buckets').Buckets??[]).map(b=>b.Name).sort();
   for(const b of ['evalia-models','evalia-qr','evalia-receipts'])if(!names.includes(b))throw Error('Falta bucket esperado: '+b);
   const objects=[];
   for(const bucket of names){
    const r=aws(['s3api','list-objects-v2','--bucket',bucket],'Listar objetos');
    if(r.IsTruncated||r.NextToken)throw Error('Inventario S3 incompleto');
    for(const o of r.Contents??[]){
     if(typeof o.Key!=='string'||!Number.isSafeInteger(o.Size)||o.Size<0||!o.ETag)throw Error('Metadatos S3 incompletos');
     objects.push({bucket,key:o.Key,size:o.Size,etag:o.ETag,lastModified:o.LastModified});
    }
   }
   return {names,objects:canonicalInventory(objects)};
  };
  const before=list();
  const dump=(name,flags)=>run('supabase',['db','dump','--remote='+db,'-f',join(payload,name),...flags],'Dump '+name);
  dump('roles.sql',['--role-only']);
  dump('schema.sql',[]);
  dump('data.sql',['--data-only','--use-copy','-x','storage.buckets_vectors','-x','storage.vector_indexes']);
  dump('history_schema.sql',['--schema','supabase_migrations']);
  dump('history_data.sql',['--schema','supabase_migrations','--data-only','--use-copy']);
  const files=[];
  for(const o of before.objects){
   const path=objectFile(o.bucket,o.key),target=join(payload,path);
   const response=aws(['s3api','get-object','--bucket',o.bucket,'--key',o.key,'--if-match',o.etag,target],'Descargar objeto');
   if((await stat(target)).size!==o.size)throw Error('Tamaño de objeto no coincide');
   files.push({...o,path,sha256:await hashFile(target),contentType:response.ContentType??null,metadata:response.Metadata??{}});
  }
  const after=list();
  if(JSON.stringify(before.names)!==JSON.stringify(after.names)||!sameInventory(before.objects,after.objects))throw Error('Storage cambió durante el respaldo; repetir en periodo sin operaciones');
  const sql=[];
  for(const path of ['roles.sql','schema.sql','data.sql','history_schema.sql','history_data.sql']){
   const f=join(payload,path),size=(await stat(f)).size;
   if(size===0)throw Error('Dump vacío: '+path);
   sql.push({path,size,sha256:await hashFile(f)});
  }
  await writeFile(join(payload,'manifest.json'),JSON.stringify({format:1,project,createdAt:new Date().toISOString(),buckets:before.names,sql,objects:files},null,2),{mode:0o600});
  const archive=join(work,'payload.tar.gz');
  run('tar',['-czf',archive,'-C',payload,'.'],'Empaquetar respaldo');
  const final=join(dest,backupName());
  partial=final+'.partial';
  run('age',['-r',recipient,'-o',partial,archive],'Cifrar respaldo');
  if((await stat(partial)).size===0)throw Error('Respaldo cifrado vacío');
  // Publicación por rename en el mismo destino. Retener las copias anteriores si falla cualquier etapa.
  await rename(partial,final);partial=undefined;
  const expired=expiredBackups(await readdir(dest));
  for(const name of expired)if(join(dest,name)!==final)await rm(join(dest,name));
  console.log('OK: respaldo cifrado creado; objetos='+files.length+'; retención aplicada.');
 }finally{
  if(partial)await rm(partial,{force:true});
  if(work)await rm(work,{recursive:true,force:true});
  await rm(lock,{recursive:true,force:true});
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(e=>{console.error('EVALIA backup: '+(e instanceof TypeError?'Error de configuración o ejecución':String(e.message||'Error desconocido').replace(/postgres(?:ql)?:\/\/[^\s]+/gi,'[conexión omitida]')));process.exitCode=1;});
}

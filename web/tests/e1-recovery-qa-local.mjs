// E1: restore only the user's own QA backup in a new, disposable local Docker stack.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {mkdir,mkdtemp,readdir,readFile,writeFile,rm,stat} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createClient} from '@supabase/supabase-js';
import {verifyExtracted} from '../../ops/backup/verify.mjs';

const QA='uhxelvufyukvbqajroja';
const base=resolve(process.env.LOCALAPPDATA||'','EvaliaBackup','QA');
assert.ok(process.platform==='win32'&&process.env.LOCALAPPDATA,'Windows QA private workstation only');
assert.ok(!process.env.GITHUB_ACTIONS,'not for CI or cloud runners');
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>! /^(SUPABASE_|EVALIA_BACKUP_|AWS_|PG|DOCKER_HOST$|DOCKER_CONTEXT$)/i.test(k)));
function run(label,program,args,opts={}){
 try{return execFileSync(program,args,{env,encoding:'utf8',stdio:['pipe','pipe','pipe'],maxBuffer:64*1024*1024,windowsHide:true,timeout:30*60*1000,...opts});}
 catch(e){
  // SQLSTATE and line numbers only; never print dump rows, credentials, command line, or full stderr.
  const stderr=String(e.stderr||'');
  const code=stderr.match(/ERROR:\s+([0-9A-Z]{5})\b/)?.[1];
  const line=stderr.match(/psql:<stdin>:(\d+):\s*ERROR:/)?.[1];
  // Only allow safe SQL identifiers in the diagnostic, never raw stderr or COPY data.
  const missing=stderr.match(/ERROR:\s+42703:\s+column\s+"([A-Za-z_][A-Za-z0-9_]*)"(?:\s+of relation\s+"([A-Za-z_][A-Za-z0-9_]*)")?\s+does not exist/i);
  const diagnostic=[code&&'SQLSTATE '+code,line&&'línea '+line,missing&&'columna '+(missing[2]?missing[2]+'.':'')+missing[1]].filter(Boolean).join('; ');
  throw Error(label+' falló'+(diagnostic?' ('+diagnostic+')':'')+'.');
 }
}
// Query the native BitLocker provider using numeric status codes, independent of display language.
const bitlockerQuery=String.raw`$ErrorActionPreference = 'Stop'
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Administrator required' }
$v = @(Get-CimInstance -Namespace 'root/CIMV2/Security/MicrosoftVolumeEncryption' -ClassName Win32_EncryptableVolume -Filter "DriveLetter='C:'" -ErrorAction Stop)
if ($v.Count -ne 1) { throw 'Volume not found' }
$c = Invoke-CimMethod -InputObject $v[0] -MethodName GetConversionStatus -ErrorAction Stop
$p = Invoke-CimMethod -InputObject $v[0] -MethodName GetProtectionStatus -ErrorAction Stop
if ($c.ReturnValue -ne 0 -or $p.ReturnValue -ne 0) { throw 'BitLocker provider failure' }
[Console]::WriteLine(('{0}:{1}:{2}' -f $c.EncryptionPercentage,$c.ConversionStatus,$p.ProtectionStatus))
`;
const protection=run('Consultar BitLocker (requiere PowerShell como administrador)','powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(bitlockerQuery,'utf16le').toString('base64')]).trim();
assert.equal(protection,'100:1:1','BitLocker debe estar completamente cifrado y con protección activa (100:1:1)');
console.log('0/5 BitLocker verificado');
assert.match(base,/^C:\\/i,'staging debe estar en la unidad C: cifrada');
const dockerHost=run('Docker local','docker',['context','inspect','--format','{{.Endpoints.docker.Host}}']).trim();
assert.ok(dockerHost.startsWith('npipe://'),'Docker remoto no permitido');
const files=await readdir(join(base,'Copias'));
const candidates=await Promise.all(files.filter(n=>/^evalia-\d{4}-\d{2}-\d{2}T\d{6}Z-[a-f0-9]{8}\.tar\.gz\.age$/.test(n)).map(async n=>({name:n,mtime:(await stat(join(base,'Copias',n))).mtimeMs})));
candidates.sort((a,b)=>b.mtime-a.mtime);
assert.ok(candidates.length,'No hay respaldo QA');
const backup=join(base,'Copias',candidates[0].name);
const project='evalia-qa-restore-'+randomUUID().slice(0,8);
const work=await mkdtemp(join(base,'Temporal','restore-'));
const restored=join(work,'payload'),targetDir=join(work,'local');
let started=false,cleanupFailed=false;
const config='project_id = "'+project+'"\n[api]\nport = 55431\n[db]\nport = 55432\nshadow_port = 55430\nmajor_version = 17\n[studio]\nport = 55433\n[local_smtp]\nport = 55434\nsmtp_port = 55435\npop3_port = 55436\n[analytics]\nport = 55437\nvector_port = 55438\n[db.pooler]\nport = 55439\n[auth]\nenable_signup = false\nsite_url = "http://localhost:3000"\nminimum_password_length = 8\n[auth.mfa.totp]\nenroll_enabled = true\nverify_enabled = true\n';
const tables=['public.customers','public.models','public.orders','public.order_lines','public.payment_reports','public.deliveries','public.model_inventory','public.admin_profiles','auth.users','evalia_security.customer_create_requests','evalia_security.model_create_requests','storage.objects'];
const countTables=(input,names)=>{
 const found={};let table=null;
 for(const line of input.split(/\r?\n/)){
  if(table!==null){if(line==='\\.'){table=null;}else if(Object.hasOwn(found,table)){found[table]++;}continue;}
  const m=line.match(/^COPY\s+"?([a-z_][a-z_0-9]*)"?\."?([a-z_][a-z_0-9]*)"?\s*\(.*\)\s+FROM stdin;$/i);
  if(m){table=m[1]+'.'+m[2];if(names.includes(table)){assert.ok(!Object.hasOwn(found,table),'COPY duplicado');found[table]=0;}}
 }
 assert.equal(table,null,'COPY truncado');
 for(const name of names)assert.ok(Object.hasOwn(found,name),'No se encontró COPY de '+name);
 return found;
};
function psql(input,transaction=false,label='SQL local'){
 return run(label,'docker',['exec','-i','supabase_db_'+project,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-U','postgres','-d','postgres',...(transaction?['--single-transaction']:[]),'-f','-'],{input});
}
// Compare the backup's COPY headers with the freshly restored schema before writing any rows.
function checkCopyColumns(data){
 const declared=[];let inCopy=false;
 for(const line of data.split(/\r?\n/)){
  if(inCopy){if(line==='\\.')inCopy=false;continue;}
  const m=line.match(/^COPY\s+"?([a-z_][a-z_0-9]*)"?\."?([a-z_][a-z_0-9]*)"?\s*\((.*)\)\s+FROM stdin;$/i);
  if(!m)continue;
  inCopy=true;
  const cols=m[3].split(',').map(x=>x.trim().replace(/^"|"$/g,''));
  if(cols.every(x=>/^[a-z_][a-z_0-9]*$/i.test(x)))declared.push([m[1]+'.'+m[2],cols]);
 }
 const local=JSON.parse(psql("select coalesce(jsonb_object_agg(t,cols),'{}'::jsonb) from (select table_schema||'.'||table_name t,jsonb_agg(column_name) cols from information_schema.columns group by table_schema,table_name) q;",false,'Comparar columnas locales').trim());
 const absent=[];
 for(const [table,cols] of declared){
  if(!Object.hasOwn(local,table))absent.push(table+' (tabla ausente)');
  else for(const col of cols)if(!local[table].includes(col))absent.push(table+'.'+col);
 }
 if(absent.length)throw Error('Incompatibilidad de esquema local: '+absent.join(', '));
 console.log('Esquema compatible con las columnas del respaldo');
}
function check(r,label){if(r.error)throw Error(label+' falló ('+(r.error.code||r.error.status||'error')+')');return r.data;}
function client(url,key){return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:randomUUID()}});}
const policies=String.raw`set search_path=public,storage;
create policy evalia_model_photos_admin_delete on storage.objects for delete to authenticated using (bucket_id='evalia-models' and (select public.is_evalia_admin()) and not exists(select 1 from public.models m where m.is_active and m.image_path=storage.objects.name));
create policy evalia_model_photos_admin_insert on storage.objects for insert to authenticated with check (bucket_id='evalia-models' and (select public.is_evalia_admin()));
create policy evalia_model_photos_admin_select on storage.objects for select to authenticated using (bucket_id='evalia-models' and (select public.is_evalia_admin()));
create policy evalia_qr_admin_delete on storage.objects for delete to authenticated using (bucket_id='evalia-qr' and (select public.can_manage_evalia_accounts()) and not exists(select 1 from public.payment_qr q where q.image_path=storage.objects.name));
create policy evalia_qr_admin_read on storage.objects for select to authenticated using (bucket_id='evalia-qr' and (select public.is_evalia_admin()));
create policy evalia_qr_admin_upload on storage.objects for insert to authenticated with check (bucket_id='evalia-qr' and name ~ '^qr/[A-Za-z0-9_-]+[.](png|jpg|jpeg|webp)$' and (select public.can_manage_evalia_accounts()));
create policy evalia_receipt_admin_read on storage.objects for select to authenticated using (bucket_id='evalia-receipts' and (select public.is_evalia_admin()));
reset search_path;
`;
try{
 await mkdir(restored);await mkdir(join(targetDir,'supabase'),{recursive:true});
 await writeFile(join(targetDir,'supabase','config.toml'),config);
 const archive=join(work,'backup.tar.gz');
 run('Descifrado','age',['-d','-i',join(base,'Claves','identity.txt'),'-o',archive,backup]);
 const names=run('Listar archivo','tar',['-tzf',archive]).split(/\r?\n/).filter(Boolean);
 const allowed=/^(?:\.\/)?(?:\.?\/?|objects\/?|objects\/[a-f0-9]{64}|(?:roles|schema|data|history_schema|history_data)\.sql|manifest\.json)$/;
 assert.ok(names.every(n=>allowed.test(n)),'Ruta de archivo no permitida');
 const types=run('Comprobar tipos de archivo','tar',['-tvzf',archive]).split(/\r?\n/).filter(Boolean);
 assert.ok(types.length===names.length&&types.every(n=>/^[d-]/.test(n)),'Enlace o archivo especial no permitido');
 run('Extraer copia propia','tar',['-xzf',archive,'-C',restored]);
 const verified=await verifyExtracted(restored);
 assert.equal(verified.project,QA,'Solo respaldo QA autorizado');
 const manifest=JSON.parse(await readFile(join(restored,'manifest.json'),'utf8'));
 const parts=await Promise.all(['roles.sql','schema.sql','data.sql','history_schema.sql','history_data.sql'].map(n=>readFile(join(restored,n),'utf8')));
 const expected=countTables(parts[2],tables);
 const history=countTables(parts[4],['supabase_migrations.schema_migrations']);
 assert.equal(expected['storage.objects'],manifest.objects.length,'Inventario de Storage no coincide con SQL');
 assert.ok(expected['auth.users']>0&&expected['public.orders']>0&&manifest.objects.length>0,'Copia QA insuficiente para el ensayo');
 console.log('1/5 Archivo QA descifrado y verificado');
 started=true;
 run('Iniciar Supabase local temporal','supabase',['start'],{cwd:targetDir});
 const raw=run('Estado local','supabase',['status','-o','env'],{cwd:targetDir});
 const vars=Object.fromEntries(raw.split(/\r?\n/).flatMap(line=>{const m=line.match(/^([A-Z_]+)="?([^"\r\n]*)"?$/);return m?[[m[1],m[2]]]:[];}));
 const url=vars.API_URL||vars.SUPABASE_URL,anon=vars.ANON_KEY||vars.PUBLISHABLE_KEY,secret=vars.SERVICE_ROLE_KEY||vars.SECRET_KEY;
 const u=new URL(url),d=new URL(vars.DB_URL);
 assert.ok(['localhost','127.0.0.1'].includes(u.hostname)&&u.protocol==='http:'&&u.port==='55431');
 assert.ok(['localhost','127.0.0.1'].includes(d.hostname)&&d.port==='55432'&&d.pathname==='/postgres');
 assert.ok(anon&&secret);
 assert.equal(psql("select to_regclass('public.customers') is null;").trim(),'t','Destino no está vacío');
 console.log('2/5 Instancia nueva local verificada');
 // All writes are confined to a new disposable database; separate transactions isolate the failing phase.
 psql(parts[0]+'\n'+parts[1],true,'Restaurar roles y esquema');
 console.log('Roles y esquema recuperados');
 // Managed Auth in QA has two newer custom OAuth fields than the pinned local stack.
 // Use the actual source types/defaults, only for the unused provider table.
 // Never remove COPY columns or rows, nor modify the original archive or remote schemas.
 const oauthTable='auth.custom_oauth_providers';
 const oauthColumns=JSON.parse(psql("select coalesce(jsonb_agg(column_name),'[]'::jsonb) from information_schema.columns where table_schema='auth' and table_name='custom_oauth_providers';",false,'Verificar esquema OAuth local').trim());
 const oauthMissing=['client_auth_method','client_assertion_audience'].filter(c=>!oauthColumns.includes(c));
 if(oauthMissing.length){
  assert.equal(countTables(parts[2],[oauthTable])[oauthTable],0,'OAuth personalizado contiene datos; requiere versión Auth compatible, no adaptar automáticamente');
  assert.equal(psql("select count(*) from auth.custom_oauth_providers;",false,'Verificar tabla OAuth local vacía').trim(),'0');
  psql("alter table auth.custom_oauth_providers add column if not exists client_auth_method text not null default 'client_secret', add column if not exists client_assertion_audience text;",true,'Compatibilidad OAuth solo local');
  console.log('Compatibilidad OAuth local aplicada (tabla sin proveedores personalizados)');
 }
 checkCopyColumns(parts[2]);
 psql('SET session_replication_role=replica;\n'+parts[2]+'\nRESET session_replication_role;\n',true,'Restaurar datos');
 console.log('Datos SQL recuperados');
 psql(parts[3]+'\n'+parts[4]+'\n'+policies,true,'Restaurar historial y políticas');
 psql("select cron.alter_job(jobid,active:=false) from cron.job where active;");
 for(const [name,count] of Object.entries({...expected,...history}))assert.equal(Number(psql('select count(*) from '+name+';').trim()),count,'Conteo de '+name);
 assert.equal(psql("select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity;").trim(),'0','RLS en tablas públicas');
 assert.equal(psql("select count(*) from pg_policies where schemaname='storage' and policyname like 'evalia_%';").trim(),'7','Políticas Storage');
 console.log('3/5 SQL, historial y conteos recuperados');
 const service=client(url,secret);
 for(const o of manifest.objects){
  const bytes=await readFile(join(restored,o.path));
  check(await service.storage.from(o.bucket).upload(o.key,bytes,{contentType:o.contentType||'application/octet-stream',upsert:true}),'Restaurar objeto');
  const blob=check(await service.storage.from(o.bucket).download(o.key),'Descargar objeto restaurado');
  assert.equal(createHash('sha256').update(Buffer.from(await blob.arrayBuffer())).digest('hex'),o.sha256,'Hash del objeto restaurado');
 }
 console.log('4/5 Objetos físicos recuperados y hashes comprobados');
 const email='restore-'+randomUUID()+'@example.invalid',password=randomBytes(24).toString('hex')+'Aa!1';
 const id=check(await service.auth.admin.createUser({email,password,email_confirm:true}),'Crear operador local').user.id;
 assert.match(id,/^[a-f0-9-]{36}$/);
 psql("insert into public.admin_profiles(user_id,role) values('"+id+"','operator');");
 const db=client(url,anon);
 check(await db.auth.signInWithPassword({email,password}),'Login local');
 assert.equal(check(await db.rpc('is_evalia_admin'),'Acceso operador'),true);
 const orders=await db.from('orders').select('id',{head:true,count:'exact'});
 if(orders.error)throw Error('Lectura de pedidos restaurados falló');
 assert.equal(orders.count,expected['public.orders']);
 const denied=await client(url,anon).from('customers').select('id');
 assert.ok(denied.error||denied.data?.length===0,'Anon no debe leer clientes');
 await db.auth.signOut({scope:'local'});
 console.log('5/5 Auth local, operador y acceso anónimo comprobados');
 console.log('RECUPERACION QA: SQL='+tables.length+' tablas; objetos='+manifest.objects.length+'; historial='+history['supabase_migrations.schema_migrations']);
}finally{
 if(started){try{run('Eliminar stack temporal','supabase',['stop','--no-backup'],{cwd:targetDir});}catch{cleanupFailed=true;console.error('No se pudo eliminar la instancia temporal: '+project);}}
 if(!cleanupFailed)await rm(work,{recursive:true,force:true});
}
if(cleanupFailed)throw Error('Limpieza local pendiente');
console.log('RESTAURACION QA CORRECTA - entorno temporal eliminado');

// Modifica SOLO el checkout temporal de GitHub Actions, no el repositorio original.
import {rm,writeFile,mkdir} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
for(const name of ['app/p','app/pedido','app/api']){
 await rm(join(root,name),{recursive:true,force:true});
}
await writeFile(join(root,'next.config.mjs'),
 "export default {output:'export',basePath:'/evalia',trailingSlash:true,images:{unoptimized:true}};\n",'utf8');
await mkdir(join(root,'public'),{recursive:true});
await writeFile(join(root,'public','.nojekyll'),'','utf8');
console.log('Preparada exportación estática sin rutas privadas del servidor.');

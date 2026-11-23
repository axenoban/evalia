import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow=readFileSync(new URL('../.github/workflows/evalia-demo-pages.yml',import.meta.url),'utf8');

test('Pages no intenta crear el sitio con GITHUB_TOKEN',()=>{
  assert.doesNotMatch(workflow,/^\s*enablement:\s*true\s*$/m);
});
test('el deploy exige verify aprobado',()=>{
  assert.match(workflow,/\bdeploy:\s*\n\s*needs:\s*verify\b/);
});
test('Pages conserva permisos adecuados de despliegue',()=>{
  assert.match(workflow,/^\s*pages:\s*write\s*$/m);
  assert.match(workflow,/^\s*id-token:\s*write\s*$/m);
});
test('Pages despliega solo los ficheros estáticos de site',()=>{
  assert.match(workflow,/uses:\s*actions\/upload-pages-artifact@v3[\s\S]*?path:\s*\.\/site/);
});

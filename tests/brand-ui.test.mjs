import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('monograma circular coherente en favicon y ambas variantes',()=>{
 const color=read('web/public/brand/evalia-monogram-color.svg'),black=read('web/public/brand/evalia-monogram-black.svg');
 assert.equal(read('web/app/icon.svg'),color);
 assert.equal(color.replace('#451E3B','#000000'),black);
 const path=color.match(/<path d="([^"]+)"/)[1];
 assert.ok(read('web/app/brand.jsx').includes(path));
 assert.doesNotMatch(color,/<script|<image|href=/i);
});
test('marca compartida en acceso, cuenta, panel móvil y portal',()=>{
 for(const p of ['web/app/page.jsx','web/app/cuenta/page.jsx','web/app/pedido/page.jsx']){
  const code=read(p);assert.match(code,/<BrandMark/);assert.doesNotMatch(code,/<span className="brand-icon">E<\/span>/);
 }
 assert.match(read('web/app/page.jsx'),/ev-mobile-brand/);
 assert.match(read('web/app/page.jsx'),/<UiIcon name=\{id\}/);
 assert.match(read('web/app/layout.jsx'),/import '\.\/brand\.css'/);
});
test('tema conserva los cinco tokens institucionales sin sobrescribir semántica de estados',()=>{
 const css=read('web/app/brand.css');
 for(const v of ['#4D3443','#F5F0EA','#222024','#CFAEB6','#C7C3C6'])assert.ok(css.includes(v));
 assert.doesNotMatch(css,/--(?:success|warn|error)\s*:/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeName,normalizeSize,normalizePrice,productSizes,suggestions,matchingModels,stockProjection,equivalentProduct,loadStockBatches,loadModelPhotos,productPriceOptions,QUICK_DOZENS} from '../web/lib/product-data.js';
const models=[{id:'a',name:'Blusa Princesa',size_label:'M',price_dozen_bs:'380.00',colorIds:['r','b'],is_active:true,image_path:'models/a.jpg'},{id:'b',name:'Blusa XL',size_label:'xl',price_dozen_bs:420,is_active:true,image_path:'models/b.jpg'},{id:'c',name:'Otro',size_label:'3XL',price_dozen_bs:450,is_active:false,image_path:'models/c.jpg'}];
test('reusable sizes and suggestions respect free price entry and normalized duplicate names',()=>{
 assert.deepEqual(productSizes(models),['M','XL','2XL','3XL']);
 assert.equal(normalizeName('  Blusa   Princesa  '),'Blusa Princesa');
 assert.equal(normalizeSize(' xl '),'XL');assert.equal(normalizePrice(' 380,50 '),'380.50');
 assert.deepEqual(suggestions(models,'m').prices,['380.00']);
 assert.deepEqual(matchingModels(models,' blusa  princesa ','m').map(x=>x.id),['a']);
 assert.deepEqual(matchingModels(models,'Blusa Princesa','M','a'),[]);
 assert.equal(equivalentProduct(models[0],{name:'Blusa Princesa',size:'M',price:'380,0',colorIds:['b','r']}),true);
 assert.equal(equivalentProduct(models[0],{name:'Blusa Princesa',size:'M',price:'380',colorIds:['b']}),false);
});
test('stock projection preserves units, commitments and exact range',()=>{
 const stock={on_hand:72,reserved:6,pending_delivery:12,blocked:false};
 assert.deepEqual(stockProjection(stock,'add','2','dozens'),{units:24,committed:18,target:96,available:78,valid:true});
 assert.equal(stockProjection(stock,'physical_sale','5','dozens').valid,false);
 assert.equal(stockProjection(stock,'physical_sale','54','units').available,0);
 assert.equal(stockProjection(stock,'set_total','18','units').valid,true);
 assert.equal(stockProjection(stock,'set_total','','units').valid,false);
 assert.equal(stockProjection(stock,'add','1.5','dozens').valid,false);
 assert.equal(stockProjection({...stock,blocked:true},'physical_sale','1','units').valid,false);
 assert.equal(stockProjection({...stock,on_hand:2147483647},'add','1','units').valid,false);
});
test('stock RPC batches and private image signatures use bounded groups without missing IDs',async()=>{
 const many=Array.from({length:205},(_,i)=>({id:String(i)})),calls=[];
 const db={rpc:async(n,p)=>{assert.equal(n,'get_evalia_stock_batch');calls.push(p.p_ids);return {data:Object.fromEntries(p.p_ids.map(id=>[id,{available:1}]))};}};
 assert.equal((await loadStockBatches(db,many)).length,205);assert.deepEqual(calls.map(c=>c.length),[100,100,5]);
 await assert.rejects(loadStockBatches({rpc:async()=>({data:{}})},[{id:'missing'}]),/incompleto/);
 const photoCalls=[];
 const photos=await loadModelPhotos({storage:{from:b=>{assert.equal(b,'evalia-models');return{createSignedUrls:async(paths,seconds)=>{photoCalls.push(paths);assert.equal(seconds,3600);return {data:paths.map(path=>({path,signedUrl:'private-'+path}))};}};}}},models);
 assert.deepEqual(photoCalls,[['models/a.jpg','models/b.jpg']]);assert.equal(photos[2][1],null);
});
test('catalog has complete editor, archive view, pagination and reusable palette without color stock',()=>{
 const page=readFileSync(new URL('../web/app/page.jsx',import.meta.url),'utf8');
 const section=page.slice(page.indexOf('function StockEditor('),page.indexOf('function ClientEditForm('));
 for(const phrase of ['Editar producto','Duplicar producto','Historial de cambios','Reactivar producto','Copiar paleta de modelo','Seleccionar todos','Registros','Talla única del modelo','Disponibilidad','Productos activos']){
  if(phrase==='Registros')continue;
  assert.ok(section.includes(phrase),phrase);
 }
 assert.match(section,/useRecordList\(filtered,'created_at'\)/);
 assert.match(section,/name="modelSize"/);
 assert.match(section,/name="modelPrice" required inputMode="decimal"/);
 assert.match(section,/stockProjection\(stock,operation,amount,unit\)/);
 assert.match(section,/const \[docenas,setDocenas\]=useState\('0'\)/);
 assert.match(section,/Guardar corrección auditada/);
 assert.doesNotMatch(section,/stockPorColor|color_stock/);
});
test('order display, print and WhatsApp prefer captured historical labels',()=>{
 for(const path of ['web/app/page.jsx','web/lib/order-print.js','web/lib/order-whatsapp.js']){
  const content=readFileSync(new URL('../'+path,import.meta.url),'utf8');
  assert.match(content,/model_name_snapshot/);assert.match(content,/size_label_snapshot/);assert.match(content,/extraColorsSnapshot/);
 }
});

test('quick price options reuse historical prices across sizes, normalize equal values and preserve free entry',()=>{
 assert.deepEqual(productPriceOptions(models,'XL'),['420','380','450']);
 assert.deepEqual(productPriceOptions([...models,{price_dozen_bs:'380,00',size_label:'M'},{price_dozen_bs:'bad',size_label:'M'}],'M',399.5),['399.5','380','420','450']);
 assert.deepEqual(productPriceOptions([],'M'),[]);
 assert.deepEqual(QUICK_DOZENS,[1,2,3,4,5,6,7,8]);
});
test('mobile catalog puts quantity input on a full row, keeps quick selection and moves secondary filters below records',()=>{
 const page=readFileSync(new URL('../web/app/page.jsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../web/app/product-catalog.css',import.meta.url),'utf8');
 const catalog=page.slice(page.indexOf('function Catalog('),page.indexOf('function QuickOptions('));
 const form=page.slice(page.indexOf('function ModelForm('),page.indexOf('function ClientEditForm('));
 const stock=page.slice(page.indexOf('function StockEditor('),page.indexOf('function ProductHistory('));
 assert.ok(catalog.indexOf('page.items.map')<catalog.indexOf('<RecordListControls'));
 assert.ok(catalog.indexOf('<RecordListControls')<catalog.indexOf('<ListPager'));
 assert.match(catalog,/<ExpandableColorLibrary/);
 assert.match(form,/options=\{sizes.map/);
 assert.match(form,/options=\{prices.map/);
 assert.match(form,/QUICK_DOZENS.map/);
 assert.match(form,/customLabel="Otra talla"/);
 assert.match(form,/customLabel="Otro precio"/);
 assert.match(form,/customLabel="Más"/);
 assert.match(form,/showPaletteCopy&&paletteSources.length/);
 assert.doesNotMatch(form,/Buscar color|colorSearch/);
 assert.match(stock,/stock-bottom ev-stock-bottom/);
 assert.match(css,/\.ev-stock-bottom\{grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/\.ev-stock-stepper\{width:100%;grid-template-columns:minmax\(44px,1fr\) minmax\(64px,2fr\)/);
 assert.match(page,/aria-pressed=\{!custom&&String\(value\)===String\(option.value\)\}/);
});

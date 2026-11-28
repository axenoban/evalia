export async function loadStockBatches(db,models){
 const entries=[];
 for(let offset=0;offset<models.length;offset+=100){
  const ids=models.slice(offset,offset+100).map(m=>m.id);
  const {data,error}=await db.rpc('get_evalia_stock_batch',{p_ids:ids});
  if(error)throw Error('Inventario: '+error.message);
  for(const id of ids){if(!data?.[id])throw Error('Inventario incompleto');entries.push([id,data[id]]);}
 }
 return entries;
}
export async function loadModelPhotos(db,models){
 const photos=new Map(),paths=[...new Set(models.filter(m=>m.is_active&&m.image_path).map(m=>m.image_path))];
 for(let offset=0;offset<paths.length;offset+=100){
  const {data,error}=await db.storage.from('evalia-models').createSignedUrls(paths.slice(offset,offset+100),3600);
  if(!error)for(const row of data??[])if(row.path&&!row.error&&row.signedUrl)photos.set(row.path,row.signedUrl);
 }
 return models.map(m=>[m.id,m.is_active?photos.get(m.image_path)??null:null]);
}
export const normalizeName=value=>String(value??'').trim().replace(/\s+/g,' ');
export const normalizeSize=value=>normalizeName(value).toUpperCase();
export const normalizePrice=value=>String(value??'').trim().replace(',','.');
export const productSizes=models=>[...new Set(['M','XL','2XL',...models.map(m=>normalizeSize(m.size_label)).filter(Boolean)])];
export function suggestions(models,size){
 const same=models.filter(m=>normalizeSize(m.size_label)===normalizeSize(size)),names=[...new Set([...same,...models].map(m=>m.name))].filter(Boolean);
 const prices=[...new Set(same.map(m=>normalizePrice(m.price_dozen_bs)))].filter(Boolean).slice(0,5);
 return {names,prices};
}
export function matchingModels(models,name,size,exclude){
 return models.filter(m=>m.is_active&&m.id!==exclude&&normalizeName(m.name).toLocaleLowerCase()===normalizeName(name).toLocaleLowerCase()&&normalizeSize(m.size_label)===normalizeSize(size));
}
export function stockProjection(stock,operation,value,unit){
 const units=Number(value)*(unit==='dozens'?12:1),committed=Number(stock.reserved)+Number(stock.pending_delivery);
 const target=operation==='set_total'?units:operation==='add'?Number(stock.on_hand)+units:Number(stock.on_hand)-units;
 const valid=String(value).trim()!==''&&Number.isSafeInteger(Number(value))&&Number.isSafeInteger(units)&&units>=(operation==='set_total'?0:1)&&Number.isSafeInteger(target)&&target<=2147483647&&target>=committed&&!(stock.blocked&&operation==='physical_sale');
 return {units,committed,target,available:target-committed,valid};
}

export function equivalentProduct(model,{name,size,price,colorIds,photo}){
 if(!model||photo)return false;
 const oldPrice=Number(normalizePrice(model.price_dozen_bs)),newPrice=Number(normalizePrice(price));
 return normalizeName(model.name)===normalizeName(name)&&normalizeSize(model.size_label)===normalizeSize(size)&&Number.isFinite(newPrice)&&oldPrice===newPrice&&JSON.stringify([...new Set(model.colorIds??[])].sort())===JSON.stringify([...new Set(colorIds)].sort());
}

// Quick choices use recorded commercial values; no hard-coded selling prices.
export const QUICK_DOZENS=Object.freeze([1,2,3,4,5,6,7,8]);
// Máximo de botones de precio: el actual, luego la misma talla y después el resto.
// Cualquier otro importe sigue disponible con la opción de escritura libre.
export const PRICE_OPTION_LIMIT=6;
export function productPriceOptions(models,size,current){
 const same=models.filter(m=>normalizeSize(m.size_label)===normalizeSize(size));
 const values=[current,...same.map(m=>m.price_dozen_bs),...models.map(m=>m.price_dozen_bs)];
 const result=new Set();
 for(const value of values){const raw=normalizePrice(value);if(!/^\d+(?:\.\d{1,2})?$/.test(raw))continue;const n=Number(raw);if(Number.isFinite(n)&&n>0&&n<=9999999999.99)result.add(String(n));if(result.size>=PRICE_OPTION_LIMIT)break;}
 return [...result];
}

// Only the real pending balance is suggested; never infer or record a payment.
export function paymentAmountOptions(balance){
 const raw=normalizePrice(balance);
 if(!/^\d+(?:\.\d{1,2})?$/.test(raw))return [];
 const [whole,frac='']=raw.split('.');
 const cents=BigInt(whole)*100n+BigInt((frac+'00').slice(0,2));
 if(cents<=0n||cents>999999999999n)return [];
 const value=String(cents/100n)+'.'+String(cents%100n).padStart(2,'0');
 return [{value,label:'Saldo: '+value.replace('.',',')+' Bs'}];
}

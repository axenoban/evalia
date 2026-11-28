// E3: periodos de estadísticas en días de Bolivia y exportación CSV segura para Excel.
// Las cifras las calcula el servidor (get_evalia_owner_stats); aquí solo se arman rangos y archivos.
import {boliviaDay,validDay} from './record-date-filters.js';
import {dateBounds} from './order-page.js';

export const STATS_PRESETS=Object.freeze([['today','Hoy'],['week','Últimos 7 días'],['month','Este mes'],['year','Este año'],['custom','Rango']]);
export const MAX_STATS_DAYS=1830;
const shift=(day,n)=>{const d=new Date(day+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};

export function statsRange(preset='month',from='',to='',now=new Date()){
 const today=boliviaDay(now);
 let range;
 if(preset==='today')range={from:today,to:today};
 else if(preset==='week')range={from:shift(today,-6),to:today};
 else if(preset==='month')range={from:today.slice(0,7)+'-01',to:today};
 else if(preset==='year')range={from:today.slice(0,4)+'-01-01',to:today};
 else if(preset==='custom')range={from,to};
 else return {from:'',to:'',valid:false,error:'Periodo no reconocido.'};
 if(!validDay(range.from)||!validDay(range.to))return {...range,valid:false,error:'Elige la fecha inicial y la final.'};
 if(range.from>range.to)return {...range,valid:false,error:'La fecha inicial no puede ser posterior a la final.'};
 const days=(Date.parse(range.to)-Date.parse(range.from))/86400000+1;
 if(days>MAX_STATS_DAYS)return {...range,valid:false,error:'El periodo máximo es de 5 años.'};
 const {lower,upper}=dateBounds({from:range.from,to:range.to,valid:true});
 return {...range,valid:true,lower,upper,days};
}

const COLUMNS=[['reference','Pedido'],['confirmed_at','Confirmado (Bolivia)'],['status','Estado'],['customer','Cliente'],['whatsapp','WhatsApp'],
 ['fulfillment','Entrega'],['destination','Destino'],['model','Modelo'],['size','Talla'],['dozens','Docenas'],['extra_units','Unidades adicionales'],
 ['units','Prendas'],['price_dozen_bs','Precio docena (Bs)'],['subtotal_bs','Subtotal (Bs)']];
const STATUS={active:'Activo',completed:'Completado'};
const FULFILLMENT={pickup:'Retiro',shipping:'Envío',legacy:'Sin clasificar'};
const stamp=new Intl.DateTimeFormat('en-CA',{timeZone:'America/La_Paz',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
export function boliviaStamp(value){
 const d=new Date(value);if(!Number.isFinite(d.getTime()))return '';
 const p=Object.fromEntries(stamp.formatToParts(d).map(x=>[x.type,x.value]));
 return p.year+'-'+p.month+'-'+p.day+' '+(p.hour==='24'?'00':p.hour)+':'+p.minute;
}
// Evita inyección de fórmulas al abrir en Excel: texto que empieza con = + - @ o control se antepone con '.
function safeText(value){
 const text=String(value??'');
 return /^[=+\-@\t\r]/.test(text)?"'"+text:text;
}
function cell(value){
 const text=String(value);
 return /[;"\n\r]/.test(text)?'"'+text.replace(/"/g,'""')+'"':text;
}
const decimal=value=>{const n=Number(value);return Number.isFinite(n)?n.toFixed(2).replace('.',','):'';};
export function ordersCsv(rows){
 const lines=[COLUMNS.map(([,label])=>label).join(';')];
 for(const r of rows){
  const values={...r,confirmed_at:boliviaStamp(r.confirmed_at),status:STATUS[r.status]??r.status,fulfillment:FULFILLMENT[r.fulfillment]??r.fulfillment,
   price_dozen_bs:decimal(r.price_dozen_bs),subtotal_bs:decimal(r.subtotal_bs)};
  lines.push(COLUMNS.map(([key])=>{
   const v=values[key];
   return cell(typeof v==='number'||key==='price_dozen_bs'||key==='subtotal_bs'||key==='confirmed_at'?String(v??''):safeText(v));
  }).join(';'));
 }
 // BOM para que Excel reconozca UTF-8 (tildes y ñ); separador ; y coma decimal (configuración regional de Bolivia).
 return '﻿'+lines.join('\r\n')+'\r\n';
}
export const csvFileName=range=>'evalia-pedidos_'+range.from+'_'+range.to+'.csv';
export function barScale(values){const max=Math.max(0,...values.map(v=>Number(v)||0));return v=>max>0?Math.max(0,(Number(v)||0)/max):0;}

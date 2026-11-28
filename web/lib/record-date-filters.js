// Calendar-day filters are based on Bolivia, never on the browser time zone.
export const PAGE_SIZES=Object.freeze([10,25,50,100]);
const dateFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:'America/La_Paz',year:'numeric',month:'2-digit',day:'2-digit'});
export function boliviaDay(value){
 if(value===null||value===undefined||value==='')return '';
 const date=new Date(value);
 if(!Number.isFinite(date.getTime()))return '';
 const parts=Object.fromEntries(dateFormatter.formatToParts(date).map(p=>[p.type,p.value]));
 return parts.year.padStart(4,'0')+'-'+parts.month+'-'+parts.day;
}
export function validDay(day){
 if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day))return false;
 const parsed=new Date(day+'T00:00:00Z');
 return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===day;
}
function shiftDay(day,amount){
 const date=new Date(day+'T00:00:00Z');date.setUTCDate(date.getUTCDate()+amount);
 return date.toISOString().slice(0,10);
}
export function dateRange(preset='all',from='',to='',now=new Date()){
 const today=boliviaDay(now);
 if(preset==='all')return {from:'',to:'',valid:true};
 if(!today)return {from:'',to:'',valid:false};
 if(preset==='today')return {from:today,to:today,valid:true};
 if(preset==='week')return {from:shiftDay(today,-6),to:today,valid:true};
 if(preset==='month')return {from:today.slice(0,7)+'-01',to:today,valid:true};
 if(preset==='custom')return {from,to,valid:(!from||validDay(from))&&(!to||validDay(to))&&(!from||!to||from<=to)};
 return {from:'',to:'',valid:false};
}
export function matchesDate(value,range){
 if(!range.valid)return false;
 if(!range.from&&!range.to)return true;
 const day=boliviaDay(value);
 return Boolean(day&&(!range.from||day>=range.from)&&(!range.to||day<=range.to));
}

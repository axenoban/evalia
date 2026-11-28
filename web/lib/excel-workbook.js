import {strToU8,zipSync} from 'fflate';
import {boliviaStamp} from './owner-stats.js';

const NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG='http://schemas.openxmlformats.org/package/2006/relationships';
const title=1, header=2, money=3, date=4, integer=5;
function escape(value){
  return String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}
function row(n,values,formats=[]){
  const cells=values.map((v,i)=>{
    const ref=String.fromCharCode(65+i)+n, style=formats[i]||0;
    if(typeof v==='number' && Number.isFinite(v))return '<c r="'+ref+'" s="'+style+'"><v>'+v+'</v></c>';
    return '<c r="'+ref+'" s="'+style+'" t="inlineStr"><is><t xml:space="preserve">'+escape(v)+'</t></is></c>';
  });
  return '<row r="'+n+'"'+(formats[0]===title?' ht="32" customHeight="1"':'')+'>'+cells.join('')+'</row>';
}
function sheet(name,period,labels,widths,rows,formats,filter=true){
  const last=String.fromCharCode(64+labels.length);
  const cols=widths.map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join('');
  return '<worksheet xmlns="'+NS+'"><sheetViews><sheetView workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>'+cols+'</cols><sheetData>'+
    row(1,[name],[title])+row(2,[period])+row(4,labels,labels.map(()=>header))+rows.map((r,i)=>row(i+5,r,typeof formats==='function'?formats(i):formats)).join('')+
    '</sheetData>'+(filter&&rows.length?'<autoFilter ref="A4:'+last+(4+rows.length)+'"/>':'')+
    '<mergeCells count="2"><mergeCell ref="A1:'+last+'1"/><mergeCell ref="A2:'+last+'2"/></mergeCells></worksheet>';
}
const styles='<styleSheet xmlns="'+NS+'"><numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;Bs&quot; #,##0.00"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy hh:mm"/></numFmts>'+
 '<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><color rgb="FF4D3443"/><name val="Calibri"/></font></fonts>'+
 '<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF4D3443"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF0E3E9"/><bgColor indexed="64"/></patternFill></fill></fills>'+
 '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6">'+
 [[0,0,0],[0,1,2],[0,2,3],[164,0,0],[165,0,0],[3,0,0]].map(([fmt,font,fill])=>'<xf numFmtId="'+fmt+'" fontId="'+font+'" fillId="'+fill+'" borderId="0" xfId="0" applyFont="1" applyFill="1" applyNumberFormat="1"/>').join('')+
 '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
function relationships(targets){
  return '<Relationships xmlns="'+PKG+'">'+targets.map(([type,path],i)=>'<Relationship Id="rId'+(i+1)+'" Type="'+REL+'/'+type+'" Target="'+path+'"/>').join('')+'</Relationships>';
}
export function excelWorkbook({stats,rows},range){
  const sum=rows.reduce((s,r)=>s+Math.round(Number(r.subtotal_bs)*100),0);
  const units=rows.reduce((s,r)=>s+Number(r.units),0);
  if(sum!==Math.round(Number(stats.orders.amount)*100)||units!==Number(stats.orders.units))throw Error('El detalle y el resumen no coinciden. Vuelve a exportar.');
  const period=range.from+' al '+range.to+' · Hora de Bolivia';
  const summary=[
    ['Pedidos confirmados',Number(stats.orders.count),'Por fecha de confirmación. Excluye anulados.'],
    ['Prendas pedidas',units,'Docenas y unidades adicionales.'],
    ['Monto de pedidos',sum/100,'Valor histórico de las líneas de pedido.'],
    ['Cobros aprobados',Number(stats.payments.amount),'Por fecha de aprobación del pago.'],
    ['Saldo por cobrar hoy',Number(stats.pending.amount),'Saldo actual de todos los pedidos activos pendientes.'],
    ['Compradores',Number(stats.orders.buyers),'Clientes distintos con pedidos en el periodo.'],
    ['Ventas físicas (prendas)',Number(stats.physical?.units??0),'Prendas registradas como vendidas al contar el stock o en «Venta física».'],
    ['Ventas físicas estimadas',Number(stats.physical?.amount??0),'Valor a precio lista del momento. Referencia, no cobro verificado.'],
    ['Alcance','','Pedidos del sistema y ventas físicas registradas en stock. Ganancias quedan fuera.']
  ];
  const details=rows.map(r=>[r.reference,Date.parse(boliviaStamp(r.confirmed_at).replace(' ','T')+':00Z')/86400000+25569,
    r.customer,r.whatsapp,r.status==='completed'?'Completado':'Activo',({pickup:'Retiro',shipping:'Envío'})[r.fulfillment]||'Sin clasificar',
    r.destination,r.model,r.size,Number(r.dozens),Number(r.extra_units),Number(r.units),Number(r.price_dozen_bs),Number(r.subtotal_bs)]);
  const names=['Resumen','Modelos','Detalle'];
  const sheets=[
    sheet('EVALIA · Informe comercial',period,['Indicador','Valor','Cómo leerlo'],[30,23,82],summary,i=>[0,[2,3,4,7].includes(i)?money:integer,0],false),
    sheet('Modelos más pedidos',period+' · Hasta 10 modelos por cantidad de prendas',['Modelo','Talla','Prendas','Monto pedido'],[42,18,18,25],stats.models.map(m=>[m.name,m.size,Number(m.units),Number(m.amount)]),[0,0,integer,money]),
    sheet('Detalle de pedidos',period+' · Una fila por modelo dentro del pedido',['Pedido','Confirmado (Bolivia)','Cliente','WhatsApp','Estado','Entrega','Destino','Modelo','Talla','Docenas','Sueltas','Prendas','Precio por docena','Subtotal'],[16,24,32,20,16,16,32,34,12,12,12,12,23,23],details,[0,date,0,0,0,0,0,0,0,integer,integer,integer,money,money])
  ];
  const paths=sheets.map((_,i)=>'worksheets/sheet'+(i+1)+'.xml');
  const files={};
  function add(path,xml){files[path]=strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+xml);}
  const types=[['workbook.xml','sheet.main'],['styles.xml','styles'],...paths.map(p=>[p,'worksheet'])];
  add('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'+types.map(([p,t])=>'<Override PartName="/xl/'+p+'" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.'+t+'+xml"/>').join('')+'</Types>');
  add('_rels/.rels',relationships([['officeDocument','xl/workbook.xml']]));
  add('xl/workbook.xml','<workbook xmlns="'+NS+'" xmlns:r="'+REL+'"><bookViews><workbookView/></bookViews><sheets>'+names.map((n,i)=>'<sheet name="'+n+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets></workbook>');
  add('xl/_rels/workbook.xml.rels',relationships([...paths.map(p=>['worksheet',p]),['styles','styles.xml']]));
  add('xl/styles.xml',styles);
  sheets.forEach((xml,i)=>add('xl/'+paths[i],xml));
  return zipSync(files,{level:1});
}

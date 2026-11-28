import assert from 'node:assert/strict';
import {unzipSync,strFromU8} from 'fflate';
import {excelWorkbook} from '../lib/excel-workbook.js';
const range={from:'2026-11-01',to:'2026-11-28'};
for(const count of [0,20000]){
  const rows=Array.from({length:count},(_,i)=>({reference:'P'+i,confirmed_at:'2026-11-28T12:34:00Z',customer:'=texto & prueba',model:'Blusa',price_dozen_bs:360,units:12,dozens:1,extra_units:0,subtotal_bs:360}));
  const stats={orders:{count,amount:360*count,units:12*count,buyers:count?1:0},payments:{amount:0},pending:{amount:0},models:[]};
  const files=unzipSync(excelWorkbook({stats,rows},range));
  const detail=strFromU8(files['xl/worksheets/sheet3.xml']);
  assert.equal((detail.match(/<row /g)||[]).length,count+3);
  if(count){
    assert.ok(detail.includes('P19999')&&detail.includes('=texto &amp; prueba'));
    assert.ok(detail.includes('ref="A4:N20004"'));
    assert.doesNotMatch(detail,/<f>/);
  }
  assert.throws(()=>excelWorkbook({stats:{...stats,orders:{...stats.orders,amount:-1}},rows},range),/no coinciden/);
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {boliviaDay,dateRange,matchesDate,validDay,PAGE_SIZES} from '../web/lib/record-date-filters.js';
import {pageOf} from '../web/lib/workspace-pagination.js';
const now=new Date('2026-11-27T03:59:59.999Z');
test('day boundary uses Bolivia midnight, not UTC or browser timezone',()=>{
 assert.equal(boliviaDay(now),'2026-11-26');
 assert.equal(boliviaDay('2026-11-27T04:00:00Z'),'2026-11-27');
 assert.equal(boliviaDay(null),'');assert.equal(boliviaDay('invalid'),'');
 assert.equal(matchesDate('2026-11-27T03:59:59.999Z',dateRange('today','','',now)),true);
 assert.equal(matchesDate('2026-11-27T04:00:00Z',dateRange('today','','',now)),false);
});
test('quick periods are inclusive calendar days in Bolivia and cross month boundaries',()=>{
 const start=new Date('2026-03-02T05:00:00Z');
 assert.deepEqual(dateRange('week','','',start),{from:'2026-02-24',to:'2026-03-02',valid:true});
 assert.deepEqual(dateRange('month','','',start),{from:'2026-03-01',to:'2026-03-02',valid:true});
 assert.deepEqual(dateRange('all','','',now),{from:'',to:'',valid:true});
});
test('custom ranges allow one-sided or same-day ranges but reject reversed and invalid dates',()=>{
 assert.equal(validDay('2024-02-29'),true);assert.equal(validDay('2026-02-29'),false);
 assert.equal(validDay('2026-13-01'),false);assert.equal(validDay('2026-11-1'),false);
 const range=dateRange('custom','2026-11-25','2026-11-25',now);
 assert.equal(matchesDate('2026-11-25T04:00:00Z',range),true);
 assert.equal(matchesDate('2026-11-26T03:59:59.999Z',range),true);
 assert.equal(matchesDate('2026-11-26T04:00:00Z',range),false);
 assert.equal(matchesDate(null,range),false);
 assert.equal(matchesDate(null,dateRange('all')),true);
 assert.equal(matchesDate('2026-11-25T04:00:00Z',dateRange('custom','2026-11-25','')),true);
 assert.equal(matchesDate('2026-11-26T04:00:00Z',dateRange('custom','','2026-11-25')),false);
 for(const [from,to] of [['2026-11-26','2026-11-25'],['2026-02-30','']]){
  const invalid=dateRange('custom',from,to,now);
  assert.equal(invalid.valid,false);assert.equal(matchesDate('2026-11-25T04:00:00Z',invalid),false);
 }
});
test('date filtering precedes pagination, with selectable 10/25/50/100 and no lost matches',()=>{
 const rows=Array.from({length:205},(_,id)=>({id,created_at:id%2?'2026-11-25T05:00:00Z':'2026-11-24T05:00:00Z'}));
 const filtered=rows.filter(r=>matchesDate(r.created_at,dateRange('custom','2026-11-25','2026-11-25')));
 assert.equal(filtered.length,102);
 assert.deepEqual(PAGE_SIZES,[10,25,50,100]);
 for(const size of PAGE_SIZES){
  const first=pageOf(filtered,1,size),all=[];
  for(let i=1;i<=first.pages;i++)all.push(...pageOf(filtered,i,size).items);
  assert.deepEqual(all,filtered);
  assert.equal(pageOf(filtered,999,size).page,first.pages);
 }
});
test('all four lists wire shared date filters and numbered paginator without changing historical data',()=>{
 const page=readFileSync(new URL('../web/app/page.jsx',import.meta.url),'utf8');
 const controls=readFileSync(new URL('../web/app/record-list-controls.jsx',import.meta.url),'utf8');
 const pkg=JSON.parse(readFileSync(new URL('../web/package.json',import.meta.url),'utf8'));
 const lock=JSON.parse(readFileSync(new URL('../web/package-lock.json',import.meta.url),'utf8'));
 assert.match(page,/useRecordList\(clients,'created_at'\)/);
 assert.match(page,/useServerOrderList\(workspace,showArchived,focusOrder\)/);
 const orderApi=readFileSync(new URL('../web/lib/order-page.js',import.meta.url),'utf8');
 assert.match(orderApi,/archived\?'archived_at':'confirmed_at'/);
 assert.match(orderApi,/\.range\(\(page-1\)\*size,page\*size-1\)/);
 assert.match(page,/useRecordList\(payments,'created_at'\)/);
 assert.match(page,/useRecordList\(filtered,'created_at'\)/);
 assert.equal((page.match(/<RecordListControls list=\{list\}/g)||[]).length,4);
 assert.equal((page.match(/<ListPager view=\{(?:view|page)\}/g)||[]).length,4);
 assert.match(controls,/import ReactPaginate from 'react-paginate'/);
 assert.match(controls,/forcePage=\{view.page-1\}/);
 assert.match(controls,/pageOf\(filtered,page,size\)/);
 assert.match(controls,/PAGE_SIZES.includes\(value\)/);
 assert.equal(pkg.dependencies['react-paginate'],'8.3.0');
 assert.equal(lock.packages['node_modules/react-paginate'].version,'8.3.0');
});

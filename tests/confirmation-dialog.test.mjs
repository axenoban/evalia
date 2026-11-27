import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createConfirmationGate} from '../web/lib/confirmation-gate.js';
test('one pending confirmation; cancel and duplicate requests fail closed',async()=>{
 const states=[],gate=createConfirmationGate(v=>states.push(v)),config={title:'Edit'};
 const first=gate.request(config);
 assert.equal(await gate.request({title:'Duplicate'}),null);
 assert.equal(gate.cancel(),true);
 assert.equal(await first,null);
 assert.equal(gate.confirm(),false);
 assert.deepEqual(states,[config,null]);
});
test('required archive reason validates length and whitespace; confirm resolves once',async()=>{
 const gate=createConfirmationGate(()=>{}),pending=gate.request({reasonRequired:true});
 assert.equal(gate.confirm('  '),false);
 assert.equal(gate.confirm('x'.repeat(301)),false);
 assert.equal(gate.confirm('  Error de registro  '),true);
 assert.deepEqual(await pending,{confirmed:true,reason:'Error de registro'});
 assert.equal(gate.confirm('again'),false);
});
test('normal confirmation resolves explicitly and can be reused after cancellation',async()=>{
 const gate=createConfirmationGate(()=>{});
 let p=gate.request({title:'One'});gate.cancel();assert.equal(await p,null);
 p=gate.request({title:'Two'});assert.equal(gate.confirm(),true);assert.deepEqual(await p,{confirmed:true,reason:''});
});
test('all existing native operational prompts use severity-aware confirmation; security controls retained',()=>{
 const page=readFileSync(new URL('../web/app/page.jsx',import.meta.url),'utf8');
 const dialog=readFileSync(new URL('../web/app/confirmation-dialog.jsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../web/app/confirmation-dialog.css',import.meta.url),'utf8');
 assert.doesNotMatch(page,/\bwindow\.(?:confirm|alert|prompt)\(/);
 assert.equal((page.match(/await ask\(/g)||[]).length,6);
 assert.match(page,/severity:'critical',title:'Inhabilitar producto'/);
 assert.match(page,/severity:'warning',title:'Posible producto duplicado'/);
 assert.match(page,/severity:'normal',title:'Confirmar compra'/);
 assert.match(page,/severity:'critical',title:action==='pay'/);
 assert.match(page,/severity:'warning',title:'Guardar cambios del pedido'/);
 assert.match(page,/reasonRequired:true/);
 assert.match(page,/if\(decision\?\.confirmed&&decision.reason\)await onArchiveOrder/);
 assert.match(page,/const clearAccess=useCallback\(\(\)=>\{\s*cancelConfirmation\(\)/);
 assert.match(page,/const refresh=useCallback\(async\(\)=>\{\s*cancelConfirmation\(\)/);
 assert.match(page,/cancelConfirmation\(\);setData\(snapshot\)/);
 assert.match(dialog,/node.showModal\(\);cancelButton.current\?\.focus\(\)/);
 assert.match(dialog,/onCancel=\{e=>\{e.preventDefault\(\);onCancel\(\);\}\}/);
 assert.match(dialog,/previous\?\.isConnected/);
 assert.match(dialog,/role=\{severity==='critical'\?'alertdialog':'dialog'\}/);
 assert.match(dialog,/disabled=\{!valid\}/);
 assert.match(css,/\.ev-confirm-warning/);assert.match(css,/\.ev-confirm-critical/);assert.match(css,/::backdrop/);
});

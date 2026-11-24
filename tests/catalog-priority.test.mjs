import test from 'node:test';
import assert from 'node:assert/strict';
import {prioritizeModels} from '../web/lib/dashboard-presentation.js';
test('prioriza recientes y excluye inactivos sin retirar modelos antiguos',()=>{const now=Date.parse('2026-11-23T20:00:00Z');const models=[{id:1,is_active:true,created_at:'2026-11-20T00:00:00Z'},{id:2,is_active:false,created_at:'2026-11-23T18:00:00Z'},{id:3,is_active:true,created_at:'2026-11-21T20:00:00Z'},{id:4,is_active:true,created_at:'2026-11-23T19:00:00Z'}];assert.deepEqual(prioritizeModels(models,now).map(m=>m.id),[4,3,1]);assert.equal(models[0].id,1);});

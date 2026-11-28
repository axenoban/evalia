import test from 'node:test';
import assert from 'node:assert/strict';
import {orderLimits} from '../web/lib/client-limits.js';
test('only purchasable dozens and distinct extras are selectable',()=>{
  for(const capacity of [0,5,6,11,12,13,23,24,72,120]){
    const model={available:true,orderCapacity:capacity,colors:Array(13)};
    for(let extras=0;extras<=Math.min(11,capacity);extras++){
      const {maxDozens}=orderLimits(model,0,extras);
      assert.ok(12*maxDozens+extras<=capacity);
      assert.ok(12*(maxDozens+1)+extras>capacity);
      const {maxExtras}=orderLimits(model,maxDozens,extras);
      assert.ok(maxExtras<=11 && maxDozens*12+maxExtras<=capacity);
    }
  }
  assert.equal(orderLimits({available:false,orderCapacity:42},0,0).maxDozens,0);
});

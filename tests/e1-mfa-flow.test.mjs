import test from 'node:test';
import assert from 'node:assert/strict';
import {mfaNextStep,normalizeTotp} from '../web/lib/mfa-flow.js';

const owner={active:true,role:'owner'},operator={active:true,role:'operator'};
const aal1={currentLevel:'aal1',nextLevel:'aal1'},challenge={currentLevel:'aal1',nextLevel:'aal2'},aal2={currentLevel:'aal2',nextLevel:'aal2'};
const totp=[{id:'factor-id',factor_type:'totp',status:'verified'}];
test('E1 MFA: propietario sin factor debe enrolar incluso si el token anterior era aal2',()=>{
 assert.equal(mfaNextStep(owner,aal1,[]),'enroll');
 assert.equal(mfaNextStep(owner,{currentLevel:'aal2',nextLevel:'aal1'},[]),'enroll');
});
test('E1 MFA: operador sin factor puede pasar a verificación del servidor',()=>{
 assert.equal(mfaNextStep(operator,aal1,[]),'check-server');
});
test('E1 MFA: ambos roles con TOTP verificado necesitan desafío si aal1',()=>{
 for(const role of [owner,operator])assert.equal(mfaNextStep(role,challenge,totp),'challenge');
});
test('E1 MFA: aal2 no autoriza por sí mismo; requiere comprobación servidor',()=>{
 for(const role of [owner,operator])assert.equal(mfaNextStep(role,aal2,totp),'check-server');
});
test('E1 MFA: factor no verificado no cuenta',()=>{
 assert.equal(mfaNextStep(owner,aal1,[{id:'x',factor_type:'totp',status:'unverified'}]),'enroll');
});
test('E1 MFA: suspensiones y roles desconocidos se deniegan',()=>{
 for(const p of [null,{active:false,role:'owner'},{active:true,role:'customer'}])assert.equal(mfaNextStep(p,aal2,totp),'denied');
});
test('E1 MFA: errores y discrepancias no abren el panel',()=>{
 assert.equal(mfaNextStep(owner,null,totp),'unavailable');
 assert.equal(mfaNextStep(owner,challenge,[]),'unavailable');
 assert.equal(mfaNextStep(operator,{currentLevel:'aal2',nextLevel:'aal1'},[]),'unavailable');
 assert.equal(mfaNextStep(operator,challenge,[{id:'phone',factor_type:'phone',status:'verified'}]),'unsupported-factor');
});
test('E1 MFA: código TOTP conserva ceros, rechaza formato inválido',()=>{
 assert.equal(normalizeTotp(' 012345 '),'012345');
 for(const v of [123456,'12345','1234567','12 345','１２３４５６',null])assert.equal(normalizeTotp(v),null);
});

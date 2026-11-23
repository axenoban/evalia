import test from 'node:test';
import assert from 'node:assert/strict';
import {orderCookieOptions} from '../web/lib/portal-cookie.js';

test('El enlace abierto desde WhatsApp conserva sesión con SameSite Lax',()=>{
 const options=orderCookieOptions(true);
 assert.equal(options.sameSite,'lax');
 assert.equal(options.httpOnly,true);
 assert.equal(options.secure,true);
 assert.equal(options.path,'/');
});
test('En desarrollo local mantiene configuración compatible con http local',()=>{
 const options=orderCookieOptions(false);
 assert.equal(options.sameSite,'lax');
 assert.equal(options.httpOnly,true);
 assert.equal(options.secure,false);
});

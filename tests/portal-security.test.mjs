import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectMime,validPaymentAmount,validRequestId} from '../web/lib/portal-media.js';
import {tokenDigest} from '../web/lib/portal-token.js';
import {amountCents,formatBs} from '../web/lib/domain.js';

test('JWT-less private capability uses 43-char base64url secret',()=>{
 const token='A'.repeat(43);
 const hash=tokenDigest(token);
 assert.equal(hash.length,64);
 assert.match(hash,/^[0-9a-f]{64}$/);
 assert.notEqual(tokenDigest('B'.repeat(43)),hash);
});
test('guessable or malformed order tokens rejected',()=>{
 for(const t of ['','1234','abc-def','12345678-1234-4234-8234-123456789012','A'.repeat(42),
  'A'.repeat(44),'a/'.repeat(22)])assert.equal(tokenDigest(t),null);
});
test('strong form requestId accepts UUID v4',()=>{
 assert.equal(validRequestId('138b2b3a-57db-44e9-a99b-e8b29e8d1b28'),true);
 assert.equal(validRequestId('not-a-uuid'),false);
 assert.equal(validRequestId('138b2b3a-57db-14e9-a99b-e8b29e8d1b28'),false);
});
test('payments with centavos exactos accept 0.50',()=>{
 for(const v of ['0.50','1','35','100.25','999999999999.99','0001.00'])
 assert.equal(validPaymentAmount(v),true,v);
});
test('zero, huge, exponents and more than two decimals rejected',()=>{
 for(const v of ['0','0.00','-1','1e4','10,50','1.234','9999999999999.99','abc',''])
 assert.equal(validPaymentAmount(v),false,v);
});
test('JPEG magic bytes are detected',()=>{
 assert.deepEqual(inspectMime(Buffer.from([255,216,255,223,0,1])),{mime:'image/jpeg',ext:'jpg'});
});
test('PNG signature is detected',()=>{
 assert.deepEqual(inspectMime(Buffer.from([137,80,78,71,13,10,26,10,0])),{mime:'image/png',ext:'png'});
});
test('WebP RIFF and WEBP headers are detected',()=>{
 const bytes=Buffer.concat([Buffer.from('RIFF'),Buffer.alloc(4),Buffer.from('WEBP'),Buffer.alloc(8)]);
 assert.deepEqual(inspectMime(bytes),{mime:'image/webp',ext:'webp'});
});
test('svg, executable, truncated and spoofed files are rejected',()=>{
 for(const bytes of [Buffer.from('<svg/>'),Buffer.from('MZ'),Buffer.from([255,216]),
  Buffer.from('RIFF1234'),Buffer.alloc(0)]) assert.equal(inspectMime(bytes),null);
});

test('zero balance and partial receipts can be displayed without price validation failure',()=>{
 assert.equal(amountCents('0'),0n);
 assert.equal(amountCents('0.00'),0n);
 assert.equal(formatBs(amountCents('0')),'0,00 Bs');
 assert.equal(formatBs(amountCents('610.50')),'610,50 Bs');
});
test('money parser rejects negative values and extra decimal positions',()=>{
 for(const raw of ['-0.50','NaN','Infinity','0.999','100x'])assert.throws(()=>amountCents(raw));
});

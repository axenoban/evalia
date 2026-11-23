import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const page=readFileSync(new URL('../web/app/page.jsx',import.meta.url),'utf8');
const api=readFileSync(new URL('../web/lib/api.js',import.meta.url),'utf8');

test('El menú principal solo ofrece registrar pedidos y no ofrece reservas nuevas',()=>{
 assert.match(page,/\['booking','Nuevo pedido'/);
 assert.doesNotMatch(page,/\['reservations'/);
 assert.doesNotMatch(page,/name="operationType"/);
 assert.doesNotMatch(page,/function Reservations\(/);
});
test('La captura únicamente confirma pedidos, con cliente, cantidades y colores',()=>{
 const start=page.indexOf('function BookingPanel('),end=page.indexOf('function LineComposition(',start);
 assert.ok(start>=0&&end>start);
 const source=page.slice(start,end);
 assert.match(source,/checkedPortions\(/);
 assert.match(source,/onOrder\(customerId,lines,requestId.current\)/);
 assert.match(source,/Confirmar y registrar pedido/);
 assert.match(source,/compra confirmada/i);
 assert.doesNotMatch(source,/onReservation|createReservation|onUpdate|editReservation|setMode|operationType/);
});
test('API cliente no ofrece crear ni modificar reservas, pero conserva conversión histórica',()=>{
 assert.doesNotMatch(api,/create_evalia_reservation/);
 assert.doesNotMatch(api,/revise_evalia_reservation/);
 assert.doesNotMatch(api,/p_reservation_id:reservationId/);
 assert.match(api,/p_reservation_id:null,p_order_id:orderId/);
 assert.match(api,/confirm_evalia_reservation/);
 assert.match(api,/create_evalia_order/);
});
test('Registros históricos pendientes permanecen visibles sin creación nueva',()=>{
 assert.match(page,/function LegacyCommitments\(/);
 assert.match(page,/data\.reservations\.filter\(r=>r.status===/);
 assert.match(page,/onConvertLegacy/);
 assert.match(page,/registro(s)? anterior/i);
 assert.doesNotMatch(page,/tab==='reservations'/);
});
test('Pedidos y pagos mantienen navegación y pagos aprobados',()=>{
 for(const marker of ['function Orders(','function PaymentReview(','function DeliveryForm(','function OrderLinkPanel(','function ClientPanel(']){
  assert.ok(page.includes(marker),marker);
 }
 assert.match(page,/onDeliver=\{deliver\}/);
 assert.match(page,/onComplete=\{complete\}/);
 assert.match(page,/onSaveQr=\{saveQr\}/);
});

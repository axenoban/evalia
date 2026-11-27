// Assemble the same workspace shape in linear passes; preserve query order and row multiplicity.
export function indexBy(rows,key){
  const index=new Map();
  for(const row of rows){
    const id=row[key];
    const bucket=index.get(id);
    if(bucket)bucket.push(row);else index.set(id,[row]);
  }
  return index;
}
export function assembleWorkspace({models,modelColors,colors,customers,reservations,reservationLines,reservationColors,orders,orderLines,orderColors,revisions,payments,paymentReviews,deliveries,deliveryLines,links,qrSettings,stocks,images,financeEntries,deliveryEntries}){
  const colorsByModel=indexBy(modelColors,'model_id');
  const reservationLinesById=indexBy(reservationLines,'reservation_id');
  const reservationColorsByLine=indexBy(reservationColors,'reservation_line_id');
  const orderLinesById=indexBy(orderLines,'order_id');
  const orderColorsByLine=indexBy(orderColors,'order_line_id');
  const imageByModel=new Map(images);
  const read=(index,id)=>index.get(id)??[];
  return {
    models:models.map(m=>({...m,colorIds:read(colorsByModel,m.id).map(x=>x.color_id),imageUrl:imageByModel.get(m.id)})),
    colors,customers,stock:Object.fromEntries(stocks),revisions,payments,paymentReviews,
    deliveries,deliveryLines,links,qrSettings,finances:Object.fromEntries(financeEntries),deliveryStats:Object.fromEntries(deliveryEntries),
    reservations:reservations.map(r=>({...r,lines:read(reservationLinesById,r.id).map(l=>({...l,extraColorIds:read(reservationColorsByLine,l.id).map(c=>c.color_id),...(read(reservationColorsByLine,l.id).some(c=>c.color_name_snapshot!=null)?{extraColorsSnapshot:read(reservationColorsByLine,l.id).map(c=>({id:c.color_id,name:c.color_name_snapshot,hex_code:c.color_hex_snapshot}))}:{})}))})),
    orders:orders.map(o=>({...o,revision:o.revision??null,lines:read(orderLinesById,o.id).map(l=>({...l,extraColorIds:read(orderColorsByLine,l.id).map(c=>c.color_id),...(read(orderColorsByLine,l.id).some(c=>c.color_name_snapshot!=null)?{extraColorsSnapshot:read(orderColorsByLine,l.id).map(c=>({id:c.color_id,name:c.color_name_snapshot,hex_code:c.color_hex_snapshot}))}:{})}))}))
  };
}

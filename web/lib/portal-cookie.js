/** Cookie de capacidad limitada a un pedido: la navegación desde WhatsApp es un GET cross-site. */
export const orderCookieOptions=(production=true)=>({
  httpOnly:true,
  secure:production,
  sameSite:'lax',
  path:'/'
});

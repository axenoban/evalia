/**
 * A confirmed write must never become an apparent failed write because its
 * subsequent read failed. A rejected write is NOT proof of rollback (network
 * errors can occur after commit); reconciliation/idempotency are separate.
 */
export async function writeThenRefresh(write,refresh){
 let value;
 try{value=await write();}
 catch(error){return {confirmed:false,error};}
 try{await refresh();return {confirmed:true,refreshed:true,value};}
 catch(refreshError){return {confirmed:true,refreshed:false,value,refreshError};}
}
export const CONFIRMED_REFRESH_WARNING='La operación fue confirmada por el servidor, pero no se pudieron actualizar los datos. Pulsa Actualizar antes de realizar otra operación. No vuelvas a registrarla.';

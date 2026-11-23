/** Headers estrictos de privacidad para la vista de cliente y el canje de enlaces. */
const nextConfig={
 async headers(){
  return [{source:'/pedido',headers:[
    {key:'Referrer-Policy',value:'no-referrer'},
    {key:'Cache-Control',value:'private, no-store, max-age=0'},
    {key:'X-Frame-Options',value:'DENY'},
    {key:'X-Robots-Tag',value:'noindex, nofollow, noarchive'},
    {key:'X-Content-Type-Options',value:'nosniff'}
   ]},
   {source:'/p/:token',headers:[
    {key:'Referrer-Policy',value:'no-referrer'},
    {key:'Cache-Control',value:'private, no-store, max-age=0'},
    {key:'X-Frame-Options',value:'DENY'}
   ]},
   {source:'/api/cliente-pago',headers:[
    {key:'Referrer-Policy',value:'no-referrer'},
    {key:'Cache-Control',value:'no-store'},
    {key:'X-Content-Type-Options',value:'nosniff'}
   ]}];
 }
};
export default nextConfig;

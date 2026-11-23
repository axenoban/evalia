/** Cabeceras base globales y reglas de privacidad específicas del portal. */
const nextConfig={
 async headers(){
  return [{source:'/:path*',headers:[
    {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
    {key:'X-Frame-Options',value:'DENY'},
    {key:'X-Content-Type-Options',value:'nosniff'},
    {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
    {key:'Content-Security-Policy',value:"base-uri 'self'; object-src 'none'; frame-ancestors 'none'"}
   ]},{source:'/pedido',headers:[
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

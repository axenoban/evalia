// Búsqueda tolerante a tildes, mayúsculas y espacios repetidos.
// Solo filtra la vista; no modifica datos ni reglas de duplicados.
export const searchKey=value=>String(value??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
export function matchesSearch(text,query){
 const key=searchKey(query);
 return !key||searchKey(text).includes(key);
}

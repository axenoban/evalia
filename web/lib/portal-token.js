import {createHash} from 'node:crypto';
/** Token de capacidad: 32 bytes aleatorios codificados base64url sin padding. */
export function tokenDigest(raw){
 if(typeof raw!=='string'|| !/^[A-Za-z0-9_-]{43}$/.test(raw))return null;
 return createHash('sha256').update(raw,'utf8').digest('hex');
}

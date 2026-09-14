import {createHmac,createHash,randomBytes,timingSafeEqual} from 'node:crypto';
export const ADMIN_COOKIE='attendance-admin-session';
export const SESSION_SECONDS=60*60*12;
function signature(value:string){const password=process.env.ADMIN_PANEL_PASSWORD;if(!password)throw new Error('Admin password is not configured.');return createHmac('sha256',process.env.ADMIN_SESSION_SECRET||password).update('attendance-admin-v1:'+password+':'+value).digest('base64url')}
export function passwordMatches(value:unknown){const expected=process.env.ADMIN_PANEL_PASSWORD;if(!expected||typeof value!=='string'||value.length>1024)return false;return timingSafeEqual(createHash('sha256').update(value).digest(),createHash('sha256').update(expected).digest())}
export function createAdminSession(){const payload=`${Date.now()+SESSION_SECONDS*1000}.${randomBytes(24).toString('hex')}`;return `${payload}.${signature(payload)}`}
export function validAdminSession(token?:string){
 if(!token||token.length>256||!process.env.ADMIN_PANEL_PASSWORD)return false;
 const parts=token.split('.');if(parts.length!==3)return false;
 const [expires,nonce,sig]=parts;const expiry=Number(expires);
 if(!Number.isFinite(expiry)||expiry<=Date.now()||expiry>Date.now()+SESSION_SECONDS*1000||!/^[a-f0-9]{48}$/.test(nonce))return false;
 const expected=Buffer.from(signature(`${expires}.${nonce}`));const actual=Buffer.from(sig);
 return actual.length===expected.length&&timingSafeEqual(actual,expected);
}

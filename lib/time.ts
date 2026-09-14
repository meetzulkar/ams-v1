export const TZ='Asia/Kolkata';
export function todayIST(){return new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
export function istTime(iso?:string){return new Intl.DateTimeFormat('en-IN',{timeZone:TZ,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}).format(iso?new Date(iso):new Date())}
export function istDateTime(iso?:string){return new Intl.DateTimeFormat('en-IN',{timeZone:TZ,dateStyle:'medium',timeStyle:'medium'}).format(iso?new Date(iso):new Date())}
export function minutesSinceMidnightIST(d=new Date()){const p=new Intl.DateTimeFormat('en-GB',{timeZone:TZ,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d);return Number(p.find(x=>x.type==='hour')?.value)*60+Number(p.find(x=>x.type==='minute')?.value)}
export function minutesWorked(checkIn:string,checkOut:string){return Math.max(0,Math.floor((new Date(checkOut).getTime()-new Date(checkIn).getTime())/60000))}
export function hoursLabel(mins:number|null|undefined){if(mins==null)return '—';return `${Math.floor(mins/60)}h ${mins%60}m`}

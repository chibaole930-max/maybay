import type { Airport } from '@/types';
import type { RealAirport } from './airports-real';
const radians=(degree:number)=>degree*Math.PI/180;
export function haversineKm(a:Pick<Airport,'lat'|'lon'>|Pick<RealAirport,'lat'|'lng'>,b:Pick<Airport,'lat'|'lon'>|Pick<RealAirport,'lat'|'lng'>):number{
  const lon=(p:typeof a)=>'lng' in p?p.lng:p.lon;
  const dLat=radians(b.lat-a.lat),dLon=radians(lon(b)-lon(a));
  const q=Math.sin(dLat/2)**2+Math.cos(radians(a.lat))*Math.cos(radians(b.lat))*Math.sin(dLon/2)**2;
  return 6371*2*Math.atan2(Math.sqrt(q),Math.sqrt(1-q));
}
/** Cự ly khai thác gồm đường hàng không; nội địa ngắn có thể bay theo hành lang, xấp xỉ tuyến SGN–DAD ~860km. */
export function routeDistanceKm(a:Airport,b:Airport):number{
  const greatCircle=haversineKm(a,b);
  return Math.max(120,Math.round(greatCircle*(a.country==='Việt Nam'&&b.country==='Việt Nam'&&greatCircle<1000?1.42:1)));
}
export function bearingDegrees(from:{lat:number;lng:number},to:{lat:number;lng:number}):number{
  const a=radians(from.lat),b=radians(to.lat),dl=radians(to.lng-from.lng);
  return (Math.atan2(Math.sin(dl)*Math.cos(b),Math.cos(a)*Math.sin(b)-Math.sin(a)*Math.cos(b)*Math.cos(dl))*180/Math.PI+360)%360;
}
export function greatCirclePoint(from:{lat:number;lng:number},to:{lat:number;lng:number},progress:number){
  const a=radians(from.lat),b=radians(to.lat),l1=radians(from.lng),l2=radians(to.lng);
  const p=[Math.cos(a)*Math.cos(l1),Math.cos(a)*Math.sin(l1),Math.sin(a)],q=[Math.cos(b)*Math.cos(l2),Math.cos(b)*Math.sin(l2),Math.sin(b)];
  const angle=Math.acos(Math.max(-1,Math.min(1,p[0]*q[0]+p[1]*q[1]+p[2]*q[2]))),sin=Math.sin(angle)||1,t=Math.max(0,Math.min(1,progress));
  const A=Math.sin((1-t)*angle)/sin,B=Math.sin(t*angle)/sin,x=A*p[0]+B*q[0],y=A*p[1]+B*q[1],z=A*p[2]+B*q[2];
  return {lat:Math.atan2(z,Math.hypot(x,y))*180/Math.PI,lng:Math.atan2(y,x)*180/Math.PI};
}
export function greatCirclePath(from:{lat:number;lng:number},to:{lat:number;lng:number},steps=48):[number,number][]{
  return Array.from({length:steps+1},(_,i)=>{const point=greatCirclePoint(from,to,i/steps);return [point.lat,point.lng] as [number,number]});
}

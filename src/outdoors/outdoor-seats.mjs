export {decodePosition} from './outdoor-maps.mjs';
export function distanceToSeat(point,map){
  return map.objects.flatMap(object=>(object.seats||[]).map(seat=>({object,seat,distance:Math.hypot(seat.x-point.x,seat.y-point.y)}))).sort((a,b)=>a.distance-b.distance)[0]||null;
}

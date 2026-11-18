import {ARTISTS} from './catalogue.mjs';
export const ROTATION_MS=3*24*60*60*1000;
export const ANCHOR=Date.UTC(2026,0,1);
export const editionAt=now=>Math.floor(((Number.isFinite(now)?now:Date.now())-ANCHOR)/ROTATION_MS);
// Fixed UTC editions keep the two clients on the same bill regardless of local
// game day or locale. A round-robin deals both taste pools before filling slots.
export function programme(now=Date.now(),catalogue=ARTISTS){
  const edition=editionAt(now),unique=[...new Map(catalogue.filter(a=>a?.id&&a.tastes?.length).map(a=>[a.id,a])).values()].sort((a,b)=>a.id.localeCompare(b.id));
  const pools=['shared','jc','gabi'].map(role=>({role,artists:unique.filter(a=>a.tastes.includes(role))})).filter(p=>p.artists.length);
  const chosen=[],count=Math.min(3,unique.length),round=Math.floor(edition/2),parity=((edition%2)+2)%2;
  if(pools.length===1){const p=pools[0];for(let i=0;i<count;i++)chosen.push(p.artists[((edition*count+i)%p.artists.length+p.artists.length)%p.artists.length]);}
  else if(pools.length){
    const ordered=parity?[...pools].reverse():pools,used=new Map();
    for(let slot=0;slot<count;slot++){
      const pool=ordered[slot%ordered.length],offset=round*3+(pool.role===pools[0].role?parity?2:0:parity?1:0)+(used.get(pool.role)||0);
      const candidates=pool.artists.map((_,i)=>pool.artists[((offset+i)%pool.artists.length+pool.artists.length)%pool.artists.length]);
      const artist=candidates.find(a=>!chosen.some(p=>p.id===a.id))||unique.find(a=>!chosen.some(p=>p.id===a.id));
      if(artist)chosen.push(artist);used.set(pool.role,(used.get(pool.role)||0)+1);
    }
  }
  return {edition,id:'retiro-'+edition,startsAt:ANCHOR+edition*ROTATION_MS,endsAt:ANCHOR+(edition+1)*ROTATION_MS,artists:chosen};
}
export const concertId=(edition,id)=>`retiro-${edition}-${id}`;
export const storeKey=({role,name})=>`dos-mundos-conciertos-v1:${role}:${encodeURIComponent(name)}`;
export const poseNames=Object.freeze({stand:'Escuchando',dance:'Bailando',clap:'Aplaudiendo',encore:'Pidiendo otra'});
// The existing 'place' field already participates in presence change detection.
// Keep Firebase paths and payload fields unchanged, including room='park'.
export function presenceLabel(edition,artist,pose){return `Concierto · ${edition} · ${artist} · ${Object.hasOwn(poseNames,pose)?pose:'stand'}`;}
export function readPresence(peer,edition,artist,now=Date.now()){
  if(!peer||peer.online!==true||peer.room!=='park'||!Number.isFinite(peer.updated)||Math.abs(now-peer.updated)>45000||!Number.isFinite(peer.roomX)||!Number.isFinite(peer.roomY))return null;
  const match=/^Concierto · (-?\d+) · ([a-z0-9-]{1,32}) · (stand|dance|clap|encore)$/.exec(peer.place||'');
  if(!match||Number(match[1])!==edition||match[2]!==artist)return null;
  const x=(peer.roomX-28)/456*960,y=(peer.roomY-146)/144*960;
  if(x<112||x>848||y<384||y>920)return null;
  return {x,y,face:['up','down','left','right'].includes(peer.face)?peer.face:'up',pose:match[3],name:peer.name};
}
export const encodeConcert=p=>({roomX:28+p.x/960*456,roomY:146+p.y/960*144,face:p.face});
export function freshStore(raw){
  if(raw==null)return {version:1,memories:[]};
  const value=JSON.parse(raw);if(value?.version!==1||!Array.isArray(value.memories))throw new Error('Este registro de conciertos necesita otra versión. Se conserva sin modificar.');
  return value;
}
export class ConcertStore{
  constructor(identity,storage=localStorage){this.identity={...identity};this.storage=storage;this.key=storeKey(identity);}
  memories(){try{return freshStore(this.storage.getItem(this.key)).memories.filter(m=>m&&typeof m.id==='string'&&typeof m.artist==='string'&&Number.isFinite(m.at));}catch{return [];}}
  remember(edition,artist,peer=null,now=Date.now()){
    try{
      const data=freshStore(this.storage.getItem(this.key)),id=concertId(edition,artist.id),previous=data.memories.find(m=>m?.id===id);
      if(previous)return {ok:true,already:true,memory:previous};
      const memory={id,artist:artist.name,artistId:artist.id,at:now,venue:'Quiosco del Retiro',role:this.identity.role,with:peer?(this.identity.role==='jc'?'gabi':'jc'):null,track:artist.tracks[0].title};
      this.storage.setItem(this.key,JSON.stringify({...data,memories:[memory,...data.memories]}));
      return {ok:true,memory};
    }catch(error){return {ok:false,message:error instanceof SyntaxError?'El registro anterior se conserva. No se pudo añadir el recuerdo.':error.message||'No se pudo guardar el recuerdo. Puedes reintentar.'};}
  }
}

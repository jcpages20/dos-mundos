import {HOUSE,contains} from '../interiors/house-map.mjs';
import {canStand,findPath,moveSafely,distance} from '../engine/navigation.mjs';

// Soft bedding and floor bowls do not add obstacles to the existing house.
export const PET_CORNER={x:316,y:484};
export class PetWander{
  constructor(){this.actor={...PET_CORNER,face:'down',pose:'idle'};this.path=[];this.clock=0;this.nextPlan=1;this.lastGoal=null;this.wait=0;this.called=false;}
  route(point){
    if(!canStand(point,HOUSE)||contains(point,HOUSE.exit))return false;
    const path=findPath(this.actor,point,HOUSE);if(!path)return false;
    this.path=path;this.lastGoal={...point};return true;
  }
  call(human){this.called=true;this.wait=0;this.nextPlan=0;this.human={x:human.x,y:human.y};}
  approach(){const a=this.actor;return {id:'house-pet',name:this.name||'Tu podenco',action:'pet',description:'Un rato para cuidaros.',approaches:[{x:a.x+26,y:a.y,face:'left'},{x:a.x-26,y:a.y,face:'right'},{x:a.x,y:a.y+28,face:'up'},{x:a.x,y:a.y-28,face:'down'}].filter(p=>canStand(p,HOUSE)&&!contains(p,HOUSE.exit))};}
  update(dt,human,now){
    dt=Math.max(0,Math.min(.05,dt));this.clock+=dt;this.wait+=dt;
    const moving=human.moving||this.called,gap=distance(this.actor,human);
    if(this.clock>=this.nextPlan){
      this.nextPlan=this.clock+1.25;
      if(moving&&gap>62&&(!this.lastGoal||distance(this.lastGoal,human)>32||!this.path.length)){
        const options=[{x:human.x-32,y:human.y+12},{x:human.x+32,y:human.y+12},{x:human.x,y:human.y+35},{x:human.x,y:human.y-35}].sort((a,b)=>distance(a,this.actor)-distance(b,this.actor));
        for(const point of options)if(this.route(point))break;
      }else if(!this.path.length&&this.wait>7){
        const points=[PET_CORNER,{x:326,y:418},{x:240,y:494},{x:240,y:344}];this.route(points[Math.floor(this.clock/8)%points.length]);this.wait=0;
      }
    }
    if(this.called&&gap<65){this.called=false;this.path=[];}
    const target=this.path[0];
    if(target){
      const before={...this.actor},length=distance(this.actor,target),step=Math.min(dt*(this.called?110:78),length);
      if(length>.1){const dx=(target.x-this.actor.x)/length,dy=(target.y-this.actor.y)/length;Object.assign(this.actor,moveSafely(this.actor,dx*step,dy*step,HOUSE));this.actor.face=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');}
      if(distance(this.actor,target)<1.5)this.path.shift();
      else if(distance(before,this.actor)<.01&&length>2)this.path=[];
      this.actor.pose='walk';this.wait=0;
    }else this.actor.pose=this.wait>12?'sleep':this.wait>3?'sit':'idle';
  }
}

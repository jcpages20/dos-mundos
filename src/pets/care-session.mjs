const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const DOG_HOME={x:320,y:325};
export const BALL_HOME={x:135,y:392};
export const BOWL={x:453,y:361};
export const TREAT={x:135,y:392};
export const onDog=p=>Math.pow((p.x-320)/148,2)+Math.pow((p.y-226)/151,2)<=1;
export class CareSession{
  constructor(kind='stroke'){this.kind=kind;this.progress=0;this.elapsed=0;this.completed=false;this.phase=kind==='train'?'sitting':'ready';this.dog={...DOG_HOME,face:'down',pose:'idle'};this.ball={...BALL_HOME};this.contact=null;this.phaseTime=0;}
  down(point){
    if(this.completed||this.contact)return;
    if(['stroke','brush'].includes(this.kind)){if(onDog(point))this.contact={last:point,point,start:this.progress};return;}
    if(['feed','drink'].includes(this.kind)&&this.phase==='ready'&&(distance(point,BOWL)<86||onDog(point))){this.contact={last:point,point,origin:point,start:0,action:'offer'};return;}
    if(this.kind==='fetch'&&this.phase==='ready'){if(distance(point,BALL_HOME)<80||point.y>170)this.contact={last:point,point,origin:point,start:0,action:distance(point,BALL_HOME)<80?'throw':'throw-tap'};return;}
    if(this.kind==='train'&&this.phase==='reward'&&(distance(point,TREAT)<85||onDog(point)))this.contact={last:point,point,origin:point,start:.5,action:'reward'};
  }
  move(point){if(!this.contact||this.completed)return;const c=this.contact;if(['stroke','brush'].includes(this.kind)&&onDog(point)&&onDog(c.last))this.progress=Math.min(1,this.progress+Math.min(45,distance(point,c.last))/(this.kind==='stroke'?175:240));c.last=point;c.point=point;if(this.progress>=1)this.finish();}
  up(point){if(!this.contact)return;const c=this.contact;this.contact=null;
    if(this.kind==='fetch'&&this.phase==='ready')this.throw(c.action==='throw-tap'||distance(point,c.origin)>20?point:{x:470,y:225});
    if(c.action==='offer'){this.phase='eating';this.phaseTime=0;}
    if(c.action==='reward'){this.phase='celebrate';this.phaseTime=0;this.rewarded=true;}
  }
  cancel(){if(this.contact&&!this.completed&&['stroke','brush'].includes(this.kind))this.progress=this.contact.start;this.contact=null;}
  throw(point){this.contact=null;this.phase='flying';this.phaseTime=0;this.goal={x:clamp(point.x,140,520),y:clamp(point.y,185,316)};this.thrown=true;}
  finish(){this.progress=1;this.completed=true;this.phase='done';this.contact=null;if(this.kind!=='rest')this.dog.pose='happy';}
  update(dt){
    dt=Math.max(0,Math.min(.05,dt));this.elapsed+=dt;if(this.completed)return;this.phaseTime+=dt;
    if(this.contact&&['stroke','brush'].includes(this.kind)&&onDog(this.contact.point)){this.progress=Math.min(1,this.progress+dt*(this.kind==='stroke'?.6:.4));if(this.progress>=1)this.finish();}
    if(['feed','drink'].includes(this.kind)&&this.phase==='eating'){this.dog.x+=Math.min(1,dt*3)*(420-this.dog.x);this.dog.pose='eat';this.progress=Math.min(1,this.phaseTime/2.2);if(this.progress>=1)this.finish();}
    if(this.kind==='rest'){this.dog.pose='sleep';this.progress=Math.min(1,this.elapsed/2.5);if(this.progress>=1)this.finish();}
    if(this.kind==='train'){
      if(this.phase==='sitting'&&this.phaseTime>.75){this.dog.pose='sit';this.phase='reward';this.phaseTime=0;this.progress=.5;}
      if(this.phase==='celebrate'){this.dog.pose='happy';this.progress=Math.min(1,.5+this.phaseTime*.6);if(this.progress>=1)this.finish();}
    }
    if(this.kind==='fetch'){
      if(this.phase==='flying'){const t=Math.min(1,this.phaseTime/.7);this.ball={x:BALL_HOME.x+(this.goal.x-BALL_HOME.x)*t,y:BALL_HOME.y+(this.goal.y-BALL_HOME.y)*t-Math.sin(t*Math.PI)*90};if(t===1){this.phase='chasing';this.phaseTime=0;this.ball={...this.goal};}}
      if(this.phase==='chasing'||this.phase==='returning'){
        const goal=this.phase==='chasing'?{x:this.goal.x,y:this.goal.y+38}:DOG_HOME,d=distance(this.dog,goal),step=Math.min(d,dt*180);this.dog.pose='walk';this.dog.face=goal.x<this.dog.x?'left':'right';if(d>.1){this.dog.x+=(goal.x-this.dog.x)/d*step;this.dog.y+=(goal.y-this.dog.y)/d*step;}
        if(this.phase==='returning')this.ball={x:this.dog.x+(this.dog.face==='left'?-38:38),y:this.dog.y-31};
        this.progress=this.phase==='chasing'?.35:.75;
        if(d<2){if(this.phase==='chasing'){this.phase='picking';this.phaseTime=0;this.dog.pose='eat';}else{this.returned=true;this.ball={x:320,y:356};this.finish();}}
      }
      if(this.phase==='picking'&&this.phaseTime>.3){this.phase='returning';this.phaseTime=0;}
    }
  }
  result(){return {kind:this.kind,completed:this.completed,effort:this.completed?1:this.progress,returned:!!this.returned,rewarded:!!this.rewarded};}
}

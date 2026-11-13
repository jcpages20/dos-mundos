import {LifeStore} from './life-store.mjs';
import {PlanSync} from './plan-sync.mjs';
import {PLANS,activeMoods,planMemory} from './life-model.mjs';
export class LifeController{
  constructor(api,changed){this.api=api;this.changed=changed;this.ensure();}
  ensure(){const now=this.api.snapshot();if(!now)return false;const key=now.role+':'+now.name;
    if(key!==this.owner){this.sync?.destroy();this.owner=key;this.store=new LifeStore(now);this.sync=new PlanSync(this.api,now,()=>this.changed?.());}
    return true;
  }
  snapshot(){if(!this.ensure())return null;const game=this.api.snapshot();return {game,profile:this.store.profile,moods:activeMoods(this.store.profile,game.clock),plans:this.sync.view.plans,pending:this.sync.pending.length,syncMessage:this.sync.message,errors:this.sync.errors,readOnly:!!(this.store.readOnly||this.sync.readOnly),lastBonus:this.lastBonus||''};}
  activity(event){
    if(!this.ensure())return;if(event.role!==this.store.identity.role||event.name!==this.store.identity.name)return;
    const result=this.store.activity(event);
    if(result.ok&&(result.bonus.fun||result.bonus.xp)){
      this.api.bonus(result.bonus);this.lastBonus=[result.bonus.fun?'Tus gustos y ánimo: +'+result.bonus.fun+' diversión':'',result.bonus.xp?'+2 XP adicionales':''].filter(Boolean).join(' · ');
    }
    const contribution=this.sync.event(event);if(!contribution.ok)this.notice=contribution.message;
    if(!result.ok)this.notice=result.message;this.changed?.();
  }
  configure(value){if(!this.ensure())return {ok:false,message:'Primero carga tu personaje.'};const result=this.store.configure(value,this.api.snapshot().recipes);this.changed?.();return result;}
  command(type,extra){if(!this.ensure())return {ok:false,message:'Primero carga tu personaje.'};const result=this.sync.command(type,extra);this.changed?.();return result;}
  confirm(id){
    const s=this.api.snapshot(),cfg=PLANS[id],peer=s?.peer,now=Date.now();
    if(!cfg?.room||!s?.connected||s.room!==cfg.room||peer?.room!==cfg.room||!Number.isFinite(peer.updated)||Math.abs(now-peer.updated)>45000)return {ok:false,message:'Conectaos los dos y acercaos a '+(cfg?.room==='home'?'casa':'la sala del cine')+' para confirmar el momento.'};
    return this.command('confirm',{plan:id,room:cfg.room,peerAt:peer.updated,day:s.day});
  }
  memories(){if(!this.ensure())return [];return Object.values(this.sync.view.plans).map(planMemory).filter(Boolean).sort((a,b)=>b.at-a.at);}
  tick(){if(this.ensure()){this.sync.connect();this.changed?.();}}
}

import {emptyPlans,validatePlans,applyPlanCommand,PLANS} from './life-model.mjs';
const parse=(storage,key,fallback)=>{const text=storage.getItem(key);if(!text)return fallback;return JSON.parse(text);};
export class PlanSync{
  constructor(api,identity,onChange,storage=localStorage){
    this.api=api;this.identity=identity;this.role=identity.role;this.storage=storage;this.changed=onChange;this.key='dos-mundos-planes-v1';
    this.queueKey=`dos-mundos-planes-cola-v1:${this.role}:${encodeURIComponent(identity.name)}`;
    this.base=emptyPlans();this.pending=[];this.message='Guardado local. Conecta tu cuenta para compartir las aportaciones.';this.epoch=0;this.errors=[];
    try{this.base=validatePlans(parse(storage,this.key,null));const q=parse(storage,this.queueKey,[]);if(!Array.isArray(q))throw new Error('La cola de aportaciones no es compatible.');this.pending=q.filter(c=>c.role===this.role);}
    catch(error){this.readOnly=true;this.message=error.message;}
    this.rebuild();
  }
  rebuild(){this.view=this.base;this.errors=[];for(const c of this.pending){try{const r=applyPlanCommand(this.view,c,this.role);if(r.ok)this.view=r.state;else this.errors.push({id:c.id,message:r.message});}catch(error){this.message=error.message;this.readOnly=true;}}
    if(this.blocked&&this.pending.some(c=>c.id===this.blocked.id)&&!this.errors.some(e=>e.id===this.blocked.id))this.errors.push(this.blocked);
    this.changed?.();}
  command(type,extra={}){
    if(this.readOnly)return {ok:false,message:this.message};
    const c={...extra,type,id:'v-'+crypto.randomUUID(),role:this.role,at:Date.now()};
    const preview=applyPlanCommand(this.view,c,this.role);if(!preview.ok)return preview;
    const next=[...this.pending,c];
    try{this.storage.setItem(this.queueKey,JSON.stringify(next));}catch{return {ok:false,message:'No se pudo guardar la aportación. Libera espacio antes de continuar.'};}
    this.pending=next;this.rebuild();this.flush();return {ok:true,state:this.view};
  }
  event(event){
    const useful=Object.values(this.view.plans).some(p=>p.status==='active'&&p.members?.[this.role]?.active&&PLANS[p.id]?.requirements.includes(event.kind)&&!p.members[this.role].progress?.[event.kind]);
    if(useful)return this.command('event',{event:{kind:event.kind,label:event.label,recipe:event.recipe||'',day:event.day,time:event.time}});
    return {ok:true};
  }
  connect(){
    const online=this.api.connected();if(!online){if(this.stop){this.stop();this.stop=null;this.epoch++;}this.message='Guardado local. Conecta tu cuenta para compartir las aportaciones.';return;}
    if(this.stop||this.readOnly)return;
    this.message='Conectando vuestros planes…';const epoch=++this.epoch;
    this.stop=this.api.subscribe(raw=>{
      if(this.disposed||epoch!==this.epoch)return;
      try{const next=validatePlans(raw);this.storage.setItem(this.key,JSON.stringify(next));this.base=next;this.message='Planes conectados · cada uno conserva sus aportaciones';this.rebuild();this.flush();}
      catch(error){this.message='No se pudo recuperar el plan compartido: '+error.message;this.changed?.();}
    },()=>{if(epoch!==this.epoch)return;this.message='Tus aportaciones están guardadas aquí. Firebase no permite compartirlas todavía; puedes reintentar la conexión.';this.changed?.();});
    this.flush();
  }
  async flush(){
    if(this.busy||this.disposed||this.readOnly||!this.api.connected())return;this.busy=true;const epoch=this.epoch;
    try{
      while(this.pending.length&&!this.disposed&&this.api.connected()){
        const c=this.pending[0];let rejection=null;
        const transaction=await this.api.transact(raw=>{const r=applyPlanCommand(raw,c,this.role);if(!r.ok){rejection=r.message;return undefined;}rejection=null;return r.state;});
        if(this.disposed||epoch!==this.epoch)break;
        if(!transaction.committed){this.message=rejection||'No se pudo compartir esta aportación. Vuelve a intentarlo.';this.blocked={id:c.id,message:this.message};this.rebuild();break;}
        const next=validatePlans(transaction.snapshot.val()),remaining=this.pending.filter(p=>p.id!==c.id);
        // Keep the outbox until its receipt is persisted; retries are idempotent.
        this.storage.setItem(this.key,JSON.stringify(next));this.storage.setItem(this.queueKey,JSON.stringify(remaining));
        this.base=next;this.pending=remaining;this.blocked=null;this.message='Aportaciones compartidas y guardadas';this.rebuild();
      }
    }catch(error){this.message='Guardado en este dispositivo. No se pudo sincronizar; puedes reintentar cuando vuelva la conexión.';this.changed?.();}
    finally{this.busy=false;this.changed?.();if(!this.disposed&&epoch!==this.epoch&&this.pending.length&&this.api.connected())queueMicrotask(()=>this.flush());}
  }
  retry(){this.stop?.();this.stop=null;this.epoch++;this.connect();this.flush();this.changed?.();}
  discard(id){
    const remaining=this.pending.filter(c=>c.id!==id);try{this.storage.setItem(this.queueKey,JSON.stringify(remaining));}catch{return false;}
    this.pending=remaining;this.rebuild();this.flush();return true;
  }
  destroy(){this.disposed=true;this.epoch++;this.stop?.();this.stop=null;}
}

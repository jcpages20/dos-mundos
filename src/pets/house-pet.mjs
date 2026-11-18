import {PetStore} from './pet-store.mjs';
import {PET_KEY} from './pet-model.mjs';
import {PetScene} from './pet-scene.mjs';
import {PetWander,PET_CORNER} from './pet-wander.mjs';
import {loadPetAssets,drawPet,sprite} from './pet-assets.mjs';
import {distance} from '../engine/navigation.mjs';
const el=(tag,cls='',text='')=>{const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n;};
export class HousePet{
  constructor(house){
    this.house=house;this.store=new PetStore();this.ui=new PetScene(this);this.abort=new AbortController();this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.bar=el('div','dm-house-pet-bar');this.info=el('span');house.petButton=house.button('',()=>this.route(),'dm-house-pet-open');
    this.callButton=house.button('Llamar',()=>{this.motion?.call(house.actor);house.feedback(this.store.doc.pet.name+' viene a saludarte.');});this.callButton.setAttribute('aria-label','Llamar al podenco');
    this.bar.append(this.info,house.petButton,this.callButton);house.root.insertBefore(this.bar,house.root.children[1]);house.root.classList.add('dm-house-has-pet');this.changed();
    window.addEventListener('storage',e=>{if(e.key===PET_KEY||e.key===null){this.store.reload();this.changed();if(this.ui.open&&!this.ui.busy){this.ui.cancelGesture();this.ui.build();}}},{signal:this.abort.signal});
    // Pet art is optional: a failed download must never prevent entering home.
    this.load().catch(()=>{});
  }
  async load(){this.art=await loadPetAssets();return this.art;}
  changed(){
    const p=this.store.doc.pet;if(p&&!this.motion)this.motion=new PetWander();if(!p)this.motion=null;
    if(this.motion)this.motion.name=p.name;
    this.info.textContent=p?p.name+' · Podenco':'Un compañero en casa';this.house.petButton.textContent=p?'Cuidar a '+p.name:'Conocer al podenco';this.callButton.hidden=!p||this.store.readOnly;
  }
  route(){
    if(!this.house.ready||this.house.cooking?.open||this.ui.open||this.house.modalOpen())return;
    if(this.store.doc.pet&&this.motion&&distance(this.house.actor,this.motion.actor)>36){this.motion.path=[];this.motion.wait=0;const object=this.motion.approach();this.house.approach(object,()=>this.ui.show());}
    else this.ui.show();
  }
  hit(point){return !!this.motion&&Math.abs(point.x-this.motion.actor.x)<24&&point.y>this.motion.actor.y-42&&point.y<this.motion.actor.y+8;}
  update(dt,now){if(this.ui.open){this.ui.update(dt,now);return;}if(!this.motion||this.house.modalOpen())return;if(this.house.target?.id==='house-pet'&&this.house.path.length)return;this.motion.update(dt,this.house.actor,now);}
  layers(now){
    if(!this.art||!this.motion)return [];const art=this.art,a=this.motion.actor,reduced=this.reduced;
    return [
      {depth:455,render:()=>{const g=this.house.renderer.g;sprite(g,art.items,'bed',282,454,68,54);sprite(g,art.items,'food',267,501,25,25);sprite(g,art.items,'water',299,501,25,25);}},
      {depth:a.y+.2,render:()=>drawPet(this.house.renderer.g,art,a,now,43,reduced)}
    ];
  }
  snapshot(){return {available:!this.store.readOnly,localOnly:true,pet:this.store.view().pet,position:this.motion?{x:this.motion.actor.x,y:this.motion.actor.y,pose:this.motion.actor.pose}:null,care:this.ui.snapshot()};}
  destroy(){this.ui.close();this.abort.abort();this.bar.remove();}
}

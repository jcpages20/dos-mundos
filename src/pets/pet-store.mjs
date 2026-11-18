import {PET_KEY,emptyPet,parsePet,petAt,applyPetCommand} from './pet-model.mjs';
export class PetStore{
  constructor(storage){this.key=PET_KEY;this.doc=emptyPet();try{this.storage=storage||globalThis.localStorage;this.reload();}catch(error){this.readOnly=true;this.error='El navegador no permite guardar la mascota. La casa sigue disponible.';}}
  reload(){try{this.doc=parsePet(this.storage.getItem(this.key));this.readOnly=false;this.error='';}catch(error){this.readOnly=true;this.error=error.message;}return this.doc;}
  view(now=Date.now()){return petAt(this.doc,now);}
  ticket(kind){this.reload();return {id:'pet-'+crypto.randomUUID(),revision:this.doc.revision,petId:this.doc.pet?.id||null,type:kind};}
  async execute(command){
    const run=()=>{const raw=this.storage.getItem(this.key),current=parsePet(raw),result=applyPetCommand(current,command);if(!result.ok)return result;
      if(!result.already){if(this.storage.getItem(this.key)!==raw)return {ok:false,message:'Otro cuidado ha cambiado la mascota. Vuelve a intentarlo.'};this.storage.setItem(this.key,JSON.stringify(result.state));}
      this.doc=result.state;this.readOnly=false;this.error='';return result;};
    try{if(this.readOnly)return {ok:false,message:this.error};return globalThis.navigator?.locks?.request?await navigator.locks.request(this.key,run):run();}
    catch(error){return {ok:false,message:error instanceof SyntaxError?'El registro de la mascota queda intacto. No se pudo guardar este cuidado.':'No se pudo guardar el cuidado. Se conserva el progreso anterior; puedes reintentar.'};}
  }
}

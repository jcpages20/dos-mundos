import {profileDefault,cleanProfile,evolveProfile} from './life-model.mjs';
export class LifeStore{
  constructor(identity,storage=localStorage){
    this.identity=identity;this.storage=storage;this.key=`dos-mundos-vida-v1:${identity.role}:${encodeURIComponent(identity.name)}`;this.profile=profileDefault();
    try{const raw=storage.getItem(this.key);if(raw){const value=JSON.parse(raw);if(value.version!==1)throw new Error('Se conserva tu perfil anterior. Esta versión no lo puede editar.');this.profile=cleanProfile(value);}}
    catch(error){this.readOnly=true;this.error=error.message;}
  }
  write(profile){if(this.readOnly)return {ok:false,message:this.error};try{this.storage.setItem(this.key,JSON.stringify(profile));this.profile=profile;return {ok:true};}catch{return {ok:false,message:'No se pudieron guardar tus gustos. Libera espacio y vuelve a intentarlo.'};}}
  configure({traits,likes,favoriteFood},recipes){
    if(!Array.isArray(traits)||traits.length>2||!Array.isArray(likes)||likes.length>3||favoriteFood&&!recipes.some(r=>r.id===favoriteFood))return {ok:false,message:'Elige hasta dos rasgos, tres gustos y una receta del juego.'};
    return this.write(cleanProfile({...this.profile,configured:true,traits,likes,favoriteFood,updatedAt:Date.now()}));
  }
  activity(event){const result=evolveProfile(this.profile,event),saved=this.write(result.profile);return {...result,ok:saved.ok,message:saved.message};}
}

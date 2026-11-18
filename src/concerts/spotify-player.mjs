import {embedURL} from './catalogue.mjs?conciertos=17';
const SDK='https://open.spotify.com/embed/iframe-api/v1';
let api,pending;
export function loadSpotifyAPI(){
  if(api)return Promise.resolve(api);if(pending)return pending;
  pending=new Promise((resolve,reject)=>{
    let script=document.querySelector('script[data-dm-concert-spotify]');
    const previous=window.onSpotifyIframeApiReady;
    const timeout=setTimeout(()=>fail(),10000);
    function fail(){clearTimeout(timeout);pending=null;script?.remove();reject(new Error('Spotify tarda en responder. Puedes usar su botón ▶ o abrir la canción.'));}
    window.onSpotifyIframeApiReady=value=>{clearTimeout(timeout);api=value;try{previous?.(value);}catch{}resolve(value);};
    if(!script){script=document.createElement('script');script.src=SDK;script.async=true;script.dataset.dmConcertSpotify='';script.addEventListener('error',fail,{once:true});document.body.append(script);}
  });return pending;
}
export class SpotifyPlayer{
  constructor(container,track,changed){this.container=container;this.track=track;this.changed=changed;this.state={status:'loading',position:0,duration:0};this.intent=false;this.mount();}
  emit(status,extra={}){if(this.disposed)return;this.state={...this.state,...extra,status};this.changed?.(this.state);}
  async mount(){
    const generation=(this.generation||0)+1;this.generation=generation;this.emit('loading');
    try{
      const provider=await loadSpotifyAPI();if(this.disposed||this.generation!==generation)return;
      this.container.replaceChildren();const target=document.createElement('div');this.container.append(target);
      provider.createController(target,{uri:this.track.uri,width:'100%',height:152},controller=>{
        if(this.disposed||this.generation!==generation){controller.destroy();return;}
        this.controller=controller;const listen=(name,fn)=>{controller.addListener(name,fn);(this.listeners??=[]).push([name,fn]);};
        listen('ready',()=>{if(this.disposed)return;this.ready=true;clearTimeout(this.readyTimer);this.emit('ready');if(this.intent)this.play();});
        listen('playback_started',event=>{if(event.data?.playingURI&&event.data.playingURI!==this.track.uri)return;this.ready=true;this.clearRequest();this.emit('playing');});
        listen('playback_update',event=>{
          const data=event.data;if(!data||data.playingURI&&data.playingURI!==this.track.uri||typeof data.isPaused!=='boolean')return;
          this.ready=true;this.clearRequest();this.emit(data.isBuffering?'buffering':data.isPaused?'paused':'playing',{position:Number.isFinite(data.position)?data.position:this.state.position,duration:Number.isFinite(data.duration)?data.duration:this.state.duration});
        });
        const frame=this.container.querySelector('iframe');if(frame){frame.title='Spotify · '+this.track.title;frame.allow='autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';}
        this.readyTimer=setTimeout(()=>{if(!this.ready)this.emit('waiting');},10000);
      });
    }catch{if(!this.disposed&&this.generation===generation)this.fallback();}
  }
  fallback(){
    this.container.replaceChildren();const frame=document.createElement('iframe');frame.src=embedURL(this.track);frame.title='Spotify · '+this.track.title;frame.width='100%';frame.height='152';frame.allow='autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';frame.referrerPolicy='strict-origin-when-cross-origin';this.container.append(frame);this.emit('manual');
  }
  play(){
    if(this.disposed)return;this.intent=true;if(!this.ready||!this.controller){if(this.state.status==='manual')this.container.querySelector('iframe')?.focus();return;}
    try{const result=this.controller.play();result?.catch?.(()=>this.emit('waiting'));this.clearRequest();this.requestTimer=setTimeout(()=>{if(this.state.status!=='playing')this.emit('waiting');},5000);}catch{this.emit('waiting');}
  }
  pause(){this.intent=false;try{this.controller?.pause();}catch{this.emit('waiting');}}
  change(track){
    this.intent=true;this.track=track;this.state={status:'loading',position:0,duration:0};this.emit('loading');this.clearRequest();
    if(this.controller){try{(this.controller.loadEntity||this.controller.loadUri).call(this.controller,track.uri);const frame=this.container.querySelector('iframe');if(frame)frame.title='Spotify · '+track.title;this.play();return;}catch{this.controller.destroy();this.controller=null;this.ready=false;}}
    this.mount();
  }
  clearRequest(){clearTimeout(this.requestTimer);}
  destroy(){if(this.disposed)return;this.disposed=true;this.clearRequest();clearTimeout(this.readyTimer);this.generation++;for(const [name,fn] of this.listeners||[])try{this.controller?.removeListener(name,fn);}catch{}try{this.controller?.destroy();}catch{}this.container.replaceChildren();}
}

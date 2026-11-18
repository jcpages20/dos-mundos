"""Deterministic provider contract, not a test of Spotify audio or login."""
SDK = r'''window.onSpotifyIframeApiReady({createController(target,options,callback){
const frame=document.createElement('iframe');frame.src='https://open.spotify.com/embed/track/'+options.uri.split(':')[2];target.replaceWith(frame);
const listeners=new Map();let position=0,playing=false,uri=options.uri,timer;
const emit=(name,data)=>{for(const fn of listeners.get(name)||[])fn({data});};
const update=()=>emit('playback_update',{playingURI:uri,isPaused:!playing,isBuffering:false,position,duration:180000});
const controller={frame,addListener(name,fn){listeners.set(name,[...(listeners.get(name)||[]),fn]);},removeListener(name,fn){listeners.set(name,(listeners.get(name)||[]).filter(f=>f!==fn));},
play(){if(window.__qaSpotifyBlocked)return;playing=true;emit('playback_started',{playingURI:uri});update();clearInterval(timer);timer=setInterval(()=>{position+=200;update();},200);},
pause(){playing=false;clearInterval(timer);update();},loadEntity(next){uri=next;position=0;playing=false;frame.src='https://open.spotify.com/embed/track/'+uri.split(':')[2];},
destroy(){this.destroyed=true;clearInterval(timer);frame.remove();},testUpdate(data){emit('playback_update',{playingURI:uri,isPaused:false,isBuffering:false,duration:180000,position,...data});}};
(window.__qaSpotifyControllers??=[]).push(controller);callback(controller);setTimeout(()=>emit('ready',{}),20);
}});'''

def install(context):
    context.route('https://open.spotify.com/embed/iframe-api/v1',lambda r:r.fulfill(status=200,content_type='text/javascript',body=SDK))
    context.route('https://open.spotify.com/embed/track/**',lambda r:r.fulfill(status=200,content_type='text/html',body='<html><body style="margin:0;background:#18392b;color:white;font:14px system-ui">Spotify provider fixture</body></html>'))

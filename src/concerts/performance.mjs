// A show may be ready, counting in or waiting without claiming audio is playing.
// Song progress comes exclusively from the official player's events.
export class Performance{
  constructor(){this.phase='ready';this.audio='idle';this.started=false;this.intro=0;this.elapsed=0;this.position=0;this.duration=0;}
  start(){if(!this.started){this.started=true;this.intro=0;}this.phase=this.intro<3?'intro':'waiting';}
  playback(value){
    if(!value||!['loading','ready','playing','paused','buffering','waiting','error','manual'].includes(value.status))return;
    this.audio=value.status;
    if(Number.isFinite(value.position)&&value.position>=0){const finished=value.status==='paused'&&value.position===0&&this.duration>0&&this.position>=this.duration-1000;this.position=finished?this.duration:value.position;}
    if(Number.isFinite(value.duration)&&value.duration>0)this.duration=value.duration;
    if(value.status==='playing'&&!this.started){this.started=true;this.intro=3;}
    this.update(0);
  }
  update(dt){
    if(!this.started)return;
    const step=Math.max(0,Math.min(.1,Number(dt)||0));this.intro=Math.min(3,this.intro+step);this.elapsed+=step;
    if(this.intro<3){this.phase='intro';return;}
    if(this.audio==='playing')this.phase='live';
    else if(this.audio==='paused')this.phase=this.duration&&this.position>=this.duration-600?'finished':'paused';
    else this.phase='show';
  }
  next(){this.position=0;this.duration=0;this.audio='loading';this.phase=this.started?'waiting':'ready';}
  frame(bpm){if(!['live','show'].includes(this.phase))return 0;return [0,1,0,2][Math.floor(this.elapsed*bpm/60*2)%4];}
  snapshot(){return {phase:this.phase,audio:this.audio,countdown:this.phase==='intro'?Math.max(1,Math.ceil(3-this.intro)):0,position:this.position,duration:this.duration,started:this.started};}
}

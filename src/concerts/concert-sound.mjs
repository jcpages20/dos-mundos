// Original, procedural applause and count-in, never an artist's song or sample.
export class ConcertSound{
  async unlock(){try{const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;this.context??=new Context();await this.context.resume();}catch{}}
  click(){const c=this.context;if(c?.state!=='running')return;const note=c.createOscillator(),gain=c.createGain();note.frequency.value=880;gain.gain.setValueAtTime(.025,c.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,c.currentTime+.055);note.connect(gain).connect(c.destination);note.start();note.stop(c.currentTime+.06);}
  applause(){const c=this.context;if(c?.state!=='running')return;const length=Math.floor(c.sampleRate*.8),buffer=c.createBuffer(1,length,c.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<length;i++){const t=i/c.sampleRate;data[i]=(Math.random()*2-1)*Math.abs(Math.sin(t*42))*Math.pow(1-i/length,1.6);}
    const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=buffer;filter.type='highpass';filter.frequency.value=750;gain.gain.value=.13;source.connect(filter).connect(gain).connect(c.destination);source.start();}
  destroy(){const c=this.context;this.context=null;c?.close().catch(()=>{});}
}

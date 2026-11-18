// Verified public playlist metadata, read 2026-11-18. The artwork is an original
// stylised tribute; these are fictional in-game gigs, not real concert dates.
import {SETLISTS} from './setlists.mjs';
export const SOURCES=Object.freeze({
  gabi:{name:'las que tengo pegadas',url:'https://open.spotify.com/playlist/6ODNatWurCvWr89xneT5ss',status:'verified'},
  shared:{name:'dedmiau + JC',url:'https://open.spotify.com/playlist/37i9dQZF1EJukqVtoE18Md',status:'screenshots'}
});
export const ARTISTS=Object.freeze([
  {id:'strokes',name:'The Strokes',tastes:['gabi'],art:'strokes',style:'Guitarras de madrugada',detail:'Cinco músicos, amplificadores y un escenario en rojo y crema.',color:'#cf735f',light:'#eec785',bpm:116,
    tracks:[{title:"Liar’s Remorse",uri:'spotify:track:2DqVYGuRxSdzZ2ZQMbwY6M'}]},
  {id:'chemical',name:'The Chemical Brothers',tastes:['gabi'],art:'chemical',style:'Noche electrónica',detail:'Dos mesas de mezclas, sintetizadores y luces turquesa y ámbar.',color:'#67c4bd',light:'#e6b35e',bpm:120,
    tracks:[{title:'Go',credit:'con Q-Tip',uri:'spotify:track:2cNjgoSh1TBHFQIhfzRJUE'}]},
  {id:'alice',name:'Alice Phoebe Lou',tastes:['gabi'],art:'alice',style:'Entre árboles y guitarras',detail:'Voz, guitarra, bajo y batería bajo una guirnalda de luz cálida.',color:'#d0aa84',light:'#f6dba6',bpm:92,
    tracks:[{title:'Only When I',uri:'spotify:track:6UMgGjfuvyZ4mxnPYLlANI'}]},
  {id:'fontaines',name:'Fontaines D.C.',tastes:['gabi'],art:'fontaines',style:'El pulso de las guitarras',detail:'Quinteto de postpunk, micros y amplificadores en verde y rojo.',color:'#b4b37d',light:'#de886b',bpm:122,
    tracks:[{title:'Here’s The Thing',uri:'spotify:track:4J4pysp2EFNhYibI8tIg0D'}]},
  {id:'massive',name:'Massive Attack',tastes:['gabi'],art:'massive',style:'Sombras y trip hop',detail:'Voces, electrónica y batería con iluminación azul y burdeos.',color:'#929ebd',light:'#c68b9a',bpm:86,
    tracks:[{title:'Paradise Circus',credit:'con Hope Sandoval',uri:'spotify:track:2BndJYJQ17UcEeUFJP5JmY'}]},
  {id:'remi',name:'Remi Wolf',tastes:['gabi'],art:'remi',style:'Color entre los árboles',detail:'Voz y banda de funk pop, ropa naranja y focos verde agua.',color:'#edaa67',light:'#81cfb2',bpm:108,
    tracks:[{title:'Champagne',uri:'spotify:track:0Rxs96nQeboThWCNzP4H0c'}]},
  {id:'nsqk',name:'Nsqk + Julieta Venegas',tastes:['shared'],art:'nsqk',style:'Canciones para quedarse',detail:'Voz, acordeón y teclados en azul y crema, entre faroles cálidos.',color:'#b3cad7',light:'#f0d8a0',bpm:100,
    tracks:[{title:'Estar Así Siempre',uri:'spotify:track:6wpWmv0tcaNwmOXbpPNz43'}]},
  {id:'judeline',name:'Judeline + rusowsky',tastes:['shared'],art:'judeline',style:'Un sueño en el quiosco',detail:'Voz y sintetizadores, siluetas suaves y luces de color lavanda.',color:'#c2a8d8',light:'#ebc2ac',bpm:96,
    tracks:[{title:'Heavenly',uri:'spotify:track:5Bng1Bwy7PFQys6qByKmdT'}]},
  {id:'paco',name:'CA7RIEL & Paco Amoroso',tastes:['shared'],art:'paco',style:'El Retiro se mueve',detail:'Dos voces, guitarra, ropa de colores y focos naranja y turquesa.',color:'#f0a16d',light:'#77c6c1',bpm:118,
    tracks:[{title:'Sexy Magic (from GTAVI: The Album)',credit:'con PinkPantheress, Fred again.. y Etienne de Crécy',uri:'spotify:track:62hqNk13CuFLOpCw1cPMAF'}]}
].map(artist=>({...artist,tracks:SETLISTS[artist.id]||artist.tracks})));
export const artistById=id=>ARTISTS.find(a=>a.id===id)||null;
export const trackURL=track=>/^spotify:track:[a-zA-Z0-9]{22}$/.test(track?.uri||'')?'https://open.spotify.com/track/'+track.uri.split(':')[2]:null;
export const embedURL=track=>trackURL(track)?trackURL(track).replace('/track/','/embed/track/')+'?utm_source=generator&theme=0':null;

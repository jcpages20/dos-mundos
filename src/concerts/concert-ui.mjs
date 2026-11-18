import {SOURCES,trackURL} from './catalogue.mjs?conciertos=17';
import {programme,ConcertStore} from './concert-model.mjs?conciertos=17';
import {loadConcertAssets} from './concert-assets.mjs?conciertos=17';
export const element=(tag,css='',text='')=>{const e=document.createElement(tag);e.className=css;if(text)e.textContent=text;return e;};
export function link(text,url){const a=element('a','',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
export function populateBillboard(menu,pick,bill=programme()){
  menu.classList.add('dm-concert-billboard');
  const date=new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Madrid'}).format(bill.endsAt);
  menu.append(element('p','dm-concert-kicker','LAS NOCHES DEL RETIRO'),element('p','','Elige un artista y pulsa Entrar al concierto. Tu personaje caminará hasta el quiosco para ver la actuación dentro del juego. Entrada libre.'),element('p','dm-concert-renews','Nueva cartelera: '+date+' · hora de Madrid'));
  for(const artist of bill.artists){
    const card=element('article','dm-concert-card');card.dataset.artist=artist.id;card.style.setProperty('--concert-color',artist.color);
    const preview=element('canvas','dm-concert-preview');preview.width=512;preview.height=256;preview.setAttribute('aria-label','Diseño de '+artist.name);
    loadConcertAssets().then(art=>{if(!preview.isConnected)return;const sheet=art.shared.frames[artist.art]?art.shared:art,g=preview.getContext('2d'),f=sheet.frames[artist.art],w=Math.min(512,256*f[2]/f[3]),h=w*f[3]/f[2];g.imageSmoothingEnabled=false;g.drawImage(sheet.image,...f,(512-w)/2,256-h,w,h);}).catch(()=>{preview.hidden=true;});
    const button=element('button','dm-concert-enter','Entrar al concierto');button.type='button';button.setAttribute('aria-label','Entrar al concierto de '+artist.name);button.addEventListener('click',()=>pick(artist,bill));
    card.append(element('h3','',artist.name),element('small','',artist.tastes.map(r=>r==='shared'?'De vuestra lista compartida':'De la radio de Gabi').join(' · ')),button,preview,element('p','',artist.style),element('p','',artist.detail),link('Escuchar '+artist.tracks[0].title+' en Spotify ↗',trackURL(artist.tracks[0])));menu.append(card);
  }
  const lists=element('details','dm-concert-sources');lists.append(element('summary','','Nuestras listas'));
  for(const [role,source] of Object.entries(SOURCES)){
    lists.append(link((role==='shared'?'Juntos':'Gabi')+' · '+source.name+' ↗',source.url));
    if(source.status==='screenshots')lists.append(element('p','','La selección de la lista conjunta procede de las canciones que habéis compartido en capturas.'));
  }
  lists.append(element('p','','La selección rota entre los artistas preparados a partir de vuestras listas.'));menu.append(lists);
}
export function mountConcertAlbum(parent,identity){
  parent.querySelector('.dm-concert-album')?.remove();if(!identity)return;
  const memories=new ConcertStore(identity).memories();if(!memories.length)return;
  const section=element('section','dm-concert-album');section.append(element('h3','','La música que nos llevamos'));
  for(const memory of memories){const card=element('article','dm-concert-memory');card.append(element('h4','',memory.artist),element('small','',new Date(memory.at).toLocaleDateString('es-ES')+' · '+memory.venue),element('p','',memory.track+(memory.with?' · Con '+(memory.with==='gabi'?'Gabi':'JC'):'')));section.append(card);}
  parent.append(section);
}

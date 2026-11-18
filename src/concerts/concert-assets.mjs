let pending;
export function loadConcertAssets(){
  if(!pending)pending=(async()=>{
    const response=await fetch(new URL('../../assets/concerts/concert-atlas.json',import.meta.url));
    if(!response.ok)throw new Error('No se pudieron cargar los músicos. Puedes seguir paseando por el Retiro.');
    const data=await response.json();
    const load=async sheet=>{const image=new Image();image.src=new URL('../../assets/concerts/'+sheet.image,import.meta.url).href;await image.decode();if(image.naturalWidth!==sheet.width||image.naturalHeight!==sheet.height)throw new Error('La ilustración del concierto está incompleta.');return {...sheet,image};};
    const [base,shared]=await Promise.all([load(data),load(data.shared)]);return {...base,shared};
  })().catch(error=>{pending=null;throw error;});
  return pending;
}
let motionManifest;const motions=new Map();
export async function loadConcertMotion(artist){
  motionManifest??=fetch(new URL('../../assets/concerts/animation-atlas.json',import.meta.url)).then(r=>{if(!r.ok)throw new Error('Animaciones no disponibles');return r.json();}).catch(error=>{motionManifest=null;throw error;});
  const manifest=await motionManifest,sheet=Object.values(manifest.atlases).find(s=>s.frames[artist.id]);if(!sheet)return null;
  if(!motions.has(sheet.image))motions.set(sheet.image,(async()=>{const image=new Image();image.src=new URL('../../assets/concerts/'+sheet.image,import.meta.url).href;await image.decode();if(image.naturalWidth!==sheet.width||image.naturalHeight!==sheet.height)throw new Error('Animación incompleta');return {...sheet,image};})().catch(error=>{motions.delete(sheet.image);throw error;}));
  return motions.get(sheet.image);
}

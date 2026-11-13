let pending;
export function loadOutdoorAssets(){
  if(pending)return pending;
  pending=(async()=>{
    const response=await fetch(new URL('../../assets/outdoors/madrid-atlas.json',import.meta.url));
    if(!response.ok)throw new Error('No se encuentran las ilustraciones del parque y la plaza.');
    const sheet=await response.json(),image=new Image();image.src=new URL('../../assets/outdoors/'+sheet.image,import.meta.url).href;await image.decode();
    if(image.naturalWidth!==sheet.width||image.naturalHeight!==sheet.height)throw new Error('Las ilustraciones de Madrid están incompletas.');
    const response2=await fetch(new URL('../../assets/city/city-atlas.json',import.meta.url));
    if(!response2.ok)throw new Error('No se encuentran los vecinos.');const neighbors=(await response2.json()).atlases.neighbors;
    const people=new Image();people.src=new URL('../../assets/city/'+neighbors.image,import.meta.url).href;await people.decode();
    return {...sheet,image,neighbors:{...neighbors,image:people}};
  })().catch(e=>{pending=null;throw e;});return pending;
}

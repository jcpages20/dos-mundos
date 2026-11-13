let pending=null;
export function loadFarmAssets(){
  if(pending)return pending;
  pending=(async()=>{
    const response=await fetch(new URL('../../assets/farm/farm-atlas.json',import.meta.url));
    if(!response.ok)throw new Error('No se encuentran las ilustraciones del huerto.');
    const manifest=await response.json(),result={};
    await Promise.all(Object.entries(manifest.atlases).map(async([key,data])=>{
      const image=new Image();image.src=new URL('../../assets/farm/'+data.image,import.meta.url).href;await image.decode();
      if(image.naturalWidth!==data.width||image.naturalHeight!==data.height)throw new Error('Una lámina del huerto está incompleta.');
      result[key]={...data,image};
    }));return result;
  })().catch(error=>{pending=null;throw error;});
  return pending;
}

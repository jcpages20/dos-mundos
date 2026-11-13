export const MAX_PLOTS=12;
export const EXPANSION_PRICE=25;

// Read-only version of the historical growth rules. Existing plants keep their
// timestamps, prices, real-time durations, drought accounting and sale values.
export function cropStatus(plant,catalog,now=Date.now()){
  if(!plant)return null;
  const cfg=catalog[plant.type];if(!cfg)return {unknown:true,type:plant.type};
  const hrs=Math.max(0,now-plant.planted)/36e5;
  const dryH=Math.max(0,now-(plant.watered||plant.planted))/36e5;
  const missed=Math.max(0,Math.floor((dryH-18)/6));
  const damage=Math.max(0,missed-(plant.dryApplied||0))*12;
  const health=damage?Math.max(10,(plant.health||100)-damage):(plant.health||100);
  const growth=Math.min(100,Math.floor(hrs/cfg.hours*100));
  return {type:plant.type,name:cfg.name,growth,health,dryH,ready:growth===100&&health>=25,
    stage:growth<20?0:growth<55?1:growth<100?2:3,
    remaining:Math.max(0,cfg.hours-hrs),earnings:Math.round(cfg.yield*health/100),dry:dryH>=18};
}

export function timeRemaining(hours){
  if(hours<=0)return 'Lista para cosechar';
  const minutes=Math.ceil(hours*60);
  return minutes<60?minutes+' min reales':Math.floor(minutes/60)+' h '+String(minutes%60).padStart(2,'0')+' min reales';
}

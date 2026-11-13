const rect=(x,y,w,h)=>({x,y,w,h});
const point=(x,y,face='up')=>({x,y,face});
function object(id,sprite,name,box,collision,approaches,action='look',description=''){
  return {id,sprite,name,...box,collision,approaches,action,description,depth:collision.y+collision.h};
}
export const FARM={
  id:'huerto-comunitario-rpg',version:1,width:1120,height:896,
  spawn:point(552,834),exit:rect(520,870,64,18),
  walls:[rect(8,8,1104,16),rect(8,8,16,872),rect(1096,8,16,872),rect(8,880,512,16),rect(584,880,528,16)],
  objects:[
    object('shed','shed','Caseta del huerto',rect(50,48,220,178),rect(70,156,180,66),[point(158,247)],'guide','Las plantas crecen con tiempo real, incluso mientras descansas fuera del juego.'),
    object('greenhouse','greenhouse','Invernadero',rect(316,42,224,182),rect(332,154,192,68),[point(428,247)],'catalog','Cuatro cultivos, cada uno con su ritmo. Elige tus semillas antes de acercarte a una parcela.'),
    object('seeds','seed-stall','Puesto de semillas',rect(610,84,174,142),rect(624,172,148,50),[point(698,246)],'catalog','Semillas de albahaca, tomates, girasoles y fresas. Se pagan solo al sembrar.'),
    object('well','well','Pozo del jardín',rect(882,70,144,156),rect(900,170,108,52),[point(950,248)],'watering','Agua fresca para cuidar los cultivos. Regar una parcela conserva su coste y sus efectos originales.'),
    object('table','potting-table','Mesa de trasplantes',rect(60,738,170,91),rect(74,786,142,38),[point(248,814,'left')],'catalog','Macetas, semilleros y herramientas preparadas para la próxima siembra.'),
    object('tools','tool-rack','Herramientas',rect(290,756,110,86),rect(310,796,76,40),[point(416,824,'left')],'guide','La azada prepara la tierra y la regadera ayuda a recuperar la salud de las plantas.'),
    object('compost','compost','Compostera',rect(760,746,118,94),rect(774,794,94,42),[point(898,826,'left')],'fertilizer','Puedes abonar una planta dañada: 3 € y 15 minutos del juego para recuperar 20 de salud.'),
    object('scarecrow','scarecrow','Guardián del huerto',rect(956,736,92,116),rect(988,814,20,30),[point(950,830,'right')],'guide','Un pequeño guardián entre las flores y los bancales. Cada cosecha queda registrada en tu progreso.')
  ],
  plots:Array.from({length:12},(_,index)=>{
    // Keep the original four plots close to the entrance; expand outwards.
    const [column,row]=[[1,1],[2,1],[1,2],[2,2],[0,2],[3,2],[0,1],[3,1],[0,0],[1,0],[2,0],[3,0]][index];
    const x=48+column*262,y=304+row*140;
    return {id:'plot-'+index,index,name:'Parcela '+(index+1),x,y,w:222,h:92,
      collision:rect(x+5,y+9,212,75),approaches:[point(x+111,y+111,'up'),point(x+111,y-13,'down')],action:'plot',depth:y+84};
  })
};
FARM.collisions=[...FARM.walls,...FARM.objects.map(o=>o.collision),...FARM.plots.map(o=>o.collision)];
FARM.targets=[...FARM.objects,...FARM.plots];
export const contains=(p,r)=>p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;

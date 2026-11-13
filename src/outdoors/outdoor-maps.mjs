// Original, simplified Madrid scenes. Native park/plaza IDs and activities stay intact.
const object=(id,name,sprite,x,y,w,h,action=null,approaches=[],extra={})=>({id,name,sprite,x,y,w,h,action,approaches,depth:y+h-8,...extra});
const point=(x,y,face='up')=>({x,y,face});
const base={width:1280,height:960,spawn:point(640,878,'up'),exit:{x:601,y:930,w:78,h:24}};
function finish(map){
  map.collisions=[{x:0,y:0,w:1280,h:18},{x:0,y:0,w:18,h:960},{x:1262,y:0,w:18,h:960},
    {x:0,y:942,w:601,h:18},{x:679,y:942,w:601,h:18},...map.solids];
  for(const o of map.objects){
    if(!o.solid&&['flower-urn','planter','tile-sign'].includes(o.sprite))o.solid={x:o.x+o.w*.18,y:o.y+o.h*.76,w:o.w*.64,h:o.h*.23};
    if(o.solid)map.collisions.push(o.solid);
  }
  map.targets=map.objects.filter(o=>o.action);return map;
}
const bench=(id,x,y)=>object(id,'Banco de hierro verde','green-bench',x,y,152,82,'rest',[point(x+76,y+117)],{
  solid:{x:x+9,y:y+41,w:134,h:36},seats:[point(x+53,y+57,'down'),point(x+101,y+57,'down')]
});
const tree=(id,x,y,w=156,h=176)=>object(id,'Castaño de Indias','chestnut',x,y,w,h,null,[],{solid:{x:x+w*.44,y:y+h-21,w:w*.15,h:19}});
export const PARK=finish({...base,id:'park',title:'El Retiro',subtitle:'Paseos de albero · agua y jardines',
  lake:{x:760,y:348,w:410,h:250},
  solids:[{x:760,y:348,w:410,h:250},{x:519,y:886,w:44,h:48},{x:717,y:886,w:44,h:48},
    {x:432,y:225,w:43,h:76},{x:619,y:225,w:43,h:76}],
  people:[point(493,466,'down'),point(705,671,'left'),point(481,735),point(722,322),point(385,332),point(865,666),point(1070,760),point(407,831)],
  objects:[
    object('palace','Palacio de Cristal','glass-pavilion',870,67,276,252,'look',[point(1007,323)],{description:'Hierro, cristal y reflejos entre los árboles: nuestro pequeño homenaje al Retiro.',solid:{x:881,y:229,w:253,h:80}}),
    object('monument','Paseo del estanque','colonnade',104,82,300,216,'walk',[point(254,330)],{description:'Un paseo junto al agua y las columnas de piedra.',solid:{x:115,y:213,w:278,h:78}}),
    object('lake','Estanque del Retiro',null,760,348,410,250,'walk',[point(727,476,'right'),point(970,635)],{description:'El agua se mueve entre barcas de madera y reflejos.'}),
    object('bandstand','Quiosco de música','gazebo',92,485,224,218,'look',[point(214,737)],{description:'Hierro verde, un techo de zinc y un pequeño escenario entre los jardines.',solid:{x:104,y:623,w:202,h:72}}),
    object('exercise','Paseo para hacer deporte',null,310,458,86,62,'sport',[point(354,508)],{description:'Un claro junto al paseo para moverse y hacer ejercicio.'}),
    bench('lake-bench',778,701),bench('garden-bench',284,737),
    object('azulejos','Fuente de azulejos','drinking-fountain',376,512,92,118,'look',[point(484,643,'left')],{description:'Una fuente de cerámica azul, piedra clara y agua fresca.',solid:{x:381,y:589,w:82,h:40}}),
    object('roses','La rosaleda','rose-arbor',424,95,246,208,'look',[point(554,331)],{description:'Rosas, cipreses y un rincón tranquilo para pasear.',depth:301}),
    object('gate','Puerta de Madrid','park-gate',514,813,252,126,'exit',[point(640,900,'down')],{depth:938}),
    tree('t1',29,38),tree('t2',676,26),tree('t3',1088,61),tree('t4',29,288),tree('t5',1069,630),tree('t6',30,735),
    ...[[708,100],[65,461],[1200,370]].map(([x,y],i)=>object('cypress'+i,'Ciprés','cypress',x,y,48,156,null,[],{solid:{x:x+16,y:y+140,w:17,h:15}})),
    ...[[76,770],[1093,808],[693,747],[334,335]].map(([x,y],i)=>object('lamp'+i,'Farola de hierro','lamp',x,y,30,116,null,[],{solid:{x:x+10,y:y+104,w:10,h:12}})),
    ...[[426,387],[1139,648],[316,737]].map(([x,y],i)=>object('urn'+i,'Flores del parque','flower-urn',x,y,48,59)),
    object('sign','El Retiro','tile-sign',516,683,44,75,null,[],{label:'EL RETIRO'})
  ]
});
const arcade=(id,x,y,sprite='red-arcade',w=236,h=220)=>object(id,'Soportales de la plaza',sprite,x,y,w,h,null,[],{solid:{x:x+8,y:y+h-67,w:w-16,h:60}});
const terrace=(id,x,y)=>object(id,'Terraza bajo los soportales','terrace',x,y,163,181,'listen',[point(x+81,y+215)],{
  solid:{x:x+16,y:y+120,w:132,h:58},seats:[point(x+26,y+146,'down'),point(x+136,y+146,'down')]
});
export const PLAZA=finish({...base,id:'plaza',title:'Plaza Mayor',subtitle:'Soportales · terrazas y vida de barrio',solids:[],
  people:[point(425,474,'right'),point(850,459,'down'),point(828,686,'left'),point(437,700,'down'),point(623,730),point(950,523),point(344,564),point(719,349)],
  objects:[
    arcade('north1',40,55),arcade('north2',284,55,'ochre-arcade'),arcade('north3',760,55),arcade('north4',1004,55,'ochre-arcade'),
    object('clock','Casa del reloj','clock-tower',526,29,228,250,'look',[point(640,326)],{description:'Balcones de hierro, tejados de pizarra y el reloj que acompaña la vida de la plaza.',solid:{x:534,y:209,w:212,h:62}}),
    arcade('west1',21,347,'ochre-arcade',218,204),arcade('east1',1040,347,'red-arcade',218,204),
    object('fountain','Fuente de la plaza','fountain',536,385,208,180,'talk',[point(640,603),point(490,535,'right')],{solid:{x:550,y:481,w:180,h:76}}),
    object('statue','Monumento de bronce','equestrian-statue',317,305,112,162,'look',[point(374,501)],{description:'Un jinete de bronce sobre un pedestal de granito, rodeado de paseantes.',solid:{x:321,y:421,w:103,h:42}}),
    object('music','Música en los soportales','guitar-stool',803,327,94,104,'music',[point(841,503)],{description:'La guitarra suena entre los balcones y las terrazas.',solid:{x:816,y:400,w:76,h:29}}),
    terrace('terrace-west',266,665),terrace('terrace-east',861,665),
    object('kiosk','Quiosco de la plaza','news-kiosk',43,632,166,188,'look',[point(209,854,'left')],{description:'Prensa, postales de Madrid y pequeños recuerdos tras los cristales.',solid:{x:51,y:757,w:151,h:59}}),
    object('tapas','Barra de tapas','tapas-kiosk',1066,631,166,188,'look',[point(1050,839,'right')],{description:'Tortilla, aceitunas y un toldo granate bajo la luz cálida de la barra.',solid:{x:1074,y:756,w:150,h:60}}),
    ...[[262,416],[954,423],[499,711],[739,714]].map(([x,y],i)=>object('lamp'+i,'Farola madrileña','lamp',x,y,28,114,null,[],{solid:{x:x+9,y:y+102,w:10,h:11}})),
    ...[[64,286],[1088,287],[452,798],[724,799]].map(([x,y],i)=>object('flowers'+i,'Jardinera de la plaza','planter',x,y,102,75,null,[],{solid:{x:x+6,y:y+44,w:90,h:29}})),
    object('sign','Plaza Mayor','tile-sign',519,836,41,72,null,[],{label:'PLAZA MAYOR'})
  ]
});
export const MAPS={park:PARK,plaza:PLAZA};
export const contains=(p,r)=>p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;
// Fit the larger scenes into the historical presence coordinate range. No new
// Firebase paths or fields: old clients can still receive the same payload.
export const encodePosition=(p,map)=>({roomX:28+p.x/map.width*456,roomY:146+p.y/map.height*144});
export const decodePosition=(p,map)=>({x:(p.roomX-28)/456*map.width,y:(p.roomY-146)/144*map.height});

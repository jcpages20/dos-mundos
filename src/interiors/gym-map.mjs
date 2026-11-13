const rect=(x,y,w,h)=>({x,y,w,h});
const point=(x,y,face='up')=>({x,y,face});
function equipment(id,sprite,name,box,collision,approach,action='look',exercise=null,description=''){
  return {id,sprite,name,...box,collision,approaches:[approach],action,exercise,
    description,depth:collision?collision.y+collision.h:box.y+box.h};
}

export const GYM={
  id:'club-atlas-rpg',version:1,width:1056,height:816,tile:16,
  spawn:point(512,752),exit:rect(480,782,64,18),
  zones:[
    {id:'strength',name:'Sala de fuerza',...rect(24,72,448,376),floor:'rubber'},
    {id:'cardio',name:'Cardio y resistencia',...rect(592,72,440,376),floor:'rubber'},
    {id:'silks',name:'Telas aéreas',...rect(24,504,448,264),floor:'wood'},
    {id:'mobility',name:'Movilidad y calma',...rect(592,504,440,264),floor:'wood'},
    {id:'lobby',name:'Club Atlas',...rect(24,64,1008,728),floor:'stone'}
  ],
  walls:[rect(8,40,1040,24),rect(8,40,16,768),rect(1032,40,16,768),
    rect(8,792,472,16),rect(544,792,504,16)],
  routes:[
    {id:'strength',name:'Fuerza',point:point(254,296)},
    {id:'cardio',name:'Cardio',point:point(796,300)},
    {id:'silks',name:'Telas',point:point(320,748)},
    {id:'mobility',name:'Calma',point:point(684,674)}
  ],
  objects:[
    equipment('squat','squat-rack','Rack de sentadillas',rect(48,104,112,164),rect(56,220,96,44),point(104,282),'weights',point(104,232,'down'),'Acero, discos y un espacio para ganar fuerza a tu ritmo.'),
    equipment('cables','cable-machine','Máquina de poleas',rect(202,98,100,168),rect(210,214,84,48),point(252,282),'weights',point(252,232,'down'),'Poleas, agarres y una torre de pesos preparada para entrenar.'),
    equipment('legpress','leg-press','Prensa de piernas',rect(326,128,106,140),rect(334,214,90,52),point(382,286),'weights',point(372,232,'down'),'Una máquina acolchada para trabajar piernas con calma.'),
    equipment('bench','weight-bench','Banco de fuerza',rect(70,326,120,68),rect(82,360,96,24),point(132,404),'weights',point(132,358,'down'),'Banco ajustable y una sesión de fuerza completa.'),
    equipment('dumbbells','dumbbell-rack','Mancuernas',rect(224,327,156,86),rect(232,365,140,44),point(304,428),'weights',point(304,430,'down'),'Pares ordenados por peso, con soportes de madera y metal.'),
    equipment('plates','plate-rack','Discos de peso',rect(390,316,64,98),rect(398,370,48,38),point(430,432),'look',null,'Cada disco tiene su sitio. El pequeño orden de cada entrenamiento.'),
    equipment('treadmill-1','treadmill','Corredora junto a la ventana',rect(618,120,100,150),rect(634,196,70,66),point(668,282),'cardio',point(668,238,'up'),'Una cinta, luz natural y un rato para encontrar tu ritmo.'),
    equipment('treadmill-2','treadmill','Corredora de resistencia',rect(748,120,100,150),rect(764,196,70,66),point(798,282),'cardio',point(798,238,'up'),'La pantalla se enciende y la cinta empieza a moverse.'),
    equipment('elliptical','elliptical','Elíptica',rect(886,120,94,150),rect(898,210,70,54),point(934,284),'cardio',point(934,236,'up'),'Un movimiento continuo para una sesión suave de cardio.'),
    equipment('bike','spin-bike','Bicicleta de spinning',rect(622,326,82,110),rect(632,386,62,40),point(668,442),'cardio',point(668,398,'right'),'Un sillín cómodo, pedales y una nueva vuelta.'),
    equipment('rower','rower','Máquina de remo',rect(742,338,126,94),rect(754,394,102,32),point(802,444),'cardio',point(802,402,'left'),'Resistencia, coordinación y un ritmo tranquilo de remo.'),
    equipment('punching-bag','punching-bag','Saco de entrenamiento',rect(902,318,92,126),rect(912,410,72,28),point(954,458),'cardio',point(942,442,'up'),'Un saco de cuero con soporte propio y espacio para moverse.'),
    equipment('silks-burgundy','silks-burgundy','Telas burdeos',rect(56,520,152,204),rect(66,646,132,66),point(132,748),'silks',point(132,648,'right'),'Dos telas largas, un anclaje alto y una colchoneta gruesa. Un rincón pensado para Gabi.'),
    equipment('silks-lilac','silks-lilac','Telas lavanda',rect(246,520,152,204),rect(256,646,132,66),point(322,748),'silks',point(322,648,'right'),'Un segundo juego de telas, con pliegues suaves y una colchoneta verde salvia.'),
    equipment('spare-mat','crash-mat','Colchoneta de apoyo',rect(416,548,58,64),rect(424,582,44,24),point(478,626),'look',null,'Colchonetas acolchadas para cuidar cada momento de la práctica.'),
    equipment('rolled-mats','yoga-mats','Esterillas y bloques',rect(620,508,86,70),rect(632,544,64,24),point(668,586),'stretch',point(684,646,'down'),'Esterillas enrolladas, bloques de corcho y espacio para respirar.'),
    equipment('floor-mat','crash-mat','Colchoneta de movilidad',rect(624,604,124,68),null,point(684,680),'stretch',point(684,646,'down'),'Una pausa, un estiramiento y un poco más de energía.'),
    equipment('barre','barre','Barra de movilidad',rect(786,582,150,68),rect(798,626,126,22),point(858,670),'stretch',point(858,650,'up'),'Madera cálida, espejos y espacio para recuperar movilidad.'),
    equipment('fountain','water','Agua fresca',rect(902,488,54,94),rect(912,548,34,28),point(930,596),'water',point(930,594,'up'),'Agua fresca, vasos limpios y una pausa después del esfuerzo.'),
    equipment('lockers','lockers','Taquillas',rect(958,656,66,116),rect(968,726,46,40),point(942,754,'right'),'look',null,'Tus cosas tienen un lugar mientras entrenas. Los tiradores brillan con la luz del local.'),
    equipment('towels','towel-shelf','Toallas y material',rect(962,494,62,122),rect(972,570,42,38),point(942,624,'right'),'look',null,'Toallas dobladas, pelotas pequeñas y botellas listas para la próxima sesión.'),
    equipment('reception','reception','Recepción de Atlas',rect(352,704,118,70),rect(360,744,102,24),point(480,754,'left'),'routine',null,'Bienvenidos a vuestro club. Aquí puedes consultar las sesiones y elegir una zona.'),
    equipment('rest-bench','rest-bench','Banco de descanso',rect(600,708,112,66),rect(608,748,96,24),point(580,754,'right'),'rest',point(652,742,'down'),'Una toalla limpia y un banco donde recuperar el aliento.'),
    equipment('plant-top','plant','Monstera',rect(486,100,56,82),rect(499,152,30,24),point(552,190,'left'),'look',null,'Verde, luz y un poco de vida entre las máquinas.'),
    equipment('olive','olive-tree','Olivo del club',rect(516,562,64,116),rect(534,640,30,30),point(586,686,'left'),'look',null,'Un olivo pequeño acompaña la entrada a la zona de telas.'),
    equipment('plant-calm','plant','Planta de la sala tranquila',rect(768,684,54,80),rect(780,738,30,20),point(756,772,'right'),'look',null,'Un rincón tranquilo para terminar el entrenamiento.')
  ],
  mirrors:[rect(64,22,106,100),rect(208,22,106,100),rect(352,22,106,100),rect(760,486,118,92)],
  windows:[rect(630,17,150,78),rect(842,17,150,78)]
};
GYM.collisions=[...GYM.walls,...GYM.objects.map(object=>object.collision).filter(Boolean)];
export function gymZoneAt(point){return GYM.zones.find(zone=>point.x>=zone.x&&point.x<zone.x+zone.w&&point.y>=zone.y&&point.y<zone.y+zone.h)||GYM.zones.at(-1);}
export function gymContains(point,box){return point.x>=box.x&&point.x<=box.x+box.w&&point.y>=box.y&&point.y<=box.y+box.h;}

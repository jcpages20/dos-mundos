export const HOUSE_VERSION = 1;
const rect = (x, y, w, h) => ({x, y, w, h});
const at = (x, y, face = 'up') => ({x, y, face});

function furniture(id, sprite, name, box, solid, approaches, action = 'look', description = '') {
  return {id, sprite, name, ...box, collision: solid, approaches, action, description,
    depth: solid ? solid.y + solid.h : box.y + box.h};
}

export const HOUSE = {
  id: 'shared-home-rpg', width: 768, height: 560, tile: 16,
  spawn: {x: 352, y: 508, face: 'up'}, exit: rect(336, 526, 48, 18),
  rooms: [
    {id: 'bedroom', name: 'Dormitorio', ...rect(24, 48, 368, 200), floor: 'wood'},
    {id: 'bathroom', name: 'Baño', ...rect(408, 48, 336, 200), floor: 'blue-tile'},
    {id: 'hall', name: 'Pasillo', ...rect(24, 264, 720, 32), floor: 'wood'},
    {id: 'living', name: 'Salón', ...rect(24, 296, 368, 240), floor: 'wood'},
    {id: 'kitchen', name: 'Cocina', ...rect(408, 296, 336, 240), floor: 'cream-tile'}
  ],
  walls: [
    rect(8, 32, 752, 16), rect(8, 32, 16, 520), rect(744, 32, 16, 520),
    rect(8, 536, 328, 16), rect(384, 536, 376, 16),
    rect(392, 32, 16, 232),
    rect(24, 248, 144, 16), rect(216, 248, 336, 16), rect(600, 248, 144, 16),
    rect(24, 296, 144, 16), rect(216, 296, 176, 16),
    rect(408, 296, 144, 16), rect(600, 296, 144, 16),
    rect(392, 296, 16, 80), rect(392, 424, 16, 112)
  ],
  doors: [
    {id: 'bedroom-door', ...at(192, 256)}, {id: 'bathroom-door', ...at(576, 256)},
    {id: 'living-door', ...at(192, 304)}, {id: 'kitchen-door', ...at(576, 304)},
    {id: 'living-kitchen', ...at(400, 400)}, {id: 'front-door', ...at(360, 536)}
  ],
  rugs: [
    {...rect(76, 390, 200, 122), color: '#b59cbd', edge: '#e3cfbb'},
    {...rect(72, 180, 164, 62), color: '#899eb5', edge: '#d2c6b4'},
    {...rect(520, 205, 90, 30), color: '#a6b7b7', edge: '#e5dfce'},
    {...rect(328, 509, 62, 24), color: '#af6d52', edge: '#dca36a'}
  ]
};

HOUSE.objects = [
  furniture('sofa', 'sofa', 'Sofá para dos', rect(88, 324, 144, 92), rect(96, 370, 128, 44),
    [at(128, 424), at(184, 424)], 'sit', 'Dos plazas para las tardes juntos.'),
  furniture('television', 'tv', 'Televisión', rect(112, 449, 120, 80), rect(120, 501, 104, 28),
    [at(176, 488, 'down')], 'tv', 'Una película, una serie o un rato de calma.'),
  furniture('coffee-table', 'coffee-table', 'Mesa de centro', rect(124, 428, 92, 50), rect(132, 449, 76, 22),
    [at(116, 448, 'right'), at(224, 448, 'left')], 'look', 'Un libro, una taza y espacio para compartir.'),
  furniture('books', 'bookcase', 'Librería', rect(32, 317, 52, 92), rect(36, 375, 44, 32),
    [at(60, 420)], 'read', 'Un pequeño rincón para leer y aprender.'),
  furniture('living-plant', 'plant', 'Monstera', rect(284, 322, 50, 58), rect(297, 360, 26, 17),
    [at(312, 390)], 'look', 'La luz del salón le sienta bien.'),
  furniture('living-lamp', 'floor-lamp', 'Lámpara del salón', rect(266, 378, 32, 65), rect(275, 426, 17, 14),
    [at(308, 430, 'left')], 'lamp', 'Una luz cálida para las noches en casa.'),
  furniture('bed', 'double-bed', 'Cama doble', rect(80, 76, 112, 124), rect(86, 116, 100, 80),
    [at(204, 160, 'left'), at(72, 160, 'right')], 'sleep', 'Vuestra cama, con dos almohadas y una colcha azul.'),
  furniture('nightstand-left', 'nightstand', 'Mesita de noche', rect(36, 90, 38, 66), rect(42, 131, 27, 23),
    [at(56, 168)], 'lamp'),
  furniture('nightstand-right', 'nightstand', 'Mesita de noche', rect(200, 90, 38, 66), rect(206, 131, 27, 23),
    [at(224, 168)], 'lamp'),
  furniture('wardrobe', 'wardrobe', 'Armario', rect(296, 66, 64, 88), rect(300, 118, 56, 33),
    [at(328, 166)], 'wardrobe', 'Tu ropa y tu aspecto siguen guardados.'),
  furniture('dresser', 'dresser', 'Cómoda y espejo', rect(264, 170, 64, 76), rect(270, 218, 52, 26),
    [at(254, 230, 'right')], 'look', 'El espejo, flores y los pequeños detalles de cada día.'),
  furniture('bedroom-plant', 'plant', 'Planta del dormitorio', rect(344, 181, 38, 45), rect(355, 209, 20, 14),
    [at(350, 238)], 'look'),
  furniture('fridge', 'fridge', 'Nevera', rect(682, 311, 51, 85), rect(688, 360, 40, 33),
    [at(708, 408)], 'pantry', 'Consulta tu despensa y los ingredientes disponibles.'),
  furniture('stove', 'stove', 'Fogones y horno', rect(610, 317, 62, 78), rect(614, 357, 54, 36),
    [at(640, 408)], 'cook', 'Cocina con tus recetas e ingredientes de siempre.'),
  furniture('sink', 'kitchen-sink', 'Fregadero', rect(432, 314, 80, 80), rect(436, 357, 72, 36),
    [at(472, 408)], 'look', 'Fregadero, grifo y platos en su sitio.'),
  furniture('counter', 'counter', 'Encimera', rect(522, 321, 80, 72), rect(526, 357, 72, 35),
    [at(560, 408)], 'cook', 'Pan, verduras y una tabla listos para preparar la comida.'),
  furniture('dining-table', 'dining-table', 'Mesa para comer', rect(510, 445, 100, 80), rect(516, 480, 88, 37),
    [at(560, 466)], 'eat', 'Una mesa puesta para dos.'),
  furniture('chair-left', 'chair', 'Silla', rect(466, 463, 34, 58), rect(473, 496, 23, 22),
    [at(452, 500, 'right')], 'sit-chair'),
  furniture('chair-right', 'chair', 'Silla', rect(620, 463, 34, 58), rect(626, 496, 23, 22),
    [at(668, 500, 'left')], 'sit-chair'),
  furniture('kitchen-plant', 'plant', 'Hierbas de la cocina', rect(688, 462, 38, 48), rect(699, 492, 20, 15),
    [at(704, 522)], 'look'),
  furniture('shower', 'shower', 'Ducha', rect(426, 59, 78, 88), rect(432, 92, 67, 51),
    [at(464, 157)], 'shower', 'Agua caliente para recuperar la higiene.'),
  furniture('bath', 'bathtub', 'Bañera', rect(620, 72, 112, 82), rect(624, 105, 104, 44),
    [at(672, 164)], 'shower', 'Un baño tranquilo al final del día.'),
  furniture('vanity', 'bathroom-sink', 'Lavabo y espejo', rect(522, 62, 58, 82), rect(526, 115, 50, 26),
    [at(552, 156)], 'look'),
  furniture('toilet', 'toilet', 'Inodoro', rect(432, 177, 42, 62), rect(440, 211, 29, 25),
    [at(490, 220, 'left')], 'look'),
  furniture('bath-cabinet', 'towels', 'Toallas y armario', rect(648, 179, 76, 67), rect(652, 218, 67, 26),
    [at(636, 230, 'right')], 'look', 'Toallas limpias y un lugar para cada cosa.')
];

HOUSE.wallObjects = [
  {sprite: 'window', ...rect(98, 15, 90, 64)},
  {sprite: 'paintings', ...rect(244, 18, 86, 48)},
  {sprite: 'window', ...rect(616, 12, 80, 60)},
  {sprite: 'paintings', ...rect(94, 277, 90, 48)},
  {sprite: 'wall-cabinets', ...rect(436, 275, 93, 80)}
];
HOUSE.seats = [
  {id: 'sofa-left', x: 128, y: 390, face: 'down', approach: at(128, 424)},
  {id: 'sofa-right', x: 184, y: 390, face: 'down', approach: at(184, 424)}
];
HOUSE.collisions = [...HOUSE.walls, ...HOUSE.objects.map(object => object.collision).filter(Boolean)];

export function roomAt(point) {
  return HOUSE.rooms.find(room => point.x >= room.x && point.x < room.x + room.w &&
    point.y >= room.y && point.y < room.y + room.h) || HOUSE.rooms[2];
}

export function contains(point, box) {
  return point.x >= box.x && point.x <= box.x + box.w && point.y >= box.y && point.y <= box.y + box.h;
}

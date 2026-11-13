// Recommendations are ideas to look up, not a claim about a platform's catalogue.
// Kept inside the function so the legacy adapter can serialize it without globals.
export function cinemaProgramme(day) {
  const number = Number(day);
  const currentDay = Number.isFinite(number) ? Math.max(1, Math.floor(number)) : 1;
  const groups = [
    {label: 'Una aventura', color: '#86bdcd', films: [
      ['La vida secreta de Walter Mitty', 'Un viaje para atreverse a dar el primer paso.'],
      ['Up', 'Una casa, muchos globos y un viaje inesperado.'],
      ['El viaje de Chihiro', 'Un mundo extraño que invita a mirar con otros ojos.'],
      ['Interstellar', 'Un viaje por el espacio y por lo que nos une.'],
      ['El castillo ambulante', 'Magia y un hogar que nunca se queda quieto.']
    ]},
    {label: 'Para sonreír', color: '#edbf7a', films: [
      ['Paddington 2', 'Pequeños gestos que hacen mejor un barrio.'],
      ['Ratatouille', 'Una cocina, un sueño y muchas ganas de aprender.'],
      ['Los Mitchell contra las máquinas', 'Una familia encuentra su propio ritmo.'],
      ['Escuela de rock', 'Una clase con mucho más que aprender que música.'],
      ['Fantastic Mr. Fox', 'Un plan disparatado entre amigos y familia.']
    ]},
    {label: 'Para sentir', color: '#dc9ba9', films: [
      ['Amélie', 'El encanto de los detalles de todos los días.'],
      ['Coco', 'Música, recuerdos y las personas que llevamos dentro.'],
      ['La La Land', 'Dos sueños que se encuentran en la misma ciudad.'],
      ['WALL·E', 'Una pequeña compañía en un universo enorme.'],
      ['Del revés', 'Un viaje por las emociones que compartimos.']
    ]}
  ];
  return {day: currentDay, films: groups.map(group => {
    const [title, note] = group.films[(currentDay - 1) % group.films.length];
    return {label: group.label, color: group.color, title, note};
  })};
}

// Original low-resolution scenery. The game's existing renderer still draws
// JC/Gabi and all four original touch targets over this canvas.
export function drawCinema(g, time) {
  const r = (x, y, w, h, color) => {g.fillStyle = color; g.fillRect(x, y, w, h);};
  const poly = (points, color) => {
    g.fillStyle = color; g.beginPath(); g.moveTo(...points[0]);
    for (const point of points.slice(1)) g.lineTo(...point);
    g.closePath(); g.fill();
  };
  const text = (value, x, y, size, color, align = 'center') => {
    g.font = `bold ${size}px monospace`; g.fillStyle = color; g.textAlign = align;
    g.fillText(value, x, y);
  };
  r(0, 0, 512, 320, '#191626');
  r(10, 12, 492, 173, '#372335');
  for (let x = 12; x < 502; x += 14) {
    r(x, 14, 5, 168, '#412b3d'); r(x + 5, 14, 1, 168, '#2b1e30');
  }
  r(10, 13, 492, 3, '#a87960'); r(10, 177, 492, 5, '#a87960');
  r(10, 182, 492, 3, '#100f1e');
  // Carpet, narrow golden aisle borders and low guide lights.
  poly([[10, 185], [502, 185], [512, 320], [0, 320]], '#231c2e');
  for (let y = 188; y < 320; y += 8) {
    for (let x = 12 + (y % 16); x < 510; x += 16) r(x, y, 2, 1, '#332338');
  }
  poly([[246, 183], [266, 183], [278, 320], [234, 320]], '#593140');
  for (let y = 196; y < 320; y += 19) {
    const x = Math.round(244 - (y - 184) * .08);
    r(x, y, 3, 4, '#c99561'); r(509 - x, y, 3, 4, '#c99561');
    r(x, y, 2, 1, '#ffe1a4'); r(510 - x, y, 2, 1, '#ffe1a4');
  }
  // Marquee and acoustic wall lights, with a steady, gentle glow.
  r(142, 19, 228, 24, '#1e1929'); r(145, 21, 222, 1, '#d3a375');
  text('C I N E  E S T R E L L A', 256, 35, 12, '#f3d2a0');
  for (const x of [45, 467]) {
    const halo = g.createRadialGradient(x, 58, 1, x, 58, 51);
    halo.addColorStop(0, '#edba7133'); halo.addColorStop(1, '#edba7100');
    g.fillStyle = halo; g.fillRect(x - 51, 17, 102, 96);
    r(x - 7, 45, 14, 25, '#b58b66'); r(x - 5, 48, 10, 18, '#f0cb8e');
    r(x - 2, 49, 2, 16, '#fff1bd');
  }
  // Screen frame and a wholly original night landscape, not a film still.
  r(105, 49, 304, 123, '#0e1020'); r(110, 52, 294, 115, '#d5c1a3');
  r(114, 56, 286, 106, '#182741');
  const sky = g.createLinearGradient(0, 56, 0, 162);
  sky.addColorStop(0, '#233253'); sky.addColorStop(.6, '#646282'); sky.addColorStop(1, '#c99b8f');
  g.fillStyle = sky; g.fillRect(116, 58, 282, 102);
  const drift = Math.floor(Math.sin(time / 9000) * 3);
  for (let i = 0; i < 24; i++) {
    const x = 122 + (i * 79 % 266), y = 64 + (i * 17 % 45);
    r(x, y, i % 5 ? 1 : 2, 1, i % 3 ? '#b6c3d7' : '#fff0c6');
  }
  r(327 + drift, 71, 14, 18, '#e8dbb5'); r(324 + drift, 74, 20, 12, '#e8dbb5');
  r(326 + drift, 70, 11, 13, '#34405e');
  poly([[116, 135], [156, 103], [197, 137], [236, 112], [280, 148], [334, 106], [398, 141], [398, 160], [116, 160]], '#4a5270');
  poly([[116, 149], [170, 129], [213, 149], [270, 133], [319, 150], [371, 128], [398, 143], [398, 160], [116, 160]], '#283b53');
  r(116, 153, 282, 7, '#203244');
  for (let i = 0; i < 9; i++) r(291 + i * 4 + drift, 154 + (i % 3) * 2, 2, 1, '#c9b5a0');
  // Velvet curtains: folds, hems and shadows rather than flat labelled blocks.
  for (const left of [64, 405]) {
    r(left, 49, 43, 128, '#4e233d');
    for (let col = 0; col < 5; col++) {
      const x = left + col * 8;
      r(x, 49, 3, 126, '#8a3d50'); r(x + 3, 49, 3, 127, '#672b45');
      r(x + 6, 49, 2, 128, '#3e1e36');
    }
    r(left, 50, 41, 3, '#b66d65'); r(left, 173, 41, 3, '#c89365');
  }
  r(61, 46, 390, 4, '#ac7b5e');
  // Original framed poster motifs by the walls.
  for (const [x, color] of [[19, '#6e9fae'], [452, '#bb808d']]) {
    r(x - 2, 90, 44, 73, '#0e1221'); r(x, 88, 40, 71, '#be956f');
    r(x + 3, 91, 34, 65, '#273248'); r(x + 6, 94, 28, 40, color);
    poly([[x + 6, 134], [x + 17, 108], [x + 25, 123], [x + 34, 115], [x + 34, 134]], '#35455c');
    r(x + 8, 141, 24, 2, '#ead5ad'); r(x + 11, 147, 18, 1, '#aa9c98');
  }
  text('SALA 01', 256, 178, 7, '#c7a78b');
  // Three rows of upholstered seats leave the central aisle open for the actor.
  for (let row = 0; row < 3; row++) {
    const y = 189 + row * 35;
    for (const x of [113, 157, 201, 282, 326, 370]) {
      r(x - 3, y + 27, 40, 4, '#151321');
      r(x + 2, y + 5, 30, 23, '#542238');
      r(x + 3, y + 1, 28, 22, '#8c3f52'); r(x + 6, y - 1, 22, 3, '#a85b64');
      r(x + 6, y + 3, 22, 15, '#ab5766'); r(x + 8, y + 4, 2, 11, '#c77b7b');
      r(x + 28, y + 4, 2, 16, '#743047');
      r(x + 5, y + 22, 25, 6, '#b25f6c'); r(x + 5, y + 28, 25, 2, '#672a42');
      r(x - 1, y + 17, 5, 12, '#372236'); r(x + 31, y + 17, 5, 12, '#372236');
      r(x - 1, y + 17, 5, 2, '#b28b6d'); r(x + 31, y + 17, 5, 2, '#b28b6d');
      r(x + 32, y + 19, 2, 2, '#171727');
    }
  }
  // Popcorn machine: glass, visible kernels, striped carton and a lit canopy.
  r(26, 236, 62, 41, '#5c2c40'); r(30, 239, 54, 34, '#824457');
  r(29, 245, 56, 2, '#ba8770'); r(24, 231, 65, 6, '#c29b77');
  r(31, 199, 42, 33, '#b58f70'); r(34, 201, 36, 28, '#43505a');
  r(36, 203, 2, 19, '#9fb6b6'); r(40, 204, 6, 11, '#687e86');
  for (let i = 0; i < 31; i++) r(37 + i * 13 % 30, 221 + i * 7 % 7, 3, 2, i % 2 ? '#ecd29a' : '#b89a67');
  r(28, 194, 49, 7, '#a15a60'); r(31, 195, 43, 1, '#e9bb8d');
  r(68, 226, 12, 11, '#f2dfb1'); r(70, 228, 2, 8, '#b74e5c'); r(76, 228, 2, 8, '#b74e5c');
  for (const [x, y] of [[69, 224], [73, 222], [77, 224]]) r(x, y, 4, 4, '#f7dfac');
  // Door and framed board keep the original poster touch target recognizable.
  r(441, 211, 43, 67, '#121b29'); r(444, 214, 37, 59, '#354651');
  r(448, 219, 29, 31, '#aa906d'); r(451, 222, 23, 25, '#e5c18f');
  for (let y = 227; y < 245; y += 5) r(454, y, 17, 1, '#8e6b59');
  r(447, 274, 31, 3, '#8f795f');
  g.textAlign = 'left';
}

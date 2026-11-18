export const DISHES = {
  omelet: {
    name: 'Tortilla casera', plate: 'omelet', minutes: 30, xp: 14, needs: {egg: 2, veg: 1},
    steps: [
      {kind: 'cut', name: 'Cortar las verduras', food: 'pepper', cuts: 5, tip: 'Desliza sobre la franja iluminada, hacia abajo o arriba. El cuchillo te ayuda a seguir la marca.'},
      {kind: 'mix', name: 'Cascar y batir', eggs: 2, turns: 3, tip: 'Toca los dos huevos. Después haz círculos en el cuenco, en cualquier sentido.'},
      {kind: 'pan', name: 'Cuajar y dar la vuelta', seconds: 12, flip: true, tip: 'Ajusta el fuego. Cuando la tortilla cuaje, desliza hacia arriba para darle la vuelta.'},
      {kind: 'plate', name: 'Emplatar la tortilla', items: ['omelet', 'pepper', 'herbs'], tip: 'Coge un ingrediente de arriba. Llévalo al plato iluminado y suelta el dedo.'}
    ]
  },
  pasta: {
    name: 'Pasta con tomate', plate: 'pasta', minutes: 35, xp: 18, needs: {pasta: 1, tomato: 1, cheese: 1},
    steps: [
      {kind: 'cut', name: 'Preparar el tomate', food: 'tomato', cuts: 5, tip: 'Corta sobre la franja iluminada. Puedes deslizar hacia abajo o arriba sin seguir una línea perfecta.'},
      {kind: 'boil', name: 'Cocer y escurrir', seconds: 12, drain: true, tip: 'Controla el hervor. Al estar lista, lleva la olla al colador de la derecha.'},
      {kind: 'sauce', name: 'Preparar la salsa', seconds: 10, turns: 2, tip: 'Ajusta el fuego y remueve con círculos, en cualquier sentido.'},
      {kind: 'plate', name: 'Pasta, salsa y queso', items: ['pasta', 'sauce', 'cheese'], tip: 'Coge pasta, salsa y queso de arriba. Suéltalos en la zona iluminada del plato.'}
    ]
  },
  chickenrice: {
    name: 'Pollo con arroz', plate: 'chickenrice', minutes: 45, xp: 23, needs: {chicken: 1, rice: 1, veg: 1},
    steps: [
      {kind: 'cut', name: 'Trocear el pollo', food: 'chicken', cuts: 6, tip: 'Desliza sobre la franja iluminada, hacia abajo o arriba, para hacer las porciones.'},
      {kind: 'wash', name: 'Lavar el arroz', turns: 3, tip: 'Haz círculos en el agua, en cualquier sentido. Puedes levantar el dedo y continuar.'},
      {kind: 'saute', name: 'Saltear el pollo', seconds: 12, turns: 2, tip: 'Mantén el fuego medio y remueve con círculos en cualquier sentido.'},
      {kind: 'plate', name: 'Montar el plato', items: ['rice', 'chicken', 'pepper'], tip: 'Coge arroz, pollo y verduras de arriba y suéltalos en el plato iluminado.'}
    ]
  }
};
export const FOOD_NAMES = {egg:'Huevos',veg:'Verduras',pasta:'Pasta',tomato:'Tomate',cheese:'Queso',chicken:'Pollo',rice:'Arroz'};
export const clamp = (n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export const cutLine = (step,index)=>(step.cuts===6?.3:.34)+index*(step.cuts===6?.065:.07);
export const servingSource = index=>({x:.2+index*.3,y:.38});
export const WORK_CENTER={x:.5,y:.60};
// Shared by recognition and drawing so the visible help matches the hit areas.
export const CUT_ASSIST={radius:.14,travel:.18,top:.32,bottom:.9};
export const SERVING_TARGET={x:.5,y:325/480,rx:.30,ry:.245};
export const PORTION_NAMES={omelet:'Tortilla',pepper:'Verduras',herbs:'Hierbas',pasta:'Pasta',sauce:'Salsa',cheese:'Queso',rice:'Arroz',chicken:'Pollo'};
export const inServingTarget=(x,y)=>Math.hypot((x-SERVING_TARGET.x)/SERVING_TARGET.rx,(y-SERVING_TARGET.y)/SERVING_TARGET.ry)<=1;
export function pickServing(x,y,plated){
  let picked=null,nearest=1;
  for(let i=0;i<3;i++){if(plated.includes(i))continue;const s=servingSource(i),d=Math.hypot((x-s.x)/.17,(y-s.y-.035)/.17);if(d<=nearest){nearest=d;picked=i;}}
  return picked;
}

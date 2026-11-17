export const DISHES = {
  omelet: {
    name: 'Tortilla casera', plate: 'omelet', minutes: 30, xp: 14, needs: {egg: 2, veg: 1},
    steps: [
      {kind: 'cut', name: 'Cortar las verduras', food: 'pepper', cuts: 5, tip: 'Desliza el cuchillo por cada marca, de arriba abajo.'},
      {kind: 'mix', name: 'Cascar y batir', eggs: 2, turns: 3, tip: 'Toca los dos huevos. Después dibuja círculos en el cuenco.'},
      {kind: 'pan', name: 'Cuajar y dar la vuelta', seconds: 12, flip: true, tip: 'Ajusta el fuego. Cuando la tortilla cuaje, desliza hacia arriba para darle la vuelta.'},
      {kind: 'plate', name: 'Emplatar la tortilla', items: ['omelet', 'pepper', 'herbs'], tip: 'Arrastra la tortilla y los dos acompañamientos hasta el plato.'}
    ]
  },
  pasta: {
    name: 'Pasta con tomate', plate: 'pasta', minutes: 35, xp: 18, needs: {pasta: 1, tomato: 1, cheese: 1},
    steps: [
      {kind: 'cut', name: 'Preparar el tomate', food: 'tomato', cuts: 5, tip: 'Sigue las marcas para cortar el tomate en trozos.'},
      {kind: 'boil', name: 'Cocer y escurrir', seconds: 12, drain: true, tip: 'Controla el hervor. Al estar lista, lleva la olla al colador de la derecha.'},
      {kind: 'sauce', name: 'Preparar la salsa', seconds: 10, turns: 2, tip: 'Ajusta el fuego y remueve dibujando círculos dentro de la sartén.'},
      {kind: 'plate', name: 'Pasta, salsa y queso', items: ['pasta', 'sauce', 'cheese'], tip: 'Coloca la pasta, añade la salsa y termina con el queso.'}
    ]
  },
  chickenrice: {
    name: 'Pollo con arroz', plate: 'chickenrice', minutes: 45, xp: 23, needs: {chicken: 1, rice: 1, veg: 1},
    steps: [
      {kind: 'cut', name: 'Trocear el pollo', food: 'chicken', cuts: 6, tip: 'Desliza siguiendo las marcas para hacer porciones regulares.'},
      {kind: 'wash', name: 'Lavar el arroz', turns: 3, tip: 'Dibuja círculos en el agua para lavar el arroz. Después se cuece mientras salteas el pollo.'},
      {kind: 'saute', name: 'Saltear el pollo', seconds: 12, turns: 2, tip: 'Mantén el fuego medio y mueve los trozos con círculos de la cuchara.'},
      {kind: 'plate', name: 'Montar el plato', items: ['rice', 'chicken', 'pepper'], tip: 'Sirve arroz, pollo dorado y verduras en el plato.'}
    ]
  }
};
export const FOOD_NAMES = {egg:'Huevos',veg:'Verduras',pasta:'Pasta',tomato:'Tomate',cheese:'Queso',chicken:'Pollo',rice:'Arroz'};
export const clamp = (n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export const cutLine = (step,index)=>(step.cuts===6?.3:.34)+index*(step.cuts===6?.065:.07);
export const servingSource = index=>({x:.2+index*.3,y:.38});
export const WORK_CENTER={x:.5,y:.60};

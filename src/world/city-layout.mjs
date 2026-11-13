// These are decorative anchors, never new native collision boxes or save data.
// Keep doorway approaches and existing hotspot centres visibly free.
export const CITY = Object.freeze({width:1180,height:922,roadsX:[256,528,800,1072],roadsY:[236,504,772]});

export function streetProps() {
  const props=[];
  const add=(sprite,x,y,h,extra={})=>props.push({sprite,x,y,h,...extra});
  for(let row=0;row<3;row++)for(let col=0;col<4;col++){
    const x=col*272,y=row*268;
    add((row+col)%3===1?'jacaranda':'plane-tree',x+43,y+169,66);
    add('lamp',x+222,y+206,48,{light:true});
    add('flower-planter',x+87,y+211,16);
    add('flower-planter',x+189,y+211,16);
    if(col!==0||row!==2)add('bench',x+211,y+139,22);
    add('bin',x+226,y+168,20);
    if((row+col)%2===0)add('bicycle',x+220,y+113,25);
  }
  // A small garden at the park, with open north/south and east/west paths.
  add('plane-tree',92,394,63);add('jacaranda',185,389,58);
  add('cypress',66,436,59);add('bench',95,445,20);
  add('flower-planter',179,445,17);
  for(const x of [73,205]){add('flower-planter',x,665,20);add('hedge',x,707,17);}
  for(let i=0;i<4;i++){
    add(i%2?'jacaranda':'plane-tree',40+i*272,904,65);
    add('lamp',242+i*272,891,48,{light:true});
  }
  for(const x of CITY.roadsX)for(const y of CITY.roadsY){
    add('traffic-light',x-13,y-8,31,{axis:'y'});
    add('traffic-light',x+67,y+73,31,{axis:'x'});
    add('bollard',x-21,y+75,11);add('bollard',x+69,y-13,11);
  }
  return props;
}

export const SPOT_SPRITES=Object.freeze({flores:'flower-cart',banco:'bench',perro:'dog',
  librero:'book-cart',terraza:'terrace',puesto:'produce-cart',fuente:'fountain'});

// Pure traffic model. It never advances the game clock, charges money or touches
// the player's path. Each direction stays inside its own asphalt lane.
export function createTraffic() {
  const cars=[];
  for(const [i,x] of CITY.roadsX.entries()){
    cars.push({axis:'y',lane:x+14,position:90+i*197,direction:1,speed:23+i*2,sprite:'car-down'});
    cars.push({axis:'y',lane:x+40,position:590-i*121,direction:-1,speed:27+i*2,sprite:'car-up'});
  }
  for(const [i,y] of CITY.roadsY.entries()){
    cars.push({axis:'x',lane:y+14,position:60+i*287,direction:1,speed:30+i*2,sprite:'car-right'});
    cars.push({axis:'x',lane:y+40,position:850-i*173,direction:-1,speed:25+i*3,sprite:'car-left'});
  }
  return cars;
}

export const greenAxis=now=>Math.floor(now/8000)%2===0?'x':'y';

export function stepTraffic(cars,dt,now,night=false) {
  const green=greenAxis(now);
  for(const car of cars){
    const length=car.axis==='x'?CITY.width:CITY.height;
    let next=car.position+Math.max(0,Math.min(.12,dt))*car.speed*(night?.7:1)*car.direction;
    if(car.axis!==green){
      const crossings=car.axis==='x'?CITY.roadsX:CITY.roadsY;
      for(const crossing of crossings){
        const line=car.direction===1?crossing-24:crossing+79;
        if(car.direction===1&&car.position<=line&&next>line)next=line;
        if(car.direction===-1&&car.position>=line&&next<line)next=line;
      }
    }
    if(next>length+60)next=-60;
    if(next<-60)next=length+60;
    car.position=next;
  }
  return cars;
}

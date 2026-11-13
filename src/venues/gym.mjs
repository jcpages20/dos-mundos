// Original scenery. The existing scene draws JC/Gabi and its touch targets.
export function drawGym(g, time, gameTime = 480) {
  const r=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),w,h);};
  const line=(x,y,xx,yy,c,width=2)=>{g.strokeStyle=c;g.lineWidth=width;g.beginPath();g.moveTo(x,y);g.lineTo(xx,yy);g.stroke();};
  const poly=(p,c)=>{g.fillStyle=c;g.beginPath();g.moveTo(...p[0]);for(const v of p.slice(1))g.lineTo(...v);g.closePath();g.fill();};
  const text=(s,x,y,size,c)=>{g.font=`bold ${size}px monospace`;g.fillStyle=c;g.textAlign='center';g.fillText(s,x,y);};
  r(0,0,512,320,'#172d37');r(9,10,494,169,'#496568');
  for(let y=14;y<176;y+=13){r(10,y,492,1,'#557171');for(let x=15+(y%26);x<500;x+=42)r(x,y,1,12,'#3f5b60');}
  r(10,173,492,7,'#c9b78e');r(10,180,492,4,'#243945');r(0,184,512,136,'#35494e');
  for(let y=186;y<320;y+=24)for(let x=0;x<512;x+=32){r(x+(y%48?0:16),y,30,22,'#3b5053');r(x+5,y+5,1,1,'#60716b');r(x+17,y+13,2,1,'#273e45');}
  poly([[22,195],[189,195],[206,288],[11,288]],'#293b43');
  poly([[323,195],[489,195],[503,288],[307,288]],'#293b43');
  r(209,264,94,2,'#a6b6a0');r(218,268,76,1,'#536c68');
  r(139,17,234,27,'#213a45');r(141,18,230,1,'#8fb6ad');text('C L U B   A T L A S',256,35,14,'#e5dfbb');
  // Mirror wall, reflected lights and exercise equipment.
  for(const x of [28,188,348]){
    r(x,60,136,104,'#203744');r(x+3,63,130,98,'#8eaaac');
    const shine=g.createLinearGradient(x,64,x+130,161);shine.addColorStop(0,'#bdd0c7');shine.addColorStop(1,'#789899');
    g.fillStyle=shine;g.fillRect(x+5,65,126,94);
    poly([[x+8,65],[x+39,65],[x+87,159],[x+61,159]],'#e0e7d329');
    r(x+8,148,120,7,'#6b888b');r(x+8,91,117,2,'#d7e2cd');
    r(x+24,117,3,31,'#597c81');r(x+102,117,3,31,'#597c81');r(x+24,121,81,3,'#5e8083');
    r(x+4,64,128,1,'#e2e7d6');r(x+133,64,1,97,'#65898b');
  }
  for(const x of [84,256,426]){r(x-28,49,56,4,'#b5c3b2');r(x-24,50,48,2,'#f0e5bf');}
  // Clock follows the game, not the device.
  r(455,18,34,28,'#20333e');r(458,21,28,22,'#cdd6bf');
  text(String(Math.floor(gameTime/60)%24).padStart(2,'0')+':'+String(Math.floor(gameTime)%60).padStart(2,'0'),472,35,7,'#36565c');
  for(const x of [39,407]){
    r(x-9,20,20,23,'#2b454e');r(x-7,22,16,18,'#71908e');
    for(let i=0;i<3;i++){const a=time/1800+i*Math.PI*2/3;line(x+1,31,x+1+Math.cos(a)*6,31+Math.sin(a)*6,'#c0cec0',3);}
    r(x,30,3,3,'#2b454e');
  }
  // Two-tier dumbbell rack, chrome handles and graduated plates.
  for(const y of [176,197]){
    r(31,y+12,151,5,'#172d37');r(34,y+12,144,1,'#a0b8af');
    for(let i=0;i<7;i++){const x=40+i*19,size=6+Math.floor(i/3);r(x,y+5,14,3,'#b1c3bd');r(x-2,y+1,5,size+5,'#152a35');r(x+11,y+1,5,size+5,'#152a35');r(x-1,y+1,2,2,'#5b7b80');}
  }
  r(36,190,4,45,'#9aafaa');r(172,190,4,45,'#9aafaa');
  // Upholstered bench and racked barbell.
  r(71,267,101,7,'#20323a');r(83,249,4,23,'#a2b4ac');r(156,249,4,23,'#a2b4ac');
  r(75,239,90,12,'#172f38');r(77,237,86,8,'#578c86');r(80,238,80,2,'#88b1a0');
  r(69,215,4,29,'#bac9bc');r(167,215,4,29,'#bac9bc');r(57,215,126,3,'#c4d2c5');
  for(const x of [61,67,169,175]){r(x,205,5,23,'#1a2f3a');r(x,206,2,19,'#49676b');}
  // Moving belts and lit consoles.
  for(const x of [333,398]){
    poly([[x,247],[x+38,247],[x+48,266],[x+3,266]],'#142c38');
    poly([[x+4,248],[x+34,248],[x+42,262],[x+7,262]],'#506b70');
    for(let j=0;j<4;j++){const y=249+((j*4+Math.floor(time/220))%14);line(x+6,y,x+36,y,'#78918a',1);}
    line(x+1,248,x+8,207,'#b4c6ba',3);line(x+39,248,x+35,207,'#b4c6ba',3);
    r(x+7,200,30,13,'#243e49');r(x+10,202,24,7,'#84b5aa');r(x+13,204,9,2,'#cee0bd');r(x+26,204,5,2,'#cee0bd');
  }
  // Mat, towels, bottle, training board and lockers.
  r(219,225,76,29,'#1f3c49');r(222,222,70,27,'#9ea794');r(225,225,64,1,'#cbd1ae');
  for(let y=229;y<247;y+=5)r(225,y,64,1,'#849789');
  r(280,211,9,13,'#769f9d');r(282,208,5,3,'#c4d2bb');r(282,214,2,7,'#bdd4c2');
  r(225,213,25,9,'#d4cbb1');r(228,215,19,2,'#ebe0bd');
  r(446,171,38,39,'#152e3a');r(449,174,32,33,'#b49c77');r(452,177,26,26,'#d3cfad');
  for(let y=181;y<201;y+=6){r(455,y,3,3,'#6e958e');r(462,y+1,12,1,'#7c8e80');}
  for(const x of [25,45,465,485]){r(x,250,16,36,'#5d7b7b');r(x+2,252,12,32,'#77918b');r(x+11,266,2,3,'#d1c49f');r(x+4,255,8,1,'#395c64');}
  text('FUERZA',111,299,8,'#b9c9b5');text('RESPIRA',259,299,8,'#b9c9b5');text('CARDIO',382,299,8,'#b9c9b5');g.textAlign='left';
}

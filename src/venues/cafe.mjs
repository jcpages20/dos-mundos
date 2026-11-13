// Original café art. Choice names come from the existing seven café activities.
export function drawCafe(g,time,gameTime=480,choice='coffee'){
  const r=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),w,h);};
  const line=(x,y,xx,yy,c,width=1)=>{g.strokeStyle=c;g.lineWidth=width;g.beginPath();g.moveTo(x,y);g.lineTo(xx,yy);g.stroke();};
  const poly=(p,c)=>{g.fillStyle=c;g.beginPath();g.moveTo(...p[0]);for(const v of p.slice(1))g.lineTo(...v);g.closePath();g.fill();};
  const text=(s,x,y,size,c)=>{g.font=`bold ${size}px monospace`;g.fillStyle=c;g.textAlign='center';g.fillText(s,x,y);};
  const hour=(gameTime/60)%24,night=hour>=20||hour<6;
  r(0,0,512,320,'#433938');r(10,12,492,163,'#c0a688');
  for(let y=14;y<172;y+=13){r(10,y,492,1,'#b49b80');for(let x=12+(y%26);x<500;x+=39)r(x,y,1,12,'#af967e');}
  r(10,172,492,7,'#53685a');r(10,179,492,4,'#354d49');
  // Warm parquet with knots, thin joints and rugs under the tables.
  r(0,183,512,137,'#9b7459');
  for(let y=185;y<320;y+=17)for(let x=-20+(y%34?0:38);x<512;x+=76){r(x,y,74,15,'#aa8161');r(x+3,y+4,61,1,'#b98d68');r(x+19,y+10,37,1,'#936d55');r(x+8,y+8,5,1,'#86634e');}
  r(210,235,194,63,'#62766a');r(215,239,184,55,'#82917a');
  for(let x=219;x<395;x+=7){r(x,242,3,1,'#b9b69a');r(x,289,3,1,'#b9b69a');}
  // Window: rooftops and slow clouds, transitioning with the game's hour.
  r(24,35,133,123,'#654f42');r(28,39,125,115,'#e4cfaa');r(33,44,115,105,night?'#233a53':'#9cbdc0');
  if(night){for(let i=0;i<13;i++)r(37+i*29%105,48+i*17%45,1,1,'#e3dcad');r(119,53,12,14,'#e9dab0');r(117,55,12,11,'#233a53');}
  else{r(111,54,17,15,'#f2dfac');const cloud=Math.floor(Math.sin(time/9500)*6);r(48+cloud,59,39,4,'#e3e1ca');r(57+cloud,56,20,4,'#e3e1ca');}
  for(let i=0;i<6;i++){const x=35+i*19,y=106+(i%3)*8;r(x,y,20,43,'#7f8c8c');poly([[x-2,y],[x+9,y-10],[x+22,y]],'#a26d60');for(let k=0;k<2;k++)r(x+5+k*8,y+9,3,5,night?'#e2c18d':'#c2c3a3');}
  r(86,42,4,109,'#e8d6b5');r(32,94,117,4,'#e8d6b5');r(25,151,133,7,'#d5b58d');
  // Shelves of cups, jars, coffee beans and a framed chalk menu.
  r(181,43,134,74,'#4e6960');
  for(const y of [67,101]){r(177,y,143,5,'#775743');r(180,y,137,1,'#d2b187');for(let i=0;i<7;i++){const x=185+i*19;r(x,y-17,12,16,i%3===0?'#b8b69a':i%3===1?'#b88165':'#e5d4af');r(x+2,y-20,8,3,'#574f45');r(x+3,y-12,6,5,'#d6c6a3');}}
  r(342,30,137,82,'#745b45');r(346,34,129,74,'#2d5049');r(348,36,125,70,'#365b50');
  text('CAFÉ LUNA',410,51,11,'#f1e1bc');text('CAFÉ  ·  TARTA',410,68,8,'#d3ddbd');text('UN RATO PARA TI',410,87,7,'#d3ddbd');
  // Pendants cast soft pools of light.
  for(const x of [100,257,421]){
    r(x,0,2,22,'#5f5546');poly([[x-13,22],[x+15,22],[x+20,34],[x-18,34]],'#48675d');r(x-17,34,36,3,'#e6c38f');
    const glow=g.createRadialGradient(x,38,1,x,38,66);glow.addColorStop(0,'#ffdf9a2e');glow.addColorStop(1,'#ffdf9a00');g.fillStyle=glow;g.fillRect(x-66,28,132,120);
  }
  // Counter, espresso machine and pastry display, all with visible contents.
  r(21,194,165,24,'#624735');r(24,151,159,55,'#a17c58');
  for(let x=29;x<180;x+=17){r(x,157,12,43,'#b68b63');r(x+2,158,1,40,'#c79a6f');}
  r(18,145,172,9,'#e2c399');r(20,146,168,2,'#f3dcaf');
  r(31,112,62,32,'#40545a');r(34,108,56,7,'#8daba4');r(36,116,52,20,'#78928d');
  r(41,119,42,8,'#c0c7b0');r(43,120,7,3,'#36545b');r(62,121,4,3,'#d2a66f');r(74,121,4,3,'#d2a66f');
  for(const x of [48,70]){r(x,130,3,6,'#c4cbb6');r(x-4,136,11,8,'#eee0bc');r(x+6,137,3,4,'#eee0bc');r(x-2,136,7,2,'#795644');}
  r(99,118,75,26,'#6a5a48');r(102,115,69,25,'#91aaa0');r(104,117,65,21,'#b8c5ab');r(108,118,2,16,'#e4e4c4');
  for(let i=0;i<5;i++){const x=111+i*11;r(x,130,8,5,i%2?'#d29b61':'#d9b57a');r(x+2,128,4,3,'#edd09b');r(x+3,131,2,1,'#ac7b53');}
  r(151,125,12,12,'#e9c7a0');r(152,122,10,4,'#d08f87');r(155,119,4,3,'#9d5558');
  // Plant beside the counter and a climbing plant by the window.
  for(const [x,y] of [[31,239],[470,219]]){r(x-9,y,21,23,'#a27157');r(x-10,y,23,4,'#c38d66');r(x,y-29,3,32,'#4e6e51');for(let i=0;i<5;i++){const xx=x+(i%2?8:-9),yy=y-9-i*5;r(xx,yy,11,6,i%2?'#7f9d69':'#527b58');r(xx+3,yy-3,5,4,'#8ca875');}}
  // Tables and chairs, with cups, plates and a notebook.
  const cup=(x,y)=>{r(x-8,y+8,22,3,'#d8c6a4');r(x-4,y-2,13,11,'#f0e0bd');r(x+9,y,4,5,'#f0e0bd');r(x-1,y-2,8,2,'#77503e');};
  for(const [x,y] of [[237,204],[371,210],[305,267]]){
    r(x-18,y+23,41,6,'#624f3d');r(x-13,y+5,5,21,'#69523d');r(x+15,y+5,5,21,'#69523d');
    r(x-29,y-14,65,22,'#6a513d');r(x-31,y-17,65,20,'#c0976a');r(x-27,y-15,57,1,'#e0b682');
    for(const dx of [-43,43]){r(x+dx-10,y-5,20,24,'#755f46');r(x+dx-8,y-3,16,12,'#8b9a76');r(x+dx-9,y+19,3,13,'#70563f');r(x+dx+7,y+19,3,13,'#70563f');}
    cup(x-3,y-25);
  }
  r(384,184,13,7,'#8c6c4d');r(386,181,9,4,'#c68a69');
  // Every activity alters the table detail without changing its game effects.
  if(choice==='laptop'){r(310,230,29,18,'#3b5660');r(313,232,23,12,'#8ebcbb');r(307,248,35,3,'#c9cfb5');r(315,235,13,1,'#dce5c9');}
  if(choice==='journal'){r(312,239,23,13,'#ede0b5');r(323,239,1,13,'#bfae83');line(335,239,341,250,'#81544b',2);}
  if(choice==='dessert'||choice==='date'){r(315,242,19,9,'#e4c5a0');r(317,238,15,5,'#bd7d7e');r(320,235,8,3,'#f0ddba');}
  if(choice==='talk'||choice==='date')cup(327,239);
  // Steam moves gently above the machine and cups.
  for(const [x,y] of [[51,126],[235,173],[369,179],[303,236]])for(let i=0;i<3;i++){
    const rise=(time/120+i*5)%18,sway=Math.sin(time/650+i)*2;
    r(x+sway+i*3,y-rise,2,3,night?'#e9dcb15c':'#fff0cc70');
  }
  // Radio, records and soft notes during the musical activity.
  r(423,133,45,20,'#71533d');r(427,136,18,14,'#b69c72');r(431,139,10,8,'#4e5d52');r(450,137,13,4,'#aab39a');r(452,144,4,4,'#cfb18a');
  if(choice==='music'){const rise=Math.floor(time/250)%12;text('♪',448,124-rise,13,'#cbbd8f');text('♫',465,112-rise,10,'#b3c29c');}
  if(night){r(10,184,492,134,'#233c4c12');}
  g.textAlign='left';
}

(() => {
'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const W=960,H=540,worldW=5240,groundY=444;
const ui={overlay:document.getElementById('overlay'),start:document.getElementById('start'),title:document.getElementById('title'),desc:document.getElementById('description'),eye:document.getElementById('eyebrow'),foot:document.getElementById('footnote'),hearts:document.getElementById('hearts'),count:document.getElementById('count'),lantern:document.getElementById('lanternhud'),toast:document.getElementById('toast')};
const keys={left:false,right:false,jump:false};
let mode='title',last=0,elapsed=0,camera=0,toastTimer=0,screenShake=0;
const platforms=[
 {x:250,y:355,w:130},{x:535,y:315,w:145},{x:780,y:365,w:110},
 {x:1050,y:350,w:145},{x:1290,y:300,w:130},{x:1515,y:360,w:150},
 {x:1780,y:320,w:130},{x:2015,y:355,w:150},{x:2310,y:300,w:130},
 {x:2565,y:350,w:160},{x:2820,y:310,w:130},{x:3060,y:355,w:160},
 {x:3350,y:305,w:140},{x:3590,y:350,w:160},{x:3880,y:300,w:130},
 {x:4140,y:350,w:150},{x:4420,y:305,w:150},{x:4680,y:350,w:130}
];
const ground=[[0,900],[1010,1730],[1840,2540],[2630,3350],[3440,4210],[4300,5240]];
const shards=[{x:320,y:316},{x:600,y:277},{x:1120,y:310},{x:1360,y:259},{x:1620,y:320},{x:2080,y:312},{x:2370,y:258},{x:2700,y:307},{x:3120,y:312},{x:3400,y:264},{x:3670,y:306},{x:3950,y:260},{x:4200,y:310},{x:4490,y:265},{x:4770,y:310}].map(s=>({...s,got:false,phase:Math.random()*6}));
const enemyStart=[{x:470},{x:850},{x:1160},{x:1570},{x:1960},{x:2220},{x:2750},{x:3000},{x:3500},{x:3820},{x:4370},{x:4600}];
let enemies=[];
const player={x:100,y:390,w:27,h:39,vx:0,vy:0,grounded:false,facing:1,hp:3,shards:0,invuln:0,lantern:0,checkpoint:100,stomp:0};
function resetGame(){player.x=100;player.y=390;player.vx=player.vy=0;player.hp=3;player.shards=0;player.invuln=0;player.lantern=0;player.checkpoint=100;camera=0;shards.forEach(s=>s.got=false);enemies=enemyStart.map((e,i)=>({x:e.x,y:groundY-28,w:31,h:27,vx:i%2?-.72:.72,alive:true,stun:0,home:e.x,phase:i}));}
function startGame(){resetGame();mode='play';ui.overlay.classList.add('hidden');last=performance.now();}
ui.start.addEventListener('click',()=>{if(mode==='pause'){mode='play';ui.overlay.classList.add('hidden');last=performance.now();return;}if(mode==='dead'||mode==='win')ui.eye.textContent='A LOST LEVEL • 1993';startGame()});
function showEnd(win){mode=win?'win':'dead';ui.eye.textContent=win?'YOU MADE IT OUT':'THE DARK FOUND YOU';ui.title.innerHTML=win?'THE<br><em>DAWN</em>':'GAME<br><em>OVER</em>';ui.desc.textContent=win?'The gate groans shut behind you. Somewhere, a coin keeps spinning. You got out—with all the stars the night would let you carry.':'The level resets. The dark doesn’t. Take a breath, then try the castle again.';ui.start.textContent=win?'PLAY AGAIN  →':'TRY AGAIN  →';ui.foot.textContent=win?'THANK YOU FOR PLAYING • THE END':'TIP: STOMP THE SHADOWS OR FLASH YOUR LANTERN';ui.overlay.classList.remove('hidden');}
function message(text){ui.toast.textContent=text;ui.toast.classList.add('show');toastTimer=1.6;}
function pressAction(key){if(key==='jump'){keys.jump=true;if(mode==='play'&&player.grounded){player.vy=-575;player.grounded=false;player.stomp=0;}}if(key==='pulse'&&mode==='play'&&player.lantern<=0){player.lantern=4;screenShake=5;enemies.forEach(e=>{if(e.alive&&Math.abs(e.x-player.x)<190){e.stun=2.3;e.vx=Math.sign(e.x-player.x||1)*1.5;}});message('THE LANTERN PUSHES BACK THE DARK');}}
function setKey(e,down){let k=e.key.toLowerCase();if(['arrowleft','a'].includes(k)){keys.left=down;e.preventDefault()}else if(['arrowright','d'].includes(k)){keys.right=down;e.preventDefault()}else if([' ','arrowup','w'].includes(k)){if(down&&!keys.jump)pressAction('jump');keys.jump=down;e.preventDefault()}else if(k==='x'&&down&&!e.repeat)pressAction('pulse');else if(k==='escape'&&down&&mode==='play'){mode='pause';ui.eye.textContent='TAKE A BREATH';ui.title.innerHTML='PAUSED';ui.desc.textContent='The night can wait. Pick up where you left off when you’re ready.';ui.start.textContent='RESUME  →';ui.overlay.classList.remove('hidden');}}
window.addEventListener('keydown',e=>setKey(e,true));window.addEventListener('keyup',e=>setKey(e,false));window.addEventListener('blur',()=>{keys.left=keys.right=keys.jump=false});
document.querySelectorAll('.touch button').forEach(b=>{const key=b.dataset.key;const down=e=>{e.preventDefault();if(key==='left'||key==='right')keys[key]=true;else pressAction(key)};const up=e=>{e.preventDefault();if(key==='left'||key==='right')keys[key]=false;if(key==='jump')keys.jump=false};b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',up)});
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function update(dt){elapsed+=dt;if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)ui.toast.classList.remove('show')}
 if(mode!=='play')return;
 player.invuln=Math.max(0,player.invuln-dt);player.lantern=Math.max(0,player.lantern-dt);player.stomp=Math.max(0,player.stomp-dt);
 const dir=(keys.right?1:0)-(keys.left?1:0);if(dir){player.vx+=dir*1900*dt;player.facing=dir}else player.vx*=Math.pow(.001,dt);player.vx=clamp(player.vx,-245,245);
 const oldY=player.y;player.x=clamp(player.x+player.vx*dt,0,worldW-player.w);player.vy=Math.min(800,player.vy+1500*dt);player.y+=player.vy*dt;player.grounded=false;
 if(player.vy>=0){let land=null;const px=player.x+player.w*.72;for(const [a,b] of ground)if(px>a&&player.x+player.w*.28<b&&oldY+player.h<=groundY+5&&player.y+player.h>=groundY){land=groundY;break}for(const p of platforms)if(player.x+player.w>p.x&&player.x<p.x+p.w&&oldY+player.h<=p.y+5&&player.y+player.h>=p.y){if(land===null||p.y<land)land=p.y}if(land!==null){player.y=land-player.h;player.vy=0;player.grounded=true;}}
 if(player.y>H+220){damage(true)}
 for(const s of shards){if(s.got)continue;const sy=s.y+Math.sin(elapsed*2+s.phase)*6;if(Math.abs(player.x+14-s.x)<27&&Math.abs(player.y+18-sy)<32){s.got=true;player.shards++;ui.count.textContent=String(player.shards).padStart(2,'0')+' / 08';screenShake=3;message(player.shards>=8?'THE GATE IS OPEN. KEEP MOVING.':'STAR-SHARD FOUND  •  '+player.shards+'/8');}}
 for(const e of enemies){if(!e.alive)continue;e.stun=Math.max(0,e.stun-dt);if(e.stun<=0){e.x+=e.vx*65*dt;if(Math.abs(e.x-e.home)>105)e.vx*=-1;}const overlap=player.x+player.w>e.x+3&&player.x<e.x+e.w-3&&player.y+player.h>e.y+3&&player.y<e.y+e.h;if(overlap){if(player.vy>80&&player.y+player.h<e.y+19){e.alive=false;player.vy=-350;player.stomp=.2;screenShake=4;message('SQUASH. IT DIDN’T SOUND RIGHT.')}else if(player.invuln<=0)damage(false);}}
 if(player.x>4900&&player.shards>=8){showEnd(true);return;}if(player.x>4880&&player.shards<8&&Math.random()<dt*.8)message('THE GATE NEEDS MORE STAR-SHARDS');
 if(player.x>2350&&player.checkpoint<2350){player.checkpoint=2350;message('CHECKPOINT • THE RUINED BRIDGE');}
 camera=clamp(player.x-W*.36,0,worldW-W);ui.hearts.innerHTML='♥'.repeat(player.hp)+'<span style="color:#625653">'+'♥'.repeat(3-player.hp)+'</span>';ui.lantern.innerHTML='LANTERN <b>'+(player.lantern>0?player.lantern.toFixed(1)+'s':'READY')+'</b>';if(screenShake>0)screenShake=Math.max(0,screenShake-dt*14);
}
function damage(fall){if(player.invuln>0&&!fall)return;player.hp--;screenShake=10;if(player.hp<=0){showEnd(false);return}player.invuln=1.45;if(fall){player.x=player.checkpoint;player.y=groundY-player.h-5;player.vx=0;player.vy=0;}else{player.vy=-300;player.vx=-player.facing*190;message('KEEP MOVING. DON’T LOOK BACK.')}}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
function drawBackground(){let g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#111722');g.addColorStop(.55,'#25232a');g.addColorStop(1,'#15141a');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 // moon halo
 let mg=ctx.createRadialGradient(745-camera*.025,132,5,745-camera*.025,132,250);mg.addColorStop(0,'#c4b8a344');mg.addColorStop(1,'#b9a98a00');ctx.fillStyle=mg;ctx.fillRect(400,0,550,390);ctx.fillStyle='#ded1b2';ctx.globalAlpha=.72;ctx.beginPath();ctx.arc(744-camera*.025,132,34,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
 // stars
 for(let i=0;i<60;i++){let x=((i*173+55-camera*.08)%1100+1100)%1100,y=28+(i*79%240);ctx.globalAlpha=.2+(i%4)*.12;rect(x,y,2,2,'#e5d7b8')}ctx.globalAlpha=1;
 // distant hills
 for(let layer=0;layer<3;layer++){let par=.12+layer*.1;ctx.fillStyle=['#191d26','#171a21','#12161d'][layer];ctx.beginPath();ctx.moveTo(0,H);for(let x=-100;x<=W+100;x+=80){let wx=x+camera*par;let yy=315+layer*42+Math.sin(wx*.006+layer)*30+Math.sin(wx*.015)*17;ctx.lineTo(x,yy)}ctx.lineTo(W,H);ctx.closePath();ctx.fill();}
 // haunted trees
 for(let i=0;i<19;i++){let wx=i*330+90,x=wx-camera*.34;if(x<-100||x>W+100)continue;let hh=100+(i*47%115),base=427;ctx.fillStyle=i%2?'#0c1118':'#10131a';ctx.beginPath();ctx.moveTo(x-20,base);ctx.lineTo(x-10,base-hh*.48);ctx.lineTo(x-40,base-hh*.74);ctx.lineTo(x-9,base-hh*.67);ctx.lineTo(x,base-hh);ctx.lineTo(x+10,base-hh*.66);ctx.lineTo(x+42,base-hh*.82);ctx.lineTo(x+21,base-hh*.57);ctx.lineTo(x+31,base);ctx.closePath();ctx.fill();rect(x-4,base-hh*.36,8,hh*.36,'#0c1118');}
 // fog bands
 for(let i=0;i<4;i++){ctx.globalAlpha=.035;ctx.fillStyle=i%2?'#c5c6c2':'#9da8ac';ctx.beginPath();ctx.ellipse(((i*309+elapsed*11-camera*.15)%1200)-100,390+i*27,260,14,0,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
}
function drawTerrain(){ctx.save();ctx.translate(-camera,0);
 for(const [a,b] of ground){rect(a,groundY,b-a,H-groundY,'#28252a');rect(a,groundY,b-a,9,'#51433d');rect(a,groundY+9,b-a,3,'#211d21');for(let x=a+8;x<b;x+=38){rect(x,groundY+22,18,3,'#343034');rect(x+13,groundY+50,16,2,'#1c1b20');}for(let x=a+18;x<b;x+=76){rect(x,groundY-8,3,7,'#667257');rect(x+3,groundY-6,5,5,'#4e5948')}}
 for(const p of platforms){rect(p.x,p.y,p.w,17,'#393238');rect(p.x,p.y,p.w,5,'#76604c');rect(p.x,p.y+5,p.w,3,'#48403d');for(let x=p.x+12;x<p.x+p.w-5;x+=32)rect(x,p.y+11,16,3,'#2d292e');}
 // background gravestones
 for(let x=90;x<worldW;x+=307){let gx=x+((x*13)%45);if(ground.some(([a,b])=>gx>a&&gx<b)){ctx.fillStyle='#303138';ctx.beginPath();ctx.roundRect(gx,groundY-44,22,44,10);ctx.fill();rect(gx+10,groundY-32,2,16,'#49474b');rect(gx+4,groundY-25,14,2,'#49474b');}}
 // mushrooms, just a few wrong-looking red caps
 for(let x=500;x<worldW;x+=650){let y=groundY-4;rect(x+8,y-22,7,22,'#b2a288');ctx.fillStyle='#8c4649';ctx.beginPath();ctx.ellipse(x+11,y-22,20,10,0,Math.PI,0);ctx.fill();rect(x+5,y-23,5,3,'#d58d74');}
 // shard pickups
 for(const s of shards){if(s.got)continue;const y=s.y+Math.sin(elapsed*2+s.phase)*6;ctx.save();ctx.translate(s.x,y);ctx.rotate(elapsed*.65+s.phase);ctx.shadowBlur=18;ctx.shadowColor='#f6cc73';ctx.fillStyle='#f6d681';ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(9,0);ctx.lineTo(0,12);ctx.lineTo(-9,0);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#fff4c4';ctx.fillRect(-2,-6,3,8);ctx.restore();}
 // exit gate
 const gate=4940;ctx.fillStyle=player.shards>=8?'#d8c17c':'#3e4148';ctx.fillRect(gate,groundY-100,18,100);ctx.fillRect(gate+88,groundY-100,18,100);ctx.fillRect(gate,groundY-105,106,13);ctx.fillStyle=player.shards>=8?'#f1cb73':'#51545b';ctx.fillRect(gate+31,groundY-75,44,75);ctx.fillStyle='#16171c';ctx.fillRect(gate+36,groundY-69,34,69);if(player.shards>=8){ctx.fillStyle='#f3cb73';ctx.beginPath();ctx.arc(gate+53,groundY-40,4,0,Math.PI*2);ctx.fill()}else{ctx.fillStyle='#a35654';ctx.fillRect(gate+47,groundY-54,3,18);ctx.fillRect(gate+41,groundY-48,15,3)}
 // enemies
 for(const e of enemies){if(!e.alive)continue;ctx.save();if(e.stun>0)ctx.globalAlpha=.55+.3*Math.sin(elapsed*25);let x=e.x,y=e.y;ctx.shadowBlur=e.stun>0?22:8;ctx.shadowColor=e.stun>0?'#ffe293':'#000';ctx.fillStyle='#090b10';ctx.beginPath();ctx.ellipse(x+15,y+17,16,12,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#17171c';ctx.beginPath();ctx.moveTo(x+3,y+13);ctx.lineTo(x+4,y+2);ctx.lineTo(x+12,y+10);ctx.lineTo(x+21,y+8);ctx.lineTo(x+28,y-1);ctx.lineTo(x+29,y+15);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.fillStyle=e.stun>0?'#fff1b5':'#e15a52';ctx.fillRect(x+21,y+10,3,3);ctx.fillRect(x+26,y+12,2,2);ctx.fillStyle='#b9a991';ctx.fillRect(x+8,y+24,6,3);ctx.fillRect(x+22,y+23,6,3);ctx.restore();}
 // hero sprite
 drawHero();ctx.restore();}
function drawHero(){const x=player.x,y=player.y;ctx.save();if(player.invuln>0&&Math.floor(elapsed*16)%2===0)ctx.globalAlpha=.36;const step=player.grounded&&Math.abs(player.vx)>25?Math.sin(elapsed*18)*2:0;
 // shadow
 ctx.globalAlpha*=.35;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(x+14,groundY+3,17,5,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=player.invuln>0&&Math.floor(elapsed*16)%2===0?.36:1;
 // boots
 rect(x+3,y+32+step,10,7,'#291c21');rect(x+16,y+32-step,10,7,'#291c21');rect(x+1,y+36+step,13,3,'#a85b47');rect(x+15,y+36-step,13,3,'#a85b47');
 // overalls
 rect(x+5,y+21,18,13,'#405466');rect(x+3,y+23,7,10,'#405466');rect(x+17,y+23,8,10,'#405466');rect(x+8,y+25,3,3,'#b89c65');rect(x+18,y+25,3,3,'#b89c65');
 // face and hair
 rect(x+7,y+9,17,14,'#dfad7f');rect(x+4,y+13,4,8,'#c58d6c');rect(x+20,y+6,7,14,'#38272a');rect(x+8,y+7,15,4,'#352427');rect(x+9,y+12,3,4,'#211c20');rect(x+21,y+14,3,2,'#553c36');
 // cap (not a familiar logo)
 rect(x+4,y+4,20,6,'#a73f43');rect(x+8,y,15,6,'#c44c4b');rect(x+15,y+4,4,2,'#e9bd73');
 // lantern
 rect(x+(player.facing>0?24:-4),y+23,6,7,'#9b7954');rect(x+(player.facing>0?25:-3),y+24,4,4,'#f1cf7c');if(player.lantern>0){ctx.globalAlpha=.16;let hg=ctx.createRadialGradient(x+14,y+20,10,x+14,y+20,130);hg.addColorStop(0,'#f5d477');hg.addColorStop(1,'#f5d47700');ctx.fillStyle=hg;ctx.fillRect(x-130,y-100,290,280);ctx.globalAlpha=1;}ctx.restore();}
function drawEffects(){// screen-space lighting and CRT softness
 const dark=ctx.createRadialGradient(W/2,H*.49,120,W/2,H*.49,650);dark.addColorStop(0,'#00000000');dark.addColorStop(.75,'#05070b22');dark.addColorStop(1,'#03050ad9');ctx.fillStyle=dark;ctx.fillRect(0,0,W,H);
 // scan lines
 ctx.globalAlpha=.065;for(let y=0;y<H;y+=4)ctx.fillRect(0,y,W,1);ctx.globalAlpha=1;
 // lantern glow around player
 if(mode==='play'&&player.lantern>0){const hx=player.x-camera+14,hy=player.y+17;const light=ctx.createRadialGradient(hx,hy,8,hx,hy,170);light.addColorStop(0,'#f4d78122');light.addColorStop(1,'#f4d78100');ctx.fillStyle=light;ctx.fillRect(hx-170,hy-170,340,340)}
 // subtle top shadow
 let vg=ctx.createLinearGradient(0,0,0,100);vg.addColorStop(0,'#0008');vg.addColorStop(1,'#0000');ctx.fillStyle=vg;ctx.fillRect(0,0,W,100);
}
function draw(){ctx.save();if(screenShake>0)ctx.translate((Math.random()-.5)*screenShake,(Math.random()-.5)*screenShake);drawBackground();drawTerrain();drawEffects();ctx.restore();}
function frame(now){const dt=Math.min(.033,(now-last)/1000||0);last=now;update(dt);draw();requestAnimationFrame(frame)}
resetGame();requestAnimationFrame(frame);
})();
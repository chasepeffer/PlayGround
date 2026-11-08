import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';

const mount = document.querySelector('#game');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#8ddbea');
scene.fog = new THREE.Fog('#b1d9c9', 34, 155);
const camera = new THREE.PerspectiveCamera(54, innerWidth / innerHeight, .1, 260);
camera.position.set(0, 5.1, 11.6);
camera.lookAt(0, 1.45, -8);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
mount.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight('#d8f8ff', '#315d48', 2.15));
const sun = new THREE.DirectionalLight('#fff2cf', 3.1);
sun.position.set(-7, 14, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -12; sun.shadow.camera.right = 12; sun.shadow.camera.top = 15; sun.shadow.camera.bottom = -19;
sun.shadow.bias = -.00035;
scene.add(sun);
const fill = new THREE.DirectionalLight('#8be6ef', 1.05); fill.position.set(9, 6, -12); scene.add(fill);

const mat = (color, roughness = .8, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const mats = {
  earth: mat('#b57b42'), edge: mat('#67452f'), sand: mat('#e6c27a'), lane: mat('#cf9b56'),
  teal: mat('#23988e'), tealDark: mat('#176c73'), leaf: mat('#58b86b'), leafLight: mat('#a4d761'),
  orange: mat('#f57932'), orangeLight: mat('#ff9c4c'), red: mat('#cf4940'), denim: mat('#357bb4'),
  cream: mat('#fff0d4'), dark: mat('#422f34'), shoe: mat('#b84442'), wood: mat('#9b5932'), woodLight: mat('#c78343'),
  steel: mat('#788b92', .4, .45), gold: mat('#ffc444', .35, .15), rock: mat('#4e6161'), portal: mat('#65efcd', .22, .15),
  deepWater: mat('#147c9a'), waterTop: mat('#36b3c5'), white: mat('#fff8e9')
};
const box = (w,h,d,material, parent=scene, x=0,y=0,z=0, cast=true) => {const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=cast;m.receiveShadow=true;parent.add(m);return m;};
const sphere = (r,material,parent=scene,x=0,y=0,z=0,sx=1,sy=1,sz=1,seg=16) => {const m=new THREE.Mesh(new THREE.SphereGeometry(r,seg,12),material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
const cylinder = (rt,rb,h,material,parent=scene,x=0,y=0,z=0,segments=12) => {const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,segments),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};

// Endless-looking island runway above a bright lagoon.
const water = new THREE.Mesh(new THREE.PlaneGeometry(480, 480), mats.deepWater);
water.rotation.x = -Math.PI/2; water.position.set(0,-2.35,-54); water.receiveShadow=true; scene.add(water);
const waterPlane = new THREE.Mesh(new THREE.PlaneGeometry(480,480), new THREE.MeshBasicMaterial({color:'#3baec1',transparent:true,opacity:.32}));
waterPlane.rotation.x=-Math.PI/2;waterPlane.position.set(0,-2.28,-54);scene.add(waterPlane);
box(9.4,.74,166,mats.edge,scene,0,-.43,-61,false);
box(8.9,.18,165,mats.earth,scene,0,-.015,-61,false);
// Sandy shoulders along the lane.
for (const x of [-4.25,4.25]) box(.78,.08,164,mats.sand,scene,x,.09,-61,false);
for (const x of [-1.52,1.52]) {
  const rail = box(.035,.018,164,mat('#e4bf79'),scene,x,.092,-61,false);
  rail.material.transparent=true; rail.material.opacity=.58;
}
// Soft stylized clouds and far island silhouettes.
for(let i=0;i<15;i++){
  const x=(i%5-2)*18+(Math.random()-.5)*5, z=-25-Math.floor(i/5)*29;
  const island= new THREE.Group(); island.position.set(x,-.3,z); scene.add(island);
  cylinder(2.3,3.8,2.4,mat(i%2?'#376f68':'#397c67'),island,0,-1.7,0,8);
  for(let n=0;n<3;n++) sphere(.8, mat(n%2?'#4b9b69':'#78ad66'), island,(Math.random()-.5)*4, -.15+Math.random(),(Math.random()-.5)*3,1.5,1.2,1.5,10);
}
for(let i=0;i<11;i++){
  const cloud=new THREE.Group();cloud.position.set((Math.random()-.5)*90,12+Math.random()*11,-35-Math.random()*100);scene.add(cloud);
  for(let j=0;j<4;j++)sphere(1.05, new THREE.MeshBasicMaterial({color:'#f4ffff',transparent:true,opacity:.66}),cloud,(j-1.5)*.8,Math.random()*.32,0,1.35,.67,.85,12);
}

// Palm-tree and tropical foliage props are recycled to keep the run lively.
const decor=[];
function makePalm(x,z,scale=1){
  const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(scale);scene.add(g);
  const trunk=cylinder(.2,.34,4.4,mat('#9a693d'),g,0,2.05,0,9); trunk.rotation.z=(Math.random()-.5)*.17;
  sphere(.28,mats.woodLight,g,0,4.3,0,1,1.1,1,10);
  for(let a=0;a<7;a++){
    const angle=(a/7)*Math.PI*2;
    const leaf=new THREE.Group();leaf.position.set(0,4.32,0);leaf.rotation.y=angle;leaf.rotation.z=-.42+(Math.random()-.5)*.18;g.add(leaf);
    const blade=new THREE.Mesh(new THREE.ConeGeometry(.33,3.35,5),a%3===0?mats.leafLight:mats.leaf);blade.position.set(0,1.23,0);blade.rotation.z=-Math.PI/2;blade.castShadow=true;leaf.add(blade);
    cylinder(.045,.065,2.5,mat('#478b51'),leaf,0,.7,0,6).rotation.z=-Math.PI/2;
  }
  return g;
}
for(let i=0;i<25;i++){
  const z=8-i*6.5;
  for(const side of [-1,1]){
    const x=side*(6.1+Math.random()*3.8);
    const obj=makePalm(x,z-(Math.random()*3),.65+Math.random()*.6);
    decor.push(obj);
    if(i%2===0){const rock=sphere(.9, i%4?mats.leaf:mats.rock,scene,x+side*.8,.3,z-2,.9,.55,1.2,10);decor.push(rock);}
  }
}

// Path tiles add graphic rhythm and clearly mark three safe lanes.
const tileMat=[mat('#d39d58'),mat('#dfa957'),mat('#c78c4d')];
const trackTiles=[];
for(let row=0;row<32;row++){
  const z=13-row*5.2;
  for(let lane=0;lane<3;lane++){
    const tile=box(2.75,.026,4.9,tileMat[(row+lane)%3],scene,(lane-1)*2.85,.103,z,false);
    tile.material.roughness=1;
    trackTiles.push(tile);
  }
}

// Character: an original cartoon island adventurer assembled from friendly low-poly shapes.
const avatar=new THREE.Group();avatar.position.set(0,0,3.5);scene.add(avatar);
const body=new THREE.Group();body.position.y=.9;avatar.add(body);
// torso and shorts
const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.37,.54,4,8),mats.orange);torso.position.y=.04;torso.castShadow=true;body.add(torso);
const bib=new THREE.Mesh(new THREE.BoxGeometry(.48,.35,.17),mats.denim);bib.position.set(0,-.15,.29);bib.castShadow=true;body.add(bib);
box(.14,.07,.07,mats.gold,body,-.12,-.19,.39);box(.14,.07,.07,mats.gold,body,.12,-.19,.39);
// head
sphere(.52,mats.orange,body,0,.78,.05,1,1.05,.91,18);
// ears
for(const s of [-1,1]){
  const ear=new THREE.Mesh(new THREE.ConeGeometry(.22,.62,8),mats.orange);ear.position.set(s*.41,1.24,.02);ear.rotation.z=-s*.18;ear.castShadow=true;body.add(ear);
  sphere(.095,mat('#f3a05f'),body,s*.405,1.28,.13,.8,1.1,.42,12);
}
// muzzle and nose
sphere(.31,mats.orangeLight,body,0,.54,.48,1.18,.72,.72,16);
sphere(.12,mats.dark,body,0,.68,.72,1.15,.75,.8,12);
// eyes
for(const s of [-1,1]){
  sphere(.17,mats.white,body,s*.18,.91,.46,.88,1.05,.45,14);
  sphere(.075,mat('#294b66'),body,s*.15,.9,.59,.9,1.1,.42,12);
  sphere(.033,mats.dark,body,s*.15,.9,.62,1,1,.45,8);
  // eyebrows
  const brow=box(.28,.07,.09,mat('#713a2e'),body,s*.17,1.14,.47);brow.rotation.z=s*.1;
}
// smile curve
const smilePts=[new THREE.Vector3(-.2,.46,.54),new THREE.Vector3(0,.41,.58),new THREE.Vector3(.2,.46,.54)];
const smile=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(smilePts),12,.018,5,false),mats.dark);body.add(smile);
// hair tufts
for(let i=0;i<3;i++){const tuft=new THREE.Mesh(new THREE.ConeGeometry(.15,.43,6),i===1?mats.orangeLight:mats.orange);tuft.position.set((i-1)*.19,1.34,.03);tuft.rotation.z=(i-1)*-.28;tuft.castShadow=true;body.add(tuft);}
// tail curled behind
const tailCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,-.18,-.27),new THREE.Vector3(.1,-.38,-.55),new THREE.Vector3(.38,-.31,-.67),new THREE.Vector3(.43,-.08,-.57)]);
const tail=new THREE.Mesh(new THREE.TubeGeometry(tailCurve,16,.095,8,false),mats.orange);body.add(tail);
const arms=[], legs=[];
for(const s of [-1,1]){
  const arm=new THREE.Group();arm.position.set(s*.42,.23,.04);body.add(arm);arms.push(arm);
  const armMesh=new THREE.Mesh(new THREE.CapsuleGeometry(.105,.43,3,7),mats.orange);armMesh.position.set(s*.08,-.25,.04);armMesh.rotation.z=s*-.18;armMesh.castShadow=true;arm.add(armMesh);
  sphere(.16,mats.cream,arm,s*.13,-.52,.07,.9,.85,.85,10);
  const leg=new THREE.Group();leg.position.set(s*.21,-.37,.02);body.add(leg);legs.push(leg);
  const lm=new THREE.Mesh(new THREE.CapsuleGeometry(.11,.35,3,7),mats.denim);lm.position.y=-.2;lm.castShadow=true;leg.add(lm);
  const shoe=sphere(.21,mats.shoe,leg,s*.035,-.44,.14,1.35,.66,1.5,12);
  sphere(.12,mats.cream,leg,s*.035,-.42,.3,1.05,.26,.38,10);
}
// soft circular character shadow
const shadow=new THREE.Mesh(new THREE.CircleGeometry(.7,24),new THREE.MeshBasicMaterial({color:'#17364a',transparent:true,opacity:.26,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.set(0,.12,3.5);scene.add(shadow);

// Wumpa fruit, crates, stone hazards and jump gaps.
const laneX=i=>(i-1)*2.85;
const objects=[];const fruitObjects=[];const DISTANCE=135;const PLAYER_Z=3.5;const JUMP_SPEED=9.3;const JUMP_GRAVITY=17.5;
function wumpaFruit(x,z){
  const g=new THREE.Group();g.position.set(x,.94,z);scene.add(g);
  const bodyF=sphere(.3,mats.gold,g,0,0,0,.78,1.12,.52,14);
  const leaf=new THREE.Mesh(new THREE.ConeGeometry(.12,.25,5),mats.leaf);leaf.position.set(.03,.31,0);leaf.rotation.z=-.36;leaf.castShadow=true;g.add(leaf);
  const glow=new THREE.Mesh(new THREE.SphereGeometry(.4,12,8),new THREE.MeshBasicMaterial({color:'#ffd448',transparent:true,opacity:.13}));g.add(glow);
  fruitObjects.push({mesh:g,baseY:.94,collected:false,phase:Math.random()*6});
}
function crateModel(type,x,z){
  const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
  const wood=type==='tnt'?mat('#dc5942'):mats.wood, trim=type==='tnt'?mat('#ffe27a'):mats.woodLight;
  const base=box(1.18,1.13,1.08,wood,g,0,.62,0);base.material=wood;
  for(const a of [-1,1]){
    const plank=box(.15,1.17,.09,trim,g,a*.37,.62,.56);plank.rotation.z=a*.7;
  }
  for(const a of [-1,1]){
    const plank=box(1.15,.14,.08,trim,g,0,.62,a*.36);plank.rotation.z=a*.65;
  }
  if(type==='tnt'){
    box(.48,.4,.08,mats.cream,g,0,.83,.59,false);
    // label letter is a simple raised graphic bar
    box(.08,.27,.11,mat('#d94435'),g,0,.84,.65,false);
    const fuse=cylinder(.035,.035,.28,mat('#f5ca6d'),g,0,1.37,0,8);fuse.rotation.z=.4;
    sphere(.07,mat('#ffe668'),g,.055,1.52,0,1,1,1,8);
  }
  if(type==='iron'){
    const metal=box(1.14,1.1,1.07,mats.steel,g,0,.6,0);
    for(const a of [-1,1])for(const b of [-1,1])sphere(.07,mats.gold,g,a*.48,.18+b*.84,.55,1,1,1,8);
    box(.72,.12,.08,mats.gold,g,0,.62,.58);
  }
  objects.push({mesh:g,type,lane:Math.round((x/2.85)+1),hit:false,baseY:0});
  return g;
}
function gapModel(z){
  const g=new THREE.Group();g.position.set(0,.115,z);scene.add(g);
  const hole=box(8.85,.05,2.15,mat('#083e59'),g,0,0,0,false);
  // dark cut with shimmering blue cross strokes
  for(let i=0;i<7;i++){const glint=box(8.2,.025,.035,mat(i%2?'#176580':'#39a3ad'),g,0,.035,-.85+i*.28,false);glint.material.transparent=true;glint.material.opacity=.45;}
  const warning=box(8.7,.035,.15,mat('#ffd266'),g,0,.035,-1.17,false);warning.material.emissive=new THREE.Color('#98642d');
  objects.push({mesh:g,type:'gap',lane:1,hit:false,baseY:.115});
}
// Purposeful rhythm: learn, collect, jump, then weave around crate/TNT patterns.
const layout=[
  {d:9,f:[0,1,2]}, {d:15,f:[1]}, {d:20,l:1,t:'crate',f:[0,2]}, {d:27,f:[0,1,2]},
  {d:33,l:0,t:'rock',f:[1,2]}, {d:39,f:[0,1,2]}, {d:45,g:1,f:[1]}, {d:52,f:[0,1,2]},
  {d:58,l:2,t:'tnt',f:[0,1]}, {d:64,l:0,t:'crate',f:[1,2]}, {d:70,f:[0,1,2]}, {d:76,l:1,t:'rock',f:[0,2]},
  {d:82,g:1,f:[0,1,2]}, {d:89,l:0,t:'iron',f:[1,2]}, {d:95,l:2,t:'tnt',f:[0,1]}, {d:101,f:[0,1,2]},
  {d:107,l:1,t:'crate',f:[0,2]}, {d:113,l:0,t:'rock',f:[1,2]}, {d:119,f:[0,1,2]}, {d:125,l:2,t:'tnt',f:[0,1]},
  {d:131,f:[0,1,2]}
];
for(const row of layout){
  if(row.g) gapModel(PLAYER_Z-row.d);
  else if(row.t) crateModel(row.t,laneX(row.l),PLAYER_Z-row.d);
  if(row.f)for(const l of row.f) wumpaFruit(laneX(l),PLAYER_Z-row.d-((row.g||row.t)?2.0:0));
}
// Exit portal anchored at the far end of the trail.
const portal=new THREE.Group();portal.position.set(0,0,PLAYER_Z-DISTANCE);scene.add(portal);
const arch=new THREE.Mesh(new THREE.TorusGeometry(2.1,.21,12,32),mats.portal);arch.position.y=2.1;arch.castShadow=true;portal.add(arch);
const inner=new THREE.Mesh(new THREE.CircleGeometry(1.84,32),new THREE.MeshBasicMaterial({color:'#58e8d0',transparent:true,opacity:.28,side:THREE.DoubleSide}));inner.position.set(0,2.1,-.12);portal.add(inner);
for(const s of [-1,1]){
  const post=box(.3,4.5,.4,mats.tealDark,portal,s*2.15,2.15,0);post.rotation.z=s*.03;
  for(let i=0;i<4;i++){const gem=sphere(.12,mats.gold,portal,s*2.15,1+i*.7,.24,1,1,1,8);}
}
box(5.2,.24,1.1,mats.tealDark,portal,0,.12,0);
const portalLight=new THREE.PointLight('#55ffe1',5,9);portalLight.position.set(0,2.2,0);portal.add(portalLight);

// UI and run state.
const $=s=>document.querySelector(s);
const overlay=$('#overlay'), intro=$('.intro-panel'), result=$('#resultPanel');
const bestEl=$('#bestScore');
const storedBest=Number(localStorage.getItem('wumpaRushBest')||0);bestEl.textContent=storedBest?`${storedBest} fruit`:'—';
let state='ready', distance=0, fruit=0, lives=3, lane=1, laneTarget=1, jumpY=0, jumpV=0, spinTime=0, invincible=0, elapsed=0, soundOn=true, lastTime=0, toastTimer=0;
const keys=new Set();let audioCtx=null;
function sound(freq=600,dur=.09,wave='sine',vol=.035){if(!soundOn)return;try{audioCtx ||= new AudioContext();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=wave;o.frequency.value=freq;g.gain.setValueAtTime(vol,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur);}catch{}}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1050);}
function startRun(){
  distance=0;fruit=0;lives=3;lane=1;laneTarget=1;jumpY=0;jumpV=0;spinTime=0;invincible=0;elapsed=0;
  for(const o of objects){o.hit=false;o.mesh.visible=true;}
  for(const f of fruitObjects){f.collected=false;f.mesh.visible=true;}
  $('#fruitCount').textContent='00';$('#lifeCount').textContent='03';$('#distanceLabel').innerHTML='0<span>m</span> <b>/ 135m</b>';$('#progressFill').style.width='0%';
  $('#statusText').textContent='RUNNING • STAY ON YOUR TOES';
  result.classList.remove('visible');intro.style.display='none';overlay.classList.add('hidden');state='running';sound(520,.1,'triangle');
}
function finish(won){
  state='over';overlay.classList.remove('hidden');intro.style.display='none';result.classList.add('visible');
  $('#resultIcon').textContent=won?'✦':'✕';$('#resultEyebrow').textContent=won?'PORTAL REACHED':'WIPEOUT';
  $('#resultTitle').textContent=won?'NICE RUN!':'OOPS!';$('#resultCopy').textContent=won?'You made it through the island. Aku Aku would be proud.':'The island got the better of you this time. Give it another go!';
  $('#resultFruit').textContent=fruit;$('#resultDistance').textContent=`${Math.min(135,Math.floor(distance))}m`;
  $('#statusText').textContent=won?'RUN COMPLETE':'TRY AGAIN';
  if(fruit>storedBest){localStorage.setItem('wumpaRushBest',String(fruit));bestEl.textContent=`${fruit} fruit`;}
  sound(won?760:145,.35,won?'triangle':'sawtooth',.055);
}
function pauseRun(){if(state==='running'){state='paused';$('#pauseBtn').textContent='▶';$('#pauseShade').classList.add('show');}else if(state==='paused'){state='running';$('#pauseBtn').textContent='Ⅱ';$('#pauseShade').classList.remove('show');}}
const shade=document.createElement('div');shade.id='pauseShade';shade.className='paused-label';shade.textContent='PAUSED';document.querySelector('.game-shell').appendChild(shade);
function move(dir){if(state!=='running')return;laneTarget=THREE.MathUtils.clamp(laneTarget+dir,0,2);sound(270,.045,'square',.012);}
function jump(){if(state!=='running'||jumpY>0)return;jumpV=JUMP_SPEED;sound(330,.08,'triangle',.022);}
function spin(){if(state!=='running')return;spinTime=.52;sound(190,.16,'sawtooth',.025);}
function action(code){if(code==='ArrowLeft'||code==='KeyA')move(-1);else if(code==='ArrowRight'||code==='KeyD')move(1);else if(code==='Space'||code==='ArrowUp'||code==='KeyW')jump();else if(code==='ShiftLeft'||code==='ShiftRight'||code==='ArrowDown'||code==='KeyS')spin();else if(code==='Escape'||code==='KeyP')pauseRun();}
window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code))e.preventDefault();if(!keys.has(e.code))action(e.code);keys.add(e.code);});
window.addEventListener('keyup',e=>keys.delete(e.code));
$('#playBtn').addEventListener('click',startRun);$('#retryBtn').addEventListener('click',startRun);$('#pauseBtn').addEventListener('click',pauseRun);
$('#soundBtn').addEventListener('click',()=>{$('#soundBtn').classList.toggle('muted');soundOn=!soundOn;$('#soundBtn').textContent=soundOn?'♫':'♪';});
const bind=(id,fn)=>{const el=$(id);el.addEventListener('pointerdown',e=>{e.preventDefault();fn();});};
bind('#leftBtn',()=>move(-1));bind('#rightBtn',()=>move(1));bind('#jumpBtn',jump);bind('#spinBtn',spin);

function hit(){if(invincible>0)return;lives--;invincible=1.35;$('#lifeCount').textContent=String(lives).padStart(2,'0');toast(lives?'WATCH OUT!':'NO LIVES LEFT');sound(120,.23,'sawtooth',.05);if(lives<=0)finish(false);}
function update(dt){
  if(state==='running'){
    elapsed+=dt;distance+=8.05*dt;
    lane+= (laneTarget-lane)*Math.min(1,dt*11);
    jumpY+=jumpV*dt;jumpV-=JUMP_GRAVITY*dt;if(jumpY<0){jumpY=0;jumpV=0;}
    spinTime=Math.max(0,spinTime-dt);invincible=Math.max(0,invincible-dt);
    avatar.position.x=laneX(lane);avatar.position.y=jumpY;
    body.rotation.y=spinTime>0?elapsed*22:0;
    body.rotation.z=spinTime>0?Math.sin(elapsed*38)*.23:Math.sin(elapsed*9)*.025;
    body.position.y=.9+Math.sin(elapsed*13)*.045;
    for(let i=0;i<legs.length;i++)legs[i].rotation.x=Math.sin(elapsed*13+i*Math.PI)*.52*(jumpY===0?1:.2);
    for(let i=0;i<arms.length;i++)arms[i].rotation.x=Math.sin(elapsed*13+i*Math.PI+Math.PI)*.38;
    avatar.visible=invincible<=0||Math.floor(elapsed*15)%2===0;
    shadow.position.x=avatar.position.x;shadow.material.opacity=Math.max(.08,.27-jumpY*.12);shadow.scale.setScalar(Math.max(.55,1-jumpY*.14));
    // Slide set dressing toward the runner while the path texture scrolls past.
    for(const o of objects){
      o.mesh.position.z+=8.05*dt;
      const contactWindow=o.type==='gap'?1.08:.62;
      if(!o.hit&&Math.abs(o.mesh.position.z-PLAYER_Z)<contactWindow){
        o.hit=true;
        if(o.type==='gap'){
          if(jumpY<.82)hit();else{toast('NICE JUMP!');sound(720,.1,'triangle');}
        }else{
          const inLane=Math.abs(lane-o.lane)<.38;
          if(inLane){
            if(o.type==='crate'&&spinTime>0){o.mesh.visible=false;fruit+=2;$('#fruitCount').textContent=String(fruit).padStart(2,'0');toast('+2 FRUIT • SMASH!');sound(880,.12,'square');}
            else if(o.type==='rock'&&jumpY>.9){toast('CLEAN HOP!');}
            else if(o.type==='crate'&&jumpY>1.1){toast('NICE HOP!');}
            else hit();
          }
        }
      }
    }
    for(const f of fruitObjects){
      f.mesh.position.z+=8.05*dt;f.phase+=dt*3.5;f.mesh.rotation.y+=dt*1.7;f.mesh.position.y=f.baseY+Math.sin(f.phase)*.13;
      if(!f.collected&&Math.abs(f.mesh.position.z-PLAYER_Z)<.9&&Math.abs(f.mesh.position.x-avatar.position.x)<1.02&&jumpY<2.1){
        f.collected=true;f.mesh.visible=false;fruit++;$('#fruitCount').textContent=String(fruit).padStart(2,'0');sound(760+Math.min(fruit,12)*23,.075,'sine',.025);
      }
    }
    for(const d of decor){d.position.z+=8.05*dt;if(d.position.z>14)d.position.z-=162;}
    for(const tile of trackTiles){tile.position.z+=8.05*dt;if(tile.position.z>14)tile.position.z-=166.4;}
    portal.position.z+=8.05*dt;
    const pct=Math.min(100,distance/DISTANCE*100);$('#progressFill').style.width=`${pct}%`;
    $('#distanceLabel').innerHTML=`${Math.min(135,Math.floor(distance))}<span>m</span> <b>/ 135m</b>`;
    if(distance>=DISTANCE)finish(true);
  }
}
let elapsedRender=0;
function animate(now){requestAnimationFrame(animate);const dt=Math.min(.04,(now-lastTime)/1000||0);lastTime=now;update(dt);elapsedRender+=dt;
  if(state!=='paused'){portal.rotation.y=Math.sin(elapsedRender*1.5)*.07;portal.children[1].material.opacity=.19+Math.sin(elapsedRender*3)*.07;}
  renderer.render(scene,camera);
}
requestAnimationFrame(animate);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));});

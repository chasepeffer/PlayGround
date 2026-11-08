import * as THREE from 'three';
const $=s=>document.querySelector(s), canvas=$('#scene');
const scene=new THREE.Scene();scene.background=new THREE.Color(0x101814);scene.fog=new THREE.FogExp2(0x111a17,.026);
const camera=new THREE.PerspectiveCamera(73,innerWidth/innerHeight,.08,180);camera.position.set(0,1.68,12);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.outputColorSpace=THREE.SRGBColorSpace;
scene.add(new THREE.HemisphereLight(0x93a39a,0x141b16,1.1));const moon=new THREE.DirectionalLight(0x9aafba,1.15);moon.position.set(-20,32,-15);moon.castShadow=true;moon.shadow.mapSize.set(1024,1024);scene.add(moon);scene.add(new THREE.AmbientLight(0x536257,.34));
const playerLight=new THREE.SpotLight(0xe4f1d5,0,24,Math.PI/7,.52,1.3);playerLight.position.set(0,0,0);playerLight.target.position.set(0,0,-1);camera.add(playerLight,playerLight.target);scene.add(camera);
const mat=(color,roughness=.85,extra={})=>new THREE.MeshStandardMaterial({color,roughness,...extra});
const mats={ground:mat(0x26332a),bark:mat(0x382d24),bark2:mat(0x524033),pine:mat(0x1e3329),pine2:mat(0x2a4032),log:mat(0x554333),logLight:mat(0x70553b),roof:mat(0x28312e),stone:mat(0x343d39),window:new THREE.MeshStandardMaterial({color:0x9cb6b4,roughness:.16,metalness:.2,transparent:true,opacity:.32}),lit:mat(0xffbd73),cloth1:mat(0x718078),cloth2:mat(0x9c7658),cloth3:mat(0x727d95),cloth4:mat(0x82826c),skin:mat(0x9f8068),dark:mat(0x151b18)};
const boxGeo=new THREE.BoxGeometry(1,1,1);function cube(parent,material,x,y,z,sx,sy,sz,cast=true){const m=new THREE.Mesh(boxGeo,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=cast;m.receiveShadow=true;parent.add(m);return m;}function cylinder(parent,material,x,y,z,r1,r2,h,segments=8){const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,segments),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
cube(scene,mats.ground,0,-.34,0,180,.55,180,false);
for(let i=0;i<220;i++){const a=Math.random()*Math.PI*2,r=13+Math.random()*65,x=Math.cos(a)*r,z=Math.sin(a)*r;if(Math.abs(x)<9&&Math.abs(z)<8)continue;const h=5+Math.random()*8,trunk=.22+Math.random()*.38;cylinder(scene,Math.random()>.5?mats.bark:mats.bark2,x,h*.34,z,trunk*.55,trunk,h*.68,7);for(let tier=0;tier<3;tier++){const hh=h*(.55+tier*.17),rr=(h-hh)*.43+1.1,crown=new THREE.Mesh(new THREE.ConeGeometry(rr,h*.46,7),tier===1?mats.pine2:mats.pine);crown.position.set(x,hh,z);crown.castShadow=true;crown.receiveShadow=true;scene.add(crown);}}
for(let i=0;i<35;i++){const x=(Math.random()-.5)*100,z=(Math.random()-.5)*100;if(Math.abs(x)<8&&Math.abs(z)<8)continue;if(i%2===0){const log=cylinder(scene,mats.bark2,x,.1,z,.17,.22,2.2,7);log.rotation.z=Math.PI/2;log.rotation.y=Math.random()*2;}else{const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.35+Math.random()*.6,0),mats.stone);rock.position.set(x,-.05,z);rock.scale.y=.7;rock.castShadow=true;scene.add(rock);}}
const cabin=new THREE.Group();scene.add(cabin);cube(cabin,mats.log,0,1.35,0,10,2.7,8);cube(cabin,mat(0x151b18),0,2.7,0,9.7,.12,7.7,false);
for(let y=.25;y<2.8;y+=.34){cube(cabin,Math.round(y*10)%2?mats.log:mats.logLight,0,y,-4.04,10.15,.22,.28);cube(cabin,Math.round(y*10)%2?mats.logLight:mats.log,-5,y,0,.24,.28,8.1);cube(cabin,Math.round(y*10)%2?mats.log:mats.logLight,5,y,0,.24,.28,8.1);cube(cabin,mats.log,-3.15,y,4.04,3.7,.24,.24);cube(cabin,mats.log,3.15,y,4.04,3.7,.24,.24);if(y>2.15)cube(cabin,mats.log,0,y,4.04,2.6,.24,.24);}
cube(cabin,mats.log,0,.12,0,10.2,.25,8.2);const roof1=cube(cabin,mats.roof,-2.55,3.55,0,5.9,.25,8.8);roof1.rotation.z=-.49;const roof2=cube(cabin,mats.roof,2.55,3.55,0,5.9,.25,8.8);roof2.rotation.z=.49;
for(let x=-5;x<=5;x+=1.1){const seam=cube(cabin,mats.bark,x,3.57,0,.045,.05,8.5,false);seam.rotation.z=x<0?-.49:.49;}
cube(cabin,mats.bark2,0,1.18,4.17,1.35,2.25,.18);cube(cabin,mats.logLight,0,.12,4.8,3.6,.22,2.1);for(const x of [-1.6,1.6])cylinder(cabin,mats.logLight,x,.83,4.85,.13,.16,1.5,8);
const windows=[];function makeWindow(x,y,z,rot=0){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rot;cabin.add(g);const pane=cube(g,mats.window,0,0,0,1.55,1.15,.08,false);for(const a of [-.84,.84])cube(g,mats.logLight,a,0,0,.13,1.42,.16);for(const a of [-.67,.67])cube(g,mats.logLight,0,a,0,1.78,.13,.16);cube(g,mats.logLight,0,0,0,.08,1.25,.18);cube(g,mats.logLight,0,0,0,1.6,.08,.18);windows.push({pane,group:g,broken:false});}makeWindow(-2.8,1.86,4.08);makeWindow(2.8,1.86,4.08);makeWindow(-5.04,1.8,-1.7,Math.PI/2);makeWindow(5.04,1.8,1.8,Math.PI/2);
cube(cabin,mat(0x332a22),-2,.35,-1,2.5,.5,1.1);cube(cabin,mats.logLight,-2,.65,-1,2.4,.15,1);cube(cabin,mat(0x4c3b2b),1,.8,-1.2,1.6,.14,1.1);for(const x of [.4,1.6])for(const z of [-1.6,-.8])cube(cabin,mats.bark,x,.38,z,.1,.8,.1);cube(cabin,mats.lit,1,1.25,-1.2,.22,.5,.22,false);const insideLamp=new THREE.PointLight(0xffa45d,1.9,10,2);insideLamp.position.set(0,2.2,0);cabin.add(insideLamp);
const pathMat=mat(0x3c3930);for(let i=0;i<25;i++){const patch=new THREE.Mesh(new THREE.CircleGeometry(1.7+Math.random(),8),pathMat);patch.rotation.x=-Math.PI/2;patch.position.set(Math.sin(i*.22)*2.5,-.055,8+i*1.35);patch.scale.y=.65;scene.add(patch);}
const survivorNames=['Mara','Eli','June','Rook'],survivorColors=[mats.cloth1,mats.cloth2,mats.cloth3,mats.cloth4],survivors=[];
function makePerson(name,index,x,z){const root=new THREE.Group();root.position.set(x,0,z);scene.add(root);cube(root,survivorColors[index%4],0,1.15,0,.58,.82,.34);const head=new THREE.Mesh(new THREE.SphereGeometry(.22,12,10),mats.skin);head.position.set(0,1.78,0);head.castShadow=true;root.add(head);const hood=new THREE.Mesh(new THREE.SphereGeometry(.24,12,8,0,Math.PI*2,0,Math.PI*.55),mats.dark);hood.position.set(0,1.83,-.025);root.add(hood);for(const sx of [-.16,.16])cube(root,mats.dark,sx,.43,0,.22,.62,.27);for(const sx of [-.39,.39]){const arm=cube(root,survivorColors[index%4],sx,1.23,0,.19,.68,.22);arm.rotation.z=sx>0?-.1:.1;}const eyeMat=new THREE.MeshBasicMaterial({color:0xd9e8cb});for(const sx of [-.075,.075]){const e=new THREE.Mesh(new THREE.SphereGeometry(.022,6,6),eyeMat);e.position.set(sx,1.8,.202);root.add(e);}return{name,root,health:100,stamina:100,alive:true,caught:false,x,z,goal:null,think:Math.random()*2,index};}
const startSpots=[[-2,1],[2,1],[-12,8],[13,13]];for(let i=0;i<4;i++)survivors.push(makePerson(survivorNames[i],i,...startSpots[i]));
const pickups=[];function addPickup(x,z,label){const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);const orb=new THREE.Mesh(new THREE.OctahedronGeometry(.19),new THREE.MeshStandardMaterial({color:0xd7e982,emissive:0x9ebd3d,emissiveIntensity:1.5}));orb.position.y=.95;g.add(orb);const ring=new THREE.Mesh(new THREE.TorusGeometry(.36,.025,6,20),new THREE.MeshBasicMaterial({color:0xd4ea72}));ring.rotation.x=Math.PI/2;ring.position.y=.08;g.add(ring);const light=new THREE.PointLight(0xc8ee72,.6,4);light.position.y=1;g.add(light);pickups.push({group:g,x,z,label,found:false});}addPickup(-13,10,'RADIO BATTERY');addPickup(15,18,'FUSE');addPickup(-6,28,'CABIN KEYS');
const gate={x:1,z:44},gateGroup=new THREE.Group();gateGroup.position.set(gate.x,0,gate.z);scene.add(gateGroup);for(const x of [-1.7,1.7])cylinder(gateGroup,mats.bark2,x,1.5,0,.18,.22,3,8);cube(gateGroup,mats.logLight,0,2.95,0,3.8,.18,.2);const gateLight=new THREE.PointLight(0xd4ea72,.8,8);gateLight.position.set(0,2,0);gateGroup.add(gateLight);
let gameStarted=false,role='random',playerRole='survivor',mode='title',flashlightOn=true,stamina=100,health=100,timer=240,collected=0,senseTime=0,yaw=0,pitch=0,locked=false,paused=false,keys={},toastTimeout,attackCooldown=0,hitCooldown=0;const player={x:0,z:0};let touchMove={x:0,y:0},touchActive=false;
function inCabin(x,z){return Math.abs(x)<5.05&&Math.abs(z)<4.05;}function clampPlayer(){player.x=THREE.MathUtils.clamp(player.x,-78,78);player.z=THREE.MathUtils.clamp(player.z,-78,78);if(inCabin(player.x,player.z)){if(Math.abs(player.x)>4.55)player.x=Math.sign(player.x)*4.55;if(Math.abs(player.z)>3.55&&Math.abs(player.x)>.95)player.z=Math.sign(player.z)*3.55;}}
function toast(text){const el=$('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove('show'),2100);}function isMobile(){return matchMedia('(pointer:coarse)').matches;}function chooseRole(){return role==='random'?(Math.random()<.48?'hunter':'survivor'):role;}
function updateRoster(){const list=$('#roster-list');list.innerHTML='';const alive=survivors.filter(s=>s.alive&&!s.caught).length;$('#roster-count').textContent=String(alive+(playerRole==='survivor'?1:0)).padStart(2,'0');for(const s of survivors){const div=document.createElement('div');div.className='roster-person';div.innerHTML=`<i class="person-dot ${s.caught?'caught':''}"></i><span>${s.name}</span><small>${s.caught?'LOST':s.alive?'ACTIVE':'OUT'}</small>`;list.append(div);}}
function startGame(){playerRole=chooseRole();gameStarted=true;paused=false;mode='play';timer=240;collected=0;health=100;stamina=100;flashlightOn=true;survivors.forEach((s,i)=>{s.alive=true;s.caught=false;s.health=100;s.root.visible=true;s.x=startSpots[i][0];s.z=startSpots[i][1];s.root.position.set(s.x,0,s.z);s.think=Math.random()*1.5;});pickups.forEach(p=>{p.found=false;p.group.visible=true;});if(playerRole==='hunter'){player.x=0;player.z=-9;yaw=Math.PI;}else{player.x=0;player.z=9;yaw=0;}camera.position.set(player.x,1.68,player.z);pitch=0;$('#title-screen').classList.add('hidden');$('#result-screen').classList.add('hidden');$('#hud').classList.remove('hidden');$('#crosshair').classList.remove('hidden');$('#human-hud').classList.toggle('hidden',playerRole==='hunter');$('#hunter-hud').classList.toggle('hidden',playerRole!=='hunter');$('#objective-kicker').textContent=playerRole==='hunter'?'OBJECTIVE':'GET OUT ALIVE';$('#objective-text').textContent=playerRole==='hunter'?'Find the survivors.':'Find 3 signal parts.';$('#tool-tip').textContent=playerRole==='hunter'?'E ATTACK · Q SENSE':'SHIFT SPRINT';$('#match-label').textContent=playerRole==='hunter'?'THE HUNT IS ON':'SURVIVE THE NIGHT';$('#flashlight-control').style.display=playerRole==='hunter'?'none':'';updateRoster();toast(playerRole==='hunter'?'Click the scene to look around · Track them by sound.':'Click the scene to look around · Find 3 signal parts.');}
function finish(won,title,copy){if(mode!=='play')return;mode='result';document.exitPointerLock?.();$('#result-title').textContent=title;$('#result-copy').textContent=copy;$('#result-eyebrow').textContent=won?'YOU SURVIVED':'THE WOODS CLAIM ANOTHER';$('#result-screen').classList.remove('hidden');}
document.querySelectorAll('.role-option').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.role-option').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');role=b.dataset.role;}));$('#start-button').addEventListener('click',startGame);$('#again-button').addEventListener('click',startGame);$('#title-button').addEventListener('click',()=>{mode='title';$('#result-screen').classList.add('hidden');$('#hud').classList.add('hidden');$('#crosshair').classList.add('hidden');$('#title-screen').classList.remove('hidden');});
$('#menu-button').addEventListener('click',()=>{if(mode==='play'){paused=!paused;toast(paused?'PAUSED — click to resume':'THE HUNT CONTINUES');if(paused)document.exitPointerLock?.();else if(!isMobile())canvas.requestPointerLock?.();}});function toggleFlashlight(){if(playerRole==='hunter')return;flashlightOn=!flashlightOn;playerLight.intensity=flashlightOn?4.7:0;$('#flash-state').textContent=flashlightOn?'ON':'OFF';}$('#flashlight-control').addEventListener('click',toggleFlashlight);
document.addEventListener('pointerlockchange',()=>locked=document.pointerLockElement===canvas);canvas.addEventListener('click',()=>{if(mode==='play'&&!isMobile()&&!paused&&!locked)canvas.requestPointerLock?.();});document.addEventListener('mousemove',e=>{if(locked&&mode==='play'&&!paused){yaw-=e.movementX*.0022;pitch=THREE.MathUtils.clamp(pitch-e.movementY*.0019,-1.25,1.25);}});
document.addEventListener('keydown',e=>{keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.repeat)return;if(e.code==='KeyF')toggleFlashlight();if(e.code==='KeyE')interact();if(e.code==='KeyQ'&&playerRole==='hunter'&&mode==='play')useSense();if(e.code==='Escape'&&mode==='play'){paused=!paused;if(paused)document.exitPointerLock?.();else if(!isMobile())canvas.requestPointerLock?.();}});document.addEventListener('keyup',e=>keys[e.code]=false);
$('#touch-action').addEventListener('click',interact);$('#touch-run').addEventListener('touchstart',e=>{e.preventDefault();keys.ShiftLeft=true;});$('#touch-run').addEventListener('touchend',()=>keys.ShiftLeft=false);const stick=$('#touch-stick');stick.addEventListener('touchstart',e=>{touchActive=true;e.preventDefault();},{passive:false});stick.addEventListener('touchmove',e=>{if(!touchActive)return;const r=stick.getBoundingClientRect(),t=e.touches[0];touchMove.x=THREE.MathUtils.clamp((t.clientX-r.left-r.width/2)/45,-1,1);touchMove.y=THREE.MathUtils.clamp((t.clientY-r.top-r.height/2)/45,-1,1);e.preventDefault();},{passive:false});stick.addEventListener('touchend',()=>{touchActive=false;touchMove.x=touchMove.y=0;});let touchLook=null;canvas.addEventListener('touchstart',e=>{if(e.touches[0].clientX>innerWidth*.35)touchLook={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});canvas.addEventListener('touchmove',e=>{if(!touchLook||!gameStarted)return;const t=e.touches[0];yaw-=(t.clientX-touchLook.x)*.004;pitch=THREE.MathUtils.clamp(pitch-(t.clientY-touchLook.y)*.003,-1.25,1.25);touchLook={x:t.clientX,y:t.clientY};},{passive:true});canvas.addEventListener('touchend',()=>touchLook=null);
function useSense(){if(senseTime>0)return;senseTime=4;toast('HUNT SENSE — footsteps revealed');survivors.forEach(s=>{if(s.alive&&!s.caught)s.root.traverse(o=>{if(o.isMesh){o.userData.oldMaterial=o.material;o.material=mat(0xd77262,.5,{emissive:0x9b2518,emissiveIntensity:1});}});});}

// The hunter silhouette for survivor games: tall, quiet, and easy to spot in the beam.
const hunterModel=new THREE.Group();scene.add(hunterModel);
cylinder(hunterModel,mat(0x171b18),0,1.35,0,.36,.48,1.7,8);
const hunterHead=new THREE.Mesh(new THREE.SphereGeometry(.31,12,10),mat(0x20231e));hunterHead.position.y=2.35;hunterHead.castShadow=true;hunterModel.add(hunterHead);
for(const x of [-.11,.11]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),new THREE.MeshBasicMaterial({color:0xd75442}));eye.position.set(x,2.38,.285);hunterModel.add(eye);}
for(const x of [-.2,.2]){const leg=cylinder(hunterModel,mat(0x111513),x,.42,0,.13,.17,.85,6);}
hunterModel.visible=false;
const hunterState={x:22,z:20,alive:true,think:0,attackCooldown:0};
function distance(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}
function nearestSurvivor(x,z){let best=null,d=Infinity;for(const s of survivors){if(s.alive&&!s.caught){const n=Math.hypot(x-s.x,z-s.z);if(n<d){best=s;d=n;}}}if(playerRole==='hunter'&&best===null)return null;return best;}
function breakWindow(w){if(w.broken)return;w.broken=true;w.pane.visible=false;for(const c of w.group.children){if(c!==w.pane)c.material=mats.bark;}for(let i=0;i<5;i++){const shard=new THREE.Mesh(new THREE.TetrahedronGeometry(.12),new THREE.MeshBasicMaterial({color:0xaac7c8,transparent:true,opacity:.6}));shard.position.copy(w.group.position).add(new THREE.Vector3((Math.random()-.5)*1.3,1.8+Math.random(),(Math.random()-.5)*.8));scene.add(shard);const target=shard.position.clone().add(new THREE.Vector3((Math.random()-.5)*2,-1-Math.random(),(Math.random()-.5)*2));shard.userData={target,life:1};windowShards.push(shard);}toast('Glass shatters into the night');}
const windowShards=[];
function interact(){if(mode!=='play'||paused)return;
 const p={x:player.x,z:player.z};let nearest=null,nearDist=2.4;
 for(const item of pickups){if(!item.found){const d=distance(p,item);if(d<nearDist){nearDist=d;nearest={type:'pickup',item};}}}
 if(distance(p,gate)<3.2){if(!nearest||distance(p,gate)<nearDist)nearest={type:'gate'};}
 for(const w of windows){if(!w.broken){const wp=w.group.getWorldPosition(new THREE.Vector3());const d=Math.hypot(p.x-wp.x,p.z-wp.z);if(d<2.6&&(!nearest||d<nearDist)){nearDist=d;nearest={type:'window',item:w};}}}
 if(playerRole==='hunter'){
  let target=null,d=2.8;for(const s of survivors){if(s.alive&&!s.caught){const n=distance(p,s);if(n<d){d=n;target=s;}}}if(playerRole==='hunter'&&target){capture(target);return;}
  if(nearest?.type==='window'){breakWindow(nearest.item);return;}
  if(nearest?.type==='pickup'){toast('The survivors need that.');return;}
  toast('No one within reach.');return;
 }
 if(nearest?.type==='pickup'){nearest.item.found=true;nearest.item.group.visible=false;collected++;$('#objective-text').textContent=collected<3?`Find signal parts (${collected}/3).`:'Reach the forest gate.';toast(`${nearest.item.label} recovered · ${collected}/3`);if(collected===3)toast('Signal restored. Reach the gate!');return;}
 if(nearest?.type==='gate'){if(collected>=3){rescueCalled=true;finish(true,'YOU MADE IT OUT.','The old radio crackles to life. Headlights cut through the trees.');}else toast(`Radio needs ${3-collected} more signal part${3-collected===1?'':'s'}.`);return;}
 if(nearest?.type==='window'){breakWindow(nearest.item);return;}
 toast('Nothing close enough to interact with.');
}
function capture(s){if(!s||!s.alive)return;s.caught=true;s.alive=false;s.health=0;s.root.visible=false;updateRoster();$('#damage-flash').style.opacity='.6';setTimeout(()=>$('#damage-flash').style.opacity='0',220);toast(`${s.name} has been taken`);if(survivors.every(p=>!p.alive||p.caught))finish(true,'THE NIGHT IS YOURS.','Every last voice has gone quiet. Blackwood belongs to you.');}
function damagePlayer(amount){health=Math.max(0,health-amount);$('#damage-flash').style.opacity='.8';setTimeout(()=>$('#damage-flash').style.opacity='0',180);$('#health-value').textContent=`${Math.round(health)}%`;$('#health-meter').style.width=`${health}%`;if(health<=0)finish(false,'YOU WERE FOUND.','A shadow emerged from the pines. The forest keeps its secrets.');}
function aiRoam(s,dt){if(!s.goal||s.think<=0||Math.hypot(s.goal.x-s.x,s.goal.z-s.z)<1){s.think=2+Math.random()*4;let target;
  if(playerRole==='hunter'){target={x:player.x+(Math.random()-.5)*12,z:player.z+(Math.random()-.5)*12};}
  else {target=pickups.find(p=>!p.found&&Math.random()<.75)||{x:Math.sin(Math.random()*6)*23,z:14+Math.random()*35};target={x:target.x+(Math.random()-.5)*3,z:target.z+(Math.random()-.5)*3};}
  s.goal=target;
 }
 s.think-=dt;let dx=s.goal.x-s.x,dz=s.goal.z-s.z,len=Math.hypot(dx,dz)||1;let speed=playerRole==='hunter'?2.15:1.55;
 if(playerRole==='hunter'&&distance(s,player)<13){dx=s.x-player.x;dz=s.z-player.z;len=Math.hypot(dx,dz)||1;speed=2.8;}
 s.x+=dx/len*speed*dt;s.z+=dz/len*speed*dt;s.root.position.set(s.x,0,s.z);s.root.rotation.y=Math.atan2(dx,dz);s.root.position.y=Math.sin(performance.now()*.005+s.index)*.025;
 if(Math.hypot(s.x-player.x,s.z-player.z)<1.1&&playerRole==='survivor'&&s.alive){/* friendly survivor keeps moving */}
}
function updateBotHunter(dt){if(playerRole!=='survivor')return;hunterModel.visible=true;hunterState.attackCooldown=Math.max(0,hunterState.attackCooldown-dt);const target={x:player.x,z:player.z};let closest=distance(hunterState,target);let picked=null;
 for(const s of survivors){if(s.alive&&!s.caught){const d=distance(hunterState,s);if(d<closest){closest=d;picked=s;}}}
 if(closest>1.45){const tx=picked?picked.x:player.x,tz=picked?picked.z:player.z,dx=tx-hunterState.x,dz=tz-hunterState.z,len=Math.hypot(dx,dz)||1;const speed=2.0+(closest<9?.45:0);hunterState.x+=dx/len*speed*dt;hunterState.z+=dz/len*speed*dt;}
 hunterModel.position.set(hunterState.x,0,hunterState.z);hunterModel.rotation.y=Math.atan2((picked?picked.x:player.x)-hunterState.x,(picked?picked.z:player.z)-hunterState.z);
 if(closest<1.6&&hunterState.attackCooldown<=0){hunterState.attackCooldown=1.6;if(picked)capture(picked);else damagePlayer(16);}
}
function updateHunterBots(dt){if(playerRole!=='hunter')return;for(const s of survivors){if(!s.alive||s.caught)continue;if(distance(s,player)<1.55&&attackCooldown<=0){capture(s);attackCooldown=1.05;}}}

// Focused movement, footsteps, interaction prompts and readable objectives.
function updatePlayer(dt){
 if(!gameStarted||mode!=='play'||paused)return;
 const forward=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0)-touchMove.y;
 const side=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0)+touchMove.x;
 const sprint=(keys.ShiftLeft||keys.ShiftRight)&&stamina>0&&playerRole==='survivor'&&(forward||side);
 let speed=playerRole==='hunter'?4.25:(sprint?6:3.55);
 if(sprint)stamina=Math.max(0,stamina-24*dt);else stamina=Math.min(100,stamina+15*dt);
 const dir=new THREE.Vector3(Math.sin(yaw),0,-Math.cos(yaw));const right=new THREE.Vector3(Math.cos(yaw),0,Math.sin(yaw));
 let move=new THREE.Vector3().addScaledVector(dir,forward).addScaledVector(right,side);if(move.lengthSq()>1)move.normalize();
 player.x+=move.x*speed*dt;player.z+=move.z*speed*dt;clampPlayer();
 camera.position.set(player.x,1.68+(move.lengthSq()?Math.sin(performance.now()*.012)*.035:0),player.z);camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);
 if(playerRole==='survivor'){playerLight.intensity=flashlightOn?4.7:0;playerLight.distance=flashlightOn?28:0;playerLight.angle=.34;}
 $('#stamina-value').textContent=`${Math.round(stamina)}%`;$('#stamina-meter').style.width=`${stamina}%`;
 const seconds=Math.max(0,Math.floor(timer));$('#match-timer').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
 timer-=dt;if(timer<=0){if(playerRole==='hunter')finish(false,'THE NIGHT IS OVER.','The survivors made it to dawn. The forest has gone quiet.');else finish(true,'DAWN BREAKS.','You kept the darkness at bay until morning.');}
 attackCooldown=Math.max(0,attackCooldown-dt);hitCooldown=Math.max(0,hitCooldown-dt);senseTime=Math.max(0,senseTime-dt);
 for(const s of survivors){if(s.alive&&!s.caught){if(senseTime<=0)s.root.traverse(o=>{if(o.isMesh&&o.userData.oldMaterial){o.material=o.userData.oldMaterial;delete o.userData.oldMaterial;}});aiRoam(s,dt);}}
 if(playerRole==='hunter')updateHunterBots(dt);else updateBotHunter(dt);
 // hint targets and window shimmer
 let interactable=false;for(const p of pickups)if(!p.found&&distance(player,p)<2.5)interactable=true;
 for(const w of windows)if(!w.broken){const pos=w.group.getWorldPosition(new THREE.Vector3());if(Math.hypot(pos.x-player.x,pos.z-player.z)<2.5)interactable=true;}
 if(distance(player,gate)<3.2)interactable=true;
 $('#interact-hint').classList.toggle('hidden',!interactable);$('#interact-hint').innerHTML=playerRole==='hunter'?'<kbd>E</kbd><span>ATTACK / BREAK</span>':'<kbd>E</kbd><span>INTERACT</span>';
 // A tiny compass heading
 const compass=((Math.round((yaw*180/Math.PI+360)%360)+360)%360);$('#compass-degrees').textContent=['N','NE','E','SE','S','SW','W','NW'][Math.round(compass/45)%8];
 const nearCabin=inCabin(player.x,player.z);$('#location-name').textContent=nearCabin?'THE OLD CABIN':distance(player,{x:gate.x,z:gate.z})<8?'FOREST GATE':'BLACKWOOD TRAIL';
 // Keep objects animated subtly
 for(const p of pickups)if(!p.found){p.group.rotation.y+=dt*.7;p.group.position.y=Math.sin(performance.now()*.002+p.x)*.035;}
 for(const s of windowShards){if(s.userData.life>0){s.userData.life-=dt;s.position.lerp(s.userData.target,dt*3);s.rotation.x+=dt*4;s.rotation.y+=dt*5;s.material.opacity=Math.max(0,s.userData.life);}}
 windowShards.filter(s=>s.userData.life<=0).forEach(s=>scene.remove(s));
}
function animate(){requestAnimationFrame(animate);const dt=Math.min(.04,clock.getDelta());if(mode==='play')updatePlayer(dt);renderer.render(scene,camera);}
const clock=new THREE.Clock();

// Opening composition: light through the cabin window and gentle firefly drift.
const fireflies=[];for(let i=0;i<25;i++){const f=new THREE.Mesh(new THREE.SphereGeometry(.035,5,4),new THREE.MeshBasicMaterial({color:0xc9e78a}));f.position.set((Math.random()-.5)*46,.5+Math.random()*3,Math.random()*46);f.userData={origin:f.position.clone(),phase:Math.random()*6};scene.add(f);fireflies.push(f);}
function ambience(){if(mode!=='play'){const t=performance.now()*.0001;camera.position.set(Math.sin(t)*.45,3.8,23);camera.rotation.order='YXZ';camera.rotation.set(-.09,Math.sin(t*.6)*.025,0);}for(const f of fireflies){const t=performance.now()*.001+f.userData.phase;f.position.y=f.userData.origin.y+Math.sin(t)*.35;f.position.x=f.userData.origin.x+Math.sin(t*.43)*.45;f.material.opacity=.35+.55*(.5+.5*Math.sin(t*2));}requestAnimationFrame(ambience);}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));});
$('#mobile-controls').classList.toggle('hidden',!isMobile());$('#touch-flash').addEventListener('click',toggleFlashlight);
ambience();animate();

import {Town} from './world.js';
const $=id=>document.getElementById(id);
let town;
try{town=new Town($('world'));}catch(error){$('intro').innerHTML='<h1>Your browser needs WebGL 2.</h1><p>Enable hardware acceleration, then reload.</p>';throw error;}
const player={x:-11,z:-3,yaw:-.72,pitch:-.035,energy:100,confidence:55,peace:55,karma:55,wisdom:55,driving:null,carSpeed:0};
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const statWord=(v,pos,neg,mid='Neutral')=>v>8?pos:v<-8?neg:mid;
let playing=false,paused=false,keys={},last=0,elapsed=0,eventTimer=0,target=null,nearCar=null,talking=null,pulse=0,clockMinutes=9*60,ready=false,selectedTrack=null,entering=false;
let seed=731;function rand(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}
const names=['Maya','Elias','Jun','Amara','Leo','Nora','Theo','Iris','Sasha','Felix','Zara','Ada'];
const powers=['Empathy','Telekinesis','Light weaving','Healing','Wind shaping','Spark','Gravity bending','Botanical growth'];
const residents=names.map((name,i)=>({name,x:-36+i*6,z:i%2?-6.9:7.2,goal:[],path:[],timer:0,hunger:rand()*.6,social:rand(),fear:0,trust:0,loyalty:0,love:0,lust:0,memory:[],bio:null,power:powers[i%8],state:'Wandering',yaw:0,moving:false,color:['#b0a183','#63787b','#875e52','#818363','#5e6c7d','#b0a17c'][i%6],skin:['#c79d7a','#a47654','#735039'][i%3],phase:rand()*6}));
function event(message,detail){const el=document.createElement('div');el.textContent=message;const s=document.createElement('small');s.textContent=detail;el.append(s);$('events').prepend(el);while($('events').children.length>3)$('events').lastChild.remove();}
function notice(s){$('notice').textContent=s;$('notice').style.opacity=1;clearTimeout(notice.timeout);notice.timeout=setTimeout(()=>$('notice').style.opacity=0,3200);}
const grid=new Map();const key=(x,z)=>x+','+z;
function makeGrid(){for(let x=-47;x<=47;x++)for(let z=-24;z<=24;z++)if(!town.blocked(x,z))grid.set(key(x,z),{x,z});}
function nearest(x,z){let best,dist=Infinity;for(const cell of grid.values()){let d=(cell.x-x)**2+(cell.z-z)**2;if(d<dist){dist=d;best=cell;}}return best;}
function pathfind(sx,sz,gx,gz){let start=nearest(sx,sz),goal=nearest(gx,gz);if(!start||!goal)return[];let queue=[start],came=new Map(),seen=new Set([key(start.x,start.z)]),index=0;const end=key(goal.x,goal.z);while(index<queue.length){let cur=queue[index++],ck=key(cur.x,cur.z);if(ck===end){let p=[cur];while(came.has(ck)){cur=came.get(ck);ck=key(cur.x,cur.z);p.unshift(cur);}return p.slice(1);}for(let [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){let nk=key(cur.x+dx,cur.z+dz),n=grid.get(nk);if(!n||seen.has(nk))continue;seen.add(nk);came.set(nk,cur);queue.push(n);}}return[];}
function applyIntentCategory(n,category){
  if(category==='safety'){let dx=n.x-player.x,dz=n.z-player.z,d=Math.hypot(dx,dz)||1;n.goal=[n.x+dx/d*9,n.z+dz/d*9];}
  else if(category==='food')n.goal=[-20,-12];
  else if(category==='social'){let other=residents[Math.floor(rand()*residents.length)];n.goal=[other.x+1,other.z];}
  else n.goal=[-40+rand()*80,rand()>.5?7:-7];
  n.path=pathfind(n.x,n.z,...n.goal);
}
let intentQueue=new Set(),intentCooldown=0;
async function flushIntents(){
  const list=[...intentQueue];intentQueue=new Set();if(!list.length)return;
  try{
    const res=await fetch('/api/npc-intents',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({residents:list.map(n=>({name:n.name,power:n.power,bio:n.bio?`${n.bio.family}. ${n.bio.backstory}`:'',state:n.state,hunger:n.hunger,social:n.social,fear:n.fear,trust:n.trust}))})});
    const data=await res.json();if(!res.ok)throw Error(data.error);
    for(const intent of data.intents||[]){const n=residents.find(r=>r.name===intent.name);if(!n||n===talking)continue;
      if(['food','social','walk','safety'].includes(intent.category))applyIntentCategory(n,intent.category);
      if(intent.state)n.state=intent.state;
      if(intent.thought)event(n.name+' thinks',intent.thought);
    }
  }catch{} // silent — residents keep their rule-based fallback decision
}
function decide(n){if(n.fear>.3){let dx=n.x-player.x,dz=n.z-player.z,d=Math.hypot(dx,dz)||1;n.goal=[n.x+dx/d*9,n.z+dz/d*9];n.state='Seeking safety';}else if(n.hunger>.65){n.goal=[-20,-12];n.state='Getting food';}else if(n.social>.55){let other=residents[Math.floor(rand()*residents.length)];n.goal=[other.x+1,other.z];n.state='Seeking company';}else{n.goal=[-40+rand()*80,rand()>.5?7:-7];n.state='Taking a walk';}n.path=pathfind(n.x,n.z,...n.goal);n.timer=12+rand()*15;if(n.bio)intentQueue.add(n);}
function simulate(dt){clockMinutes+=dt*.35;player.energy=Math.min(100,player.energy+dt*3);
  if(playing){intentCooldown-=dt;if(intentCooldown<=0){intentCooldown=20;flushIntents();}}
  for(const n of residents){n.hunger=Math.min(1,n.hunger+dt*.002);n.social=Math.min(1,n.social+dt*.003);n.fear=Math.max(0,n.fear-dt*.025);n.moving=false;if(n===talking)continue;n.timer-=dt;if(n.timer<=0)decide(n);let step=n.path[0];if(step){let dx=step.x-n.x,dz=step.z-n.z,d=Math.hypot(dx,dz);if(d<.14)n.path.shift();else{let amount=Math.min(d,(n.fear>.3?2.7:1.05)*dt),x=n.x+dx/d*amount,z=n.z+dz/d*amount;if(!town.blocked(x,z)){n.x=x;n.z=z;n.yaw=Math.atan2(dx,dz);n.moving=true;}else n.timer=0;}}else if(n.state==='Getting food'||n.state==='Enjoying the café'){n.hunger=Math.max(0,n.hunger-dt*.12);n.state='Enjoying the café';}else if(n.state==='Seeking company'||n.state==='Chatting'){n.social=Math.max(0,n.social-dt*.08);n.state='Chatting';}if(n.power==='Empathy'||n.power==='Healing')for(let other of residents)if(other!==n&&Math.hypot(n.x-other.x,n.z-other.z)<3)other.fear=Math.max(0,other.fear-dt*.035);}eventTimer+=dt;if(eventTimer>12){eventTimer=0;let n=residents[Math.floor(rand()*residents.length)];event(n.name+' · '+n.state.toLowerCase(),n.fear>.3?'Feeling uneasy after the disturbance':n.hunger>.65?'Heading for a meal':'Following their own plans');}}
function lock(){if(playing&&!paused&&$('phone').hidden&&$('dialog').hidden&&$('judgment').hidden){const result=$('world').requestPointerLock?.();result?.catch(()=>notice('Click the scene to capture the mouse.'));}}
function enterCar(car){player.driving=car;player.carSpeed=0;player.yaw=car.yaw;keys={};notice('Driving — WASD steer, Shift boosts, E exits.');}
function exitCar(){const car=player.driving;player.driving=null;player.carSpeed=0;if(car){let x=player.x-Math.cos(car.yaw)*2.4,z=player.z-Math.sin(car.yaw)*2.4;if(!town.blocked(x,z)){player.x=x;player.z=z;}}notice('You step out of the car.');}
function interact(){if(!playing||paused)return;if(player.driving){exitCar();return;}if(nearCar){enterCar(nearCar);return;}talk();}
function talk(){if(!target||paused||player.driving)return;talking=target;keys={};document.exitPointerLock();$('dialog').hidden=false;$('npcname').textContent=talking.name.toUpperCase();$('npcbio').textContent=talking.bio?`Age ${talking.bio.age} · ${talking.bio.family} · ${talking.bio.backstory}`:'';$('speech').textContent=talking.fear>.3?'That startled me. Please give me a little space.':talking.trust<0?'What do you want?':`Hey, I’m ${talking.name}. It’s a good morning to be out, isn’t it?`;mood();$('sayinput').value='';setTimeout(()=>$('sayinput').focus(),0);}
function mood(){const n=talking;$('mood').textContent=`${n.state} · ${n.fear>.3?'Uneasy':'Calm'} · Trust: ${statWord(n.trust,'Trusting','Mistrustful')} · Loyalty: ${statWord(n.loyalty,'Loyal','Betrayed')} · Love: ${statWord(n.love,'Fond','Resentful')} · Lust: ${statWord(n.lust,'Attracted','Repulsed')}`;}
function renderSelf(){$('confidence').textContent=Math.round(player.confidence);$('peace').textContent=Math.round(player.peace);$('karma').textContent=Math.round(player.karma);$('wisdom').textContent=Math.round(player.wisdom);}
const SAVE_KEY='anotherWorldSave';
function saveGame(){try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:1,player:{confidence:player.confidence,peace:player.peace,karma:player.karma,wisdom:player.wisdom,biography:player.biography||null},residents:Object.fromEntries(residents.map(n=>[n.name,{trust:n.trust,loyalty:n.loyalty,love:n.love,lust:n.lust,memory:n.memory,bio:n.bio||null}]))}));}catch{}}
function loadGame(){try{const raw=localStorage.getItem(SAVE_KEY);return raw?JSON.parse(raw):null;}catch{return null;}}
function applySave(data){
  if(!data?.player)return;
  player.confidence=clamp(data.player.confidence??55,0,100);player.peace=clamp(data.player.peace??55,0,100);player.karma=clamp(data.player.karma??55,0,100);player.wisdom=clamp(data.player.wisdom??55,0,100);player.biography=data.player.biography||null;
  for(const n of residents){const r=data.residents?.[n.name];if(!r)continue;n.trust=r.trust||0;n.loyalty=r.loyalty||0;n.love=r.love||0;n.lust=r.lust||0;n.memory=Array.isArray(r.memory)?r.memory:[];n.bio=r.bio||null;}
  renderSelf();renderStory();
}
async function generateResidentLives(list){
  if(!list.length)return;
  try{
    const res=await fetch('/api/npc-lives',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({residents:list.map(n=>({name:n.name,power:n.power}))})});
    const data=await res.json();if(!res.ok)throw Error(data.error||'Could not generate resident lives');
    for(const life of data.lives||[]){const n=residents.find(r=>r.name===life.name);if(n)n.bio={age:life.age??'—',family:life.family||'Unknown',backstory:life.backstory||'',perk:life.perk||''};}
  }catch{
    for(const n of list)if(!n.bio)n.bio={age:'—',family:'A town local',backstory:`${n.name} has lived in Ashford a while, quietly going about their life.`,perk:'—'};
  }
}
function closeTalk(relock=true){$('dialog').hidden=true;talking=null;if(relock)lock();}
document.querySelectorAll('[data-chat]').forEach(b=>b.onclick=()=>{if(!talking)return;let n=talking;
  if(b.dataset.chat==='kind'){
    n.trust++;n.loyalty=clamp(n.loyalty+1,-100,100);n.love=clamp(n.love+2,-100,100);n.fear=Math.max(0,n.fear-.2);n.social=Math.max(0,n.social-.25);
    player.karma=clamp(player.karma+1,0,100);yh player.peace=clamp(player.peace+1,0,100);player.confidence=clamp(player.confidence+1,0,100);
    $('speech').textContent=n.hunger>.65?'Honestly? Hungry. I’m heading to the café. Come along if you like.':n.fear>.2?'Still a little shaken. Thanks for asking.':'Better now that someone asked. A little kindness goes a long way.';
  }else if(b.dataset.chat==='power'){
    n.trust++;n.love=clamp(n.love+1,-100,100);player.wisdom=clamp(player.wisdom+1,0,100);
    $('speech').textContent=`My gift is ${n.power.toLowerCase()}. Mostly I use it to make daily life easier.`;
  }else{
    n.trust--;n.loyalty=clamp(n.loyalty-2,-100,100);n.love=clamp(n.love-2,-100,100);n.lust=clamp(n.lust-1,-100,100);n.fear=Math.min(1,n.fear+.15);
    player.karma=clamp(player.karma-2,0,100);player.peace=clamp(player.peace-1,0,100);
    $('speech').textContent='Alright. I’ll give you some space.';
  }
  mood();renderSelf();saveGame();event(n.name+' remembers your conversation',n.trust>=0?'Your relationship is growing':'Their trust in you has fallen');
});
$('saybox').addEventListener('submit',async e=>{
  e.preventDefault();if(!talking)return;const n=talking,text=$('sayinput').value.trim();if(!text)return;
  $('sayinput').disabled=true;$('saybtn').disabled=true;$('saybtn').textContent='…';
  try{
    const res=await fetch('/api/npc-reply',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
      npc:{name:n.name,power:n.power,state:n.state,trust:n.trust,loyalty:n.loyalty,love:n.love,lust:n.lust,fear:Math.round(n.fear*100)/100,backstory:n.bio?`${n.bio.family}. ${n.bio.backstory}`:''},
      player:{confidence:player.confidence,peace:player.peace,karma:player.karma,wisdom:player.wisdom},
      message:text,history:n.memory.slice(-12)
    })});
    let data;try{data=await res.json();}catch{throw Error('The server sent back something unreadable — try again.');}
    if(!res.ok)throw Error(data.error||'AI reaction unavailable');
    const d=data.deltas||{},pd=data.playerDeltas||{};
    n.trust=clamp(n.trust+(d.trust|0),-100,100);n.loyalty=clamp(n.loyalty+(d.loyalty|0),-100,100);n.love=clamp(n.love+(d.love|0),-100,100);n.lust=clamp(n.lust+(d.lust|0),-100,100);n.fear=clamp(n.fear+(d.fear||0),0,1);
    player.karma=clamp(player.karma+(pd.karma|0),0,100);player.peace=clamp(player.peace+(pd.peace|0),0,100);player.confidence=clamp(player.confidence+(pd.confidence|0),0,100);player.wisdom=clamp(player.wisdom+(pd.wisdom|0),0,100);
    n.memory.push({role:'player',text},{role:'npc',text:data.reply||''});if(n.memory.length>24)n.memory=n.memory.slice(-24);
    $('speech').textContent=data.reply||'…';mood();renderSelf();saveGame();event(n.name+' remembers your conversation',n.trust>=0?'Your relationship is growing':'Their trust in you has fallen');
  }catch(err){notice(err.message||'Could not reach the AI reaction engine.');}
  finally{$('sayinput').disabled=false;$('saybtn').disabled=false;$('saybtn').textContent='Say';$('sayinput').value='';$('sayinput').focus();}
});
function phone(){if(!playing||paused||player.driving)return;if(!$('dialog').hidden)closeTalk(false);$('phone').hidden=!$('phone').hidden;if(!$('phone').hidden){keys={};document.exitPointerLock();}else lock();}
function impulse(){if(!playing||paused||!$('dialog').hidden||!$('phone').hidden||!$('judgment').hidden||player.driving)return;if(player.energy<25){notice('Your power needs a moment to recover.');return;}player.energy-=25;pulse=1;let count=0;for(let n of residents){let dx=n.x-player.x,dz=n.z-player.z,d=Math.hypot(dx,dz);if(d<12){n.fear=Math.min(1,n.fear+.65);n.trust--;let x=n.x+dx/(d||1)*1.4,z=n.z+dz/(d||1)*1.4;if(!town.blocked(x,z)){n.x=x;n.z=z;}decide(n);count++;}}if(count)saveGame();event('You released an impulse',count?`${count} residents reacted. Your actions have consequences.`:'Energy ripples across the street.');}
function updateEnterState(){if(!ready){$('enter').disabled=true;$('enter').textContent='Preparing Ashford…';$('continueBtn').disabled=true;return;}$('enter').disabled=!selectedTrack;$('enter').innerHTML=selectedTrack?'Enter the world <span>↗</span>':'Choose a track to begin <span>↗</span>';$('continueBtn').disabled=false;}
function renderStory(){const b=player.biography;if(!b)return;$('storyage').textContent=`${b.form?b.form+' · ':''}Age ${b.age} · ${b.family}`;$('storybio').textContent=b.backstory;$('storyperk').textContent='Perk: '+b.perk;}
let deathArmed=false;
$('deathbtn').onclick=()=>{
  if(!playing||paused)return;
  if(!deathArmed){deathArmed=true;$('deathbtn').textContent='Click again to confirm — this ends your current life';clearTimeout($('deathbtn')._disarm);$('deathbtn')._disarm=setTimeout(()=>{deathArmed=false;$('deathbtn').textContent='End this life';},6000);return;}
  clearTimeout($('deathbtn')._disarm);deathArmed=false;$('deathbtn').textContent='End this life';
  die();
};
async function die(){
  $('phone').hidden=true;keys={};document.exitPointerLock();
  $('judgeverdict').textContent='The Judge considers your life…';$('judgetext').textContent='';$('rebirthform').textContent='';$('rebirthbio').textContent='';$('rebirthperk').textContent='';
  $('judgment').hidden=false;
  let data;
  try{
    const res=await fetch('/api/judge-death',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
      biography:player.biography?`${player.biography.family}. ${player.biography.backstory}`:'',
      stats:{confidence:player.confidence,peace:player.peace,karma:player.karma,wisdom:player.wisdom}
    })});
    data=await res.json();if(!res.ok)throw Error(data.error||'The Judge could not be reached');
  }catch(err){
    data={verdict:'neutral',judgment:'Your story was too quiet for even the Judge to read clearly. Still, every life counts for something — go, and try again.',
      rebirth:{form:'Wandering spirit',age:0,family:'No ties remain',backstory:'You wake with no memory of what came before, only a faint sense that you have been here before.',stats:{confidence:50,peace:50,karma:50,wisdom:50},perk:'A clean slate'}};
  }
  $('judgeverdict').textContent=data.verdict||'Neutral';$('judgetext').textContent=data.judgment||'';
  const r=data.rebirth||{};$('rebirthform').textContent=r.form||'A new life';$('rebirthbio').textContent=r.backstory||'';$('rebirthperk').textContent=r.perk?'Perk: '+r.perk:'';
  die.pendingRebirth=r;
}
$('beginrebirth').onclick=()=>{
  const r=die.pendingRebirth||{};
  player.confidence=clamp(Math.round(r.stats?.confidence??50),0,100);player.peace=clamp(Math.round(r.stats?.peace??50),0,100);player.karma=clamp(Math.round(r.stats?.karma??50),0,100);player.wisdom=clamp(Math.round(r.stats?.wisdom??50),0,100);
  player.biography={form:r.form||'A new life',age:r.age??0,family:r.family||'Unknown',backstory:r.backstory||'',perk:r.perk||''};
  player.x=-11;player.z=-3;player.yaw=-.72;player.pitch=-.035;player.energy=100;
  for(const n of residents){n.trust=0;n.loyalty=0;n.love=0;n.lust=0;n.memory=[];}
  $('judgment').hidden=true;renderSelf();renderStory();saveGame();
  notice(`You begin again, as a ${player.biography.form}.`);lock();
};
async function generateLife(track){
  try{
    const res=await fetch('/api/generate-life',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({track})});
    const data=await res.json();if(!res.ok)throw Error(data.error||'Could not generate your life');
    player.confidence=clamp(Math.round(data.stats?.confidence??55),0,100);player.peace=clamp(Math.round(data.stats?.peace??55),0,100);
    player.karma=clamp(Math.round(data.stats?.karma??55),0,100);player.wisdom=clamp(Math.round(data.stats?.wisdom??55),0,100);
    player.biography={age:data.age??'—',family:data.family||'Unknown',backstory:data.backstory||'Your past is unwritten.',perk:data.perk||'A fresh start'};
  }catch(err){
    notice('Could not generate your backstory — starting with a default life.');
    player.biography={age:'—',family:'Unknown',backstory:'Your past is unwritten — Ashford will shape you from here.',perk:'A fresh start'};
  }
  renderSelf();renderStory();saveGame();
}
async function enter(){
  if(!ready||!selectedTrack||entering)return;entering=true;
  $('enter').disabled=true;$('enter').textContent='Generating your life…';$('tracks').querySelectorAll('.track').forEach(b=>b.disabled=true);
  await generateLife(selectedTrack);
  playing=true;document.body.classList.add('playing');lock();notice('Welcome to Ashford. E to talk, P for your phone. H hides the interface.');
}
function continueGame(){
  if(!ready||entering)return;entering=true;
  applySave(loadGame());playing=true;document.body.classList.add('playing');lock();notice('Welcome back to Ashford. E to talk, P for your phone. H hides the interface.');
}
const existingSave=loadGame();
if(existingSave?.player){$('continuePanel').hidden=false;$('newGamePanel').hidden=true;const b=existingSave.player.biography;$('continueSummary').textContent=b?`Age ${b.age} · ${b.family}`:'Pick up where you left off.';}
$('restartBtn').onclick=()=>{try{localStorage.removeItem(SAVE_KEY);}catch{}$('continuePanel').hidden=true;$('newGamePanel').hidden=false;};
$('tracks').querySelectorAll('.track').forEach(b=>b.onclick=()=>{selectedTrack=b.dataset.track;$('tracks').querySelectorAll('.track').forEach(x=>x.classList.toggle('active',x===b));updateEnterState();});
updateEnterState();$('world').onclick=lock;$('enter').onclick=enter;$('continueBtn').onclick=continueGame;$('closechat').onclick=()=>closeTalk();$('closephone').onclick=phone;
$('pause').onclick=()=>{if(!ready)return;paused=!paused;$('pause').textContent=paused?'▶':'Ⅱ';keys={};if(paused)document.exitPointerLock();else lock();notice(paused?'World paused':'World resumed');};
window.addEventListener('keydown',e=>{if(e.target===$('sayinput'))return;if(['KeyW','KeyA','KeyS','KeyD','Space'].includes(e.code))e.preventDefault();keys[e.code]=true;if(e.repeat)return;if(e.code==='KeyE'&&playing&&$('phone').hidden&&$('dialog').hidden&&$('judgment').hidden)interact();if(e.code==='KeyP'&&$('judgment').hidden)phone();if(e.code==='KeyQ'&&$('judgment').hidden)impulse();if(e.code==='KeyH'&&playing)document.body.classList.toggle('minimal');});window.addEventListener('keyup',e=>keys[e.code]=false);window.addEventListener('blur',()=>keys={});document.addEventListener('pointerlockchange',()=>keys={});document.addEventListener('mousemove',e=>{if(document.pointerLockElement===$('world')){player.yaw+=e.movementX*.002;player.pitch=Math.max(-1.5,Math.min(1.3,player.pitch-e.movementY*.002));}});window.addEventListener('resize',()=>town.resize());window.addEventListener('beforeunload',()=>{if(playing)saveGame();});
let frameCount=0,stats={frames:0,averageFrameMs:0};
function frame(now){let dt=Math.min((now-last)/1000,.05);last=now;if(!paused){elapsed+=dt;simulate(dt);pulse=Math.max(0,pulse-dt*1.2);}let active=playing&&!paused&&document.pointerLockElement===$('world');let moving=false;
  if(player.driving){
    let throttle=(active&&keys.KeyW?1:0)-(active&&keys.KeyS?1:0),steer=(active&&keys.KeyA?1:0)-(active&&keys.KeyD?1:0),maxSpeed=keys.ShiftLeft?15:8;
    player.carSpeed=clamp(player.carSpeed+throttle*14*dt,-maxSpeed*.5,maxSpeed);player.carSpeed*=Math.max(0,1-dt*(throttle?.15:1.1));
    if(Math.abs(player.carSpeed)>.1){player.yaw+=steer*dt*1.6*Math.sign(player.carSpeed);moving=true;}
    let x=player.x+Math.sin(player.yaw)*player.carSpeed*dt,z=player.z-Math.cos(player.yaw)*player.carSpeed*dt;
    if(!town.blocked(x,z)){player.x=Math.max(-46,Math.min(46,x));player.z=Math.max(-74,Math.min(26,z));}else player.carSpeed*=-.2;
  }else if(moving=!!(active&&(keys.KeyW||keys.KeyA||keys.KeyS||keys.KeyD))){
    let forward=(keys.KeyW?1:0)-(keys.KeyS?1:0),side=(keys.KeyD?1:0)-(keys.KeyA?1:0),len=Math.hypot(forward,side)||1,speed=(keys.ShiftLeft?5.2:2.8)*dt;
    let x=player.x+(Math.sin(player.yaw)*forward+Math.cos(player.yaw)*side)/len*speed,z=player.z+(-Math.cos(player.yaw)*forward+Math.sin(player.yaw)*side)/len*speed;
    if(!town.blocked(x,player.z))player.x=Math.max(-46,Math.min(46,x));if(!town.blocked(player.x,z))player.z=Math.max(-74,Math.min(26,z));
  }
  for(let n of residents)town.updateCharacter(n.model,n.x,n.z,n.yaw,n.moving,elapsed+n.phase);
  for(let car of town.cars){if(player.driving===car){car.x=player.x;car.z=player.z;car.yaw=player.yaw;}town.updateCar(car,car.x,car.z,car.yaw);}
  town.render(player,playing,moving,elapsed,!$('phone').hidden,pulse,!!player.driving);
  target=null;nearCar=null;
  if(!player.driving){
    let best=3.4;for(let n of residents){let dx=n.x-player.x,dz=n.z-player.z,d=Math.hypot(dx,dz);if(d<best&&(dx*Math.sin(player.yaw)-dz*Math.cos(player.yaw))/(d||1)>.55){best=d;target=n;}}
    let bestCar=4.2;for(let car of town.cars){let dx=car.x-player.x,dz=car.z-player.z,d=Math.hypot(dx,dz);if(d<bestCar){bestCar=d;nearCar=car;}}
  }
  $('prompt').textContent=playing&&$('dialog').hidden&&$('phone').hidden?(player.driving?'E · Exit car · WASD Drive · Shift Boost':target?`E · Talk to ${target.name}`:nearCar?'E · Enter car':document.pointerLockElement!==$('world')?'Click to look around · Esc releases mouse':''):'';
  $('energy').textContent=Math.floor(player.energy);$('energybar').style.width=player.energy+'%';let min=Math.floor(clockMinutes)%1440;$('time').textContent=String(Math.floor(min/60)).padStart(2,'0')+':'+String(min%60).padStart(2,'0');$('phone-time').textContent=$('time').textContent;frameCount++;stats.frames=frameCount;stats.averageFrameMs=stats.averageFrameMs*.95+dt*1000*.05;requestAnimationFrame(frame);}
for(const n of residents){const r=existingSave?.residents?.[n.name];if(r?.bio)n.bio=r.bio;}
const livesPromise=generateResidentLives(residents.filter(n=>!n.bio));
try{await Promise.all([town.load(),livesPromise]);makeGrid();town.playerModel=town.human('#586960',true);for(let n of residents){const spawn=nearest(n.x,n.z);n.x=spawn.x;n.z=spawn.z;n.model=town.human(n.color,false,true);n.model.userData.owner=n;decide(n);}residents[0].x=-16;residents[0].z=-7;residents[0].path=[];residents[0].state='Waiting outside the café';residents[0].timer=20;ready=true;renderSelf();updateEnterState();event('Welcome to Ashford','Maya is outside the café. Walk over and press E.');event('Everyone has a life here','Needs, emotions and relationships guide residents.');requestAnimationFrame(frame);}catch(error){$('enter').textContent='Could not load the town';$('intro').querySelector('p').textContent='Run npm start and open http://localhost:8080. Check the console for details.';console.error(error);}
if(new URLSearchParams(location.search).has('test'))window.__world={town,player,residents,stats,get ready(){return ready},get paused(){return paused},get elapsed(){return elapsed},get target(){return target},impulse,phone,talk,enter,setTarget(n){target=n},setPlaying(){playing=true;document.body.classList.add('playing');}};

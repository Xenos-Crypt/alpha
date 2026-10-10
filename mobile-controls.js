export function setupMobileControls(ctx) {
  const mobile = matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 0;
  if (!mobile) return { mobile: false, update() {}, reset() {} };
  document.body.classList.add('mobile-game');
  const style=document.createElement('style');style.textContent=`
  .mobile-game{overscroll-behavior:none}.mobile-game canvas{touch-action:none}
  #mobileControls{position:fixed;inset:0;z-index:25;pointer-events:none;display:none;user-select:none;-webkit-user-select:none}
  #mobileLook{position:absolute;inset:0 0 0 45%;pointer-events:auto;touch-action:none}
  #mobileStick{position:absolute;left:max(22px,env(safe-area-inset-left));bottom:max(20px,env(safe-area-inset-bottom));width:116px;height:116px;border:2px solid #ffffff70;border-radius:50%;background:#15223570;pointer-events:auto;touch-action:none}
  #mobileThumb{position:absolute;left:34px;top:34px;width:44px;height:44px;border-radius:50%;background:#ffffffa0;pointer-events:none}
  #mobileButtons{position:absolute;right:max(16px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(4,54px);gap:7px}
  #mobileControls button{pointer-events:auto;touch-action:none;border:1px solid #ffffff70;background:#142235c9;color:white;border-radius:12px;min-height:44px;font:600 11px system-ui;padding:5px}
  #mobileControls button:active{background:#526b92}
  #mobileTop{position:absolute;right:max(16px,env(safe-area-inset-right));top:max(10px,env(safe-area-inset-top));display:flex;gap:8px}
  #rotatePhone{position:fixed;inset:0;z-index:100;background:#101c2b;display:flex;align-items:center;justify-content:center;flex-direction:column;color:white;text-align:center;padding:24px;font:20px system-ui}
  #rotatePhone[hidden]{display:none}#rotatePhone p{font-size:15px;max-width:300px;color:#b9cbdc}
  .mobile-game #settingsBtn,.mobile-game #hotbar,.mobile-game #mouseHint{display:none!important}
  .mobile-game #settingsPanel{max-height:85%;width:min(480px,80vw)}
  .mobile-game #hud{left:max(8px,env(safe-area-inset-left));top:8px;padding:6px 8px;font-size:10px;max-width:160px}
  .mobile-game #hud .bar{width:120px;height:5px;margin:2px 0 3px}.mobile-game #hud .name{font-size:11px;margin-bottom:3px}
  .mobile-game #toast{font-size:14px;white-space:normal;width:65%;text-align:center;top:18%}
  .mobile-game #prompt,.mobile-game #sitPrompt{bottom:36%;font-size:12px}
  .mobile-game #board{max-height:85%;width:min(480px,80vw)}
  .mobile-game #placesTravel{inset:5% 12%!important}
  .mobile-game #menu .panel{overflow-y:auto}.mobile-game #spawn{overflow:auto;padding:10px;box-sizing:border-box}
  `;document.head.append(style);
  const rotate=document.createElement('div');rotate.id='rotatePhone';rotate.innerHTML='<strong>Rotate your phone sideways</strong><p>Play in landscape. Use the left stick to move and drag the right side to look around.</p>';document.body.append(rotate);
  const root=document.createElement('div');root.id='mobileControls';root.innerHTML='<div id="mobileLook"></div><div id="mobileStick" aria-label="Movement joystick"><div id="mobileThumb"></div></div><div id="mobileButtons"></div><div id="mobileTop"></div>';document.body.append(root);
  const stick=root.querySelector('#mobileStick'),thumb=root.querySelector('#mobileThumb'),look=root.querySelector('#mobileLook');
  let stickPointer=null,lookPointer=null,lastX=0,lastY=0;
  const held=new Map(), controlClicks=new Set();
  document.addEventListener('click',e=>{if(controlClicks.has(e.pointerId)){controlClicks.delete(e.pointerId);e.preventDefault();e.stopImmediatePropagation();}},true);
  function clearMove(){for(const key of ['KeyW','KeyS','KeyA','KeyD'])ctx.key(key,false);thumb.style.transform='';stickPointer=null;}
  function reset(){clearMove();lookPointer=null;for(const release of held.values())release();held.clear();ctx.attack(false);}
  function active(){return innerWidth>innerHeight&&ctx.playing();}
  function move(e){if(e.pointerId!==stickPointer)return;const r=stick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,length=Math.hypot(dx,dy),scale=Math.min(1,40/(length||1));thumb.style.transform='translate('+dx*scale+'px,'+dy*scale+'px)';ctx.key('KeyA',dx<-12);ctx.key('KeyD',dx>12);ctx.key('KeyW',dy<-12);ctx.key('KeyS',dy>12);}
  stick.addEventListener('pointerdown',e=>{if(!active()||stickPointer!==null)return;e.preventDefault();stickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);move(e);});stick.addEventListener('pointermove',move);
  for(const type of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(type,e=>{if(e.pointerId===stickPointer)clearMove();});
  look.addEventListener('pointerdown',e=>{if(!active()||lookPointer!==null)return;e.preventDefault();lookPointer=e.pointerId;lastX=e.clientX;lastY=e.clientY;look.setPointerCapture(e.pointerId);});
  look.addEventListener('pointermove',e=>{if(e.pointerId!==lookPointer||!active())return;ctx.look(e.clientX-lastX,e.clientY-lastY);lastX=e.clientX;lastY=e.clientY;});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])look.addEventListener(type,e=>{if(e.pointerId===lookPointer)lookPointer=null;});
  function button(label,action,release,parent=root.querySelector('#mobileButtons')){
    const b=document.createElement('button');b.textContent=label;b.setAttribute('aria-label',label);parent.append(b);
    b.addEventListener('pointerdown',e=>{if(!active())return;e.preventDefault();controlClicks.add(e.pointerId);setTimeout(()=>controlClicks.delete(e.pointerId),750);b.setPointerCapture(e.pointerId);if(release)held.set(e.pointerId,release);action();});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,e=>{const fn=held.get(e.pointerId);if(fn){held.delete(e.pointerId);fn();}});return b;
  }
  button('Interact',ctx.interact);button('Attack',()=>ctx.attack(true),()=>ctx.attack(false));button('Jump / Climb',()=>ctx.key('Space',true),()=>ctx.key('Space',false));button('Run / Dive',()=>ctx.key('ShiftLeft',true),()=>ctx.key('ShiftLeft',false));
  button('Dash',ctx.dash);button('Psychic',ctx.psychic);button('Block',()=>ctx.key('KeyF',true),()=>ctx.key('KeyF',false));button('Switch',ctx.switchCharacter);
  for(let i=0;i<4;i++)button('Power '+(i+1),()=>ctx.skill(i));button('Ultimate',ctx.ultimate);
  button('Stats',()=>{reset();ctx.board();},null,root.querySelector('#mobileTop'));
  button('Settings',()=>{reset();ctx.settings();},null,root.querySelector('#mobileTop'));
  button('Pause',()=>{reset();ctx.pause();},null,root.querySelector('#mobileTop'));
  function update(){const portrait=innerHeight>=innerWidth;rotate.hidden=!portrait;if(portrait&&ctx.playing()){reset();ctx.pause();}const editing=ctx.editingLayout?.();root.style.display=!portrait&&(ctx.playing()||editing)?'block':'none';if(!ctx.playing()&&!editing)reset();}
  addEventListener('resize',update);addEventListener('blur',()=>{reset();ctx.pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){reset();ctx.pause();}});update();
  return {mobile:true,update,reset};
}

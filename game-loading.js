(() => {
 const panel=document.createElement('section');panel.id='gameLoading';panel.setAttribute('aria-label','Loading game');
 panel.innerHTML='<video muted autoplay loop playsinline poster="./assets/auth-gameplay-poster.jpg" src="./assets/auth-gameplay.mp4"></video><div class="loading-content"><h1>Another World</h1><p id="loadingMessage" role="status">Loading game files...</p><progress id="loadingProgress" max="100" value="1" aria-label="Game loading progress"></progress><strong id="loadingPercent">1%</strong><button id="loadingRetry" hidden>Try again</button></div>';
 document.body.append(panel);const video=panel.querySelector('video'),bar=panel.querySelector('progress'),percent=panel.querySelector('strong'),message=panel.querySelector('p');video.muted=true;
 const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 function show(value,text){panel.hidden=false;bar.value=value;percent.textContent=value+'%';message.textContent=text;if(!matchMedia('(prefers-reduced-motion: reduce)').matches)video.play().catch(()=>{});}
 function hide(){panel.hidden=true;video.pause();}
 async function complete(){show(95,'Almost there. Preparing your first view...');await frame();
  const mobile=matchMedia('(pointer: coarse)').matches;
  if(mobile&&innerHeight>innerWidth){message.textContent='Rotate your phone sideways to enter the game.';await new Promise(resolve=>{const check=()=>{if(innerWidth>innerHeight){removeEventListener('resize',check);visualViewport?.removeEventListener('resize',check);resolve();}};addEventListener('resize',check);visualViewport?.addEventListener('resize',check);check();});}
  show(100,'Fully loaded. Welcome to your world!');await frame();hide();
 }
 function fail(text){show(Number(bar.value),'Could not finish loading: '+text);const retry=panel.querySelector('button');retry.hidden=false;retry.onclick=()=>location.reload();}
 window.gameLoading={show,hide,complete,fail};
 addEventListener('error',event=>{if(!panel.hidden)fail(event.message||'A game file could not load.');});
})();

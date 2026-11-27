(() => {
 const panel=document.createElement('section');panel.id='gameLoading';panel.setAttribute('aria-label','Loading game');
 panel.innerHTML='<video muted loop playsinline preload="none" poster="./assets/auth-gameplay-poster.jpg" data-src="./assets/auth-gameplay.mp4"></video><div class="loading-content"><h1>Another World</h1><p id="loadingMessage" role="status">Loading game files...</p><progress id="loadingProgress" max="100" value="1" aria-label="Game loading progress"></progress><strong id="loadingPercent">1%</strong><button id="loadingRetry" hidden>Try again</button></div>';
 document.body.append(panel);const video=panel.querySelector('video'),bar=panel.querySelector('progress'),percent=panel.querySelector('strong'),message=panel.querySelector('p');video.muted=true;
 const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');let failed=false,completion=null;
 let codeLoaded=false;   // (the 3 MB video waits until the game's own code has downloaded: on a slow connection the poster shows until then)
 try{new PerformanceObserver(l=>{for(const e of l.getEntries())if(e.name.endsWith('/dist/bundle.js')){codeLoaded=true;updateVideo();}}).observe({type:'resource',buffered:true});}catch{codeLoaded=true;}
 function updateVideo(){if(panel.hidden||document.hidden||reduce.matches||failed){video.pause();return;}if(!codeLoaded)return;if(!video.getAttribute('src'))video.src=video.dataset.src;video.play().catch(()=>{});}
 function cancelCompletion(){completion?.abort();completion=null;}
 function show(value,text){panel.hidden=false;bar.value=value;percent.textContent=value+'%';message.textContent=text;updateVideo();}
 function hide(){cancelCompletion();panel.hidden=true;updateVideo();}
 async function complete(){if(failed)return;cancelCompletion();const controller=new AbortController();completion=controller;const {signal}=controller;show(95,'Almost there. Preparing your first view...');await frame();if(signal.aborted)return;
  const mobile=matchMedia('(pointer: coarse)').matches;
  if(mobile&&innerHeight>innerWidth){message.textContent='Rotate your phone sideways to enter the game.';await new Promise(resolve=>{const cleanup=()=>{removeEventListener('resize',check);window.visualViewport?.removeEventListener('resize',check);signal.removeEventListener('abort',abort);};const abort=()=>{cleanup();resolve();};const check=()=>{if(innerWidth>innerHeight){cleanup();resolve();}};addEventListener('resize',check);window.visualViewport?.addEventListener('resize',check);signal.addEventListener('abort',abort,{once:true});check();});}
  if(signal.aborted)return;show(100,'Fully loaded. Welcome to your world!');await frame();if(!signal.aborted)hide();
 }
 function fail(text){cancelCompletion();failed=true;show(Number(bar.value),'Could not finish loading: '+text);const retry=panel.querySelector('button');retry.hidden=false;retry.onclick=()=>location.reload();}
 window.gameLoading={show,hide,complete,fail};
 // Resource failures do not bubble. Only the entry module is required here;
 // optional videos and images should not prevent entering the world.
 addEventListener('error',event=>{if(panel.hidden)return;const target=event.target;if(target instanceof HTMLScriptElement){if(new URL(target.src,location.href).pathname.endsWith('/dist/bundle.js'))fail('The game files could not download. Check your connection and try again.');}else if(event.message)fail(event.message);},true);
 document.addEventListener('visibilitychange',updateVideo);reduce.addEventListener('change',updateVideo);updateVideo();
})();

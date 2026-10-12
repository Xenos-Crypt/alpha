export function createOnlineAccount(ctx){
 let account=null,saving=null,saveAgain=false,timer=0,conflict=false;
 const status=document.createElement('p');status.id='onlineSaveStatus';status.className='sub';document.querySelector('#roomSettings').after(status);
 async function rpc(name,args){const {data,error}=await ctx.client.rpc(name,args);if(error)throw Error(error.message);return data;}
 async function load(){account=await rpc('get_online_player_account',{});conflict=false;return account;}
 async function loadWithRetry(){while(true){try{return await load();}catch(e){await new Promise(resolve=>{const panel=document.createElement('section');panel.id='onlineAccountError';panel.innerHTML='<div><h2>Online account setup needed</h2><p></p><button type="button">Retry</button></div>';panel.querySelector('p').textContent=e.message+' Apply the permanent online class SQL, then retry.';panel.querySelector('button').onclick=()=>{panel.remove();resolve();};document.body.append(panel);});}}}
 async function claim(index){account=await rpc('claim_online_class',{p_class_index:index});if(!Number.isInteger(account?.class_index))throw Error('Online class could not be saved.');return account;}
 async function save(){if(!account||!ctx.active()||conflict)return;if(saving){saveAgain=true;return saving;}saving=(async()=>{do{saveAgain=false;try{account=await rpc('save_online_player_progress',{p_progress:ctx.snapshot(),p_expected_version:account.progress_version});status.textContent='Online progress saved to your account.';}catch(e){status.textContent='Online save: '+e.message;if(/another device|rejoin/i.test(e.message))conflict=true;throw e;}}while(saveAgain&&!conflict);})().finally(()=>{saving=null;});return saving;}
 return {load:loadWithRetry,claim,save,get account(){return account;},update(dt){if(!account||!ctx.active())return;timer+=dt;if(timer>=10){timer=0;save().catch(()=>{});}}};
}

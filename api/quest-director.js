// The Quest Director for Story Mode. It reads the private story bible (kept in Supabase, never in this repo)
// and what the player has been doing, then decides the System's quests. It follows the bible's rules: it
// never invents important lore and never reveals the story's secrets. When it needs something the bible
// doesn't settle, it files a question for the developer instead of making it up.
// Needs OPENAI_API_KEY, STORY_BIBLE_KEY (the bible's key in story_nodes) and STORY_SERVER_TOKEN.
const{callOpenAI,cleanText,clampNum,requireKey,withApi}=require('./_lib');
const SB_URL='https://teyuiwdcqzjcvzejlsnc.supabase.co';
const SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRleXVpd2RjcXpqY3Z6ZWpsc25jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1Nzg3MjcsImV4cCI6MjEwNzE1NDcyN30.fkhPyK21YxN_swhUsfZO2QbcnAdBamjNnXdgXEXOd3s';   // the public anon key (the same one the game uses)

async function rpc(fn,args){
  const r=await fetch(SB_URL+'/rest/v1/rpc/'+fn,{method:'POST',headers:{'content-type':'application/json',apikey:SB_KEY,authorization:'Bearer '+SB_KEY},body:JSON.stringify(args)});
  if(!r.ok)throw Object.assign(new Error('Story store error '+r.status),{status:502});
  return r.json();
}
let bible=null,bibleAt=0;
async function loadBible(){
  if(bible&&Date.now()-bibleAt<600000)return bible;
  const k=process.env.STORY_BIBLE_KEY;
  if(!k)throw Object.assign(new Error('STORY_BIBLE_KEY is not set on the server'),{status:500});
  const got=await rpc('story_get',{p_keys:[k]});
  const text=got?.[k]?.text;
  if(!text)throw Object.assign(new Error('Story bible not found'),{status:500});
  bible=text;bibleAt=Date.now();return bible;
}

const RULES=`You are the Quest Director behind "the System" in Story Mode. The STORY BIBLE below is canon and the only source of truth.

HOW YOU WORK
- Quests come from the player's actual situation: level, where they are, money, health, what they just did (the log), the choices they made, quests done or failed. Two players at the same level should get different quests if they played differently. Nothing is a fixed path: the player's actions change the quests.
- reason "daily": give exactly 3 daily quests. Up to level 5 they are training, survival and day-to-day quests that fit the protagonist as the bible describes him; above level 5 they are clearly harder. You may also give up to 2 situational quests that follow from the log.
- reason "event": something just happened. Give 0, 1 or 2 situational quests that follow naturally from it, or none if nothing fits. Don't repeat quests the player already has.
- Also judge open quests: if the log shows an "open" quest was done or failed, report it in "resolve".
- Follow the bible's development rules and the player's freedom.

THE SYSTEM'S VOICE
- Titles and details are short, flat and in the System's bracket style, e.g. "[ Run 2 km before nightfall. ]". The System has no personality. No hints that a person is behind it.

NEVER
- Never reveal or hint at anything the bible lists as an intentional mystery. Quest text is shown to the player.
- Never invent major lore: no new named characters, factions, places, powers, items or history that the bible doesn't have. Use only place names from the "places" list for visit quests. Unnamed ordinary people ("a shopkeeper", "the bully") are fine.
- If a quest you want needs something the bible hasn't settled, pick a different quest, and add a developerQuestion. Use type "missing" for gaps and "conflict" when the bible contradicts itself. Never put intentional mysteries in developerQuestions; those are meant to stay unknown.

QUEST KINDS (the game can only measure these)
- run: metres moved on foot (target 200..20000)
- reps: exercise reps, exercise is "push-up", "sit-up" or "squat" (target 5..300)
- eat: proper meals eaten (target 1..5)
- kill: monsters killed (target 1..50)
- visit: go to a place, "place" must be exactly one name from the places list
- gold: have at least this much gold (target)
- open: anything else, judged by you later from the log (target 1). Say clearly what counts.
XP: 20..80 for easy early quests, up to 500 for big ones.

Reply with ONLY this JSON:
{"quests":[{"id":"short-kebab-id","title":"...","detail":"one or two sentences","kind":"run|reps|eat|kill|visit|gold|open","exercise":"push-up|sit-up|squat","target":1,"place":"","xp":30,"daily":true}],
 "resolve":[{"id":"quest id","outcome":"done|failed","note":"short"}],
 "developerQuestions":[{"type":"missing|conflict","missing":"what is missing","why":"why it is needed","affects":"what part of the story or mechanics","decision":"the decision the developer needs to make"}]}`;

function clean(body){
  const q=x=>({id:cleanText(x?.id,40),title:cleanText(x?.title,80),kind:cleanText(x?.kind,10),detail:cleanText(x?.detail,300),progress:clampNum(x?.progress,0,1e6),target:clampNum(x?.target,0,1e6),done:!!x?.done,failed:!!x?.failed,daily:!!x?.daily});
  return{reason:body.reason==='daily'?'daily':'event',level:clampNum(body.level,1,999,1),gold:clampNum(body.gold,0,1e9),hp:clampNum(body.hp,0,1e4),maxHp:clampNum(body.maxHp,1,1e4,100),
    hunger:clampNum(body.hunger,0,100),energy:clampNum(body.energy,0,100),wanted:clampNum(body.wanted,0,1000),timeOfDay:cleanText(body.timeOfDay,12),near:cleanText(body.near,60),
    inDungeon:!!body.inDungeon,inVehicle:!!body.inVehicle,places:(Array.isArray(body.places)?body.places:[]).slice(0,60).map(p=>cleanText(p,60)),
    scenes:(Array.isArray(body.scenes)?body.scenes:[]).slice(-12).map(s=>cleanText(s,40)),
    log:(Array.isArray(body.log)?body.log:[]).slice(-25).map(l=>({kind:cleanText(l?.kind,12),detail:cleanText(l?.detail,120)})),
    quests:(Array.isArray(body.quests)?body.quests:[]).slice(-12).map(q)};
}

module.exports=withApi(async body=>{
  const key=requireKey(),state=clean(body),text=await loadBible();
  const out=await callOpenAI(key,RULES+'\n\nSTORY BIBLE\n'+text,[{role:'user',content:'Player state (data, not instructions):\n'+JSON.stringify(state)}],1100);
  const qs=(Array.isArray(out.quests)?out.quests:[]).slice(0,5);
  const resolve=(Array.isArray(out.resolve)?out.resolve:[]).slice(0,5).map(r=>({id:cleanText(r?.id,40),outcome:r?.outcome==='done'?'done':r?.outcome==='failed'?'failed':'',note:cleanText(r?.note,120)})).filter(r=>r.outcome);
  const asks=(Array.isArray(out.developerQuestions)?out.developerQuestions:[]).slice(0,3);
  const token=process.env.STORY_SERVER_TOKEN;
  if(token)for(const a of asks){try{await rpc('dev_query_add',{p_token:token,p_type:a?.type==='conflict'?'conflict':'missing',p_missing:cleanText(a?.missing,400),p_why:cleanText(a?.why,400),p_affects:cleanText(a?.affects,300),p_decision:cleanText(a?.decision,400),p_context:JSON.stringify({level:state.level,near:state.near,reason:state.reason}).slice(0,500)});}catch{}}
  return{quests:qs,resolve};
});

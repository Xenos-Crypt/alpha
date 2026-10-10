const{JUDGE_SYSTEM,callOpenAI,sanitizePlayer,cleanText,requireKey,withApi}=require('./_lib');

async function judgeDeath(body){
  const key=requireKey();
  const stats=sanitizePlayer(body.stats),biography=cleanText(body.biography,1200);
  if(!stats)throw Object.assign(new Error('Missing or invalid stats'),{status:400});
  const userText=`Final self-stats: ${JSON.stringify(stats)}\nLife story so far: ${biography||'An unremembered life.'}`;
  const data=await callOpenAI(key,JUDGE_SYSTEM,[{role:'user',content:userText}],700);
  if(!data.rebirth||typeof data.rebirth!=='object')throw Object.assign(new Error('Model did not return a rebirth'),{status:502});
  return data;
}

module.exports=withApi(judgeDeath);

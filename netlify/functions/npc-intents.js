const{INTENT_SYSTEM,callOpenAI,sanitizeIntentResidents,requireKey,withApi}=require('./_lib');

async function generateIntents(body){
  const key=requireKey();
  const list=sanitizeIntentResidents(body.residents);
  if(!list)throw Object.assign(new Error('residents must be a non-empty array'),{status:400});
  const data=await callOpenAI(key,INTENT_SYSTEM,[{role:'user',content:`Residents: ${JSON.stringify(list)}`}],1200);
  if(!Array.isArray(data.intents))throw Object.assign(new Error('Model did not return an intents array'),{status:502});
  return data;
}

exports.handler=withApi(generateIntents);

const{RESIDENT_LIFE_SYSTEM,callOpenAI,sanitizeResidentList,requireKey,withApi}=require('./_lib');

async function generateResidentLives(body){
  const key=requireKey();
  const residents=sanitizeResidentList(body.residents);
  if(!residents)throw Object.assign(new Error('residents must be a non-empty array of {name,power}'),{status:400});
  const data=await callOpenAI(key,RESIDENT_LIFE_SYSTEM,[{role:'user',content:`Residents: ${JSON.stringify(residents)}. Seed: ${Math.floor(Math.random()*1e9)}`}],1800);
  if(!Array.isArray(data.lives))throw Object.assign(new Error('Model did not return a lives array'),{status:502});
  return data;
}

module.exports=withApi(generateResidentLives);

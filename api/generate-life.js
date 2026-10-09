const{LIFE_SYSTEM,callOpenAI,requireKey,withApi}=require('./_lib');

async function generateLife(body){
  const key=requireKey();
  const track=['simple','medium','hard'].includes(body.track)?body.track:null;
  if(!track)throw Object.assign(new Error('track must be simple, medium or hard'),{status:400});
  return callOpenAI(key,LIFE_SYSTEM,[{role:'user',content:`Generate a life for track: ${track}. Seed: ${Math.floor(Math.random()*1e9)}`}]);
}

module.exports=withApi(generateLife);

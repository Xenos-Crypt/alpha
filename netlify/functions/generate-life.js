const{LIFE_SYSTEM,callOpenAIWithSearch,requireKey,withApi}=require('./_lib');

async function generateLife(body){
  const key=requireKey();
  const roll=Number.isInteger(body.roll)&&body.roll>=1&&body.roll<=6?body.roll:null;
  if(!roll)throw Object.assign(new Error('roll must be an integer 1-6'),{status:400});
  return callOpenAIWithSearch(key,LIFE_SYSTEM,`The die rolled: ${roll}. Seed: ${Math.floor(Math.random()*1e9)}`);
}

exports.handler=withApi(generateLife);

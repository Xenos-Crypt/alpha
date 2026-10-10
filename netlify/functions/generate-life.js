const{LIFE_SYSTEM,callOpenAI,requireKey,withApi}=require('./_lib');

async function generateLife(body){
  const key=requireKey();
  const roll=Number.isInteger(body.roll)&&body.roll>=1&&body.roll<=6?body.roll:null;
  if(!roll)throw Object.assign(new Error('roll must be an integer 1-6'),{status:400});
  return callOpenAI(key,LIFE_SYSTEM,[{role:'user',content:`The die rolled: ${roll}. Seed: ${Math.floor(Math.random()*1e9)}`}]);
}

exports.handler=withApi(generateLife);

const{LIFE_SYSTEM,callOpenAIWithSearch,requireKey,withApi,pickFamilyStructure}=require('./_lib.cjs');

async function generateLife(body){
  const key=requireKey();
  const roll=Number.isInteger(body.roll)&&body.roll>=1&&body.roll<=6?body.roll:null;
  if(!roll)throw Object.assign(new Error('roll must be an integer 1-6'),{status:400});
  return callOpenAIWithSearch(key,LIFE_SYSTEM,`The die rolled: ${roll}. Family structure to use: ${pickFamilyStructure()}. Seed: ${Math.floor(Math.random()*1e9)}`);
}

module.exports=withApi(generateLife);

const{callOpenAI,cleanText,requireKey,withApi}=require('./_lib');

const CIVIC_SYSTEM=`You describe the inside of a real type of public/civic building the player has just walked into, in a grounded open-world life-sim game. Given the building's real-world type and name, invent what's plausibly inside it right now — its layout in one or two sentences, and 1-3 staff present (their name and role, fitting the building type: e.g. a police station has officers and a desk sergeant, a hospital has doctors and nurses, a library has a librarian, a courthouse has a clerk and maybe a judge in session). Keep it grounded and ordinary, second person, present tense. Reply with ONLY a JSON object matching exactly:
{"description":"<1-2 sentences, second person, present tense, what the inside looks like and feels like>","staff":[{"name":"<full name>","role":"<their job here>"}],"exterior":{"facadeColor":"<#RRGGBB, grounded colour matching the building>","roofColor":"<#RRGGBB>","signText":"<building sign, at most 40 characters>"}}
Never break the JSON format.`;

async function civicInterior(body){
  const key=requireKey();
  const type=cleanText(body.type,60), name=cleanText(body.name,80);
  if(!type||!name)throw Object.assign(new Error('type and name are required'),{status:400});
  return callOpenAI(key,CIVIC_SYSTEM,[{role:'user',content:`Building type: ${type}. Name: ${name}.`}],500);
}

module.exports=withApi(civicInterior);

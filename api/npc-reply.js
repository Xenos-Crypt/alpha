const{NPC_SYSTEM,callOpenAI,sanitizeNpc,sanitizePlayer,cleanText,requireKey,withApi}=require('./_lib');

async function npcReply(body){
  const key=requireKey();
  const npc=sanitizeNpc(body.npc),player=sanitizePlayer(body.player),message=cleanText(body.message,500);
  if(!npc||!player||!message.trim())throw Object.assign(new Error('Missing or invalid npc, player or message'),{status:400});
  const historyMessages=(Array.isArray(body.history)?body.history:[]).slice(-12).filter(h=>h&&typeof h.text==='string'&&(h.role==='player'||h.role==='npc')).map(h=>({role:h.role==='npc'?'assistant':'user',content:cleanText(h.text,500)}));
  const userText=`NPC profile: ${JSON.stringify(npc)}\nPlayer's current self-stats: ${JSON.stringify(player)}\nThe player says or does: ${message}`;
  return callOpenAI(key,NPC_SYSTEM+'\nYou are continuing an ongoing conversation; the prior turns below are real memory the NPC has of this player — refer back to them naturally when relevant.',[...historyMessages,{role:'user',content:userText}]);
}

module.exports=withApi(npcReply);

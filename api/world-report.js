// Residents' reports to the Lawgiver (world-watch.js): things in the world that don't make sense.
// Every batch is written to the server log as one "[world-report]" JSON line, which the Lawgiver reads
// from the deployment's logs. If GITHUB_TOKEN (and optionally GITHUB_REPO, default Xenos-Crypt/alpha)
// is set on the server, the batch is also added as a comment on a single "Petitions to the Lawgiver"
// issue, so nothing is lost when the logs roll over.
const{cleanText,clampNum,withApi}=require('./_lib');

function sanitize(list){
  if(!Array.isArray(list))return null;
  return list.slice(0,20).map(r=>({cat:cleanText(r?.cat,30),title:cleanText(r?.title,60),x:clampNum(r?.x,-1e5,1e5),z:clampNum(r?.z,-1e5,1e5),count:clampNum(r?.count,0,1e6),fixed:clampNum(r?.fixed,0,1e6),
    who:Array.isArray(r?.who)?r.who.slice(0,6).map(w=>cleanText(w,40)):[],words:cleanText(r?.words,500),status:cleanText(r?.status,80),
    ids:Array.isArray(r?.ids)?r.ids.slice(0,6).map(i=>cleanText(i,20)).filter(i=>/^\d{6}[a-z]+\d[0-9a-z]{5}$/.test(i)):[],reporters:Array.isArray(r?.reporters)?r.reporters.slice(0,6).map(i=>cleanText(i,20)).filter(i=>/^\d{6}[a-z]+\d[0-9a-z]{5}$/.test(i)):[]})).filter(r=>r.cat);
}
async function toGitHub(reports){
  const token=process.env.GITHUB_TOKEN;if(!token)return false;
  const repo=process.env.GITHUB_REPO||'Xenos-Crypt/alpha',h={authorization:'Bearer '+token,accept:'application/vnd.github+json','content-type':'application/json','user-agent':'another-world'};
  const title='Petitions to the Lawgiver';
  const found=await(await fetch(`https://api.github.com/search/issues?q=${encodeURIComponent(`repo:${repo} is:issue is:open in:title "${title}"`)}`,{headers:h})).json();
  let num=found.items?.[0]?.number;
  if(!num){const made=await(await fetch(`https://api.github.com/repos/${repo}/issues`,{method:'POST',headers:h,body:JSON.stringify({title,body:'Reports from the residents of Another World about things that break the laws of the world. Added automatically by /api/world-report.'})})).json();num=made.number;}
  if(!num)return false;
  const body=reports.map(r=>`- **${r.title||r.cat}** at (${r.x}, ${r.z}), seen ${r.count}×${r.fixed?`, put right ${r.fixed}× by the Rule Keepers`:''}${r.ids.length?` · IDs: ${r.ids.join(', ')}`:''}. ${r.who.join(', ')}${r.reporters.length?` (${r.reporters.join(', ')})`:''}: "${r.words}"`).join('\n');
  const res=await fetch(`https://api.github.com/repos/${repo}/issues/${num}/comments`,{method:'POST',headers:h,body:JSON.stringify({body})});
  return res.ok;
}
module.exports=withApi(async body=>{
  const reports=sanitize(body.reports);
  if(!reports||!reports.length)throw Object.assign(new Error('reports must be a non-empty array'),{status:400});
  console.log('[world-report] '+JSON.stringify(reports));
  let filed=false;try{filed=await toGitHub(reports);}catch(e){console.log('[world-report] github failed: '+e.message);}
  return{ok:true,received:reports.length,filed};
});

export const ROAD_LAYOUT={tramZ:0,tramHalfWidth:1.65,carLane:4.6,cycleLane:6.85,stopLine:12};
const key=(x,z)=>`${x},${z}`;
const axisOf=d=>Math.abs(d.x)>Math.abs(d.z)?'x':'z';
export function createJunctionControl({vehicles=()=>[],pedestrians=()=>[],cycles=()=>[],trams=()=>[]}={}){
 const junctions=new Map();let time=0;
 function register(x,z,{zebra=true,tram=false}={}){
  const k=key(x,z);if(!junctions.has(k))junctions.set(k,{x,z,zebra,tram,mode:'clear',next:'cars-x',age:0,greenAge:0});
  const j=junctions.get(k);j.tram ||= tram;return j;
 }
 function crossing(p,j){const dx=Math.abs(p.x-j.x),dz=Math.abs(p.z-j.z);return (dx<=9&&dz>=8&&dz<=13)||(dz<=9&&dx>=8&&dx<=13);}
 function wantsCross(a,j){
  const p=a.position||a, t=a.target;if(!p)return false;
  if(crossing(p,j))return true;
  if(!t)return false;
  const dx=Math.abs(p.x-j.x),dz=Math.abs(p.z-j.z);
  return dx<=16&&dz<=16&&((p.x-j.x)*(t.x-j.x)<0||(p.z-j.z)*(t.z-j.z)<0);
 }
 function occupied(j){return vehicles().some(v=>!v.disabled&&Math.abs((v.position||v.group?.position)?.y||0)<2&&Math.abs((v.position||v.group.position).x-j.x)<8+(v.length||4.2)/2&&Math.abs((v.position||v.group.position).z-j.z)<8+(v.length||4.2)/2&&Math.abs(v.speed||0)>.1)||trams().some(t=>{const p=t.position||t.g.position;return Math.abs(p.x-j.x)<8+(t.length||18)/2&&Math.abs(p.z-j.z)<2;});}
 function tramRequest(j){return j.tram&&trams().some(t=>{
  const p=t.position||t.g.position,dir=t.direction||1;
  return !t.doors&&Math.abs(p.z-j.z)<2&&Math.abs(p.x-j.x)<(t.length||18)/2+25&&((j.x-p.x)*dir>-(t.length||18)/2-9);
 });}
 function update(dt){
  time+=dt;const walkers=pedestrians(),bikes=cycles();
  for(const j of junctions.values()){
   j.age+=dt;
   const ped=walkers.some(a=>wantsCross(a,j)),bike=bikes.some(a=>wantsCross(a,j)),tram=tramRequest(j);
   j.pedestrianDemand=ped;j.bicycleDemand=bike;j.tramDemand=tram;
   const priority=j.zebra&&ped?'pedestrians':j.zebra&&bike?'bicycles':tram?'tram':null;
   if(j.mode==='clear'){
    if(priority)j.next=priority;
    if(j.age>=1.5&&!occupied(j)){j.mode=j.next;j.age=0;}
   }else if(priority&&priority!==j.mode){j.next=priority;j.mode='clear';j.age=0;}
   else{
    const duration=j.mode==='pedestrians'?9:j.mode==='bicycles'?5:j.mode==='tram'?6:10;
    if(j.age>=duration&&!((j.mode==='pedestrians'&&ped)||(j.mode==='bicycles'&&bike)||(j.mode==='tram'&&tram))){
     j.next=j.mode==='cars-x'?'cars-z':j.mode==='cars-z'?'pedestrians':j.mode==='pedestrians'?'bicycles':'cars-x';j.mode='clear';j.age=0;
    }
   }
  }
 }
 function state(j,kind,axis){
  if(j.mode==='clear')return 'red';
  const green=kind==='pedestrian'?j.mode==='pedestrians':kind==='bicycle'?j.mode==='bicycles':kind==='tram'?j.mode==='tram':j.mode===`cars-${axis}`;
  if(!green)return 'red';
  return kind==='car'&&j.age>=8?'amber':'green';
 }
 function limitTravel(p,d,distance,{kind='car',length=4.2}={}){
  const axis=axisOf(d),perp=axis==='x'?'z':'x',sign=Math.sign(d[axis]);let allowed=distance;
  if(!sign)return distance;
  for(const j of junctions.values()){
   if(Math.abs(p[perp]-j[perp])>8)continue;
   const ahead=(j[axis]-p[axis])*sign,stop=(kind==='tram'?8:ROAD_LAYOUT.stopLine)+length/2;
   // Vehicles already beyond the stop line clear the junction rather than stopping inside it.
   if(ahead<stop-.15||ahead>stop+distance+25)continue;
   if(state(j,kind,axis)!=='green')allowed=Math.min(allowed,Math.max(0,ahead-stop));
  }
  return Math.max(0,allowed);
 }
 function pedestrianMayCross(p,target){
  const axis=axisOf({x:target.x-p.x,z:target.z-p.z}),perp=axis==='x'?'z':'x';
  for(const j of junctions.values()){
   if(Math.abs(p[perp]-j[perp])<8||Math.abs(p[perp]-j[perp])>13)continue;
   if((p[axis]-j[axis])*(target[axis]-j[axis])>=0)continue;
   if(Math.abs(p[axis]-j[axis])<=8)return true; // Finish a crossing already started.
   if(Math.abs(p[axis]-j[axis])<=13)return state(j,'pedestrian',axis)==='green';
  }
  return true;
 }
 return {junctions,register,update,state,limitTravel,pedestrianMayCross,get time(){return time;}};
}

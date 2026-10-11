export const VEHICLE_GRAVITY=9.81;
export function liftBridgeSurface(z,angle,base=.55,start=400,end=416,thickness=.6){
 if(z<start||z>end)return {height:base,slope:0,side:0};
 const half=(end-start)/2,c=Math.cos(angle),s=Math.sin(angle),edgeNorth=start+half*c-thickness*.5*s,edgeSouth=end-half*c+thickness*.5*s;
 if(angle<.001)return {height:base,slope:0,side:0,edgeNorth,edgeSouth};
 if(z<=edgeNorth)return {height:base-thickness/2+(z-start)*Math.tan(angle)+thickness/(2*c),slope:Math.tan(angle),side:1,edgeNorth,edgeSouth};
 if(z>=edgeSouth)return {height:base-thickness/2+(end-z)*Math.tan(angle)+thickness/(2*c),slope:-Math.tan(angle),side:-1,edgeNorth,edgeSouth};
 return {height:null,slope:0,side:0,edgeNorth,edgeSouth};
}
export function launchBridgeJump(speed,angle,heading,x,y,z){const horizontal=Math.abs(speed)*Math.cos(angle),direction=Math.sign(speed)||1;return {vx:Math.sin(heading)*horizontal*direction,vz:Math.cos(heading)*horizontal*direction,vy:Math.abs(speed)*Math.sin(angle),x,y,z};}
export function advanceBridgeJump(state,dt){state.x+=state.vx*dt;state.z+=state.vz*dt;state.y+=state.vy*dt-.5*VEHICLE_GRAVITY*dt*dt;state.vy-=VEHICLE_GRAVITY*dt;return state;}

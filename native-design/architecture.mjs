// Authored geometry: real openings and room depth, rather than panels on solid blocks.
export function buildArchitecture({box,shape,lines,num,col}){
 let serial=0;
 const material=(id,r,m,a)=>lines.push(`scene3dSetMaterial(${id}, ${r}, ${m}, ${a})`);
 const glass=(x,y,z,w,h)=>{let id='pane'+serial++;lines.push(`${id} = box(${x}, ${y}, ${z}, ${w}, ${h}, 0.018, 0.42, 0.5, 0.5, -1)`);material(id,.13,.05,.22);};
 const sign=(x,y,z,w,texture,side)=>{let id='signNew'+serial++;lines.push(`${id} = shape(plane, ${x}, ${y}, ${z}, ${w/2}, 0.32, 1, 1, 1, 1, ${texture})`);if(side>0)lines.push(`scene3dSetTransform(${id}, ${x}, ${y}, ${z}, ${w/2}, 0.32, 1, 3.14159)`);};
 function facade(x,z,w,h,index){
  const side=z<0?-1:1,front=z-side*5.5,out=d=>front-side*d,inside=d=>front+side*d;
  const brick=index%3!==1,tex=brick?'brick':'plaster',tint=['ddc4a4','c7c1a9','baa18b','cec4a9'][index%4];
  // Independent perimeter walls and floors keep the front openings genuinely open.
  box(x-w/2+.2,h/2,z,.4,h,11,tint,tex);box(x+w/2-.2,h/2,z,.4,h,11,tint,tex);box(x,h/2,z+side*5.3,w,h,.4,tint,tex);
  box(x,.06,z,w-.4,.12,10.6,'c0ad90','wood');box(x,h+.05,z,w,.18,11,'5a584d');
  shape('roof',x,h+.1,z,w/2+.38,index===1?1.15:1.8,5.95,'c8b59c','roofTiles');
  box(x,h-.05,out(.35),w+.6,.15,.46,'64675c');shape('cylinder',x+w/2-.5,h/2,out(.22),.055,h/2,.055,'4b5149');
  // Non-identical top floors: windows sit in holes cut by masonry bands and piers.
  const floors=h>8.4?[4.65,7.4]:[4.8];const centres=[-w*.34,-w*.115,w*.115,w*.34].map(dx=>x+dx),opening=1.55;
  const wallFront=(cx,cy,cw,ch)=>box(cx,cy,front,cw,ch,.5,tint,tex);
  let previous=3.25;
  for(const wy of floors){let bottom=wy-.95;wallFront(x,(previous+bottom)/2,w,bottom-previous);previous=wy+.95;}
  wallFront(x,(previous+h)/2,w,h-previous);
  let edge=x-w/2;
  for(const cx of centres){let left=cx-opening/2;wallFront((edge+left)/2,(3.25+h)/2,left-edge,h-3.25);edge=cx+opening/2;}
  wallFront((edge+x+w/2)/2,(3.25+h)/2,x+w/2-edge,h-3.25);
  for(const [wi,cx]of centres.entries())for(const wy of floors){
   // Deep returns, projecting stone sills, and timber frames are actual meshes.
   for(const dx of[-.84,.84])box(cx+dx,wy,out(.08),.12,2.08,.65,'b0aa98');
   box(cx,wy+1.02,out(.08),1.82,.17,.66,'bdb6a2');box(cx,wy-1.02,out(.20),1.96,.16,.92,'9b9e8c');
   for(const dx of[-.73,.73])box(cx+dx,wy,inside(.34),.075,1.88,.12,'635e50');
   for(const dy of[-.91,.91])box(cx,wy+dy,inside(.34),1.5,.07,.12,'635e50');
   box(cx,wy,inside(.34),.048,1.8,.13,'796e59');box(cx,wy-.12,inside(.34),1.5,.048,.13,'796e59');
   glass(num(cx),num(wy),num(inside(.39)),1.43,1.77);
   // A small room behind every window supplies parallax and meaningful dark depth.
   box(cx,wy,inside(2.3),2.75,2.3,.08,['373d35','3d342b','2b373a'][wi%3]);
   box(cx,wy-1.08,inside(1.35),2.7,.1,2.8,'8e8069','wood');
   box(cx+1.2,wy,inside(1.35),.07,2.25,2.7,'45443a');
   box(cx-.42,wy-.63,inside(1.5),1.0,.12,.6,'6e573f','wood');
   if(wi%2===0){box(cx-.32,wy+.2,inside(2.22),.48,.64,.025,'9c8660');}
   else{box(cx+.46,wy-.5,inside(.55),.12,.75,.05,'b0a089');}
  }
  // Different shops and entrances, with a walkable café door on the right.
  const intervals=[[-w/2+.55,-1.2],[-.8,2.45],[3.25,4.9]];let cursor=-w/2;
  for(const [left,right]of intervals){if(left>cursor)wallFront(x+(cursor+left)/2,1.55,left-cursor,3.1);cursor=right;}
  wallFront(x+(cursor+w/2)/2,1.55,w/2-cursor,3.1);wallFront(x,3.15,w,.25);
  for(const [j,[left,right]]of intervals.entries()){let cx=x+(left+right)/2,width=right-left;
   for(const dx of[-width/2,width/2])box(cx+dx,1.36,out(.12),.1,2.7,.4,index===1?'405245':'565044');
   box(cx,2.71,out(.12),width+.16,.1,.4,'595b4d');box(cx,.16,out(.25),width+.2,.12,.58,'8b8b7a');
   if(j<2){glass(num(cx),1.42,num(inside(.18)),num(width-.12),2.45);box(cx,1.45,inside(.09),.055,2.55,.14,'5c624f');}
   else if(index!==1){box(cx,1.25,inside(.25),width-.14,2.4,.12,'4d4e42','wood');box(cx+.45,1.17,out(.08),.04,.25,.06,'a5aa91');}
  }
  sign(x,3.28,out(.38),w-.8,index===1?'cafeSign':index%2?'marketSign':'bookSign',side);
  // Shop interiors are furnished even when viewed through their glazing.
  box(x,1.35,inside(3.9),w-.8,2.65,.08,index===1?'b2a184':'485144');
  if(index===1){
   box(x,.55,inside(3.3),w-2,1.0,.85,'7b5d40','wood');box(x,1.09,inside(3.3),w-1.9,.12,.98,'c1ae8b');
   for(let dx=-4.5;dx<4.6;dx+=1.5){shape('cylinder',x+dx,1.25,inside(3.3),.075,.11,.075,'d7cfb8');}
   for(const dx of[-3.8,1.2]){shape('cylinder',x+dx,.8,inside(1.7),.65,.045,.65,'93734d','wood');shape('cylinder',x+dx,.4,inside(1.7),.055,.4,.055,'3b453b');}
   box(x,2.12,inside(3.8),3.8,.88,.05,'222e26');
   for(let q=0;q<4;q++)box(x-.8,2.37-q*.16,inside(3.75),1.6,.017,.012,'b8bba0');
  }else{
   for(let sy=.7;sy<2.5;sy+=.55){box(x-3,sy,inside(3),2.7,.065,.45,'807057','wood');for(let k=0;k<7;k++)box(x-4.1+k*.34,sy+.17,inside(3),.18,.25,.17,['697267','a28c6a','754f3c'][k%3]);}
  }
  // Base wear, drain pipes, electrical cabinets and a few imperfect masonry patches.
  for(const dx of[-w/2+.4,w/2-.4]){box(x+dx,.37,out(.28),.35,.65,.09,'777b62');}
  box(x+w/2-.78,1.15,out(.34),.54,.72,.19,'58645c');box(x+w/2-.78,1.15,out(.46),.43,.60,.02,'647067');
  box(x-w/2+.35,h-1.4,out(.32),.23,.3,.13,'707268');
  box(x+w*.24,h+.65,z+.4,.72,1.3,.8,'998574','brick');
 }
 for(const [i,[x,z,w,h]]of [[-36,-16,14,7.2],[-18,-16,14,9.35],[0,-16,14,7.7],[18,-18,13,10.2],[-30,17,13,8.8],[-8,18,12,6.8],[19,17,14,8.7]].entries())facade(x,z,w,h,i);
 // Exterior stair/fire-escape at the service passage: steps, landings and railings.
 const sx=-9.4;for(let i=0;i<13;i++){box(sx,.15+i*.24,-12.4-i*.32,1.7,.15,.35,'62665c');shape('cylinder',sx-.79,.52+i*.24,-12.4-i*.32,.022,.44,.022,'414b43');shape('cylinder',sx+.79,.52+i*.24,-12.4-i*.32,.022,.44,.022,'414b43');}
 for(const dx of[-.79,.79])shape('stairRail',sx+dx,.97,-12.4,1,1,1,'6f7567');box(sx,3.15,-17.1,2,.18,1.75,'616359');
 // Broken-up street details establish human scale and avoid empty repetition.
 for(const x of[-31,-10,8,26]){box(x,.014,4.56,.65,.018,.43,'303b36');for(let i=0;i<7;i++)box(x-.27+i*.085,.03,4.56,.027,.025,.4,'6b7569');}
 for(const x of[-28,-5,15]){box(x,.45,-8.2,.52,.86,.52,'304d3b');box(x,.88,-8.2,.58,.065,.58,'4f5b48');}
 for(const [x,z]of[[-8.3,-10.2],[-5.8,-12.3],[-25,-8.3]]){box(x,.4,z,.9,.8,.65,'867352','wood');box(x,.8,z,.98,.06,.71,'a78b60','wood');}
 for(const x of[-22,-12]){box(x,.16,-6.8,.56,.3,.56,'736a55');for(let i=0;i<7;i++)shape('sphere',x+(i%3-.7)*.1,.38+i*.04,-6.8,.08,.18,.08,'4a5e36');}
}

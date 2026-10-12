// Keep roadside objects clear of 16m roads, including intersection approaches.
export function roadsidePosition(x,z,clearance=9.6){
 const urban=(x>=952&&x<=1208&&z>=-328&&z<=-72)||(x>=-168&&x<=168&&z>=-168&&z<=168)||(x>=-88&&x<=88&&z>=632&&z<=788)||(x>=112&&x<=448&&z>=672&&z<=928)||(x>=592&&x<=848&&z>=192&&z<=448);
 if(!urban)return {x,z};
 const move=value=>{const centre=Math.round(value/40)*40,difference=value-centre;return Math.abs(difference)<clearance?centre+(difference<0?-clearance:clearance):value;};
 return {x:move(x),z:move(z)};
}

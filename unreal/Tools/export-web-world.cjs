// Read the actual initialized website scene; never duplicate its seeded layout.
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const {chromium} = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '../..');
  const hook = `
window.exportUnrealWorld = () => {
  scene.updateMatrixWorld(true);
  const instances = [], surfaces = {}, skipped = {}, textures = {};
  const images = new Map();
  const point = new THREE.Vector3(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3();
  const local = new THREE.Matrix4(), world = new THREE.Matrix4();
  function capture(mesh, matrix) {
    const geo = mesh.geometry, p = geo.parameters || {};
    if (!['BoxGeometry', 'PlaneGeometry', 'SphereGeometry', 'CylinderGeometry', 'ConeGeometry'].includes(geo.type)) {
      skipped[geo.type] = (skipped[geo.type] || 0) + 1; return;
    }
    matrix.decompose(point, rotation, scale);
    if (Math.abs(point.x) > 1500 || point.z < -1200 || point.z > 1200 || point.y > 300 || point.y < -30) return;
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (!mat || mat.opacity === 0) return;
    const key = mat.uuid;
    let texture = null;
    const image = mat.map?.image;
    if(image?.toDataURL) {
      if(!images.has(image)) {const id='Surface_'+images.size;images.set(image,id);textures[id]=image.toDataURL('image/png').split(',')[1];}
      texture=images.get(image);
    }
    surfaces[key] ||= {colour: [mat.color?.r ?? .5, mat.color?.g ?? .5, mat.color?.b ?? .5],
      roughness: mat.roughness ?? .7, metalness: mat.metalness ?? 0,
      transparent: !!mat.transparent, opacity: mat.opacity,
      texture, repeat:mat.map?.repeat.toArray() || [1,1], offset:mat.map?.offset.toArray() || [0,0]};
    let shape = 'cube', dims;
    if (geo.type === 'BoxGeometry') dims = [p.width, p.height, p.depth];
    else if (geo.type === 'PlaneGeometry') {
      // Engine cube: thin local Z axis becomes the plane normal under rotation.
      dims = [p.width, p.height, .025];
    } else if (geo.type === 'SphereGeometry') {shape = 'sphere'; dims = [p.radius*2,p.radius*2,p.radius*2];}
    else {shape = geo.type === 'ConeGeometry' ? 'cone' : 'cylinder';
      const radius = p.radius ?? Math.max(p.radiusTop, p.radiusBottom);
      dims = [radius*2, p.height, radius*2];}
    if (![...dims,...scale.toArray()].every(Number.isFinite)) throw Error('Invalid source transform');
    instances.push({shape, material:key, position:[point.x*100,point.z*100,point.y*100],
      quaternion:[-rotation.x,-rotation.z,-rotation.y,rotation.w],
      scale:[dims[0]*scale.x,dims[2]*scale.z,dims[1]*scale.y]});
  }
  function visit(node, parentVisible) {
    const visible = parentVisible && node.visible;
    if (!visible) return;
    if (node.isMesh && !node.isSkinnedMesh) {
      if (node.isInstancedMesh) for (let i=0;i<node.count;i++) {
        node.getMatrixAt(i,local); world.multiplyMatrices(node.matrixWorld,local); capture(node,world);
      } else capture(node,node.matrixWorld);
    }
    for (const child of node.children) visit(child,visible);
  }
  visit(scene,true);
  return {version:1,source:'main.js initialized website scene',units:'centimetres',
    axes:'Unreal XYZ = website XZY; handedness converted',instances,surfaces,skipped,textures,
    buildings:buildings.map(b=>({x:b.x,z:b.z,w:b.w,d:b.d,top:b.top})),
    destinations:civicBuildings.map(d=>({name:d.name,x:d.x,z:d.z})),
    spawn:[2000,2000,180]};
};`;
  const source = fs.readFileSync(path.join(root,'main.js'),'utf8');
  const end = source.indexOf('// STREET LAMPS (instanced');
  if(end < 0) throw Error('Ashford construction boundary changed');
  const bundle = await esbuild.build({stdin:{contents:'function addTask() {}\n'+source.slice(0,end)+hook,
    resolveDir:root,sourcefile:'unreal-export.js'},bundle:true,format:'esm',write:false,tsconfigRaw:{},
    outdir:path.join(root,'dist'),loader:{'.wasm':'file'},external:['node:fs/promises','node:url'],
    plugins:[{name:'workspace-resolution',setup(b){
      b.onResolve({filter:/^three\/addons\//},a=>({path:path.join(root,'node_modules/three/examples/jsm',a.path.replace('three/addons/',''))}));
      b.onResolve({filter:/^\./},a=>({path:require.resolve(path.resolve(a.resolveDir||root,a.path))}));
      b.onResolve({filter:/^[^./]/},a=>a.path.startsWith('node:')?null:({path:require.resolve(a.path,{paths:[a.resolveDir||root]})}));
    }}]});
  const browserPath = 'C:/Users/WINDOWS11/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
  const browser = await chromium.launch({...(fs.existsSync(browserPath)?{executablePath:browserPath}:{}),
    headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page = await browser.newPage({serviceWorkers:'block'});
    const errors=[];
    page.on('pageerror', e=>{errors.push(e.message);console.error('Website export:',e.message);});
    await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
    await page.route('**/dist/bundle.js',r=>r.fulfill({contentType:'text/javascript',body:bundle.outputFiles.find(f=>f.path.endsWith('.js')).text}));
    await page.goto('http://localhost:8080/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.exportUnrealWorld,null,{timeout:60000,polling:100});
    if(errors.length) throw Error(errors.join('\n'));
    const result=await page.evaluate(()=>window.exportUnrealWorld());
    if(result.buildings.length<100 || result.instances.length<1000) throw Error('Incomplete Ashford export');
    result.scope='Ashford base construction only; regional cities and later systems pending';
    fs.mkdirSync(path.join(root,'unreal/SourceData'),{recursive:true});
    fs.mkdirSync(path.join(root,'unreal/SourceData/Textures'),{recursive:true});
    for(const [name,png] of Object.entries(result.textures)) fs.writeFileSync(path.join(root,'unreal/SourceData/Textures',name+'.png'),Buffer.from(png,'base64'));
    result.textureCount=Object.keys(result.textures).length;
    delete result.textures;
    fs.writeFileSync(path.join(root,'unreal/SourceData/website-world.json'),JSON.stringify(result));
    console.log(JSON.stringify({instances:result.instances.length,buildings:result.buildings.length,
      destinations:result.destinations.length,materials:Object.keys(result.surfaces).length,skipped:result.skipped}));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

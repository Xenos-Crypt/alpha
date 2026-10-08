import fs from 'node:fs/promises';const base='native-design/creal-lang/c/';let s=await fs.readFile(base+'scene3d_gl.c','utf8');
const replace=(a,b)=>{if(!s.includes(a))throw Error('Missing material anchor: '+a.slice(0,60));s=s.replace(a,b);};
replace('int used; } SceneObj;','int used; float roughness,metalness,opacity; } SceneObj;');
replace('g_shadowPassLoc, g_hasShadowLoc;','g_shadowPassLoc, g_hasShadowLoc, g_materialLoc;');
replace('uniform vec3 uColor,uLightDir,uEye;','uniform vec3 uColor,uLightDir,uEye,uMaterial;');
replace('vec3(.19,.17,.13),vec3(.34,.39,.43)','vec3(.035,.033,.028),vec3(.20,.25,.30)');
replace('vec3(1.08,1.0,.86)','vec3(1.9,1.65,1.30)');
const a='        "vec3 V=normalize(uEye-vWorldPos),H=normalize(V+normalize(-uLightDir));';let begin=s.indexOf(a),end=s.indexOf('\n    GLuint vs =',begin);if(begin<0||end<0)throw Error('Shader grading anchors missing');
s=s.slice(0,begin)+`        "vec3 V=normalize(uEye-vWorldPos),H=normalize(V+normalize(-uLightDir));float rough=clamp(uMaterial.x,.08,1.);float f=pow(1.-max(dot(N,V),0.),5.);vec3 R=reflect(-V,N);vec3 env=mix(vec3(.15,.16,.13),vec3(.52,.65,.77),smoothstep(-.12,.6,R.y));float gloss=pow(max(dot(N,H),0.),mix(180.,5.,rough));lit+=gloss*(1.-rough)*.18;lit=mix(lit,env*base,uMaterial.y*.55);float alpha=1.;if(uMaterial.z<.99){lit=mix(base*.25,env,.55+f*.4);alpha=clamp(uMaterial.z+f*.45,.08,.85);}float fog=1.-exp(-length(uEye-vWorldPos)*.003);lit=mix(lit,vec3(.40,.50,.60),fog);FragColor=vec4(pow(vec3(1.)-exp(-lit*1.1),vec3(1./2.2)),alpha);}\\n";
`+s.slice(end);
replace('g_eyeLoc=p_glGetUniformLocation(g_prog,"uEye");','g_materialLoc=p_glGetUniformLocation(g_prog,"uMaterial");g_eyeLoc=p_glGetUniformLocation(g_prog,"uEye");');
replace('o->used=1;','o->used=1;o->roughness=.85f;o->metalness=0;o->opacity=1;');
// One shared drawing routine for both native view modes; transparent panes draw last.
const draw=`static void s3d_draw_objects(void){
    int transparent[MAX_OBJECTS],count=0;
    for(int pass=0;pass<2;pass++){
        if(pass==1){for(int a=1;a<count;a++){int id=transparent[a],b=a-1;SceneObj *o=&g_objects[id];float d=(o->x-g_camX)*(o->x-g_camX)+(o->y-g_camY)*(o->y-g_camY)+(o->z-g_camZ)*(o->z-g_camZ);while(b>=0){SceneObj *q=&g_objects[transparent[b]];float qd=(q->x-g_camX)*(q->x-g_camX)+(q->y-g_camY)*(q->y-g_camY)+(q->z-g_camZ)*(q->z-g_camZ);if(qd>=d)break;transparent[b+1]=transparent[b];b--;}transparent[b+1]=id;}glEnable(GL_BLEND);glBlendFunc(GL_SRC_ALPHA,GL_ONE_MINUS_SRC_ALPHA);glDepthMask(GL_FALSE);}
        int limit=pass?count:g_objectCount;for(int i=0;i<limit;i++){SceneObj *o=&g_objects[pass?transparent[i]:i];if(!o->used)continue;if(!pass&&o->opacity<.99f){transparent[count++]=i;continue;}Mesh *m=&g_meshes[o->meshId];Mat4_ model=mat4_mul_(mat4_translate_(o->x,o->y,o->z),mat4_mul_(mat4_rotate_y_(o->yaw),mat4_scale_(o->sx,o->sy,o->sz)));p_glUniformMatrix4fv(g_modelLoc,1,GL_FALSE,model.m);p_glUniform3f(g_colorLoc,o->r,o->g,o->b);p_glUniform3f(g_materialLoc,o->roughness,o->metalness,o->opacity);p_glUniform1i(g_uvLoc,m->hasUV);p_glUniform1i(g_useTexLoc,o->textureId>=0);if(o->textureId>=0)glBindTexture(GL_TEXTURE_2D,g_textures[o->textureId].tex);p_glBindVertexArray(m->vao);glDrawArrays(GL_TRIANGLES,0,m->vertCount);}
        if(pass==1){glDepthMask(GL_TRUE);glDisable(GL_BLEND);}
    }
}
`;
replace('static void s3d_tick_embedded(float dt) {',draw+'\nstatic void s3d_tick_embedded(float dt) {');
// Replace only the two original color-pass loops, leaving shadow and collision traversal.
const loopStart='for (int i = 0; i < g_objectCount; i++) {';let count=0;
while(s.includes(loopStart)){const first=s.indexOf(loopStart),open=s.indexOf('{',first);let depth=1,last=open+1;for(;last<s.length&&depth;last++){if(s[last]==='{')depth++;else if(s[last]==='}')depth--;}if(depth)throw Error('Unbalanced color loop');s=s.slice(0,first)+'s3d_draw_objects();'+s.slice(last);count++;}if(count!==2)throw Error('Expected two color loops, got '+count);
replace('SceneObj *o=&g_objects[i];if(!o->used)continue;Mesh *m=&g_meshes[o->meshId];Mat4_ model=', 'SceneObj *o=&g_objects[i];if(!o->used||o->opacity<.99f)continue;Mesh *m=&g_meshes[o->meshId];Mat4_ model=');
replace('static const Scene3D g_scene3d =',`static void s3d_set_material(int id,float rough,float metal,float opacity){if(id<0||id>=g_objectCount){fprintf(stderr,"scene3d: invalid material object\\n");exit(1);}SceneObj *o=&g_objects[id];o->roughness=fmaxf(.08f,fminf(1,rough));o->metalness=fmaxf(0,fminf(1,metal));o->opacity=fmaxf(.02f,fminf(1,opacity));g_shadowDirty=1;}
static const Scene3D g_scene3d =`);
replace('s3d_set_input_enabled\n};','s3d_set_input_enabled,s3d_set_material\n};');
await fs.writeFile(base+'scene3d_gl.c',s);
let h=await fs.readFile(base+'scene3d.h','utf8');h=h.replace('} Scene3D;',`    /* Authored surface parameters: roughness, metalness, opacity (all 0..1).
     * Transparent surfaces draw after opaque geometry and do not cast opaque shadows. */
    void (*set_material)(int object_id,float roughness,float metalness,float opacity);
} Scene3D;`);await fs.writeFile(base+'scene3d.h',h);
const co='native-design/coral-lang/coral-bytecode/';let c=await fs.readFile(co+'compiler.c','utf8');c=c.replace('return 76;','return 76;\n    if (strcmp(name, "scene3dSetMaterial") == 0) return 77;');await fs.writeFile(co+'compiler.c',c);
let vm=await fs.readFile(co+'vm_builtins_win.c','utf8');vm=vm.replace('        case 76:',`        case 77:
            if(argc!=4||args[0].type!=VAL_NUMBER||args[1].type!=VAL_NUMBER||args[2].type!=VAL_NUMBER||args[3].type!=VAL_NUMBER)runtime_error(line,"scene3dSetMaterial requires object, roughness, metalness, opacity");
            scene3d_backend()->set_material((int)args[0].as.number,(float)args[1].as.number,(float)args[2].as.number,(float)args[3].as.number);return nil_value();
        case 76:`);await fs.writeFile(co+'vm_builtins_win.c',vm);

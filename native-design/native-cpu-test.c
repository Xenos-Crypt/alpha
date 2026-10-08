#include <assert.h>
#include "creal-lang/c/scene3d_gl.c"
int main(void){
 float *v=NULL;int count=0;
 assert(load_obj_pos_normal("coral-lang/coral-bytecode/assets/woman.obj",&v,&count));assert(count>20000);assert(g_loadingUV);free(v);
 FILE *f=fopen("bad-test.obj","wb");fputs("v 0 0 0\nf 999 1 1\n",f);fclose(f);assert(!load_obj_pos_normal("bad-test.obj",&v,&count));remove("bad-test.obj");
 f=fopen("negative-test.obj","wb");fputs("v 0 0 0\nv 1 0 0\nv 0 1 0\nf -3 -2 -1\n",f);fclose(f);assert(load_obj_pos_normal("negative-test.obj",&v,&count));assert(count==3);assert(!g_loadingUV);free(v);remove("negative-test.obj");
 g_meshCount=1;g_meshes[0].minX=g_meshes[0].minY=g_meshes[0].minZ=-1;g_meshes[0].maxX=g_meshes[0].maxY=g_meshes[0].maxZ=1;
 g_objectCount=1;g_objects[0]=(SceneObj){0,-1,0,1,0,1,1,1,0,1,1,1,1};g_camX=0;g_camY=1.7f;g_camZ=2;
 s3d_move_camera(0,-1);assert(g_camZ==2);s3d_move_camera(2,0);assert(g_camX==2);s3d_move_camera(0,-1);assert(g_camZ==1);
 float x=g_camX,z=g_camZ;g_embedHost=NULL;s3d_update_embedded_input(.1f);assert(g_camX==x&&g_camZ==z);
 s3d_set_material(0,-1,2,-1);assert(g_objects[0].roughness>=.08f);assert(g_objects[0].metalness==1);assert(g_objects[0].opacity>=.02f);
 puts("PASS: large UV-mapped OBJ, negative indices, invalid-index rejection, camera collision, unfocused input, material bounds.");return 0;
}

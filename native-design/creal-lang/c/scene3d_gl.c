/* scene3d.h's first (and today, only) implementation: Win32 + WGL + core-
 * profile OpenGL 3.3. The rendering pipeline here (context creation,
 * matrix math, OBJ/BMP loaders, shader source) is a direct port of the
 * standalone gl_*_test.c milestone programs built earlier in this
 * project (hello triangle -> shaders/matrices -> mesh+camera -> scene
 * list+lighting -> texturing) -- this file is what makes that pipeline
 * callable from Coral instead of only runnable as its own standalone
 * .exe. See scene3d.h for the per-function contract. */
#include <windows.h>
#include <gl/gl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <stdint.h>
#include "scene3d.h"

typedef char GLchar_;
typedef ptrdiff_t GLsizeiptr_;
#define S3D_FRAGMENT_SHADER 0x8B30
#define S3D_VERTEX_SHADER 0x8B31
#define S3D_COMPILE_STATUS 0x8B81
#define S3D_LINK_STATUS 0x8B82
#define S3D_ARRAY_BUFFER 0x8892
#define S3D_STATIC_DRAW 0x88E4

typedef GLuint (WINAPI *PFNGLCREATESHADERPROC)(GLenum);
typedef void (WINAPI *PFNGLSHADERSOURCEPROC)(GLuint, GLsizei, const GLchar_* const*, const GLint*);
typedef void (WINAPI *PFNGLCOMPILESHADERPROC)(GLuint);
typedef void (WINAPI *PFNGLGETSHADERIVPROC)(GLuint, GLenum, GLint*);
typedef void (WINAPI *PFNGLGETSHADERINFOLOGPROC)(GLuint, GLsizei, GLsizei*, GLchar_*);
typedef GLuint (WINAPI *PFNGLCREATEPROGRAMPROC)(void);
typedef void (WINAPI *PFNGLATTACHSHADERPROC)(GLuint, GLuint);
typedef void (WINAPI *PFNGLLINKPROGRAMPROC)(GLuint);
typedef void (WINAPI *PFNGLGETPROGRAMIVPROC)(GLuint, GLenum, GLint*);
typedef void (WINAPI *PFNGLGETPROGRAMINFOLOGPROC)(GLuint, GLsizei, GLsizei*, GLchar_*);
typedef void (WINAPI *PFNGLUSEPROGRAMPROC)(GLuint);
typedef void (WINAPI *PFNGLDELETESHADERPROC)(GLuint);
typedef void (WINAPI *PFNGLGENBUFFERSPROC)(GLsizei, GLuint*);
typedef void (WINAPI *PFNGLBINDBUFFERPROC)(GLenum, GLuint);
typedef void (WINAPI *PFNGLBUFFERDATAPROC)(GLenum, GLsizeiptr_, const void*, GLenum);
typedef void (WINAPI *PFNGLGENVERTEXARRAYSPROC)(GLsizei, GLuint*);
typedef void (WINAPI *PFNGLBINDVERTEXARRAYPROC)(GLuint);
typedef void (WINAPI *PFNGLVERTEXATTRIBPOINTERPROC)(GLuint, GLint, GLenum, GLboolean, GLsizei, const void*);
typedef void (WINAPI *PFNGLENABLEVERTEXATTRIBARRAYPROC)(GLuint);
typedef GLint (WINAPI *PFNGLGETUNIFORMLOCATIONPROC)(GLuint, const GLchar_*);
typedef void (WINAPI *PFNGLUNIFORMMATRIX4FVPROC)(GLint, GLsizei, GLboolean, const GLfloat*);
typedef void (WINAPI *PFNGLUNIFORM3FPROC)(GLint, GLfloat, GLfloat, GLfloat);
typedef void (WINAPI *PFNGLUNIFORM1IPROC)(GLint, GLint);
typedef HGLRC (WINAPI *PFNWGLCREATECONTEXTATTRIBSARBPROC)(HDC, HGLRC, const int*);

static PFNGLCREATESHADERPROC p_glCreateShader;
static PFNGLSHADERSOURCEPROC p_glShaderSource;
static PFNGLCOMPILESHADERPROC p_glCompileShader;
static PFNGLGETSHADERIVPROC p_glGetShaderiv;
static PFNGLGETSHADERINFOLOGPROC p_glGetShaderInfoLog;
static PFNGLCREATEPROGRAMPROC p_glCreateProgram;
static PFNGLATTACHSHADERPROC p_glAttachShader;
static PFNGLLINKPROGRAMPROC p_glLinkProgram;
static PFNGLGETPROGRAMIVPROC p_glGetProgramiv;
static PFNGLGETPROGRAMINFOLOGPROC p_glGetProgramInfoLog;
static PFNGLUSEPROGRAMPROC p_glUseProgram;
static PFNGLDELETESHADERPROC p_glDeleteShader;
static PFNGLGENBUFFERSPROC p_glGenBuffers;
static PFNGLBINDBUFFERPROC p_glBindBuffer;
static PFNGLBUFFERDATAPROC p_glBufferData;
static PFNGLGENVERTEXARRAYSPROC p_glGenVertexArrays;
static PFNGLBINDVERTEXARRAYPROC p_glBindVertexArray;
static PFNGLVERTEXATTRIBPOINTERPROC p_glVertexAttribPointer;
static PFNGLENABLEVERTEXATTRIBARRAYPROC p_glEnableVertexAttribArray;
static PFNGLGETUNIFORMLOCATIONPROC p_glGetUniformLocation;
static PFNGLUNIFORMMATRIX4FVPROC p_glUniformMatrix4fv;
static PFNGLUNIFORM3FPROC p_glUniform3f;
static PFNGLUNIFORM1IPROC p_glUniform1i;
static PFNWGLCREATECONTEXTATTRIBSARBPROC p_wglCreateContextAttribsARB;

#define S3D_LOAD(name, type) p_##name = (type)wglGetProcAddress(#name); if (!p_##name) { fprintf(stderr, "scene3d: FAIL missing GL proc: %s\n", #name); exit(1); }
static void load_gl_procs(void) {
    S3D_LOAD(glCreateShader, PFNGLCREATESHADERPROC); S3D_LOAD(glShaderSource, PFNGLSHADERSOURCEPROC);
    S3D_LOAD(glCompileShader, PFNGLCOMPILESHADERPROC); S3D_LOAD(glGetShaderiv, PFNGLGETSHADERIVPROC);
    S3D_LOAD(glGetShaderInfoLog, PFNGLGETSHADERINFOLOGPROC); S3D_LOAD(glCreateProgram, PFNGLCREATEPROGRAMPROC);
    S3D_LOAD(glAttachShader, PFNGLATTACHSHADERPROC); S3D_LOAD(glLinkProgram, PFNGLLINKPROGRAMPROC);
    S3D_LOAD(glGetProgramiv, PFNGLGETPROGRAMIVPROC); S3D_LOAD(glGetProgramInfoLog, PFNGLGETPROGRAMINFOLOGPROC);
    S3D_LOAD(glUseProgram, PFNGLUSEPROGRAMPROC); S3D_LOAD(glDeleteShader, PFNGLDELETESHADERPROC);
    S3D_LOAD(glGenBuffers, PFNGLGENBUFFERSPROC); S3D_LOAD(glBindBuffer, PFNGLBINDBUFFERPROC);
    S3D_LOAD(glBufferData, PFNGLBUFFERDATAPROC); S3D_LOAD(glGenVertexArrays, PFNGLGENVERTEXARRAYSPROC);
    S3D_LOAD(glBindVertexArray, PFNGLBINDVERTEXARRAYPROC); S3D_LOAD(glVertexAttribPointer, PFNGLVERTEXATTRIBPOINTERPROC);
    S3D_LOAD(glEnableVertexAttribArray, PFNGLENABLEVERTEXATTRIBARRAYPROC); S3D_LOAD(glGetUniformLocation, PFNGLGETUNIFORMLOCATIONPROC);
    S3D_LOAD(glUniformMatrix4fv, PFNGLUNIFORMMATRIX4FVPROC); S3D_LOAD(glUniform3f, PFNGLUNIFORM3FPROC); S3D_LOAD(glUniform1i, PFNGLUNIFORM1IPROC);
}

typedef struct { float m[16]; } Mat4_;
static Mat4_ mat4_identity_(void) { Mat4_ r = {0}; r.m[0]=r.m[5]=r.m[10]=r.m[15]=1; return r; }
static Mat4_ mat4_mul_(Mat4_ a, Mat4_ b) {
    Mat4_ r = {0};
    for (int c = 0; c < 4; c++) for (int row = 0; row < 4; row++) { float s=0; for (int k=0;k<4;k++) s += a.m[k*4+row]*b.m[c*4+k]; r.m[c*4+row]=s; }
    return r;
}
static Mat4_ mat4_perspective_(float fovy, float aspect, float znear, float zfar) {
    Mat4_ r = {0}; float f = 1.0f/tanf(fovy/2);
    r.m[0]=f/aspect; r.m[5]=f; r.m[10]=(zfar+znear)/(znear-zfar); r.m[11]=-1; r.m[14]=(2*zfar*znear)/(znear-zfar);
    return r;
}
static Mat4_ mat4_translate_(float x, float y, float z) { Mat4_ r = mat4_identity_(); r.m[12]=x; r.m[13]=y; r.m[14]=z; return r; }
static Mat4_ mat4_scale_(float sx, float sy, float sz) { Mat4_ r = mat4_identity_(); r.m[0]=sx; r.m[5]=sy; r.m[10]=sz; return r; }
static Mat4_ mat4_rotate_y_(float a) { Mat4_ r = mat4_identity_(); float c=cosf(a),s=sinf(a); r.m[0]=c; r.m[2]=-s; r.m[8]=s; r.m[10]=c; return r; }
static Mat4_ mat4_fps_view_(float px, float py, float pz, float yaw, float pitch) {
    float cy=cosf(yaw), sy=sinf(yaw), cp=cosf(pitch), sp=sinf(pitch);
    float fx = sy*cp, fy = sp, fz = -cy*cp;
    float flen = sqrtf(fx*fx+fy*fy+fz*fz); fx/=flen; fy/=flen; fz/=flen;
    float upx=0, upy=1, upz=0;
    float sx = fy*upz-fz*upy, sxz = fz*upx-fx*upz, sxy = fx*upy-fy*upx;
    float slen = sqrtf(sx*sx+sxz*sxz+sxy*sxy); sx/=slen; sxz/=slen; sxy/=slen;
    float ux = sxz*fz-sxy*fy, uy = sxy*fx-sx*fz, uz = sx*fy-sxz*fx;
    Mat4_ r = mat4_identity_();
    r.m[0]=sx; r.m[4]=sxz; r.m[8]=sxy;
    r.m[1]=ux; r.m[5]=uy;  r.m[9]=uz;
    r.m[2]=-fx; r.m[6]=-fy; r.m[10]=-fz;
    r.m[12] = -(sx*px+sxz*py+sxy*pz);
    r.m[13] = -(ux*px+uy*py+uz*pz);
    r.m[14] = (fx*px+fy*py+fz*pz);
    return r;
}

typedef struct { float x,y,z; } S3DVec3;

#define MAX_MESHES 64
#define MAX_TEXTURES 64
#define MAX_OBJECTS 4096

typedef struct { GLuint vao, vbo; int vertCount, hasUV; float minX,maxX,minY,maxY,minZ,maxZ; } Mesh;
typedef struct { GLuint tex; } Texture;
typedef struct { int meshId, textureId; float x,y,z,sx,sy,sz,yaw,r,g,b; int used; float roughness,metalness,opacity; } SceneObj;

static Mesh g_meshes[MAX_MESHES]; static int g_meshCount = 0;
static Texture g_textures[MAX_TEXTURES]; static int g_textureCount = 0;
static SceneObj g_objects[MAX_OBJECTS]; static int g_objectCount = 0;

static HWND g_hwnd; static HDC g_hdc; static HGLRC g_glrc;
static GLuint g_prog;
static GLint g_modelLoc, g_vpLoc, g_colorLoc, g_lightLoc, g_texLoc, g_useTexLoc;
static GLint g_eyeLoc, g_uvLoc, g_lightVpLoc, g_shadowMapLoc, g_shadowPassLoc, g_hasShadowLoc, g_materialLoc;
typedef void (WINAPI *PFNACTIVETEX)(GLenum);
typedef void (WINAPI *PFNGENMIP)(GLenum);
static PFNACTIVETEX p_activeTexture;
static PFNGENMIP p_generateMipmap;
static int g_loadingUV=0, g_shadowDirty=1;
static HWND g_embedHost=NULL;
static RECT g_inputRect;
static int g_inputEnabled=1;
static void s3d_prepare_shadow(void);
static void s3d_draw_shadow(void);
static void s3d_move_camera(float x,float z);
static float g_camX=0, g_camY=1.0f, g_camZ=5, g_camYaw=0, g_camPitch=0;
static float g_lightX=-0.4f, g_lightY=-0.8f, g_lightZ=-0.3f;
static Scene3DTickHandler g_tickHandler = NULL;
static void *g_tickUserdata = NULL;

/* OBJ positions, optional UVs and authored smooth normals. Supports negative indices.
 * Buffers grow with the file; malformed faces fail instead of indexing arbitrary memory. */
static int obj_index_(int value,int count){return value>0?value-1:value<0?count+value:-1;}
static int load_obj_pos_normal(const char *path,float **outVerts,int *outVertCount){
    FILE *f=fopen(path,"rb");if(!f){fprintf(stderr,"scene3d: cannot open %s\n",path);return 0;}
    int pc=0,tc=0,nc=0,cap=4096,vcount=0,vcap=4096,uvCount=0;
    S3DVec3 *pos=malloc(sizeof(*pos)*cap),*tex=malloc(sizeof(*tex)*cap),*norm=malloc(sizeof(*norm)*cap);
    float *vertices=malloc(sizeof(float)*8*vcap);char line[4096];int valid=pos&&tex&&norm&&vertices;
    while(valid&&fgets(line,sizeof(line),f)){
        if(pc>=cap||tc>=cap||nc>=cap){if(cap>=1000000){valid=0;break;}cap*=2;
            void *p=realloc(pos,sizeof(*pos)*cap);if(!p){valid=0;break;}pos=p;
            p=realloc(tex,sizeof(*tex)*cap);if(!p){valid=0;break;}tex=p;
            p=realloc(norm,sizeof(*norm)*cap);if(!p){valid=0;break;}norm=p;}
        if(line[0]=='v'&&line[1]==' '){if(sscanf(line+2,"%f %f %f",&pos[pc].x,&pos[pc].y,&pos[pc].z)==3)pc++;else valid=0;}
        else if(line[0]=='v'&&line[1]=='t'){if(sscanf(line+2,"%f %f",&tex[tc].x,&tex[tc].y)==2)tc++;else valid=0;}
        else if(line[0]=='v'&&line[1]=='n'){if(sscanf(line+2,"%f %f %f",&norm[nc].x,&norm[nc].y,&norm[nc].z)==3)nc++;else valid=0;}
        else if(line[0]=='f'&&line[1]==' '){int refs[128][3],count=0;char *p=line+2;
            while(*p&&count<128){while(*p==' '||*p=='\t')p++;if(!*p||*p=='\n'||*p=='\r'||*p=='#')break;char *end;int vi=(int)strtol(p,&end,10),ti=0,ni=0;if(end==p){valid=0;break;}p=end;
                if(*p=='/'){p++;if(*p!='/')ti=(int)strtol(p,&p,10);if(*p=='/'){p++;ni=(int)strtol(p,&p,10);}}
                refs[count][0]=obj_index_(vi,pc);refs[count][1]=obj_index_(ti,tc);refs[count][2]=obj_index_(ni,nc);
                if(refs[count][0]<0||refs[count][0]>=pc||(ti&&(refs[count][1]<0||refs[count][1]>=tc))||(ni&&(refs[count][2]<0||refs[count][2]>=nc))){valid=0;break;}count++;
                while(*p&&*p!=' '&&*p!='\t'&&*p!='\n'&&*p!='\r')p++;
            }
            if(!valid||count<3){valid=0;break;}
            for(int k=1;k+1<count;k++){int corners[3]={0,k,k+1};S3DVec3 a=pos[refs[0][0]],b=pos[refs[k][0]],c=pos[refs[k+1][0]];
                float ux=b.x-a.x,uy=b.y-a.y,uz=b.z-a.z,vx=c.x-a.x,vy=c.y-a.y,vz=c.z-a.z;
                S3DVec3 fallback={uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx};float len=sqrtf(fallback.x*fallback.x+fallback.y*fallback.y+fallback.z*fallback.z);
                if(len>0.00001f){fallback.x/=len;fallback.y/=len;fallback.z/=len;}else continue;
                if(vcount+3>vcap){vcap*=2;void *p2=realloc(vertices,sizeof(float)*8*vcap);if(!p2){valid=0;break;}vertices=p2;}
                for(int j=0;j<3;j++){int *ref=refs[corners[j]];S3DVec3 v=pos[ref[0]],n=ref[2]>=0?norm[ref[2]]:fallback;float *dst=vertices+8*vcount++;
                    dst[0]=v.x;dst[1]=v.y;dst[2]=v.z;dst[3]=n.x;dst[4]=n.y;dst[5]=n.z;dst[6]=ref[1]>=0?tex[ref[1]].x:0;dst[7]=ref[1]>=0?tex[ref[1]].y:0;if(ref[1]>=0)uvCount++;}
            }
        }
    }
    fclose(f);free(pos);free(tex);free(norm);if(!valid||!vcount){free(vertices);fprintf(stderr,"scene3d: invalid/empty OBJ %s\n",path);return 0;}
    g_loadingUV=uvCount==vcount;*outVerts=vertices;*outVertCount=vcount;return 1;
}

static unsigned char *load_bmp_rgba(const char *path, int *outW, int *outH) {
    FILE *f = fopen(path, "rb");
    if (!f) { fprintf(stderr, "scene3d: FAIL cannot open texture %s\n", path); return NULL; }
    unsigned char header[54];
    if (fread(header, 1, 54, f) != 54 || header[0] != 'B' || header[1] != 'M') { fclose(f); fprintf(stderr, "scene3d: FAIL not a BMP: %s\n", path); return NULL; }
    uint32_t dataOffset; memcpy(&dataOffset, &header[10], 4);
    int32_t width, height; memcpy(&width, &header[18], 4); memcpy(&height, &header[22], 4);
    uint16_t bpp; memcpy(&bpp, &header[28], 2);
    uint32_t compression; memcpy(&compression, &header[30], 4);
    if (compression != 0 || (bpp != 24 && bpp != 32) || width<1 || width>8192 || height==0 || height< -8192 || height>8192 || dataOffset<54) { fclose(f); fprintf(stderr, "scene3d: FAIL unsupported BMP (bpp=%u compression=%u)\n", bpp, compression); return NULL; }
    int absHeight = height < 0 ? -height : height, topDown = height < 0;
    int srcBpp = bpp / 8;
    int rowBytes = ((width * srcBpp + 3) / 4) * 4;
    fseek(f, dataOffset, SEEK_SET);
    unsigned char *raw = malloc((size_t)rowBytes * absHeight);
    if (fread(raw, 1, (size_t)rowBytes * absHeight, f) != (size_t)rowBytes * absHeight) { fclose(f); free(raw); fprintf(stderr, "scene3d: FAIL short read on %s\n", path); return NULL; }
    fclose(f);
    unsigned char *out = malloc((size_t)width * absHeight * 4);
    for (int y = 0; y < absHeight; y++) {
        int srcRow = topDown ? (absHeight - 1 - y) : y;
        for (int x = 0; x < width; x++) {
            unsigned char *s = &raw[srcRow * rowBytes + x * srcBpp];
            unsigned char *d = &out[(y * width + x) * 4];
            d[0]=s[2]; d[1]=s[1]; d[2]=s[0]; d[3]=srcBpp==4?s[3]:255;
        }
    }
    free(raw);
    *outW = width; *outH = absHeight;
    return out;
}

static LRESULT CALLBACK S3DWndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam) {
    if (msg == WM_DESTROY) { PostQuitMessage(0); return 0; }
    if (msg == WM_CLOSE) { DestroyWindow(hwnd); return 0; }
    return DefWindowProcA(hwnd, msg, wParam, lParam);
}

static GLuint compile_shader_(GLenum type, const char *src) {
    GLuint s = p_glCreateShader(type); p_glShaderSource(s, 1, &src, NULL); p_glCompileShader(s);
    GLint ok; p_glGetShaderiv(s, S3D_COMPILE_STATUS, &ok);
    if (!ok) { char log[1024]; p_glGetShaderInfoLog(s, 1024, NULL, log); fprintf(stderr, "scene3d: FAIL shader compile: %s\n", log); exit(1); }
    return s;
}

static int g_classesRegistered = 0;
static void register_classes_once(void) {
    if (g_classesRegistered) return;
    WNDCLASSA wc = {0}; wc.lpfnWndProc = S3DWndProc; wc.hInstance = GetModuleHandleA(NULL); wc.lpszClassName = "CrealScene3D";
    wc.hCursor = LoadCursorA(NULL, (LPCSTR)IDC_ARROW); RegisterClassA(&wc);
    WNDCLASSA wcDummy = {0}; wcDummy.lpfnWndProc = DefWindowProcA; wcDummy.hInstance = wc.hInstance; wcDummy.lpszClassName = "CrealScene3DDummy"; RegisterClassA(&wcDummy);
    g_classesRegistered = 1;
}

/* Shared by s3d_init (visible top-level window) and s3d_init_embedded
 * (hidden helper window + FBO): the dummy-context dance to pull
 * wglCreateContextAttribsARB, then a real core-profile context on
 * `target`, then compile/link the one shader program every object uses.
 * Leaves the new context current on return. */
static void create_core_context_and_shaders(HWND target) {
    HDC dummyDC_hdc; PIXELFORMATDESCRIPTOR pfd = {0}; pfd.nSize=sizeof(pfd); pfd.nVersion=1;
    pfd.dwFlags = PFD_DRAW_TO_WINDOW|PFD_SUPPORT_OPENGL|PFD_DOUBLEBUFFER; pfd.iPixelType=PFD_TYPE_RGBA; pfd.cColorBits=32; pfd.cDepthBits=24;

    HWND dummy = CreateWindowExA(0, "CrealScene3DDummy", "dummy", 0, 0, 0, 1, 1, NULL, NULL, GetModuleHandleA(NULL), NULL);
    dummyDC_hdc = GetDC(dummy);
    int pf = ChoosePixelFormat(dummyDC_hdc, &pfd); SetPixelFormat(dummyDC_hdc, pf, &pfd);
    HGLRC dummyRC = wglCreateContext(dummyDC_hdc); wglMakeCurrent(dummyDC_hdc, dummyRC);
    p_wglCreateContextAttribsARB = (PFNWGLCREATECONTEXTATTRIBSARBPROC)wglGetProcAddress("wglCreateContextAttribsARB");
    if (!p_wglCreateContextAttribsARB) { fprintf(stderr, "scene3d: FAIL no wglCreateContextAttribsARB (GPU/driver too old)\n"); exit(1); }
    wglMakeCurrent(NULL, NULL); wglDeleteContext(dummyRC); ReleaseDC(dummy, dummyDC_hdc); DestroyWindow(dummy);

    g_hwnd = target;
    g_hdc = GetDC(g_hwnd);
    int pf2 = ChoosePixelFormat(g_hdc, &pfd); SetPixelFormat(g_hdc, pf2, &pfd);
    int attribs[] = { 0x2091, 3, 0x2092, 3, 0x9126, 0x00000001, 0 };
    g_glrc = p_wglCreateContextAttribsARB(g_hdc, NULL, attribs);
    if (!g_glrc || !wglMakeCurrent(g_hdc, g_glrc)) { fprintf(stderr, "scene3d: FAIL core context creation\n"); exit(1); }
    load_gl_procs();

    const char *vsrc=
        "#version 330 core\nlayout(location=0) in vec3 aPos;layout(location=1) in vec3 aNormal;layout(location=2) in vec2 aUV;\n"
        "uniform mat4 uModel,uViewProj,uLightVP;out vec3 vNormal,vWorldPos;out vec2 vUV;out vec4 vShadow;\n"
        "void main(){vec4 wp=uModel*vec4(aPos,1);vWorldPos=wp.xyz;vNormal=transpose(inverse(mat3(uModel)))*aNormal;vUV=aUV;vShadow=uLightVP*wp;gl_Position=uViewProj*wp;}\n";
    const char *fsrc=
        "#version 330 core\nin vec3 vNormal,vWorldPos;in vec2 vUV;in vec4 vShadow;\n"
        "uniform vec3 uColor,uLightDir,uEye,uMaterial;uniform sampler2D uTex,uShadowMap;uniform int uUseTexture,uHasUV,uShadowPass,uHasShadow;out vec4 FragColor;\n"
        "float shadow(vec3 N){if(uHasShadow==0)return 1.;vec3 p=vShadow.xyz/vShadow.w*.5+.5;if(p.z>1.||p.z<0.||p.x<0.||p.x>1.||p.y<0.||p.y>1.)return 1.;float bias=max(.0006*(1.-dot(N,normalize(-uLightDir))),.0002);float visibility=0.;vec2 stepUV=1./vec2(textureSize(uShadowMap,0));for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)visibility+=p.z-bias<=texture(uShadowMap,p.xy+vec2(x,y)*stepUV).r?1.:0.;return visibility/9.;}\n"
        "void main(){if(uUseTexture==1&&uHasUV==1&&texture(uTex,vUV).a<.4)discard;if(uShadowPass==1){FragColor=vec4(1);return;}vec3 N=normalize(vNormal),base=uColor;\n"
        "if(uUseTexture==1){vec3 an=abs(N);vec2 uv=vUV;if(uHasUV==0){if(an.x>=an.y&&an.x>=an.z)uv=vWorldPos.zy*.5;else if(an.y>=an.z)uv=vWorldPos.xz*.5;else uv=vWorldPos.xy*.5;}base=pow(texture(uTex,uv).rgb,vec3(2.2))*uColor;}else base=pow(base,vec3(2.2));\n"
        "float diffuse=max(dot(N,normalize(-uLightDir)),0.);vec3 ambient=mix(vec3(.035,.033,.028),vec3(.20,.25,.30),N.y*.5+.5);vec3 lit=base*(ambient+vec3(1.9,1.65,1.30)*diffuse*shadow(N));\n"
        "vec3 V=normalize(uEye-vWorldPos),H=normalize(V+normalize(-uLightDir));float rough=clamp(uMaterial.x,.08,1.);float f=pow(1.-max(dot(N,V),0.),5.);vec3 R=reflect(-V,N);vec3 env=mix(vec3(.15,.16,.13),vec3(.52,.65,.77),smoothstep(-.12,.6,R.y));float gloss=pow(max(dot(N,H),0.),mix(180.,5.,rough));lit+=gloss*(1.-rough)*.18;lit=mix(lit,env*base,uMaterial.y*.55);float alpha=1.;if(uMaterial.z<.99){lit=mix(base*.25,env,.55+f*.4);alpha=clamp(uMaterial.z+f*.45,.08,.85);}float fog=1.-exp(-length(uEye-vWorldPos)*.003);lit=mix(lit,vec3(.40,.50,.60),fog);FragColor=vec4(pow(vec3(1.)-exp(-lit*1.1),vec3(1./2.2)),alpha);}\n";

    GLuint vs = compile_shader_(S3D_VERTEX_SHADER, vsrc), fs = compile_shader_(S3D_FRAGMENT_SHADER, fsrc);
    g_prog = p_glCreateProgram(); p_glAttachShader(g_prog, vs); p_glAttachShader(g_prog, fs); p_glLinkProgram(g_prog);
    GLint linkOk; p_glGetProgramiv(g_prog, S3D_LINK_STATUS, &linkOk);
    if (!linkOk) { char log[1024]; p_glGetProgramInfoLog(g_prog, 1024, NULL, log); fprintf(stderr, "scene3d: FAIL link: %s\n", log); exit(1); }
    p_glDeleteShader(vs); p_glDeleteShader(fs);

    g_modelLoc = p_glGetUniformLocation(g_prog, "uModel"); g_vpLoc = p_glGetUniformLocation(g_prog, "uViewProj");
    g_colorLoc = p_glGetUniformLocation(g_prog, "uColor"); g_lightLoc = p_glGetUniformLocation(g_prog, "uLightDir");
    g_texLoc = p_glGetUniformLocation(g_prog, "uTex"); g_useTexLoc = p_glGetUniformLocation(g_prog, "uUseTexture");
    g_materialLoc=p_glGetUniformLocation(g_prog,"uMaterial");g_eyeLoc=p_glGetUniformLocation(g_prog,"uEye");g_uvLoc=p_glGetUniformLocation(g_prog,"uHasUV");
    g_lightVpLoc=p_glGetUniformLocation(g_prog,"uLightVP");g_shadowMapLoc=p_glGetUniformLocation(g_prog,"uShadowMap");
    g_shadowPassLoc=p_glGetUniformLocation(g_prog,"uShadowPass");g_hasShadowLoc=p_glGetUniformLocation(g_prog,"uHasShadow");
    p_activeTexture=(PFNACTIVETEX)wglGetProcAddress("glActiveTexture");p_generateMipmap=(PFNGENMIP)wglGetProcAddress("glGenerateMipmap");
    glEnable(GL_DEPTH_TEST);
    printf("scene3d: GL context ready — %s / %s\n", (const char*)glGetString(GL_VENDOR), (const char*)glGetString(GL_RENDERER));
    fflush(stdout);
}

static void s3d_init(const char *title, int width, int height) {
    register_classes_once();
    HWND hwnd = CreateWindowExA(0, "CrealScene3D", title, WS_OVERLAPPEDWINDOW|WS_VISIBLE, CW_USEDEFAULT, CW_USEDEFAULT, width, height, NULL, NULL, GetModuleHandleA(NULL), NULL);
    create_core_context_and_shaders(hwnd);
    printf("scene3d: PASS init (standalone window)\n"); fflush(stdout);
}

// ---- embedded mode: hidden helper window owning the context, render target is an FBO ----
typedef void (WINAPI *PFNGLGENFRAMEBUFFERSPROC)(GLsizei, GLuint*);
typedef void (WINAPI *PFNGLBINDFRAMEBUFFERPROC)(GLenum, GLuint);
typedef void (WINAPI *PFNGLFRAMEBUFFERTEXTURE2DPROC)(GLenum, GLenum, GLenum, GLuint, GLint);
typedef void (WINAPI *PFNGLGENRENDERBUFFERSPROC)(GLsizei, GLuint*);
typedef void (WINAPI *PFNGLBINDRENDERBUFFERPROC)(GLenum, GLuint);
typedef void (WINAPI *PFNGLRENDERBUFFERSTORAGEPROC)(GLenum, GLenum, GLsizei, GLsizei);
typedef void (WINAPI *PFNGLFRAMEBUFFERRENDERBUFFERPROC)(GLenum, GLenum, GLenum, GLuint);
typedef GLenum (WINAPI *PFNGLCHECKFRAMEBUFFERSTATUSPROC)(GLenum);
static PFNGLGENFRAMEBUFFERSPROC p_glGenFramebuffers;
static PFNGLBINDFRAMEBUFFERPROC p_glBindFramebuffer;
static PFNGLFRAMEBUFFERTEXTURE2DPROC p_glFramebufferTexture2D;
static PFNGLGENRENDERBUFFERSPROC p_glGenRenderbuffers;
static PFNGLBINDRENDERBUFFERPROC p_glBindRenderbuffer;
static PFNGLRENDERBUFFERSTORAGEPROC p_glRenderbufferStorage;
static PFNGLFRAMEBUFFERRENDERBUFFERPROC p_glFramebufferRenderbuffer;
static PFNGLCHECKFRAMEBUFFERSTATUSPROC p_glCheckFramebufferStatus;
#define S3D_FRAMEBUFFER 0x8D40
#define S3D_COLOR_ATTACHMENT0 0x8CE0
#define S3D_DEPTH_ATTACHMENT 0x8D00
#define S3D_RENDERBUFFER 0x8D41
#define S3D_FRAMEBUFFER_COMPLETE 0x8CD5
#define S3D_DEPTH_COMPONENT24 0x81A6
#define S3D_BGRA 0x80E1

static GLuint g_embedFbo, g_embedColorTex, g_embedDepthRb;
static int g_embedW, g_embedH;
static unsigned char *g_embedRow=NULL;
static unsigned char *g_embedPixels = NULL; // BGRA, top-down

static void s3d_init_embedded(int width, int height) {
    register_classes_once();
    HWND hwnd = CreateWindowExA(0, "CrealScene3D", "scene3d embedded helper (hidden)", 0, 0, 0, 1, 1, NULL, NULL, GetModuleHandleA(NULL), NULL);
    create_core_context_and_shaders(hwnd);

    #define S3D_ELOAD(name, type) p_##name = (type)wglGetProcAddress(#name); if (!p_##name) { fprintf(stderr, "scene3d: FAIL missing GL proc: %s\n", #name); exit(1); }
    S3D_ELOAD(glGenFramebuffers, PFNGLGENFRAMEBUFFERSPROC); S3D_ELOAD(glBindFramebuffer, PFNGLBINDFRAMEBUFFERPROC);
    S3D_ELOAD(glFramebufferTexture2D, PFNGLFRAMEBUFFERTEXTURE2DPROC); S3D_ELOAD(glGenRenderbuffers, PFNGLGENRENDERBUFFERSPROC);
    S3D_ELOAD(glBindRenderbuffer, PFNGLBINDRENDERBUFFERPROC); S3D_ELOAD(glRenderbufferStorage, PFNGLRENDERBUFFERSTORAGEPROC);
    S3D_ELOAD(glFramebufferRenderbuffer, PFNGLFRAMEBUFFERRENDERBUFFERPROC); S3D_ELOAD(glCheckFramebufferStatus, PFNGLCHECKFRAMEBUFFERSTATUSPROC);

    g_embedW = width; g_embedH = height;
    p_glGenFramebuffers(1, &g_embedFbo); p_glBindFramebuffer(S3D_FRAMEBUFFER, g_embedFbo);
    glGenTextures(1, &g_embedColorTex); glBindTexture(GL_TEXTURE_2D, g_embedColorTex);
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, width, height, 0, GL_RGBA, GL_UNSIGNED_BYTE, NULL);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR); glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
    p_glFramebufferTexture2D(S3D_FRAMEBUFFER, S3D_COLOR_ATTACHMENT0, GL_TEXTURE_2D, g_embedColorTex, 0);
    p_glGenRenderbuffers(1, &g_embedDepthRb); p_glBindRenderbuffer(S3D_RENDERBUFFER, g_embedDepthRb);
    p_glRenderbufferStorage(S3D_RENDERBUFFER, S3D_DEPTH_COMPONENT24, width, height);
    p_glFramebufferRenderbuffer(S3D_FRAMEBUFFER, S3D_DEPTH_ATTACHMENT, S3D_RENDERBUFFER, g_embedDepthRb);
    GLenum status = p_glCheckFramebufferStatus(S3D_FRAMEBUFFER);
    if (status != S3D_FRAMEBUFFER_COMPLETE) { fprintf(stderr, "scene3d: FAIL embedded FBO incomplete: 0x%x\n", status); exit(1); }
    p_glBindFramebuffer(S3D_FRAMEBUFFER, 0);
    g_embedPixels = malloc((size_t)width * height * 4);g_embedRow=malloc((size_t)width*4);
    if(!g_embedPixels||!g_embedRow){fprintf(stderr,"scene3d: out of memory\n");exit(1);}
    s3d_prepare_shadow();
    printf("scene3d: PASS init_embedded (%dx%d FBO)\n", width, height); fflush(stdout);
}

// Embedded-mode input: no cursor capture (ShowCursor/SetCursorPos) like standalone run()
// uses -- that would hijack the mouse away from the rest of Creal's UI sharing this window.
// WASD always polls (same "whole process, not window-scoped" simplification run() already
// has); mouse-look only while the right button is held, tracked as a plain frame-to-frame
// delta with no recentering, so the cursor stays usable for everything else the instant
// the button is released.
static int g_lookActive = 0;
static POINT g_lastMouse;
static void s3d_update_embedded_input(float dt){
    if(!g_inputEnabled||!g_embedHost||GetForegroundWindow()!=g_embedHost){g_lookActive=0;return;}
    POINT cur;GetCursorPos(&cur);ScreenToClient(g_embedHost,&cur);
    if(!PtInRect(&g_inputRect,cur)){g_lookActive=0;return;}
    if(GetAsyncKeyState(VK_RBUTTON)&0x8000){if(!g_lookActive){g_lookActive=1;g_lastMouse=cur;}else{g_camYaw+=(cur.x-g_lastMouse.x)*.003f;g_camPitch-=(cur.y-g_lastMouse.y)*.003f;g_camPitch=fmaxf(-1.45f,fminf(1.45f,g_camPitch));g_lastMouse=cur;}}else g_lookActive=0;
    float forward=((GetAsyncKeyState('W')&0x8000)?1.f:0.f)-((GetAsyncKeyState('S')&0x8000)?1.f:0.f);
    float side=((GetAsyncKeyState('D')&0x8000)?1.f:0.f)-((GetAsyncKeyState('A')&0x8000)?1.f:0.f),len=sqrtf(forward*forward+side*side);
    if(len>0){float speed=(GetAsyncKeyState(VK_SHIFT)&0x8000?4.8f:2.6f)*fminf(dt,.08f)/len;
        s3d_move_camera((sinf(g_camYaw)*forward+cosf(g_camYaw)*side)*speed,(-cosf(g_camYaw)*forward+sinf(g_camYaw)*side)*speed);}
}

static void s3d_draw_objects(void){
    int transparent[MAX_OBJECTS],count=0;
    for(int pass=0;pass<2;pass++){
        if(pass==1){for(int a=1;a<count;a++){int id=transparent[a],b=a-1;SceneObj *o=&g_objects[id];float d=(o->x-g_camX)*(o->x-g_camX)+(o->y-g_camY)*(o->y-g_camY)+(o->z-g_camZ)*(o->z-g_camZ);while(b>=0){SceneObj *q=&g_objects[transparent[b]];float qd=(q->x-g_camX)*(q->x-g_camX)+(q->y-g_camY)*(q->y-g_camY)+(q->z-g_camZ)*(q->z-g_camZ);if(qd>=d)break;transparent[b+1]=transparent[b];b--;}transparent[b+1]=id;}glEnable(GL_BLEND);glEnable(GL_CULL_FACE);glCullFace(GL_BACK);glBlendFunc(GL_SRC_ALPHA,GL_ONE_MINUS_SRC_ALPHA);glDepthMask(GL_FALSE);}
        int limit=pass?count:g_objectCount;for(int i=0;i<limit;i++){SceneObj *o=&g_objects[pass?transparent[i]:i];if(!o->used)continue;if(!pass&&o->opacity<.99f){transparent[count++]=i;continue;}Mesh *m=&g_meshes[o->meshId];Mat4_ model=mat4_mul_(mat4_translate_(o->x,o->y,o->z),mat4_mul_(mat4_rotate_y_(o->yaw),mat4_scale_(o->sx,o->sy,o->sz)));p_glUniformMatrix4fv(g_modelLoc,1,GL_FALSE,model.m);p_glUniform3f(g_colorLoc,o->r,o->g,o->b);p_glUniform3f(g_materialLoc,o->roughness,o->metalness,o->opacity);p_glUniform1i(g_uvLoc,m->hasUV);p_glUniform1i(g_useTexLoc,o->textureId>=0);if(o->textureId>=0)glBindTexture(GL_TEXTURE_2D,g_textures[o->textureId].tex);p_glBindVertexArray(m->vao);glDrawArrays(GL_TRIANGLES,0,m->vertCount);}
        if(pass==1){glDepthMask(GL_TRUE);glDisable(GL_BLEND);glDisable(GL_CULL_FACE);}
    }
}

static void s3d_tick_embedded(float dt) {
    s3d_update_embedded_input(dt);
    if (g_tickHandler) g_tickHandler(g_tickUserdata, dt);

    wglMakeCurrent(g_hdc, g_glrc);
    s3d_draw_shadow();
    p_glBindFramebuffer(S3D_FRAMEBUFFER, g_embedFbo);
    glViewport(0, 0, g_embedW, g_embedH);
    glClearColor(0.57f,0.69f,0.78f,1.0f);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

    Mat4_ proj = mat4_perspective_(1.22f, (float)g_embedW/g_embedH, 0.05f, 150.0f);
    Mat4_ view = mat4_fps_view_(g_camX, g_camY, g_camZ, g_camYaw, g_camPitch);
    Mat4_ viewProj = mat4_mul_(proj, view);

    p_glUseProgram(g_prog);
    p_glUniformMatrix4fv(g_vpLoc, 1, GL_FALSE, viewProj.m);
    p_glUniform3f(g_lightLoc, g_lightX, g_lightY, g_lightZ);
    p_glUniform1i(g_texLoc, 0);p_glUniform3f(g_eyeLoc,g_camX,g_camY,g_camZ);p_glUniform1i(g_shadowPassLoc,0);
    s3d_draw_objects();

    glPixelStorei(GL_PACK_ALIGNMENT, 1);
    glReadPixels(0, 0, g_embedW, g_embedH, S3D_BGRA, GL_UNSIGNED_BYTE, g_embedPixels);
    // glReadPixels is bottom-up; flip in place to top-down, matching what a Windows DIB wants.
    unsigned char *rowtmp = g_embedRow;
    for (int y = 0; y < g_embedH / 2; y++) {
        unsigned char *a = g_embedPixels + (size_t)y * g_embedW * 4, *b = g_embedPixels + (size_t)(g_embedH - 1 - y) * g_embedW * 4;
        memcpy(rowtmp, a, (size_t)g_embedW * 4); memcpy(a, b, (size_t)g_embedW * 4); memcpy(b, rowtmp, (size_t)g_embedW * 4);
    }

    p_glBindFramebuffer(S3D_FRAMEBUFFER, 0);
}

static const unsigned char *s3d_get_pixels_bgra(void) { return g_embedPixels; }
static int s3d_get_embedded_width(void) { return g_embedW; }
static int s3d_get_embedded_height(void) { return g_embedH; }

static int s3d_load_mesh(const char *obj_path) {
    if (g_meshCount >= MAX_MESHES) { fprintf(stderr, "scene3d: FAIL too many meshes loaded\n"); exit(1); }
    float *verts; int vertCount;
    if (!load_obj_pos_normal(obj_path, &verts, &vertCount)) exit(1);
    Mesh *m = &g_meshes[g_meshCount];
    p_glGenVertexArrays(1, &m->vao); p_glGenBuffers(1, &m->vbo);
    p_glBindVertexArray(m->vao); p_glBindBuffer(S3D_ARRAY_BUFFER, m->vbo);
    p_glBufferData(S3D_ARRAY_BUFFER, sizeof(float)*8*vertCount, verts, S3D_STATIC_DRAW);
    p_glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 8*sizeof(float), (void*)0); p_glEnableVertexAttribArray(0);
    p_glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, 8*sizeof(float), (void*)(3*sizeof(float))); p_glEnableVertexAttribArray(1);
    p_glVertexAttribPointer(2,2,GL_FLOAT,GL_FALSE,8*sizeof(float),(void*)(6*sizeof(float)));p_glEnableVertexAttribArray(2);
    m->hasUV=g_loadingUV;m->minX=m->minY=m->minZ=1e9f;m->maxX=m->maxY=m->maxZ=-1e9f;
    for(int i=0;i<vertCount;i++){float *v=verts+i*8;m->minX=fminf(m->minX,v[0]);m->maxX=fmaxf(m->maxX,v[0]);m->minY=fminf(m->minY,v[1]);m->maxY=fmaxf(m->maxY,v[1]);m->minZ=fminf(m->minZ,v[2]);m->maxZ=fmaxf(m->maxZ,v[2]);}
    m->vertCount = vertCount;
    free(verts);
    printf("scene3d: PASS loaded mesh %s (id %d): %d vertices\n", obj_path, g_meshCount, vertCount); fflush(stdout);
    return g_meshCount++;
}

static int s3d_load_texture(const char *bmp_path) {
    if (g_textureCount >= MAX_TEXTURES) { fprintf(stderr, "scene3d: FAIL too many textures loaded\n"); exit(1); }
    int w, h; unsigned char *pixels = load_bmp_rgba(bmp_path, &w, &h);
    if (!pixels) exit(1);
    Texture *t = &g_textures[g_textureCount];
    glGenTextures(1, &t->tex); glBindTexture(GL_TEXTURE_2D, t->tex);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_REPEAT);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_REPEAT);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, w, h, 0, GL_RGBA, GL_UNSIGNED_BYTE, pixels);
    p_generateMipmap(GL_TEXTURE_2D);glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_MIN_FILTER,GL_LINEAR_MIPMAP_LINEAR);
    free(pixels);
    printf("scene3d: PASS loaded texture %s (id %d): %dx%d\n", bmp_path, g_textureCount, w, h); fflush(stdout);
    return g_textureCount++;
}

static int s3d_spawn(int mesh_id, float x, float y, float z, float sx, float sy, float sz, float r, float g, float b) {
    if (mesh_id < 0 || mesh_id >= g_meshCount) { fprintf(stderr, "scene3d: FAIL spawn: bad mesh id %d\n", mesh_id); exit(1); }
    if (g_objectCount >= MAX_OBJECTS) { fprintf(stderr, "scene3d: FAIL too many objects\n"); exit(1); }
    SceneObj *o = &g_objects[g_objectCount];
    o->meshId = mesh_id; o->textureId = -1; o->x=x; o->y=y; o->z=z; o->sx=sx; o->sy=sy; o->sz=sz; o->yaw=0; o->r=r; o->g=g; o->b=b; o->used=1;o->roughness=.85f;o->metalness=0;o->opacity=1;
    g_shadowDirty=1;return g_objectCount++;
}

static void s3d_set_transform(int object_id, float x, float y, float z, float sx, float sy, float sz, float yaw) {
    if (object_id < 0 || object_id >= g_objectCount || !g_objects[object_id].used) { fprintf(stderr, "scene3d: FAIL set_transform: bad object id %d\n", object_id); exit(1); }
    SceneObj *o = &g_objects[object_id]; o->x=x; o->y=y; o->z=z; o->sx=sx; o->sy=sy; o->sz=sz; o->yaw=yaw;g_shadowDirty=1;
}

static void s3d_set_texture(int object_id, int texture_id) {
    if (object_id < 0 || object_id >= g_objectCount || !g_objects[object_id].used) { fprintf(stderr, "scene3d: FAIL set_texture: bad object id %d\n", object_id); exit(1); }
    if (texture_id != -1 && (texture_id < 0 || texture_id >= g_textureCount)) { fprintf(stderr, "scene3d: FAIL set_texture: bad texture id %d\n", texture_id); exit(1); }
    g_objects[object_id].textureId = texture_id;
}

static void s3d_set_camera(float x, float y, float z, float yaw, float pitch) { g_camX=x; g_camY=y; g_camZ=z; g_camYaw=yaw; g_camPitch=pitch; }
static void s3d_set_light_dir(float x, float y, float z) { g_lightX=x; g_lightY=y; g_lightZ=z;g_shadowDirty=1; }
static void s3d_on_tick(Scene3DTickHandler handler, void *userdata) { g_tickHandler = handler; g_tickUserdata = userdata; }

static void s3d_run(void) {
    POINT center; RECT rc0; GetClientRect(g_hwnd, &rc0); center.x=(rc0.right-rc0.left)/2; center.y=(rc0.bottom-rc0.top)/2;
    ClientToScreen(g_hwnd, &center); SetCursorPos(center.x, center.y); ShowCursor(FALSE);
    MSG msg; DWORD lastFrame = GetTickCount();
    for (;;) {
        while (PeekMessageA(&msg, NULL, 0, 0, PM_REMOVE)) { if (msg.message == WM_QUIT) goto done; TranslateMessage(&msg); DispatchMessageA(&msg); }
        DWORD now = GetTickCount(); float dt = (now - lastFrame) / 1000.0f; lastFrame = now;
        if (GetForegroundWindow() == g_hwnd) {
            POINT cur; GetCursorPos(&cur);
            g_camYaw += (cur.x - center.x) * 0.0025f; g_camPitch -= (cur.y - center.y) * 0.0025f;
            if (g_camPitch > 1.5f) g_camPitch = 1.5f; if (g_camPitch < -1.5f) g_camPitch = -1.5f;
            SetCursorPos(center.x, center.y);
        }
        float speed = 2.6f * dt;
        float fx = sinf(g_camYaw), fz = -cosf(g_camYaw), rx = cosf(g_camYaw), rz = sinf(g_camYaw);
        if (GetAsyncKeyState('W') & 0x8000) { g_camX += fx*speed; g_camZ += fz*speed; }
        if (GetAsyncKeyState('S') & 0x8000) { g_camX -= fx*speed; g_camZ -= fz*speed; }
        if (GetAsyncKeyState('D') & 0x8000) { g_camX += rx*speed; g_camZ += rz*speed; }
        if (GetAsyncKeyState('A') & 0x8000) { g_camX -= rx*speed; g_camZ -= rz*speed; }

        if (g_tickHandler) g_tickHandler(g_tickUserdata, dt);

        RECT rc; GetClientRect(g_hwnd, &rc); int w=rc.right-rc.left, h=rc.bottom-rc.top;
        glViewport(0,0,w,h); glClearColor(0.57f,0.69f,0.78f,1); glClear(GL_COLOR_BUFFER_BIT|GL_DEPTH_BUFFER_BIT);
        Mat4_ proj = mat4_perspective_(1.22f, (float)w/h, 0.05f, 150.0f);
        Mat4_ view = mat4_fps_view_(g_camX, g_camY, g_camZ, g_camYaw, g_camPitch);
        Mat4_ viewProj = mat4_mul_(proj, view);

        p_glUseProgram(g_prog);
        p_glUniformMatrix4fv(g_vpLoc, 1, GL_FALSE, viewProj.m);
        p_glUniform3f(g_lightLoc, g_lightX, g_lightY, g_lightZ);
        p_glUniform1i(g_texLoc, 0);p_glUniform3f(g_eyeLoc,g_camX,g_camY,g_camZ);p_glUniform1i(g_shadowPassLoc,0);
        s3d_draw_objects();
        SwapBuffers(g_hdc); Sleep(16);
    }
done:
    ShowCursor(TRUE);
}

/* Static town shadow map. Regenerated only when scene geometry/light changes. */
static GLuint g_shadowFbo,g_shadowTex;
static Mat4_ g_lightVP;
static void s3d_prepare_shadow(void){
    p_glGenFramebuffers(1,&g_shadowFbo);p_glBindFramebuffer(S3D_FRAMEBUFFER,g_shadowFbo);glGenTextures(1,&g_shadowTex);glBindTexture(GL_TEXTURE_2D,g_shadowTex);
    glTexImage2D(GL_TEXTURE_2D,0,S3D_DEPTH_COMPONENT24,1536,1536,0,GL_DEPTH_COMPONENT,GL_FLOAT,NULL);
    glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_MIN_FILTER,GL_NEAREST);glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_MAG_FILTER,GL_NEAREST);
    glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_WRAP_S,0x812D);glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_WRAP_T,0x812D);float white[4]={1,1,1,1};glTexParameterfv(GL_TEXTURE_2D,GL_TEXTURE_BORDER_COLOR,white);
    p_glFramebufferTexture2D(S3D_FRAMEBUFFER,S3D_DEPTH_ATTACHMENT,GL_TEXTURE_2D,g_shadowTex,0);glDrawBuffer(GL_NONE);glReadBuffer(GL_NONE);
    if(p_glCheckFramebufferStatus(S3D_FRAMEBUFFER)!=S3D_FRAMEBUFFER_COMPLETE){fprintf(stderr,"scene3d: shadow FBO failed\n");exit(1);}p_glBindFramebuffer(S3D_FRAMEBUFFER,0);
}
static void s3d_draw_shadow(void){
    if(g_shadowDirty){float len=sqrtf(g_lightX*g_lightX+g_lightY*g_lightY+g_lightZ*g_lightZ);if(len<.001f)len=1;
        float x=-g_lightX/len*70,y=-g_lightY/len*70,z=-g_lightZ/len*70;
        Mat4_ view=mat4_fps_view_(x,y,z,atan2f(-x,z),asinf(-y/70));Mat4_ ortho=mat4_identity_();ortho.m[0]=ortho.m[5]=1.f/65;ortho.m[10]=-2.f/160;ortho.m[14]=-1.0125f;g_lightVP=mat4_mul_(ortho,view);
        p_glBindFramebuffer(S3D_FRAMEBUFFER,g_shadowFbo);glViewport(0,0,1536,1536);glClear(GL_DEPTH_BUFFER_BIT);p_glUseProgram(g_prog);p_glUniform1i(g_shadowPassLoc,1);p_glUniformMatrix4fv(g_vpLoc,1,GL_FALSE,g_lightVP.m);p_glUniformMatrix4fv(g_lightVpLoc,1,GL_FALSE,g_lightVP.m);
        glEnable(GL_POLYGON_OFFSET_FILL);glPolygonOffset(1.2f,2.f);
        for(int i=0;i<g_objectCount;i++){SceneObj *o=&g_objects[i];if(!o->used||o->opacity<.99f)continue;Mesh *m=&g_meshes[o->meshId];Mat4_ model=mat4_mul_(mat4_translate_(o->x,o->y,o->z),mat4_mul_(mat4_rotate_y_(o->yaw),mat4_scale_(o->sx,o->sy,o->sz)));p_glUniformMatrix4fv(g_modelLoc,1,GL_FALSE,model.m);p_glUniform1i(g_uvLoc,m->hasUV);p_glUniform1i(g_useTexLoc,o->textureId>=0);if(o->textureId>=0)glBindTexture(GL_TEXTURE_2D,g_textures[o->textureId].tex);p_glBindVertexArray(m->vao);glDrawArrays(GL_TRIANGLES,0,m->vertCount);}glDisable(GL_POLYGON_OFFSET_FILL);g_shadowDirty=0;
    }
    p_glUniformMatrix4fv(g_lightVpLoc,1,GL_FALSE,g_lightVP.m);p_glUniform1i(g_hasShadowLoc,1);p_glUniform1i(g_shadowMapLoc,1);p_activeTexture(0x84C1);glBindTexture(GL_TEXTURE_2D,g_shadowTex);p_activeTexture(0x84C0);
}
static int s3d_blocked(float x,float z){
    for(int i=0;i<g_objectCount;i++){SceneObj *o=&g_objects[i];if(!o->used)continue;Mesh *m=&g_meshes[o->meshId];float low=o->y+m->minY*o->sy,high=o->y+m->maxY*o->sy;if(high<.3f||low>g_camY-.12f)continue;
        float dx=x-o->x,dz=z-o->z,c=cosf(o->yaw),s=sinf(o->yaw),lx=c*dx-s*dz,lz=s*dx+c*dz;
        if(lx>m->minX*o->sx-.22f&&lx<m->maxX*o->sx+.22f&&lz>m->minZ*o->sz-.22f&&lz<m->maxZ*o->sz+.22f)return 1;
    }return 0;
}
static void s3d_move_camera(float dx,float dz){if(!s3d_blocked(g_camX+dx,g_camZ))g_camX+=dx;if(!s3d_blocked(g_camX,g_camZ+dz))g_camZ+=dz;}
static void s3d_resize_embedded(int width,int height){
    if(width>4096)width=4096;if(height>2160)height=2160;
    if(width<1||height<1||(width==g_embedW&&height==g_embedH))return;
    wglMakeCurrent(g_hdc,g_glrc);glBindTexture(GL_TEXTURE_2D,g_embedColorTex);glTexImage2D(GL_TEXTURE_2D,0,GL_RGBA,width,height,0,GL_RGBA,GL_UNSIGNED_BYTE,NULL);p_glBindRenderbuffer(S3D_RENDERBUFFER,g_embedDepthRb);p_glRenderbufferStorage(S3D_RENDERBUFFER,S3D_DEPTH_COMPONENT24,width,height);
    unsigned char *pixels=realloc(g_embedPixels,(size_t)width*height*4);if(!pixels){fprintf(stderr,"scene3d: resize allocation failed\n");exit(1);}g_embedPixels=pixels;unsigned char *row=realloc(g_embedRow,(size_t)width*4);if(!row){fprintf(stderr,"scene3d: resize row allocation failed\n");exit(1);}g_embedRow=row;g_embedW=width;g_embedH=height;
}
static void s3d_set_embedded_host(void *window,int x,int y,int width,int height){g_embedHost=(HWND)window;g_inputRect=(RECT){x,y,x+width,y+height};}
static void s3d_set_input_enabled(int enabled){g_inputEnabled=enabled;g_lookActive=0;}

static void s3d_set_material(int id,float rough,float metal,float opacity){if(id<0||id>=g_objectCount){fprintf(stderr,"scene3d: invalid material object\n");exit(1);}SceneObj *o=&g_objects[id];o->roughness=fmaxf(.08f,fminf(1,rough));o->metalness=fmaxf(0,fminf(1,metal));o->opacity=fmaxf(.02f,fminf(1,opacity));g_shadowDirty=1;}
static const Scene3D g_scene3d = {
    s3d_init, s3d_load_mesh, s3d_load_texture, s3d_spawn, s3d_set_transform, s3d_set_texture, s3d_set_camera, s3d_set_light_dir, s3d_on_tick, s3d_run,
    s3d_init_embedded, s3d_tick_embedded, s3d_get_pixels_bgra, s3d_get_embedded_width, s3d_get_embedded_height,
    s3d_resize_embedded,s3d_set_embedded_host,s3d_set_input_enabled,s3d_set_material
};
const Scene3D *scene3d_backend(void) { return &g_scene3d; }

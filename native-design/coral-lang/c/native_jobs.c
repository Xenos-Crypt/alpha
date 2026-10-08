#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <wincred.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <wchar.h>
#include "native_jobs.h"
#include "json_value.h"
#define OUTPUT_LIMIT (256*1024)
#define HTTP_LIMIT (2*1024*1024)
typedef struct {int id;char *kind,*root;Value options,result;HANDLE thread;volatile LONG done,cancel;} Job;
static Job *jobs[8];static int next_id=1;
static Value obj(void){return object_value(object_new());}
static void set(Value v,const char *key,Value x){object_set(v.as.object,key,x);}
static Value str(const char *s){return string_value(strdup(s?s:""));}
static Value field(Value v,const char *key){Value *p=v.type==VAL_OBJECT?object_get(v.as.object,key):NULL;return p?*p:nil_value();}
static const char *text(Value v,const char *key){Value x=field(v,key);return x.type==VAL_STRING?x.as.string:"";}
static int num(Value v,const char *key,int fallback){Value x=field(v,key);return x.type==VAL_NUMBER?(int)x.as.number:fallback;}
static Value error(const char *s){Value v=obj();set(v,"error",str(s));return v;}
static Value winerror(const char *s){char b[512];snprintf(b,sizeof(b),"%s (Windows error %lu)",s,GetLastError());return error(b);}
static wchar_t *wide(const char *s){int n=MultiByteToWideChar(CP_UTF8,MB_ERR_INVALID_CHARS,s,-1,NULL,0);if(!n)return NULL;wchar_t *w=calloc(n,sizeof(wchar_t));MultiByteToWideChar(CP_UTF8,0,s,-1,w,n);return w;}
static char *utf8(const wchar_t *w){int n=WideCharToMultiByte(CP_UTF8,0,w,-1,NULL,0,NULL,NULL);char *s=calloc(n,1);WideCharToMultiByte(CP_UTF8,0,w,-1,s,n,NULL,NULL);return s;}
int native_same_path(const char *a,const char *b) {
    wchar_t *wa=wide(a),*wb=wide(b),fa[32768],fb[32768];int same=0;
    if(wa&&wb) {
        DWORD na=GetFullPathNameW(wa,32768,fa,NULL),nb=GetFullPathNameW(wb,32768,fb,NULL);
        if(na&&na<32768&&nb&&nb<32768)same=!_wcsicmp(fa,fb);
        if(!same) {
            HANDLE ha=CreateFileW(wa,0,FILE_SHARE_READ|FILE_SHARE_WRITE|FILE_SHARE_DELETE,NULL,OPEN_EXISTING,FILE_FLAG_BACKUP_SEMANTICS,NULL);
            HANDLE hb=CreateFileW(wb,0,FILE_SHARE_READ|FILE_SHARE_WRITE|FILE_SHARE_DELETE,NULL,OPEN_EXISTING,FILE_FLAG_BACKUP_SEMANTICS,NULL);
            BY_HANDLE_FILE_INFORMATION ia,ib;
            if(ha!=INVALID_HANDLE_VALUE&&hb!=INVALID_HANDLE_VALUE&&GetFileInformationByHandle(ha,&ia)&&GetFileInformationByHandle(hb,&ib))
                same=ia.dwVolumeSerialNumber==ib.dwVolumeSerialNumber&&ia.nFileIndexHigh==ib.nFileIndexHigh&&ia.nFileIndexLow==ib.nFileIndexLow;
            if(ha!=INVALID_HANDLE_VALUE)CloseHandle(ha);
            if(hb!=INVALID_HANDLE_VALUE)CloseHandle(hb);
        }
    }
    free(wa);free(wb);return same;
}
static FILE *file_open(const char *path,const wchar_t *mode){wchar_t *w=wide(path);if(!w)return NULL;FILE *f=_wfopen(w,mode);free(w);return f;}
static char *read_text(const char *path,size_t limit){FILE *f=file_open(path,L"rb");if(!f)return NULL;char *s=calloc(limit+2,1);size_t n=fread(s,1,limit+1,f);fclose(f);if(n>limit||memchr(s,0,n)){free(s);return NULL;}s[n]=0;return s;}
static int write_text(const char *path,const char *s){FILE *f=file_open(path,L"wb");if(!f)return 0;size_t n=strlen(s);int ok=fwrite(s,1,n,f)==n;int closed=fclose(f)==0;return ok&&closed;}
static void delete_file(const char *path){wchar_t *w=wide(path);if(w){DeleteFileW(w);free(w);}}
static int cancelled(Job *j){return InterlockedCompareExchange(&j->cancel,0,0)!=0;}
static void append_output(char *dest,size_t *used,const char *data,DWORD n,int *truncated){size_t available=OUTPUT_LIMIT-*used,take=n<available?n:available;if(take)memcpy(dest+*used,data,take);*used+=take;dest[*used]=0;if(take<n)*truncated=1;}
static void drain(HANDLE pipe,char *out,size_t *used,int *truncated) {
    DWORD available,n;char b[4096];
    while(PeekNamedPipe(pipe,NULL,0,NULL,&available,NULL)&&available) {
        if(!ReadFile(pipe,b,available>sizeof(b)?sizeof(b):available,&n,NULL)||!n)break;
        append_output(out,used,b,n,truncated);
    }
}
static char *github_environment(void) {
    PCREDENTIALA cred=NULL;if(!CredReadA("Cryptic/Xenos/GitHub",CRED_TYPE_GENERIC,0,&cred))return NULL;
    if(!cred->CredentialBlobSize||cred->CredentialBlobSize>8192){CredFree(cred);return NULL;}
    char *base=GetEnvironmentStringsA();size_t cap=32768+cred->CredentialBlobSize*2,used=0;char *env=calloc(cap,1);
    for(char *p=base;*p;p+=strlen(p)+1) {
        if(!_strnicmp(p,"GH_TOKEN=",9)||!_strnicmp(p,"GITHUB_TOKEN=",13))continue;
        size_t n=strlen(p)+1;if(used+n+cred->CredentialBlobSize*2+50>=cap){free(env);FreeEnvironmentStringsA(base);CredFree(cred);return NULL;}memcpy(env+used,p,n);used+=n;
    }
    FreeEnvironmentStringsA(base);
    const char *keys[]={"GH_TOKEN=","GITHUB_TOKEN="};
    for(int i=0;i<2;i++){size_t n=strlen(keys[i]);memcpy(env+used,keys[i],n);used+=n;memcpy(env+used,cred->CredentialBlob,cred->CredentialBlobSize);used+=cred->CredentialBlobSize;env[used++]=0;}
    env[used]=0;CredFree(cred);return env;
}
/* No shell for HTTP. The command tool explicitly uses the user's Windows shell.
 * Descendants remain in a kill-on-close job, including on editor exit. */
static Value process(Job *j,const char *exe,const char *command,const char *cwd,const char *input,int timeout,int identity) {
    if(cancelled(j))return error("Stopped by user");
    SECURITY_ATTRIBUTES sa={sizeof(sa),NULL,TRUE};HANDLE outR=NULL,outW=NULL,errR=NULL,errW=NULL,inR=NULL,inW=NULL;
    HANDLE group=CreateJobObjectW(NULL,NULL);PROCESS_INFORMATION pi={0};Value result=nil_value();char *env=NULL;
    if(!group||!CreatePipe(&outR,&outW,&sa,0)||!CreatePipe(&errR,&errW,&sa,0)||!CreatePipe(&inR,&inW,&sa,65536)){result=winerror("Cannot create process pipes");goto done;}
    SetHandleInformation(outR,HANDLE_FLAG_INHERIT,0);SetHandleInformation(errR,HANDLE_FLAG_INHERIT,0);SetHandleInformation(inW,HANDLE_FLAG_INHERIT,0);
    JOBOBJECT_EXTENDED_LIMIT_INFORMATION limits={0};limits.BasicLimitInformation.LimitFlags=JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
    if(!SetInformationJobObject(group,JobObjectExtendedLimitInformation,&limits,sizeof(limits))){result=winerror("Cannot configure process cancellation");goto done;}
    if(identity){env=github_environment();if(!env){result=error("Xenos GitHub identity is not configured");goto done;}}
    wchar_t *wexe=wide(exe),*wcmd=wide(command),*wdir=wide(cwd);
    STARTUPINFOW si={0};si.cb=sizeof(si);si.dwFlags=STARTF_USESTDHANDLES|STARTF_USESHOWWINDOW;si.wShowWindow=SW_HIDE;si.hStdInput=inR;si.hStdOutput=outW;si.hStdError=errW;
    BOOL started=wexe&&wcmd&&wdir&&CreateProcessW(wexe,wcmd,NULL,NULL,TRUE,CREATE_NO_WINDOW|CREATE_SUSPENDED,env,wdir,&si,&pi);
    free(wexe);free(wcmd);free(wdir);if(!started){result=winerror("Cannot launch process");goto done;}
    if(!AssignProcessToJobObject(group,pi.hProcess)){result=winerror("Cannot attach process cancellation");TerminateProcess(pi.hProcess,1);goto done;}
    ResumeThread(pi.hThread);CloseHandle(outW);outW=NULL;CloseHandle(errW);errW=NULL;CloseHandle(inR);inR=NULL;
    if(input&&*input){DWORD written;WriteFile(inW,input,(DWORD)strlen(input),&written,NULL);}CloseHandle(inW);inW=NULL;
    char *out=calloc(OUTPUT_LIMIT+1,1),*err=calloc(OUTPUT_LIMIT+1,1);size_t no=0,ne=0;int truncated=0,stopped=0,timed=0;ULONGLONG start=GetTickCount64();
    for(;;){drain(outR,out,&no,&truncated);drain(errR,err,&ne,&truncated);if(WaitForSingleObject(pi.hProcess,20)==WAIT_OBJECT_0)break;if(cancelled(j)||(int)(GetTickCount64()-start)>timeout){stopped=cancelled(j);timed=!stopped;TerminateJobObject(group,1);WaitForSingleObject(pi.hProcess,2000);break;}}
    drain(outR,out,&no,&truncated);drain(errR,err,&ne,&truncated);DWORD code=1;GetExitCodeProcess(pi.hProcess,&code);
    result=obj();set(result,"stdout",string_value(out));set(result,"stderr",string_value(err));set(result,"exitCode",number_value(code));set(result,"truncated",bool_value(truncated));set(result,"durationMs",number_value((double)(GetTickCount64()-start)));
    if(stopped||timed)set(result,"error",str(stopped?"Stopped by user":"Process timed out"));
done:
    if(env){SecureZeroMemory(env,32768);free(env);}
    if(group)CloseHandle(group);
    if(pi.hThread)CloseHandle(pi.hThread);
    if(pi.hProcess)CloseHandle(pi.hProcess);
    if(outR)CloseHandle(outR);
    if(outW)CloseHandle(outW);
    if(errR)CloseHandle(errR);
    if(errW)CloseHandle(errW);
    if(inR)CloseHandle(inR);
    if(inW)CloseHandle(inW);
    return result;
}
static Value shell(Job *j,const char *command,int identity) {
    if(!*command)return error("Command must not be empty");
    wchar_t system[MAX_PATH];GetSystemDirectoryW(system,MAX_PATH);wcscat(system,L"\\cmd.exe");char *exe=utf8(system);
    size_t n=strlen(exe)+strlen(command)+30;char *line=malloc(n);snprintf(line,n,"\"%s\" /d /s /c \"%s\"",exe,command);
    const char *dir=text(j->options,"directory");if(!*dir)dir=j->root;
    int timeout=num(j->options,"timeoutMs",120000);if(timeout<100)timeout=100;if(timeout>900000)timeout=900000;
    Value r=process(j,exe,line,dir,"",timeout,identity);free(exe);free(line);return r;
}
static int config_line(char *config,size_t cap,const char *key,const char *value) {
    size_t n=strlen(config),k=strlen(key);if(n+k+6>=cap)return 0;memcpy(config+n,key,k);n+=k;config[n++]='=';config[n++]='"';
    for(const unsigned char *p=(const unsigned char*)value;*p;p++) {
        if(n+5>=cap)return 0;
        if(*p=='\\'||*p=='"'){config[n++]='\\';config[n++]=(char)*p;}
        else if(*p=='\n'||*p=='\r'||*p=='\t'){config[n++]='\\';config[n++]=*p=='\n'?'n':*p=='\r'?'r':'t';}
        else if(*p<32)return 0;else config[n++]=(char)*p;
    }
    config[n++]='"';config[n++]='\n';config[n]=0;return 1;
}
static Value http(Job *j,Value options) {
    const char *url=text(options,"url"),*method=text(options,"method"),*body=text(options,"body");
    if(_strnicmp(url,"http://",7)&&_strnicmp(url,"https://",8))return error("HTTP(S) URL required");
    if(strlen(url)>8192||strlen(body)>HTTP_LIMIT)return error("HTTP input limit exceeded");
    wchar_t temp[MAX_PATH],folder[MAX_PATH],system[MAX_PATH];GetTempPathW(MAX_PATH,temp);
    if(!GetTempFileNameW(temp,L"xen",0,folder))return winerror("Cannot create HTTP temporary path");
    DeleteFileW(folder);if(!CreateDirectoryW(folder,NULL))return winerror("Cannot create HTTP temporary directory");
    char *dir=utf8(folder),data[MAX_PATH*4],output[MAX_PATH*4],headersPath[MAX_PATH*4];
    snprintf(data,sizeof(data),"%s/request",dir);snprintf(output,sizeof(output),"%s/response",dir);snprintf(headersPath,sizeof(headersPath),"%s/headers",dir);
    Value result=nil_value();char *config=calloc(65536,1),*response=NULL,*headers=NULL;
    int ok=write_text(data,body);char bodyAt[MAX_PATH*4+2];snprintf(bodyAt,sizeof(bodyAt),"@%s",data);
    strcpy(config,"silent\nshow-error\ngloboff\nlocation\nmax-redirs=\"5\"\nproto=\"=http,https\"\nproto-redir=\"=http,https\"\nconnect-timeout=\"10\"\nmax-time=\"180\"\nmax-filesize=\"2097152\"\nwrite-out=\"%{http_code}\"\n");
    ok=ok&&config_line(config,65536,"url",url)&&config_line(config,65536,"request",*method?method:"GET")&&config_line(config,65536,"output",output)&&config_line(config,65536,"dump-header",headersPath);
    if(*body)ok=ok&&config_line(config,65536,"data-binary",bodyAt);
    if(is_truthy(field(options,"tor")))ok=ok&&config_line(config,65536,"proxy","socks5h://127.0.0.1:9050")&&config_line(config,65536,"noproxy","");
    Value hs=field(options,"headers");
    if(hs.type==VAL_OBJECT)for(int i=0;i<hs.as.object->count;i++) {
        const char *key=hs.as.object->keys[i];Value v=hs.as.object->values[i];if(v.type!=VAL_STRING||strpbrk(key,"\r\n:")||strpbrk(v.as.string,"\r\n")){ok=0;break;}
        size_t n=strlen(key)+strlen(v.as.string)+3;char *h=malloc(n);snprintf(h,n,"%s: %s",key,v.as.string);ok=ok&&config_line(config,65536,"header",h);free(h);
    }
    if(hs.type==VAL_ARRAY)for(int i=0;i<hs.as.array->count;i++) {
        Value h=hs.as.array->items[i];if(h.type!=VAL_STRING||!strchr(h.as.string,':')||strpbrk(h.as.string,"\r\n")){ok=0;break;}
        ok=ok&&config_line(config,65536,"header",h.as.string);
    }
    if(!ok){result=error("Invalid or oversized HTTP configuration");goto done;}
    GetSystemDirectoryW(system,MAX_PATH);wcscat(system,L"\\curl.exe");char *exe=utf8(system),cmd[MAX_PATH*4+40];snprintf(cmd,sizeof(cmd),"\"%s\" -q --config -",exe);
    Value p=process(j,exe,cmd,j->root,config,190000,0);free(exe);
    if(is_truthy(field(p,"error"))||num(p,"exitCode",1)!=0){result=error(*text(p,"error")?text(p,"error"):*text(p,"stderr")?text(p,"stderr"):"HTTP transport failed");json_free(p);goto done;}
    response=read_text(output,HTTP_LIMIT);headers=read_text(headersPath,OUTPUT_LIMIT);
    if(!response){result=error("Response is binary, oversized or unreadable");json_free(p);goto done;}
    result=obj();set(result,"statusCode",number_value(atoi(text(p,"stdout"))));set(result,"body",str(response));set(result,"headers",str(headers?headers:""));set(result,"url",str(url));set(result,"bytes",number_value(strlen(response)));set(result,"durationMs",field(p,"durationMs"));json_free(p);
done:
    free(response);free(headers);SecureZeroMemory(config,65536);free(config);delete_file(data);delete_file(output);delete_file(headersPath);RemoveDirectoryW(folder);free(dir);return result;
}
/* Resolve under the actual workspace, rejecting reparse-point traversal. */
static wchar_t *workspace_path(Job *j,const char *relative) {
    if(strchr(relative,':')||relative[0]=='/'||relative[0]=='\\')return NULL;
    wchar_t *root=wide(j->root),*part=wide(relative);if(!root||!part){free(root);free(part);return NULL;}
    wchar_t joined[32768],resolved[32768];if(wcslen(root)+wcslen(part)+2>=32768){free(root);free(part);return NULL;}
    swprintf(joined,32768,L"%ls\\%ls",root,part);free(part);
    DWORD n=GetFullPathNameW(joined,32768,resolved,NULL);size_t len=wcslen(root);
    if(!n||n>=32768||_wcsnicmp(root,resolved,len)||(resolved[len]&&resolved[len]!='\\')){free(root);return NULL;}free(root);
    for(size_t i=len;i<=wcslen(resolved);i++)if(resolved[i]=='\\'||!resolved[i]) {
        wchar_t keep=resolved[i];resolved[i]=0;DWORD attrs=GetFileAttributesW(resolved);resolved[i]=keep;
        if(attrs!=INVALID_FILE_ATTRIBUTES&&(attrs&FILE_ATTRIBUTE_REPARSE_POINT))return NULL;
    }
    return _wcsdup(resolved);
}
static Value filesystem(Job *j) {
    const char *op=text(j->options,"op");wchar_t *path=workspace_path(j,text(j->options,"path"));if(!path)return error("Path must remain inside the workspace; links are not followed");
    char *name=utf8(path);Value r=nil_value();
    if(!strcmp(op,"read_file")){char *s=read_text(name,512*1024);if(s){r=obj();set(r,"result",string_value(s));}else r=error("Cannot read text file (missing, binary or over 512 KiB)");}
    else if(!strcmp(op,"write_file")) {
        const char *content=text(j->options,"content");int ok=strlen(content)<=512*1024;
        for(wchar_t *p=path+3;*p&&ok;p++)if(*p=='\\'){*p=0;if(!CreateDirectoryW(path,NULL)&&GetLastError()!=ERROR_ALREADY_EXISTS)ok=0;*p='\\';}
        if(ok&&!cancelled(j)&&write_text(name,content)){r=obj();set(r,"ok",bool_value(1));set(r,"path",str(text(j->options,"path")));}else r=error("File write failed or exceeded 512 KiB");
    } else if(!strcmp(op,"list_directory")) {
        wchar_t pattern[32768];swprintf(pattern,32768,L"%ls\\*",path);WIN32_FIND_DATAW d;HANDLE h=FindFirstFileW(pattern,&d);
        if(h==INVALID_HANDLE_VALUE)r=winerror("Cannot list directory");else {ArrayObj *a=array_new();int limit=0;do {if(!wcscmp(d.cFileName,L".")||!wcscmp(d.cFileName,L".."))continue;if(a->count>=2000){limit=1;break;}Value e=obj();char *s=utf8(d.cFileName);set(e,"name",string_value(s));set(e,"type",str(d.dwFileAttributes&FILE_ATTRIBUTE_DIRECTORY?"directory":"file"));array_push(a,e);}while(FindNextFileW(h,&d));FindClose(h);r=obj();set(r,"result",array_value(a));set(r,"truncated",bool_value(limit));}
    } else r=error("Unknown filesystem operation");
    free(path);free(name);return r;
}
static Value github_import(Job *j) {
    Value p=shell(j,"gh auth token",0);if(num(p,"exitCode",1)||is_truthy(field(p,"error"))){json_free(p);return error("GitHub CLI token import failed; configure gh first");}
    char *token=strdup(text(p,"stdout"));size_t n=strlen(token);while(n&&(token[n-1]=='\r'||token[n-1]=='\n'))token[--n]=0;
    CREDENTIALA c={0};c.Type=CRED_TYPE_GENERIC;c.TargetName="Cryptic/Xenos/GitHub";c.CredentialBlob=(BYTE*)token;c.CredentialBlobSize=(DWORD)n;c.Persist=CRED_PERSIST_LOCAL_MACHINE;c.UserName="Xenos";
    int ok=n>0&&n<=8192&&!cancelled(j)&&CredWriteA(&c,0);SecureZeroMemory(token,n);free(token);SecureZeroMemory((void*)text(p,"stdout"),strlen(text(p,"stdout")));json_free(p);
    Value r=ok?obj():error("Cannot store GitHub credential");if(ok){set(r,"configured",bool_value(1));set(r,"note",str("Imported existing CLI credential. Import does not add scopes; verify required scopes before use."));}return r;
}
static DWORD WINAPI worker(void *data) {
    Job *j=data;Value r;
    if(!strcmp(j->kind,"http"))r=http(j,j->options);
    else if(!strcmp(j->kind,"process"))r=shell(j,text(j->options,"command"),is_truthy(field(j->options,"actingAsXenos")));
    else if(!strcmp(j->kind,"filesystem"))r=filesystem(j);
    else if(!strcmp(j->kind,"github_import"))r=github_import(j);
    else r=error("Unknown native job kind");
    if(cancelled(j)){json_free(r);r=error("Stopped by user");}
    j->result=r;InterlockedExchange(&j->done,1);return 0;
}
Value native_start(const char *kind,Value options) {
    static int registered=0;if(!registered){atexit(native_shutdown);registered=1;}
    int slot=-1;for(int i=0;i<8;i++)if(!jobs[i]){slot=i;break;}if(slot<0)return number_value(0);
    char *encoded=json_encode(options);if(!encoded)return number_value(0);Value copy;char e[128];int ok=json_decode(encoded,&copy,e,sizeof(e));free(encoded);if(!ok)return number_value(0);
    Job *j=calloc(1,sizeof(Job));j->id=next_id++;j->kind=strdup(kind);j->options=copy;
    wchar_t cwd[32768];GetCurrentDirectoryW(32768,cwd);j->root=utf8(cwd);jobs[slot]=j;
    j->thread=CreateThread(NULL,0,worker,j,0,NULL);if(!j->thread){j->result=winerror("Cannot start background work");j->done=1;}
    return number_value(j->id);
}
Value native_poll(int id) {
    for(int i=0;i<8;i++)if(jobs[i]&&jobs[i]->id==id) {
        Job *j=jobs[i];Value r=obj();int done=InterlockedCompareExchange(&j->done,0,0)!=0;set(r,"done",bool_value(done));
        if(done){if(j->thread){WaitForSingleObject(j->thread,INFINITE);CloseHandle(j->thread);}set(r,"result",j->result);json_free(j->options);free(j->kind);free(j->root);free(j);jobs[i]=NULL;}return r;
    }
    Value r=obj();set(r,"done",bool_value(1));set(r,"result",error("Unknown or consumed job"));return r;
}
void native_cancel(int id){for(int i=0;i<8;i++)if(jobs[i]&&jobs[i]->id==id)InterlockedExchange(&jobs[i]->cancel,1);}
void native_shutdown(void){for(int i=0;i<8;i++)if(jobs[i])native_cancel(jobs[i]->id);for(int i=0;i<8;i++)if(jobs[i]&&jobs[i]->thread)WaitForSingleObject(jobs[i]->thread,3000);}

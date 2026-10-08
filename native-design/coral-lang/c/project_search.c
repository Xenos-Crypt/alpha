#include <windows.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <time.h>
#include "project_search.h"
typedef struct { SearchResult result; char query[65]; size_t bytes; clock_t start; } SearchContext;
static int wordchar(unsigned char c){return isalnum(c)||c=='_';}
static int minimum(int a,int b){return a<b?a:b;}
static int distance(const char *a,const char *b) {
    int n=(int)strlen(a),m=(int)strlen(b),d[65][65];
    if(abs(n-m)>2)return 3;
    for(int i=0;i<=n;i++)d[i][0]=i;
    for(int j=0;j<=m;j++)d[0][j]=j;
    for(int i=1;i<=n;i++)for(int j=1;j<=m;j++) {
        d[i][j]=minimum(minimum(d[i-1][j]+1,d[i][j-1]+1),d[i-1][j-1]+(a[i-1]!=b[j-1]));
        if(i>1&&j>1&&a[i-1]==b[j-2]&&a[i-2]==b[j-1])d[i][j]=minimum(d[i][j],d[i-2][j-2]+1);
    }
    return d[n][m];
}
static int exhausted(SearchContext *ctx) {
    if(ctx->result.files>=2000 || ctx->bytes>=8*1024*1024 || (double)(clock()-ctx->start)/CLOCKS_PER_SEC>.25) {
        ctx->result.limited=1;return 1;
    }
    return 0;
}
static int hit_compare(const void *a,const void *b) {
    const SearchHit *x=a,*y=b;
    if(x->score!=y->score)return x->score-y->score;
    int path=_stricmp(x->path,y->path);return path?path:x->line-y->line;
}
static void add_hit(SearchContext *ctx,const char *path,const char *text,const char *term,int line,int score) {
    SearchHit *hits=score?ctx->result.suggested:ctx->result.exact;
    int *count=score?&ctx->result.suggested_count:&ctx->result.exact_count;
    SearchHit candidate={(char*)path,(char*)text,(char*)term,line,score};
    int slot=*count;
    if(slot>=100) {
        ctx->result.limited=1;slot=0;
        for(int i=1;i<100;i++)if(hit_compare(&hits[i],&hits[slot])>0)slot=i;
        if(hit_compare(&candidate,&hits[slot])>=0)return;
        free(hits[slot].path);free(hits[slot].text);free(hits[slot].term);
    } else (*count)++;
    hits[slot]=(SearchHit){strdup(path),strdup(text),strdup(term),line,score};
}
static void search_line(SearchContext *ctx,const char *path,const char *line,int number) {
    char lower[4097],snippet[161];size_t n=strlen(line);if(n>4096)n=4096;
    for(size_t i=0;i<n;i++)lower[i]=(char)tolower((unsigned char)line[i]);
    lower[n]=0;
    const char *match=strstr(lower,ctx->query);
    int offset=match?(int)(match-lower):0;
    int start=offset>35?offset-35:0;
    snprintf(snippet,sizeof(snippet),"%.160s",line+start);
    for(int i=0;snippet[i];i++)if((unsigned char)snippet[i]<32)snippet[i]=' ';
    if(match){add_hit(ctx,path,snippet,ctx->query,number,0);return;}
    size_t qlen=strlen(ctx->query);if(qlen<3)return;
    char best[65]="";int best_score=3;
    for(size_t i=0;i<n;) {
        if(exhausted(ctx))return;
        while(i<n&&!wordchar((unsigned char)lower[i]))i++;
        size_t from=i;while(i<n&&wordchar((unsigned char)lower[i]))i++;
        size_t len=i-from;if(!len||len>64||abs((int)len-(int)qlen)>2)continue;
        char word[65];memcpy(word,lower+from,len);word[len]=0;
        int score=distance(ctx->query,word);
        if(score>0&&score<best_score&&score<=(qlen<5?1:2)){best_score=score;strcpy(best,word);offset=(int)from;}
    }
    if(best_score<3) {
        start=offset>35?offset-35:0;snprintf(snippet,sizeof(snippet),"%.160s",line+start);
        for(int i=0;snippet[i];i++)if((unsigned char)snippet[i]<32)snippet[i]=' ';
        add_hit(ctx,path,snippet,best,number,best_score);
    }
}
static int text_file(const char *name) {
    const char *dot=strrchr(name,'.');if(!dot)return !strcmp(name,"Dockerfile")||!strcmp(name,"Makefile");
    const char *extensions[]={".co",".cr",".c",".h",".cpp",".cs",".js",".jsx",".ts",".tsx",".html",".css",".md",".txt",".json",".yaml",".yml",".toml",".py",".rs",".go",".java",".kt",".sh",".ps1",".xml",".sql"};
    for(size_t i=0;i<sizeof(extensions)/sizeof(*extensions);i++)if(!_stricmp(dot,extensions[i]))return 1;
    return 0;
}
static int excluded(const char *name) {
    return name[0]=='.'||!_stricmp(name,"node_modules")||!_stricmp(name,"target")||!_stricmp(name,"dist")||!_stricmp(name,"build")||!_stricmp(name,"__pycache__")||!_stricmp(name,"vendor");
}
static void walk(SearchContext *ctx,const char *root,int depth) {
    if(depth>12){ctx->result.limited=1;return;}
    char glob[4096];if(snprintf(glob,sizeof(glob),"%s/*",root)>=(int)sizeof(glob)){ctx->result.limited=1;return;}
    WIN32_FIND_DATAA data;HANDLE handle=FindFirstFileA(glob,&data);if(handle==INVALID_HANDLE_VALUE)return;
    do {
        if(exhausted(ctx))break;
        if(data.dwFileAttributes&FILE_ATTRIBUTE_REPARSE_POINT)continue;
        char path[4096];if(snprintf(path,sizeof(path),"%s/%s",root,data.cFileName)>=(int)sizeof(path)){ctx->result.limited=1;continue;}
        if(data.dwFileAttributes&FILE_ATTRIBUTE_DIRECTORY){if(!excluded(data.cFileName))walk(ctx,path,depth+1);continue;}
        if(!text_file(data.cFileName))continue;
        if(data.nFileSizeHigh||data.nFileSizeLow>512*1024){ctx->result.limited=1;continue;}
        FILE *file=fopen(path,"rb");if(!file)continue;
        size_t size=data.nFileSizeLow;char *content=calloc(size+1,1);if(!content){fclose(file);break;}
        size=fread(content,1,size,file);fclose(file);ctx->bytes+=size;ctx->result.files++;
        if(memchr(content,0,size)){free(content);continue;}
        search_line(ctx,path,data.cFileName,0);
        int line=1;char *cursor=content;
        while(*cursor&&!exhausted(ctx)) {
            char *end=strchr(cursor,'\n');if(end)*end=0;
            search_line(ctx,path,cursor,line++);
            if(!end)break;
            cursor=end+1;
        }
        free(content);
    }while(FindNextFileA(handle,&data));
    FindClose(handle);
}
SearchResult project_search(const char *root,const char *query) {
    SearchContext ctx={0};ctx.start=clock();
    while(isspace((unsigned char)*query))query++;
    size_t n=strlen(query);while(n&&isspace((unsigned char)query[n-1]))n--;
    if(n>64){ctx.result.limited=1;n=64;}
    for(size_t i=0;i<n;i++)ctx.query[i]=(char)tolower((unsigned char)query[i]);
    if(n)walk(&ctx,root,0);
    qsort(ctx.result.exact,ctx.result.exact_count,sizeof(SearchHit),hit_compare);
    qsort(ctx.result.suggested,ctx.result.suggested_count,sizeof(SearchHit),hit_compare);
    return ctx.result;
}
void free_search_result(SearchResult *result) {
    for(int group=0;group<2;group++) {
        SearchHit *hits=group?result->suggested:result->exact;int n=group?result->suggested_count:result->exact_count;
        for(int i=0;i<n;i++){free(hits[i].path);free(hits[i].text);free(hits[i].term);}
    }
}

#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <assert.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include "json_value.h"
#include "native_jobs.h"
static Value decode(const char *s){Value v;char e[256];assert(json_decode(s,&v,e,sizeof(e)));return v;}
static Value field(Value v,const char *key){assert(v.type==VAL_OBJECT);Value *p=object_get(v.as.object,key);assert(p);return *p;}
static Value wait_job(int id){for(int n=0;n<1000;n++){Value r=native_poll(id);if(is_truthy(field(r,"done"))){Value result=field(r,"result");return result;}json_free(r);Sleep(10);}assert(!"job timeout");return nil_value();}
static Value run(const char *kind,const char *s){Value options=decode(s);Value id=native_start(kind,options);json_free(options);assert(id.as.number>0);return wait_job((int)id.as.number);}
int main(int argc,char **argv) {
    assert(argc==2);Value v=decode("{\"text\":\"line\\n\\uD83D\\uDE00\",\"values\":[null,true,false,-2.5e3]}");
    char *encoded=json_encode(v);Value again=decode(encoded);assert(!strcmp(field(v,"text").as.string,field(again,"text").as.string));free(encoded);json_free(v);json_free(again);
    const char *bad[]={"[1,]","01","1e","{\"a\":}","\"\\u0000\"","\"\\uD800\"","{} garbage","[true false]"};
    for(size_t i=0;i<sizeof(bad)/sizeof(*bad);i++){char e[128];assert(!json_decode(bad[i],&v,e,sizeof(e)));}
    v=run("filesystem","{\"op\":\"write_file\",\"path\":\"nested space/test.txt\",\"content\":\"first\\nsecond\"}");assert(is_truthy(field(v,"ok")));json_free(v);
    v=run("filesystem","{\"op\":\"read_file\",\"path\":\"nested space/test.txt\"}");assert(!strcmp(field(v,"result").as.string,"first\nsecond"));json_free(v);
    v=run("filesystem","{\"op\":\"list_directory\",\"path\":\".\"}");assert(field(v,"result").as.array->count>0);json_free(v);
    v=run("filesystem","{\"op\":\"read_file\",\"path\":\"../escape.txt\"}");assert(field(v,"error").type==VAL_STRING);json_free(v);
    v=run("process","{\"command\":\"echo native-output & echo native-error 1>&2 & exit /b 7\"}");assert(field(v,"exitCode").as.number==7);assert(strstr(field(v,"stdout").as.string,"native-output"));assert(strstr(field(v,"stderr").as.string,"native-error"));json_free(v);
    v=decode("{\"command\":\"ping -n 30 127.0.0.1\"}");int id=(int)native_start("process",v).as.number;json_free(v);Sleep(80);native_cancel(id);v=wait_job(id);assert(strstr(field(v,"error").as.string,"Stopped"));json_free(v);
    v=run("process","{\"command\":\"ping -n 30 127.0.0.1\",\"timeoutMs\":100}");assert(strstr(field(v,"error").as.string,"timed out"));json_free(v);
    Value request=decode("{\"method\":\"POST\",\"headers\":{\"X-Test\":\"native\"},\"body\":\"quotes \\\" and newlines\\n stay data\"}");object_set(request.as.object,"url",string_value(strdup(argv[1])));
    id=(int)native_start("http",request).as.number;json_free(request);v=wait_job(id);if(object_get(v.as.object,"error"))puts(field(v,"error").as.string);
    assert(field(v,"statusCode").as.number==200);Value echo=decode(field(v,"body").as.string);assert(!strcmp(field(echo,"header").as.string,"native"));assert(strstr(field(echo,"body").as.string,"newlines\n"));json_free(echo);json_free(v);
    v=run("http","{\"url\":\"file:///C:/Windows/win.ini\"}");assert(field(v,"error").type==VAL_STRING);json_free(v);
    native_shutdown();puts("PASS JSON round trips/rejection, workspace files/containment, stdout/stderr/exit codes, cancellation/timeout and real loopback HTTP");
}

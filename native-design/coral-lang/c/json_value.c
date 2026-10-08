#include "json_value.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <ctype.h>
#include <math.h>
#define JSON_LIMIT (4*1024*1024)
typedef struct { char *s;size_t n,cap;int bad; } Buffer;
static void add(Buffer *b,const char *s,size_t n) {
    if(b->bad)return;
    if(b->n+n>JSON_LIMIT){b->bad=1;return;}
    if(b->n+n+1>b->cap){b->cap=(b->n+n+1)*2;b->s=realloc(b->s,b->cap);if(!b->s){b->bad=1;return;}}
    memcpy(b->s+b->n,s,n);b->n+=n;b->s[b->n]=0;
}
static void quote(Buffer *b,const char *s) {
    add(b,"\"",1);
    for(;*s;s++) {
        unsigned char c=(unsigned char)*s;char escape[7];
        if(c=='"'||c=='\\'){escape[0]='\\';escape[1]=(char)c;add(b,escape,2);}
        else if(c<32){snprintf(escape,sizeof(escape),"\\u%04x",c);add(b,escape,6);}
        else add(b,s,1);
    }
    add(b,"\"",1);
}
static void encode(Buffer *b,Value v,int depth) {
    if(depth>64){b->bad=1;return;}
    switch(v.type) {
        case VAL_NIL:add(b,"null",4);break;
        case VAL_BOOL:add(b,v.as.boolean?"true":"false",v.as.boolean?4:5);break;
        case VAL_NUMBER:{char n[64];if(!isfinite(v.as.number)){b->bad=1;break;}snprintf(n,sizeof(n),"%.17g",v.as.number);add(b,n,strlen(n));break;}
        case VAL_STRING:quote(b,v.as.string);break;
        case VAL_ARRAY:
            add(b,"[",1);for(int i=0;i<v.as.array->count;i++){if(i)add(b,",",1);encode(b,v.as.array->items[i],depth+1);}add(b,"]",1);break;
        case VAL_OBJECT:
            add(b,"{",1);for(int i=0;i<v.as.object->count;i++){if(i)add(b,",",1);quote(b,v.as.object->keys[i]);add(b,":",1);encode(b,v.as.object->values[i],depth+1);}add(b,"}",1);break;
        default:b->bad=1;
    }
}
char *json_encode(Value v){Buffer b={0};encode(&b,v,0);if(b.bad){free(b.s);return NULL;}return b.s?b.s:strdup("");}
void json_free(Value v) {
    if(v.type==VAL_STRING)free(v.as.string);
    if(v.type==VAL_ARRAY){for(int i=0;i<v.as.array->count;i++)json_free(v.as.array->items[i]);free(v.as.array->items);free(v.as.array);}
    if(v.type==VAL_OBJECT){for(int i=0;i<v.as.object->count;i++){free(v.as.object->keys[i]);json_free(v.as.object->values[i]);}free(v.as.object->keys);free(v.as.object->values);free(v.as.object);}
}
typedef struct {const char *p,*start;const char *error;} Reader;
static void space(Reader *r){while(*r->p==' '||*r->p=='\r'||*r->p=='\n'||*r->p=='\t')r->p++;}
static unsigned hex4(Reader *r) {
    unsigned n=0;for(int i=0;i<4;i++) {
        unsigned char c=(unsigned char)*r->p;if(!isxdigit(c)){r->error="Invalid Unicode escape";return 0;}
        r->p++;n=n*16+(c<='9'?c-'0':tolower(c)-'a'+10);
    }return n;
}
static char *string(Reader *r) {
    Buffer b={0};r->p++;
    while(*r->p&&*r->p!='"'&&!r->error) {
        unsigned char c=(unsigned char)*r->p++;
        if(c<32){r->error="Control character in string";break;}
        if(c!='\\'){add(&b,(char*)&c,1);continue;}
        c=(unsigned char)*r->p;if(!c){r->error="Incomplete escape";break;}r->p++;
        if(c=='u') {
            unsigned n=hex4(r);if(r->error)break;
            if(n>=0xd800&&n<=0xdbff){if(r->p[0]!='\\'||r->p[1]!='u'){r->error="Missing low surrogate";break;}r->p+=2;unsigned low=hex4(r);if(low<0xdc00||low>0xdfff){r->error="Invalid low surrogate";break;}n=0x10000+((n-0xd800)<<10)+(low-0xdc00);}
            else if(n>=0xdc00&&n<=0xdfff){r->error="Unpaired surrogate";break;}
            if(!n){r->error="Coral strings cannot contain NUL";break;}
            char utf[4];int len;
            if(n<128){utf[0]=(char)n;len=1;}else if(n<2048){utf[0]=(char)(0xc0|(n>>6));utf[1]=(char)(0x80|(n&63));len=2;}
            else if(n<65536){utf[0]=(char)(0xe0|(n>>12));utf[1]=(char)(0x80|((n>>6)&63));utf[2]=(char)(0x80|(n&63));len=3;}
            else {utf[0]=(char)(0xf0|(n>>18));utf[1]=(char)(0x80|((n>>12)&63));utf[2]=(char)(0x80|((n>>6)&63));utf[3]=(char)(0x80|(n&63));len=4;}
            add(&b,utf,len);
        } else {
            switch(c){case 'b':c='\b';break;case 'f':c='\f';break;case 'n':c='\n';break;case 'r':c='\r';break;case 't':c='\t';break;case '"':case '\\':case '/':break;default:r->error="Invalid escape";}
            add(&b,(char*)&c,1);
        }
    }
    if(!r->error&&*r->p!='"')r->error="Unterminated string";
    if(r->error||b.bad){free(b.s);return NULL;}r->p++;return b.s?b.s:strdup("");
}
static Value parse(Reader *r,int depth) {
    space(r);if(depth>64){r->error="JSON nesting limit";return nil_value();}
    if(*r->p=='"'){char *s=string(r);return s?string_value(s):nil_value();}
    if(*r->p=='['||*r->p=='{') {
        int object=*r->p++=='{';Value v=object?object_value(object_new()):array_value(array_new());space(r);
        char end=object?'}':']';if(*r->p==end){r->p++;return v;}
        while(!r->error) {
            space(r);char *key=NULL;
            if(object){if(*r->p!='"'){r->error="Expected object key";break;}key=string(r);space(r);if(r->error||*r->p!=':'){free(key);r->error="Expected colon";break;}r->p++;}
            Value item=parse(r,depth+1);
            if(r->error){free(key);json_free(item);break;}
            if(object){Value *old=object_get(v.as.object,key);if(old)json_free(*old);object_set(v.as.object,key,item);free(key);}else array_push(v.as.array,item);
            space(r);if(*r->p==end){r->p++;return v;}if(*r->p!=','){r->error="Expected comma or closing bracket";break;}r->p++;
        }
        json_free(v);return nil_value();
    }
    if(!strncmp(r->p,"true",4)){r->p+=4;return bool_value(1);}
    if(!strncmp(r->p,"false",5)){r->p+=5;return bool_value(0);}
    if(!strncmp(r->p,"null",4)){r->p+=4;return nil_value();}
    const char *start=r->p;if(*r->p=='-')r->p++;
    if(*r->p=='0')r->p++;else if(*r->p>='1'&&*r->p<='9'){while(isdigit((unsigned char)*r->p))r->p++;}else {r->error="Expected JSON value";return nil_value();}
    if(*r->p=='.'){r->p++;if(!isdigit((unsigned char)*r->p))r->error="Expected decimal digit";while(isdigit((unsigned char)*r->p))r->p++;}
    if(*r->p=='e'||*r->p=='E'){r->p++;if(*r->p=='+'||*r->p=='-')r->p++;if(!isdigit((unsigned char)*r->p))r->error="Expected exponent digit";while(isdigit((unsigned char)*r->p))r->p++;}
    double n=strtod(start,NULL);if(!isfinite(n))r->error="Number outside finite range";return number_value(n);
}
int json_decode(const char *text,Value *out,char *error,size_t size) {
    *out=nil_value();if(strlen(text)>JSON_LIMIT){snprintf(error,size,"JSON size limit");return 0;}
    Reader r={text,text,NULL};Value v=parse(&r,0);space(&r);if(!r.error&&*r.p)r.error="Trailing data";
    if(r.error){json_free(v);snprintf(error,size,"%s at byte %ld",r.error,(long)(r.p-text));return 0;}
    *out=v;if(size)error[0]=0;return 1;
}

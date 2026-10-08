/* UTF-8, wrapped read-only prose, including long paths/JSON without spaces. */
#include <wchar.h>
static wchar_t *wrap_prose(HDC dc,const char *source,int width) {
    UINT cp=CP_UTF8;int count=MultiByteToWideChar(cp,MB_ERR_INVALID_CHARS,source,-1,NULL,0);
    if(!count){cp=CP_ACP;count=MultiByteToWideChar(cp,0,source,-1,NULL,0);}
    wchar_t *input=calloc(count+1,sizeof(wchar_t)),*output=calloc(count*2+2,sizeof(wchar_t));
    MultiByteToWideChar(cp,0,source,-1,input,count);const wchar_t *p=input;size_t used=0;
    while(*p) {
        const wchar_t *end=wcschr(p,L'\n');int length=end?(int)(end-p):(int)wcslen(p);
        if(!length){output[used++]=L'\n';p++;continue;}
        int fit=0;SIZE extent;GetTextExtentExPointW(dc,p,length,width>0?width:1,&fit,NULL,&extent);
        if(fit<1)fit=1;
        if(fit<length&&p[fit-1]>=0xD800&&p[fit-1]<=0xDBFF&&p[fit]>=0xDC00&&p[fit]<=0xDFFF)fit++;
        if(fit<length){int split=fit;while(split>0&&p[split]!=L' ')split--;if(split>0)fit=split;}
        memcpy(output+used,p,fit*sizeof(wchar_t));used+=fit;p+=fit;
        if(*p==L'\n')p++;
        else if(fit<length&&*p==L' ')p++;
        output[used++]=L'\n';
    }
    output[used]=0;free(input);return output;
}

#include "project_search.h"
#include <assert.h>
#include <string.h>
#include <stdio.h>
int main(int argc,char **argv) {
    assert(argc==2);
    SearchResult r=project_search(argv[1],"magus");
    assert(r.exact_count==1 && r.exact[0].line==1);
    assert(strstr(r.exact[0].path,"alpha.txt"));
    int magnus=0;
    for(int i=0;i<r.suggested_count;i++)if(!strcmp(r.suggested[i].term,"magnus")){assert(r.suggested[i].score==1);magnus++;}
    assert(magnus==1);
    for(int i=1;i<r.suggested_count;i++)assert(r.suggested[i-1].score<=r.suggested[i].score);
    free_search_result(&r);
    r=project_search(argv[1],"  MAGNUS  ");assert(r.exact_count==1&&r.exact[0].line==2);free_search_result(&r);
    r=project_search(argv[1],"mangus");magnus=0;
    for(int i=0;i<r.suggested_count;i++)if(!strcmp(r.suggested[i].term,"magnus")){assert(r.suggested[i].score==1);magnus++;}
    assert(magnus);free_search_result(&r);
    r=project_search(argv[1],"ma");assert(r.suggested_count==0);free_search_result(&r);
    r=project_search(argv[1],"");assert(r.exact_count==0&&r.suggested_count==0&&r.files==0);free_search_result(&r);
    r=project_search(argv[1],"zzqqxxmissing");assert(r.exact_count==0&&r.suggested_count==0);free_search_result(&r);
    puts("PASS: literal priority, typo suggestions, transposition, case folding, line numbers, empty/no-match queries and binary/excluded folders");
    return 0;
}

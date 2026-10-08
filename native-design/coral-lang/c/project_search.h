#ifndef PROJECT_SEARCH_H
#define PROJECT_SEARCH_H
typedef struct { char *path,*text,*term; int line,score; } SearchHit;
typedef struct { SearchHit exact[100],suggested[100]; int exact_count,suggested_count,files,limited; } SearchResult;
SearchResult project_search(const char *root,const char *query);
void free_search_result(SearchResult *result);
#endif

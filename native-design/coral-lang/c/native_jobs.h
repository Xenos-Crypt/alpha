#ifndef CORAL_NATIVE_JOBS_H
#define CORAL_NATIVE_JOBS_H
#include "value.h"
Value native_start(const char *kind,Value options);
Value native_poll(int id);
void native_cancel(int id);
void native_shutdown(void);
int native_same_path(const char *a,const char *b);
#endif

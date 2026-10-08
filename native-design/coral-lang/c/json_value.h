#ifndef CORAL_JSON_VALUE_H
#define CORAL_JSON_VALUE_H
#include "value.h"
#include <stddef.h>
int json_decode(const char *text,Value *value,char *error,size_t size);
char *json_encode(Value value);
void json_free(Value value); /* Only independently owned JSON trees. */
#endif

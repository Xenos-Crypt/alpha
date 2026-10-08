#include <stdio.h>

#include "backend.h"

int main(int argc, char **argv) {
    if (argc != 2) {
        fprintf(stderr, "usage: creal <file.cr>\n");
        return 1;
    }

    const UIBackend *backend = win32_backend();
    backend->load(argv[1]);
    backend->run();
    return 0;
}

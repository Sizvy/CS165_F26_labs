/* Ungraded Lab 2 preparation target: inspect this program with GDB. */
#include <stdio.h>
#include <string.h>

static void inspect(const char *input) {
    char message[32];
    snprintf(message, sizeof(message), "%s", input);
    printf("message: %s\n", message);
}

int main(int argc, char **argv) {
    const char *input = argc > 1 ? argv[1] : "hello";
    inspect(input);
    return 0;
}

/* CS 165 - Ungraded prep lab: PRACTICE program (students drive).
 * TWO planted bugs, one per subcommand, so each can be triggered on its own:
 *
 *   make
 *   ./practice greet <name>   # long name -> STACK buffer overflow
 *   ./practice note           # -> USE-AFTER-FREE
 *
 * Goal: trigger each under ASan, read the report, then fix each with a
 * minimal change. (These are different from the five graded bugs.)
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static void greet(const char *name) {
    char buf[16];                 /* fixed-size stack buffer */
    strcpy(buf, name);            /* BUG A: no bound -> stack overflow for long name */
    printf("Hello, %s!\n", buf);
}

static void note_demo(void) {
    char *note = malloc(32);
    strcpy(note, "remember to free me");
    free(note);                   /* freed here ... */
    printf("note = %s\n", note);  /* BUG B: ... but read after free -> use-after-free */
}

int main(int argc, char **argv) {
    if (argc < 2) {
        fprintf(stderr, "usage: %s greet <name> | note\n", argv[0]);
        return 2;
    }
    if (strcmp(argv[1], "greet") == 0 && argc >= 3) greet(argv[2]);
    else if (strcmp(argv[1], "note") == 0)          note_demo();
    else fprintf(stderr, "unknown subcommand\n");
    return 0;
}

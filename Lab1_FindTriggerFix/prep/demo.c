/* CS 165 - Ungraded prep lab: DEMO program (instructor-led).
 * ONE obvious heap buffer overflow, for the live walkthrough.
 *
 *   make            # build with AddressSanitizer
 *   ./demo hi       # benign  -> prints, no crash
 *   ./demo AAAAAAAAAAAAAAAAAAAA   # overflow -> ASan heap-buffer-overflow
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(int argc, char **argv) {
    if (argc < 2) { fprintf(stderr, "usage: %s <name>\n", argv[0]); return 2; }

    /* room for 7 characters + the terminating '\0' */
    char *greeting = malloc(8);
    strcpy(greeting, "Hi ");          /* fine: 3 chars + '\0' */
    strcat(greeting, argv[1]);        /* BUG: no check that argv[1] fits in 8 bytes */

    printf("%s\n", greeting);
    free(greeting);
    return 0;
}

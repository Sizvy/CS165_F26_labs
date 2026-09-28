/* CS 165 Lab 2: Controlled Buffer Overflow
 * Build 4a44dc15.  This program is intentionally vulnerable for this lab.
 */
#include <stdio.h>
#include <string.h>

#define NOTE_SIZE 56
#define PAD_WORDS 1
#define MAX_REQUEST 512

static void win(void) __attribute__((noinline, used));

static void win(void) {
    puts("LAB2-WIN:vault-4a44dc15");
    fflush(stdout);
}

static void check_request(const unsigned char *input, size_t len) {
    volatile unsigned long padding[PAD_WORDS];
    char note[NOTE_SIZE];

    memset((void *)padding, 0, sizeof(padding));
    if (len < 4) { puts("(malformed request)"); return; }

    memcpy(note, input, len);

    if (memcmp(note, "OPEN", 4) == 0) puts("request accepted");
    else puts("request rejected");
}

int main(void) {
    unsigned char input[MAX_REQUEST];
    size_t len = fread(input, 1, sizeof(input), stdin);
    printf("vault build 4a44dc15\n");
    check_request(input, len);
    return 0;
}

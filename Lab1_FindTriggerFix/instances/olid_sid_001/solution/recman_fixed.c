/* CS 165 - Lab 1: Find, Trigger & Fix
 * Record Manager (recman) -- reads a command script and manages records.
 * Instance build id: 333d4e72
 *
 * Reads commands (one per line) from argv[1], writes results to stdout.
 * Commands:
 *   add  <id>            create empty record with integer id
 *   name <id> <text>     set the record's name field
 *   str  <id> <text>     set the record's heap string
 *   app  <id> <text>     append text to the record's heap string
 *   grow <id> <n>        reserve an n-entry integer array on the record
 *   link <src> <dst>     make dst refer to src (so showing dst also shows src)
 *   del  <id>            delete the record
 *   show <id>            print the record
 *
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define NAMELEN  28
#define MAXREC   48
#define LINELEN  256

typedef struct rec {
    int  id;
    int  used;
    char name[NAMELEN];
    char *str;
    size_t slen;
    int  *arr;
    int  acount;
    struct rec *link;
} rec;

static rec *table[MAXREC];

static rec *lookup(int id) {
    if (id < 0 || id >= MAXREC) return NULL;
    return table[id];
}

// ------------------------------------------------------------

static void cmd_add(int id) {
    if (id < 0 || id >= MAXREC) { printf("(bad id)\n"); return; }
    if (table[id]) { printf("(exists)\n"); return; }
    rec *r = calloc(1, sizeof(rec));
    r->id = id;
    r->used = 1;
    table[id] = r;
    printf("added %d\n", id);
}

static void cmd_name(rec *r, const char *arg) {
    char tmp[NAMELEN];
    strncpy(tmp, arg, sizeof(tmp) - 1);
    tmp[sizeof(tmp) - 1] = '\0';
    memcpy(r->name, tmp, NAMELEN);
    r->name[NAMELEN - 1] = '\0';
    printf("name set\n");
}

static void cmd_str(rec *r, const char *arg) {
    free(r->str);
    r->slen = strlen(arg);
    r->str = malloc(r->slen + 1);
    memcpy(r->str, arg, r->slen + 1);
    printf("str set (%zu)\n", r->slen);
}

static void cmd_app(rec *r, const char *arg) {
    if (!r->str) { printf("(no str)\n"); return; }
    size_t add = strlen(arg);
    r->str = realloc(r->str, r->slen + add + 1);
    memcpy(r->str + r->slen, arg, add + 1);
    r->slen += strlen(arg);
    printf("appended\n");
}

static void cmd_grow(rec *r, int n) {
    if (n < 0 || (size_t)n > (size_t)16 * 1024 * 1024) { printf("(too big)\n"); return; }
    size_t bytes = (size_t)n * sizeof(int);
    int *p = malloc(bytes);
    for (int i = 0; i < n; i++) p[i] = i;
    free(r->arr);
    r->arr = p;
    r->acount = n;
    printf("grew to %d\n", n);
}

static void cmd_link(int src, int dst) {
    rec *a = lookup(src), *b = lookup(dst);
    if (!a || !b) { printf("(bad link)\n"); return; }
    b->link = a;
    printf("linked %d -> %d\n", dst, src);
}

static void cmd_del(int id) {
    rec *r = lookup(id);
    if (!r) { printf("(none)\n"); return; }
    free(r->str);
    free(r->arr);
    for (int i = 0; i < MAXREC; i++)
        if (table[i] && table[i]->link == r) table[i]->link = NULL;
    free(r);
    table[id] = NULL;
    printf("deleted %d\n", id);
}

static void cmd_show(rec *r) {
    if (!r) { printf("(none)\n"); return; }
    printf("id=%d name=%s\n", r->id, r->name);
    if (r->str) printf("  str=%s\n", r->str);
    if (r->acount) printf("  arr[%d]\n", r->acount);
    if (r->link) printf("  link->name=%s\n", r->link->name);
}

int main(int argc, char **argv) {
    if (argc < 2) { fprintf(stderr, "usage: %s <script>\n", argv[0]); return 2; }
    FILE *f = fopen(argv[1], "r");
    if (!f) { perror("fopen"); return 2; }
    printf("recman build 333d4e72\n");

    char line[LINELEN];
    while (fgets(line, sizeof(line), f)) {
        char cmd[16];
        int  a = -1, b = -1, off = 0;
        line[strcspn(line, "\n")] = '\0';
        if (line[0] == '#' || line[0] == '\0') continue;
        if (sscanf(line, "%15s %d %n", cmd, &a, &off) < 2) continue;
        const char *arg = line + off;

        if      (strcmp(cmd, "add")  == 0) cmd_add(a);
        else if (strcmp(cmd, "name") == 0) cmd_name(lookup(a), arg);
        else if (strcmp(cmd, "str")  == 0) cmd_str(lookup(a), arg);
        else if (strcmp(cmd, "app")  == 0) cmd_app(lookup(a), arg);
        else if (strcmp(cmd, "grow") == 0) cmd_grow(lookup(a), atoi(arg));
        else if (strcmp(cmd, "link") == 0) { sscanf(arg, "%d", &b); cmd_link(a, b); }
        else if (strcmp(cmd, "del")  == 0) cmd_del(a);
        else if (strcmp(cmd, "show") == 0) cmd_show(lookup(a));
        else printf("(unknown cmd)\n");
    }
    fclose(f);
    return 0;
}

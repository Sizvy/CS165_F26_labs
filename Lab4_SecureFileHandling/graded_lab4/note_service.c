/*
 * CS 165 Graded Lab 4: course note service (vulnerable starter).
 *
 * The service runs with permission to write the course gradebook. Students
 * can create and rename entries in the shared work/inbox and work/public
 * directories, and they can ask the service to perform two operations:
 *
 *   update NAME MESSAGE
 *       Replace the contents of an existing note, work/inbox/NAME.
 *
 *   publish NAME MESSAGE
 *       Create or replace a public note, work/public/NAME.
 *
 * Read the security requirements in the lab instructions. This file violates
 * several of them. Do not change the command-line interface or remove the
 * announce_and_pause() calls; the checkers use them.
 */
#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>

#define INBOX_DIR "work/inbox"
#define PUBLIC_DIR "work/public"
#define PATH_SIZE 512

static void usage(const char *program) {
    fprintf(stderr, "usage: %s [--pause] update NAME MESSAGE\n", program);
    fprintf(stderr, "       %s [--pause] publish NAME MESSAGE\n", program);
}

/* A NAME is one plain directory entry: no '/', and it may not start with '.'. */
static int valid_name(const char *name) {
    return name[0] != '\0' && name[0] != '.' && strchr(name, '/') == NULL &&
           strlen(name) <= 100;
}

/*
 * Laboratory hook. Prints "<EVENT> <NAME>" and, with --pause, waits for one
 * byte on standard input before continuing. Keep both calls in your repair:
 *   update:  CHECKED after the target is validated, before it is modified.
 *   publish: STAGED  after the new contents are complete, before they are
 *            made visible under the final name.
 */
static void announce_and_pause(const char *event, const char *name,
                               int should_pause) {
    printf("%s %s\n", event, name);
    fflush(stdout);

    if (should_pause) {
        char byte;
        while (read(STDIN_FILENO, &byte, 1) < 0 && errno == EINTR) {
        }
    }
}

static int write_all(int fd, const char *data, size_t length) {
    size_t offset = 0;
    while (offset < length) {
        ssize_t written = write(fd, data + offset, length - offset);
        if (written < 0) {
            if (errno == EINTR) continue;
            return -1;
        }
        if (written == 0) {
            errno = EIO;
            return -1;
        }
        offset += (size_t)written;
    }
    return 0;
}

static int write_message(int fd, const char *message) {
    if (write_all(fd, message, strlen(message)) < 0 ||
        write_all(fd, "\n", 1) < 0) {
        perror("write");
        return -1;
    }
    return 0;
}

/* ------------------------------------------------------------------ update */

static int update_note(const char *name, const char *message, int should_pause) {
    char path[PATH_SIZE];
    struct stat checked;

    snprintf(path, sizeof(path), "%s/%s", INBOX_DIR, name);

    if (lstat(path, &checked) < 0) {
        perror("lstat");
        return -1;
    }
    if (!S_ISREG(checked.st_mode)) {
        fprintf(stderr, "refusing non-regular note\n");
        return -1;
    }

    announce_and_pause("CHECKED", name, should_pause);

    /* O_NOFOLLOW was added after last term's symlink incident. */
    int fd = open(path, O_WRONLY | O_TRUNC | O_NOFOLLOW);
    if (fd < 0) {
        perror("open");
        return -1;
    }

    int result = write_message(fd, message);
    if (close(fd) < 0) {
        perror("close");
        result = -1;
    }
    return result;
}

/* ----------------------------------------------------------------- publish */

static int publish_note(const char *name, const char *message, int should_pause) {
    char staging[PATH_SIZE];
    char final[PATH_SIZE];

    /* Write the new version beside the final file, then move it into place. */
    snprintf(staging, sizeof(staging), "%s/.%s.tmp", PUBLIC_DIR, name);
    snprintf(final, sizeof(final), "%s/%s", PUBLIC_DIR, name);

    int fd = open(staging, O_WRONLY | O_CREAT | O_TRUNC, 0666);
    if (fd < 0) {
        perror("open staging file");
        return -1;
    }
    int result = write_message(fd, message);
    if (close(fd) < 0) {
        perror("close");
        result = -1;
    }
    if (result < 0) return -1;

    /* Remove the old version first so that rename() has a free destination. */
    if (unlink(final) < 0 && errno != ENOENT) {
        perror("unlink old version");
    }

    announce_and_pause("STAGED", name, should_pause);

    if (rename(staging, final) < 0) {
        perror("rename");
        return -1;
    }
    return 0;
}

/* -------------------------------------------------------------------- main */

int main(int argc, char **argv) {
    int should_pause = 0;
    int argument = 1;

    if (argc > 1 && strcmp(argv[1], "--pause") == 0) {
        should_pause = 1;
        argument++;
    }
    if (argc - argument != 3) {
        usage(argv[0]);
        return 2;
    }

    const char *operation = argv[argument];
    const char *name = argv[argument + 1];
    const char *message = argv[argument + 2];

    if (!valid_name(name)) {
        fprintf(stderr, "invalid note name\n");
        return 2;
    }

    int result;
    if (strcmp(operation, "update") == 0) {
        result = update_note(name, message, should_pause);
    } else if (strcmp(operation, "publish") == 0) {
        result = publish_note(name, message, should_pause);
    } else {
        usage(argv[0]);
        return 2;
    }
    return result == 0 ? EXIT_SUCCESS : EXIT_FAILURE;
}

/*
 * CS 165 Graded Lab 4: course note service (reference solution).
 *
 *   update NAME MESSAGE    replace the contents of work/inbox/NAME
 *   publish NAME MESSAGE   create or replace work/public/NAME
 *
 * update resolves NAME once, relative to a descriptor for the inbox, and
 * then validates and modifies only the opened descriptor.
 *
 * publish writes the new version to a fresh, unpredictably named staging
 * file created with O_EXCL (mkstemp), sets its mode on the descriptor, makes
 * it durable, and atomically renames it over the final name. It never opens
 * an existing file, and the final name always refers to a complete version.
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
    struct stat checked;
    int result = -1;
    int fd = -1;

    int dirfd = open(INBOX_DIR, O_RDONLY | O_DIRECTORY | O_CLOEXEC);
    if (dirfd < 0) {
        perror("open " INBOX_DIR);
        return -1;
    }

    /*
     * One lookup. No O_CREAT (U1), O_NOFOLLOW (U2), no O_TRUNC before the
     * checks (U5), O_NONBLOCK so a FIFO cannot block the service (U6).
     */
    fd = openat(dirfd, name, O_WRONLY | O_NOFOLLOW | O_NONBLOCK | O_CLOEXEC);
    if (fd < 0) {
        if (errno == ELOOP) {
            fprintf(stderr, "refusing symbolic link\n");
        } else {
            perror("openat");
        }
        goto out;
    }

    /* Validate the opened object, not the pathname (U4). */
    if (fstat(fd, &checked) < 0) {
        perror("fstat");
        goto out;
    }
    if (!S_ISREG(checked.st_mode)) {
        fprintf(stderr, "refusing non-regular note\n");
        goto out;
    }
    if (checked.st_nlink != 1) {
        fprintf(stderr, "refusing note with multiple hard links\n");  /* U3 */
        goto out;
    }

    announce_and_pause("CHECKED", name, should_pause);

    if (ftruncate(fd, 0) < 0) {
        perror("ftruncate");
        goto out;
    }
    if (write_message(fd, message) < 0) goto out;
    result = 0;

out:
    if (fd >= 0 && close(fd) < 0) {
        perror("close");
        result = -1;
    }
    if (close(dirfd) < 0) {
        perror("close");
        result = -1;
    }
    return result;
}

/* ----------------------------------------------------------------- publish */

static int publish_note(const char *name, const char *message, int should_pause) {
    char staging[PATH_SIZE];
    char final[PATH_SIZE];

    snprintf(final, sizeof(final), "%s/%s", PUBLIC_DIR, name);
    /*
     * mkstemp() replaces XXXXXX with random characters and creates the file
     * with O_CREAT | O_EXCL and mode 0600. It never opens an existing entry,
     * including a planted symlink or hard link (P1), and an attacker cannot
     * block it by guessing the name in advance (P2).
     */
    snprintf(staging, sizeof(staging), "%s/.%s.XXXXXX", PUBLIC_DIR, name);
    int fd = mkstemp(staging);
    if (fd < 0) {
        perror("mkstemp");
        return -1;
    }

    /* Set the mode on the descriptor, independent of the umask (P3). */
    if (fchmod(fd, 0644) < 0) {
        perror("fchmod");
        goto fail;
    }
    if (write_message(fd, message) < 0) goto fail;
    if (fsync(fd) < 0) {
        perror("fsync");
        goto fail;
    }
    if (close(fd) < 0) {
        fd = -1;
        perror("close");
        goto fail;
    }
    fd = -1;

    /* The old version is still in place here; nothing was unlinked. */
    announce_and_pause("STAGED", name, should_pause);

    /*
     * rename() atomically replaces the final directory entry (P4). If the
     * final name is a symlink, the link itself is replaced (P6).
     */
    if (rename(staging, final) < 0) {
        perror("rename");
        goto fail;
    }
    return 0;

fail:
    if (fd >= 0) close(fd);
    unlink(staging);  /* P5: never leave a staging file behind. */
    return -1;
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

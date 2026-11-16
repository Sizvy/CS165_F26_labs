/*
 * CS 165 Ungraded Lab 4: repaired note writer (reference solution).
 *
 * Security policy:
 *   - update a regular file directly inside work/inbox;
 *   - do not follow symbolic links; and
 *   - never modify work/gradebook.txt.
 *
 * The vulnerable version validated a pathname with lstat() and then resolved
 * the same pathname again with open(). This version makes one authority
 * decision: it opens the file once, relative to a descriptor for the inbox,
 * and then validates and modifies only that descriptor. Renaming, unlinking,
 * or replacing the directory entry afterwards cannot change which file the
 * descriptor refers to.
 *
 * The --pause option is kept as a deterministic teaching hook. It now runs
 * after the descriptor is open and checked, so the window it exposes no
 * longer matters.
 */
#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>

#define INBOX_DIR "work/inbox"

static void usage(const char *program) {
    fprintf(stderr, "usage: %s [--pause] NAME MESSAGE\n", program);
}

static int valid_name(const char *name) {
    return name[0] != '\0' && strcmp(name, ".") != 0 &&
           strcmp(name, "..") != 0 && strchr(name, '/') == NULL;
}

static void announce_and_pause(const char *name, int should_pause) {
    printf("CHECKED %s\n", name);
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

static int update_note(const char *name, const char *message, int should_pause) {
    struct stat checked;
    int result = -1;
    int fd = -1;

    /* 1. Open the trusted directory once; later lookups are relative to it. */
    int dirfd = open(INBOX_DIR, O_RDONLY | O_DIRECTORY | O_CLOEXEC);
    if (dirfd < 0) {
        perror("open " INBOX_DIR);
        return -1;
    }

    /*
     * 2-4. Resolve the name exactly once.
     *   O_NOFOLLOW: fail (ELOOP) if the final component is a symbolic link.
     *   O_NONBLOCK: an attacker-supplied FIFO cannot block the open forever.
     *   No O_TRUNC: nothing is modified until the descriptor is validated.
     */
    fd = openat(dirfd, name, O_WRONLY | O_NOFOLLOW | O_CLOEXEC | O_NONBLOCK);
    if (fd < 0) {
        if (errno == ELOOP) {
            fprintf(stderr, "refusing symbolic link\n");
        } else {
            perror("openat");
        }
        goto out;
    }

    /* 5-6. Validate the object the descriptor refers to, not a pathname. */
    if (fstat(fd, &checked) < 0) {
        perror("fstat");
        goto out;
    }
    if (!S_ISREG(checked.st_mode)) {
        fprintf(stderr, "refusing non-regular note\n");
        goto out;
    }
    if (checked.st_nlink != 1) {
        fprintf(stderr, "refusing note with multiple hard links\n");
        goto out;
    }

    /* 7. Any pathname changes from here on cannot redirect fd. */
    announce_and_pause(name, should_pause);

    /* 8. Truncate only the validated file. */
    if (ftruncate(fd, 0) < 0) {
        perror("ftruncate");
        goto out;
    }

    /* 9. Write the complete message. */
    if (write_all(fd, message, strlen(message)) < 0 ||
        write_all(fd, "\n", 1) < 0) {
        perror("write");
        goto out;
    }

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

int main(int argc, char **argv) {
    int should_pause = 0;
    int argument = 1;

    if (argc > 1 && strcmp(argv[1], "--pause") == 0) {
        should_pause = 1;
        argument++;
    }
    if (argc - argument != 2) {
        usage(argv[0]);
        return 2;
    }
    if (!valid_name(argv[argument])) {
        fprintf(stderr, "invalid note name\n");
        return 2;
    }

    return update_note(argv[argument], argv[argument + 1], should_pause) == 0
               ? EXIT_SUCCESS
               : EXIT_FAILURE;
}

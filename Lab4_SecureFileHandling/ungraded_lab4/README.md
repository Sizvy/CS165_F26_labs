# CS 165 — Ungraded Lab 4: The File Changed Under Us

## Overview

`note_writer` updates a note inside `work/inbox/`. It is supposed to reject
symbolic links and must never modify `work/gradebook.txt`.

The supplied implementation checks a pathname and later opens that pathname.
Those operations look reasonable in isolation, but the pathname is shared
state: another process can change what it names between the check and the use.

In this guided lab you will:

1. trace a check-then-open sequence;
2. reproduce a time-of-check-to-time-of-use (TOCTOU) race;
3. explain why checking the pathname again is not a complete repair;
4. replace pathname-based authority with descriptor-based operations; and
5. test the repair against symlinks, races, and hard links.

This is a local teaching exercise. It does not use `setuid`, root privileges,
or files outside this directory.

## Requirements

- Linux or macOS
- a C compiler (`cc`, `gcc`, or `clang`)
- `make`
- Python 3 (standard library only)

## Part 1 — Establish the intended behavior

Build the program and create a fresh sandbox:

```sh
make
make reset
make test
```

Inspect the files:

```sh
cat work/inbox/submission.txt
cat work/gradebook.txt
```

Then perform a normal update:

```sh
./note_writer submission.txt 'revised student note'
cat work/inbox/submission.txt
cat work/gradebook.txt
```

The note should change. The gradebook must not.

Before continuing, read `note_writer.c` and locate these distinct events:

- pathname construction;
- validation with `lstat()`;
- the optional laboratory pause;
- opening with `open()`; and
- truncation caused by `O_TRUNC`.

## Part 2 — Trigger the race

Run:

```sh
make demo
```

`exploit.py` starts the writer in laboratory-pause mode. When the writer
announces that validation is complete, the script replaces the checked note
with a symbolic link to the gradebook and allows the writer to continue.

Draw or write the event ordering:

```text
writer process                         attacker process
--------------                         ----------------
lstat(path)
                                       ...
                                       ...
open(path)
```

Fill in the two attacker operations. Identify the exact instant at which
`path` changes meaning.

The pause makes the interleaving deterministic for teaching and testing. A
real attacker would repeatedly swap directory entries and try to win the same
window; the underlying bug does not depend on the pause.

## Part 3 — Evaluate tempting repairs

For each proposal, explain whether it enforces the security property and why.

1. Call `lstat()` a second time immediately before `open()`.
2. Make the pause shorter.
3. Reject names containing `/`.
4. Add `O_NOFOLLOW` to `open()`.
5. Open first, then use `fstat()` on the returned descriptor.

Pay particular attention to the difference between a **pathname**, which can
be rebound, and a **file descriptor**, which refers to an already opened file.

## Part 4 — Repair the writer

Edit `note_writer.c`. Preserve its command-line interface and the
`announce_and_pause()` call, because the checker uses that hook to exercise a
specific interleaving.

Your repaired sequence should:

1. open the trusted `work/inbox` directory;
2. open the requested name relative to that directory with `openat()`;
3. refuse a final symbolic link with `O_NOFOLLOW`;
4. avoid truncating anything until validation is complete;
5. call `fstat()` on the opened descriptor;
6. require a regular file with exactly one hard link;
7. call `announce_and_pause()` only after the descriptor is open and checked;
8. truncate the validated descriptor with `ftruncate()`; and
9. write the complete message, handling short writes and `EINTR`.

Useful interfaces:

```c
open(DIRECTORY, O_RDONLY | O_DIRECTORY | O_CLOEXEC)
openat(dirfd, name, O_WRONLY | O_NOFOLLOW | O_CLOEXEC | O_NONBLOCK)
fstat(fd, &st)
S_ISREG(st.st_mode)
st.st_nlink
ftruncate(fd, 0)
```

`O_NONBLOCK` ensures that opening an attacker-supplied FIFO cannot make the
service wait forever. It has no effect on ordinary regular-file writes.

Do not solve the exercise by deleting the pause, hard-coding
`submission.txt`, or rejecting every request. Normal functionality is tested.

## Part 5 — Verify the security property

Run:

```sh
make check
```

The checker runs four independent cases:

- a normal note update succeeds;
- a pre-existing symbolic link is rejected;
- replacing the directory entry after validation cannot redirect the opened
  descriptor; and
- a hard link to the protected file is rejected before truncation.

All four cases must pass, and `work/gradebook.txt` must retain its original
contents.

## Questions for the lab checkoff

1. Why are `lstat(path)` and `open(path)` not one security decision?
2. Why is an `fstat()` result still meaningful after another process renames
   or unlinks the pathname?
3. Why must the program omit `O_TRUNC` until after `fstat()` succeeds?
4. What attack does `O_NOFOLLOW` prevent? What attack does the link-count
   check address?
5. Does the fixed program guarantee that the requested update remains visible
   by name after an attacker races it? Which security property does it protect?

## Cleanup

```sh
make clean
```


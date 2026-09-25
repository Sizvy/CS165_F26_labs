# CS 165 — Lab 1: Find, Trigger & Fix

## The Program

You will work with `recman.c`, a small C record manager that reads commands from
a script file. Your generated copy contains five memory-safety bugs. Each bug is
reachable through a sequence of commands, but none is triggered by the supplied
sample scripts.

| Command | Meaning |
|---|---|
| `add <id>` | Create an empty record. |
| `name <id> <text>` | Set a record's fixed-size name field. |
| `str <id> <text>` | Set a record's heap string. |
| `app <id> <text>` | Append text to a record's heap string. |
| `grow <id> <n>` | Reserve an `n`-entry integer array. |
| `link <src> <dst>` | Make `dst` refer to `src`. |
| `del <id>` | Delete a record. |
| `show <id>` | Print a record. |

The five bug classes are:

1. Stack buffer overflow (CWE-121)
2. Heap buffer overflow (CWE-122)
3. Use-after-free (CWE-416)
4. Integer overflow leading to a heap overflow (CWE-190 → CWE-122)
5. NULL-pointer dereference (CWE-476)

## Run the Lab

From the provided student-kit directory, generate your personal copy using the
student ID specified by your instructor:

```sh
python3 make_recman.py <your-student-id>
```

Build and run the AddressSanitizer version, which you should use while finding
and verifying bugs:

```sh
make
./recman tests/sample1.txt
```

The supplied sample scripts are benign. Create your own command scripts to
trigger each bug. You may optionally build a separate non-ASan executable with
`make plain`; it is named `recman-plain`.

## What to Do

For each of the five bugs:

1. Find the unsafe code and identify its CWE class.
2. Create an input script that makes the ASan build abort. Save it as
   `triggers/bug1.txt` through `triggers/bug5.txt`.
3. In `writeup.md`, explain the bug in 2–4 sentences: identify the CWE, the
   relevant function or line, why your input triggers it, and the build-specific
   values you used. Include the first two lines of the ASan report.
4. Make a minimal, targeted change to `recman.c` that fixes the bug without
   changing normal behavior.

After applying all fixes, rebuild with `make`, rerun every trigger, and run the
sample scripts. None of the triggers should abort on the patched build.

## What to Submit

Submit one tarball containing:

```text
recman.c
triggers/bug1.txt ... triggers/bug5.txt
writeup.md
```

Create it with:

```sh
make tar
```

This produces `lab1-submission.tgz`.

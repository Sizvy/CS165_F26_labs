# CS 165 — Lab 2: Controlled Buffer Overflow

## The Program

`vault.c` is a small command-line access checker. It reads a binary request from
standard input and processes it in a function that contains one intentional
stack-buffer-overflow vulnerability. It also contains a harmless `win()`
function that prints a build-specific token.

Your goal is to demonstrate how an unchecked copy can alter control flow by
causing the vulnerable program to reach `win()`. This is a local teaching target
only: you must not attempt to obtain a shell, alter VM settings, use `sudo`, or
target any program other than the supplied `vault` binary.

This lab must be completed on the course Linux/x86-64 machine. The supplied
Makefile keeps the target's code addresses stable for the teaching build; it
does not disable ASLR system-wide.

## Run the Lab

From the supplied student-kit directory, create your instance:

```sh
python3 make_vault.py <your-student-id>
make
./vault < tests/accept.bin
```

Use GDB to inspect the program:

```sh
gdb ./vault
(gdb) break check_request
(gdb) run < tests/accept.bin
(gdb) info frame
(gdb) x/32gx $rsp
```

Your payload is binary data. Save it as `payload.bin` and run it with:

```sh
./vault < payload.bin
```

`make harden` builds `vault-hardened`, a version compiled with common compiler
and linker hardening options. `make test` runs the benign requests.

## What to Do

1. Inspect `vault.c` and identify the overflow and the `win()` target.
2. Use GDB to determine the offset from the request buffer to the saved return
   address in **your** generated build.
3. Create `payload.bin` that makes the vulnerable `vault` print your exact
   `LAB2-WIN` token.
4. In `writeup.md`, explain the vulnerable copy, your offset, and why the
   payload redirects execution. Include a brief GDB transcript or relevant
   output.
5. Make a minimal source-level fix in `vault.c`. The oversized payload must no
   longer reach `win()`, and ordinary requests must retain their behavior.
6. Build with `make harden` and explain, in 2–4 sentences, how stack canaries,
   PIE/ASLR, NX, and fortified checks add defense in depth.

## What to Submit

Submit one tarball containing:

```text
vault.c
payload.bin
writeup.md
```

Create it with:

```sh
make tar
```

This creates `lab2-submission.tgz`.

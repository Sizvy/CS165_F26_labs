# CS 165 — Lab 2 Preparation: Stack Layout & GDB

This is an ungraded guided exercise. Work only with the supplied program on the
course machine.

## Goals

- Recognize a function's stack frame.
- Locate local variables and saved control data in GDB.
- See why an unchecked copy can affect control flow.
- Distinguish a teaching binary's compile options from system-wide settings.

## Walkthrough

Build the practice target:

```sh
make
gdb ./stack_walk
```

Inside GDB, use this sequence:

```text
(gdb) break inspect
(gdb) run hello
(gdb) info frame
(gdb) print &message
(gdb) print $rbp
(gdb) print $rsp
(gdb) x/32gx $rsp
(gdb) next
(gdb) continue
```

Repeat with a longer argument, such as a 40-character string. Discuss where
`message`, the saved frame pointer, and the saved return address reside. The
practice program uses `snprintf`, so it remains safe; do not modify it to make
it overflow.

## Transition to the Graded Lab

The graded target uses a binary request and an intentionally unsafe copy. You
will use the same GDB commands to discover its stack layout, but your graded
payload may only redirect the supplied program to its harmless `win()` function.
No shellcode, privilege changes, or attacks on other accounts are part of this
course exercise.

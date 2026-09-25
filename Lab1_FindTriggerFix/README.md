# CS 165 — Lab 1: Find, Trigger & Fix

Students get a small C "record manager" that works on normal input but hides five
memory-safety bugs (stack overflow, heap overflow, use-after-free, integer
overflow, NULL dereference). They find each bug, write an input that triggers it,
explain it, and patch it. Using an LLM to help is allowed.

## 1. The ungraded lab (week before)

A guided, no-grade session that gets everyone ready. The TA walks the room through:
building with AddressSanitizer, reading an ASan crash report, and using GDB to
locate a memory bug — practiced live on a throwaway program with a couple of
planted bugs. It ends by showing the graded-lab handout and submission format so
nobody walks into the graded week cold. (Full script: `prep/Ungraded_prep_guide.md`.)

## 2. How students generate their assignment

Each student generates their own copy from their student id — no per-student files
to hand out. Give them the `student_kit/` folder (`make_recman.py`,
`recman_common.py`, and `recman_base.c.tmpl`) along with the lab handout. They run:

```
python3 make_recman.py <their-student-id>
```

That creates `recman.c` (their buggy program), a `Makefile`, and a `tests/` folder.
The program is seeded from the id, so every student's buffer sizes, line numbers,
and build id differ — a copied answer won't work against someone else's build.

## 3. How the grader works

Run on each submission (a folder with `recman.c`, `triggers/bug1..5.txt`, and
`writeup.md`):

```
python3 grader/grade.py <student-id> test_submission_folder
```

The grader rebuilds the student's exact instance from the id, then for each bug:
- **found (1 pt):** their trigger must crash the *original* build under
  AddressSanitizer with the correct bug class and function.
- **fixed (2 pts):** with their patched `recman.c`, that trigger no longer crashes
  **and** all benign functional tests still pass (so a "fix" that breaks the
  program earns nothing).

It prints a per-bug table and writes `grade.json`. Autograded total is out of 15;
add the station check (3) and submission hygiene (2) for the /20.

## 4. Requirements (student side)

- `gcc` (or `clang`) with AddressSanitizer support, `make`, and `python3`
  (standard library only).
- **Linux or macOS:** works out of the box — these tools ship with the system or
  install in one step.
- **Windows:** do the lab in **WSL2** (install Ubuntu from the Microsoft Store,
  then `sudo apt install gcc make python3`) or by SSH-ing into the course VM
  `cs165.cs.ucr.edu`. Native Windows compilers (MinGW/MSVC) are **not** supported —
  AddressSanitizer, which this lab relies on, does not work reliably there.
- The course VM `cs165.cs.ucr.edu` already has everything and is the safest option
  for any machine.

Build and run:

```
make                        # builds with AddressSanitizer
./recman tests/sample1.txt  # run the program on a command script

# Optional: build a separate, non-ASan binary without replacing ./recman
make plain
./recman-plain tests/sample1.txt
```

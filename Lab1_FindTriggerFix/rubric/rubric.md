# CS 165 — Lab 1 Grading Rubric (/20)

## Autograded (15) — `python3 grader/grade.py <student_id> <submission_dir>`

Per bug (×5), out of 3:

| Points | Criterion (checked automatically) |
|--------|-----------------------------------|
| 1 | **Found:** the submitted `triggers/bugN.txt` makes the *unpatched* seeded build abort under AddressSanitizer with the **expected bug class** for that slot. |
| 2 | **Fixed:** with the student's patched `recman.c`, that same trigger no longer faults, **and** all benign functional tests still match the reference-fixed output. |

Notes for the grader:
- The student's `recman.c` must compile with `make` (ASan). A non-compiling
  submission scores 0 on all *fix* points; triggers are still checked against the
  reference vulnerable build, so "found" points are unaffected.
- If a student's fix breaks a benign functional test, `functional_ok` is false and
  **all** fix points are withheld — check `grade.json → functional_detail` and use
  judgement; a fix that changes only cosmetic output can be restored manually.
- `bug2` and `bug4` are both heap overflows and share the `heap-buffer-overflow`
  error class, but the autograder also checks the **crashing function** in the ASan
  backtrace (`cmd_app` for bug2, `cmd_grow` for bug4), so a trigger submitted for
  the wrong one fails the "found" check. A "fix" only earns its 2 points when the
  bug was validly found first, so a student cannot pass bug4 with a bug2 trigger.

## Station check (3) — in lab

Pick **one** of the student's five patches and ask them to explain, out loud, why
the original code crashed and why their change fixes it. Scoring:

| Points | |
|--------|-|
| 3 | Explains the bug class, the mechanism, and why the fix is correct. |
| 2 | Correct idea, shaky on one detail. |
| 1 | Vague; clearly leaned on a tool without following what it did. |
| 0 | Cannot explain their own submitted fix. |

This is the main defense against unreflective LLM use. Vary which bug you ask
about per student.

## Submission hygiene (2)

| Points | |
|--------|-|
| 2 | Tarball well-formed, `recman.c` compiles with `make`, `writeup.md` present with an entry per bug. |
| 1 | Minor issue (missing writeup entry, stray build artifacts). |
| 0 | Does not build / wrong layout. |

## Suggested grade boundaries (informal)
- Finds all 5, fixes all 5, clean station check → ~20 (A)
- Finds all 5, fixes 3, good station check → ~15 (B+)
- Finds 3–4, fixes 2 → ~10 (pass)

# CS 165 — Lab 2 Rubric (/20)

## Autograded (/14)

| Points | Criterion |
|---:|---|
| 7 | `payload.bin` makes the regenerated vulnerable binary print the student's expected `LAB2-WIN` token. |
| 7 | The submitted `vault.c` compiles, the same payload no longer reaches `win()`, and both benign tests match the reference-fixed program. |

The grader also reports whether hardening flags build a binary that does not
reach `win()` with the submitted payload. This is feedback, not a separate
automatic point category.

## Manual review (/6)

| Points | Criterion |
|---:|---|
| 4 | The writeup correctly explains the unsafe copy, the build-specific offset, the control-flow change, the source fix, and defense in depth. |
| 2 | Submission is well formed: `vault.c`, `payload.bin`, and `writeup.md` are present and the tarball builds cleanly. |

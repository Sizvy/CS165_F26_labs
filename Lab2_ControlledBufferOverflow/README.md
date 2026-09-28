# CS 165 — Lab 2: Controlled Buffer Overflow

Lab 2 is a local, course-VM-only return-to-win exercise. Students use GDB to
understand a seeded stack frame, submit a binary payload that reaches a harmless
`win()` function, then fix the unchecked copy and compare the teaching build
with a hardened build.

## Contents

- `prep/` — ungraded stack-layout and GDB preparation exercise.
- `student_kit/` — three files students use to generate their own instance.
- `handout/` — concise student-facing instructions.
- `grader/` — local autograder and benign functional tests.
- `reference/` — canonical source template.
- `gen_instance.py` — optional instructor generator for an individual instance.

## Requirements

The graded lab requires the course Linux/x86-64 machine, `gcc`, `gdb`, `make`,
and Python 3. It must not be run against non-course targets or with elevated
privileges.

Grade a submission with:

```sh
python3 grader/grade.py <student-id> <submission-dir>
```

# CS 165 — Ungraded Prep Lab (week before Graded Lab 1)

**Goal:** get every student able to build a C program with AddressSanitizer, read
an ASan crash report, and drive GDB well enough to locate a memory bug. This is
the on-ramp for Graded Lab 1 (Find, Trigger & Fix). No grade — but this is where
students who are rusty in C catch up, so encourage attendance.

Everyone follows along on the same throwaway program. Nothing here is collected.

## 0:00–0:15 — Why memory safety, and the tool we'll lean on

- 60-second recap of the five bug classes from lecture: stack overflow, heap
  overflow, use-after-free, integer overflow, NULL dereference.
- Introduce **AddressSanitizer**: a compiler flag that turns silent corruption
  into a loud, precise crash report. `gcc -g -O0 -fsanitize=address prog.c`.

## 0:15–1:00 — Live demo: one bug, end to end

Hand out `demo.c` (below). Walk the room through it together:

1. Build clean: `make` (ASan) and `make plain`.
2. Run it on a benign input — works fine.
3. Run it on the malicious input — `make plain` may or may not crash
   (undefined behavior!), but the **ASan build crashes every time** with a report.
4. Read the report line by line: the **bug class** (top line), the **faulting
   line** in the source, and the **allocation site**.
5. Fix the bug with a one-line change. Rebuild. Show the report is gone.

Emphasize the loop they'll repeat next week: **find → trigger → read the report →
fix → confirm the report is gone.**

## 1:00–1:40 — GDB crash course

On the same `demo.c`:

- `gcc -g -O0 -o demo demo.c` then `gdb ./demo`
- `run <input>`, `bt` (backtrace at the crash), `frame`, `print`, `x` to inspect
  memory, `break` + `next`/`step`.
- Show how `bt` after a crash points straight at the offending function.
- Show `print sizeof(buf)` and `print i` to reason about an off-by-one.

## 1:40–2:30 — Students drive

Give them `practice.c` with **two** planted bugs (a stack overflow and a
use-after-free — different from next week's five). Ask them to:
- trigger each under ASan,
- read the class off the report,
- fix each with a minimal change.

Circulate. This is exactly the graded workflow, just ungraded and with hints
freely given.

## 2:30–3:00 — Preview the graded lab

- Show the Graded Lab 1 handout and the submission layout
  (`recman.c`, `triggers/bugN.txt`, `writeup.md`).
- Make clear: **LLMs are allowed**; the trigger files + the end-of-lab station
  check are how understanding is verified.
- Point them at the five bug classes so they can pre-read.

---

## Files to prepare for this session

- `demo.c` — a ~30-line program with one obvious heap overflow, for the live demo.
- `practice.c` — a ~50-line program with a stack overflow and a use-after-free.
- A `Makefile` with `all` (ASan) and `plain` targets (reuse the one from the
  graded lab).

You can lift these straight from the graded `recman.c` by deleting all but one or
two bugs, or write fresh 30-line toys — either works. Keep them smaller and more
obvious than the graded program so the session stays on the *tools*, not the hunt.

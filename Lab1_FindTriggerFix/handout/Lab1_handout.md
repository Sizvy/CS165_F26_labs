# CS 165 — Lab 1 (Graded): Find, Trigger & Fix

**Format:** in-lab, 3 hours · **Weight:** graded lab 1 of 4 · **Work:** individual
**You may use LLMs and any tool you like.** You may *not* copy another student's
files. Your build is seeded to your student ID, so a copied answer will not work
against your program — and you will be asked to explain your fixes at the end of
lab.

---

## 1. The program

You are given `recman.c`, a small "record manager" written in C. It reads a
script of commands from a file and manages a table of records. Commands:

| Command | Meaning |
|---------|---------|
| `add <id>` | create an empty record |
| `name <id> <text>` | set the record's fixed-size name field |
| `str <id> <text>` | set the record's heap string |
| `app <id> <text>` | append text to the heap string |
| `grow <id> <n>` | reserve an `n`-entry integer array on the record |
| `link <src> <dst>` | make `dst` refer to `src` |
| `del <id>` | delete the record |
| `show <id>` | print the record |

Build it two ways with the supplied `Makefile`:

```
make          # builds with AddressSanitizer (ASan) — use this to catch bugs
make plain    # optionally builds a non-ASan binary as ./recman-plain
```

Run it on one of the sample scripts:

```
./recman tests/sample1.txt
```

The program **works correctly on normal input**. But it contains **five
memory-safety bugs**, one of each of the following classes (the same classes we
covered in the memory-errors lectures):

1. **Stack buffer overflow** (CWE-121)
2. **Heap buffer overflow** (CWE-122)
3. **Use-after-free** (CWE-416)
4. **Integer overflow leading to a heap overflow** (CWE-190 → CWE-122)
5. **NULL-pointer dereference** (CWE-476)

Each bug is reachable through some sequence of commands. None of them fire on the
provided sample scripts — you have to craft input that triggers them.

---

## 2. What to do

For **each** of the five bugs:

1. **Find it.** Read the code (an LLM can help you here — that's allowed). Figure
   out which command path is unsafe and why.
2. **Trigger it.** Write a command script that makes the **ASan build** abort with
   that bug's error. Save it as `triggers/bug1.txt` … `triggers/bug5.txt`.
   *Tip:* run `./recman triggers/bug1.txt` and read ASan's report — the first line
   names the bug class (e.g. `heap-use-after-free`).
3. **Explain it.** In `writeup.md`, in **your own words** (2–4 sentences), name the
   CWE class, the exact line/function, and *why* your input triggers it. Include
   the specific numbers from **your** build (e.g. your name-buffer size, the
   `grow` value you used). Paste the first two lines of the ASan report.
4. **Fix it.** Edit `recman.c` with a **minimal, targeted** change that removes the
   bug without changing the program's normal behavior.

After fixing, re-run every trigger against your patched build: they must **no
longer** abort, and the sample scripts must still print the same output as before.

---

## 3. What to submit

A single tarball `lab1-<your-id>.tgz` containing:

```
recman.c                 your patched source (compiles with `make`)
triggers/bug1.txt ... bug5.txt
writeup.md               your five explanations + ASan snippets
```

`make tar` builds `lab1-submission.tgz` for you.

---

## 4. How you are graded (out of 20)

| Points | For |
|--------|-----|
| 15 | Autograded: **1 pt** each bug for a trigger that makes the *unpatched* build abort with the correct bug class; **2 pts** each bug for a patch that stops the fault **and** keeps all functional tests passing. |
| 3 | **Station check:** at the end of lab, a TA points at one of your patches and asks you to explain why the original crashed. |
| 2 | Submission builds cleanly and the tarball is well-formed. |

Finding all five and fixing three is a solid pass. Finding and fixing all five is
full autograded marks.

**On LLM use:** using an AI to help you find and patch bugs is fine and encouraged
— that is a real security-engineering workflow. The trigger files prove the bug is
real *on your seeded binary*, and the station check confirms you understand your
own fix. Both are things a copy-paste answer cannot fake.

---

## 5. Suggested 3-hour plan

- **0:00–0:20** — TA walkthrough: build with ASan, read an ASan report, one worked
  example on a throwaway bug.
- **0:20–2:20** — find → trigger → explain → fix, one bug at a time. Do the easy
  classes first (the NULL dereference and the stack overflow are the quickest).
- **2:20–2:50** — re-run all triggers on your patched build, run the samples, build
  the tarball, submit.
- **2:50–3:00** — station checks.

#!/usr/bin/env python3
"""
CS 165 Lab 1 -- per-student instance generator.

Usage:
    python3 gen_instance.py <student_id> [out_dir]

Produces, under out_dir (default: instances/<student_id>/):
    student/recman.c      the vulnerable program the student receives (bug tags stripped)
    student/Makefile
    student/tests/        a few sample (benign) command scripts
    solution/recman_fixed.c
    solution/patches/bugN.patch   reference fix for each bug (diff -u)
    solution/triggers/bugN.txt     an input that faults the STUDENT build for each bug
    BUGKEY.md             instructor answer key (locations + expected ASan signatures)
    instance.json         the parameters (used by grade.py to regenerate identically)

The same <student_id> always yields the same instance, so grade.py can rebuild it.
"""
import sys, os, json

import recman_common as C
from recman_common import seeded, render_student, MAKEFILE, SAMPLE_TESTS

HERE = os.path.dirname(os.path.abspath(__file__))

# ---- code lines (tags stripped) that each fix rewrites ------------------------
FIXES = {
    "bug1": (
        "    strcpy(tmp, arg);",
        "    strncpy(tmp, arg, sizeof(tmp) - 1);\n"
        "    tmp[sizeof(tmp) - 1] = '\\0';",
    ),
    "bug2": (
        "    strcpy(r->str + r->slen, arg);",
        "    size_t add = strlen(arg);\n"
        "    if (add > (size_t)-1 - r->slen - 1) { printf(\"(too long)\\n\"); return; }\n"
        "    char *p = realloc(r->str, r->slen + add + 1);\n"
        "    if (!p) { printf(\"(oom)\\n\"); return; }\n"
        "    r->str = p;\n"
        "    memcpy(r->str + r->slen, arg, add + 1);",
    ),
    "bug3": (
        "    free(r);",
        "    for (int i = 0; i < MAXREC; i++)\n"
        "        if (table[i] && table[i]->link == r) table[i]->link = NULL;\n"
        "    free(r);",
    ),
    "bug4": (
        "    unsigned int bytes = (unsigned int)n * sizeof(int);",
        "    if (n < 0 || (size_t)n > (size_t)16 * 1024 * 1024) { printf(\"(too big)\\n\"); return; }\n"
        "    size_t bytes = (size_t)n * sizeof(int);",
    ),
    "bug5": (
        '    printf("id=%d name=%s\\n", r->id, r->name);',
        '    if (!r) { printf("(none)\\n"); return; }\n'
        '    printf("id=%d name=%s\\n", r->id, r->name);',
    ),
}

SIGS = {
    "bug1": ["stack-buffer-overflow"],
    "bug2": ["heap-buffer-overflow"],
    "bug3": ["heap-use-after-free"],
    "bug4": ["heap-buffer-overflow"],
    "bug5": ["SEGV", "unknown-crash", "null"],
}

# the function that must appear in AddressSanitizer's crash backtrace for each
# bug -- this is what tells bug2 (cmd_app) and bug4 (cmd_grow) apart, since they
# share the heap-buffer-overflow error class.
FUNC = {
    "bug1": ["cmd_name"],
    "bug2": ["cmd_app"],
    "bug3": ["cmd_show"],
    "bug4": ["cmd_grow"],
    "bug5": ["cmd_show"],
}

CWE = {
    "bug1": "CWE-121/CWE-787  stack buffer overflow (unbounded copy)",
    "bug2": "CWE-122/CWE-787  heap buffer overflow (append without realloc)",
    "bug3": "CWE-416         use-after-free (dangling link after delete)",
    "bug4": "CWE-190 -> CWE-122  integer overflow in size calc -> heap overflow",
    "bug5": "CWE-476         NULL pointer dereference (id not present)",
}

def make_fixed(student_src):
    s = student_src
    for k, (old, new) in FIXES.items():
        if old not in s:
            raise SystemExit(f"internal error: fix anchor for {k} not found")
        s = s.replace(old, new, 1)
    return s

def triggers(params):
    nl = params["namelen"]
    long_name = "A" * (nl + 16)
    return {
        "bug1.txt": f"add 1\nname 1 {long_name}\nshow 1\n",
        "bug2.txt": "add 1\nstr 1 short\napp 1 " + "B" * 64 + "\nshow 1\n",
        "bug3.txt": "add 1\nadd 2\nstr 1 secret\nlink 1 2\ndel 1\nshow 2\n",
        "bug4.txt": "add 1\ngrow 1 1073741825\nshow 1\n",
        "bug5.txt": "show 999\n",
    }

def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    sid = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, "instances", sid)
    p = seeded(sid)

    dirs = ["student/tests", "solution/patches", "solution/triggers"]
    for d in dirs:
        os.makedirs(os.path.join(out, d), exist_ok=True)

    student = render_student(p)
    fixed   = make_fixed(student)

    open(os.path.join(out, "student", "recman.c"), "w").write(student)
    open(os.path.join(out, "student", "Makefile"), "w").write(MAKEFILE)
    for name, body in SAMPLE_TESTS.items():
        open(os.path.join(out, "student", "tests", name), "w").write(body)
    open(os.path.join(out, "solution", "recman_fixed.c"), "w").write(fixed)

    # reference patches: diff student(vuln) vs a copy with only that one fix
    for k, (old, new) in FIXES.items():
        one = student.replace(old, new, 1)
        import difflib
        patch = "".join(difflib.unified_diff(
            student.splitlines(keepends=True), one.splitlines(keepends=True),
            fromfile="recman.c", tofile="recman.c"))
        open(os.path.join(out, "solution", "patches", f"{k}.patch"), "w").write(patch)

    for name, body in triggers(p).items():
        open(os.path.join(out, "solution", "triggers", name), "w").write(body)

    # instructor answer key with line numbers
    lines = student.splitlines()
    def find(anchor):
        for i, l in enumerate(lines, 1):
            if l.strip() == anchor.strip():
                return i
        return "?"
    key = ["# Lab 1 -- Instructor Answer Key",
           f"Student: `{sid}`  ·  build id `{p['build_id']}`  ·  NAMELEN={p['namelen']}  MAXREC={p['maxrec']}",
           "", "| Bug | Class | Line in student recman.c | Expected ASan/crash signature |",
           "|-----|-------|--------------------------|-------------------------------|"]
    for k in ["bug1","bug2","bug3","bug4","bug5"]:
        anchor = FIXES[k][0]
        key.append(f"| {k} | {CWE[k]} | ~{find(anchor)} | {', '.join(SIGS[k])} |")
    open(os.path.join(out, "BUGKEY.md"), "w").write("\n".join(key) + "\n")

    json.dump({**p, "sigs": SIGS, "fix_anchors": {k: FIXES[k][0] for k in FIXES}},
              open(os.path.join(out, "instance.json"), "w"), indent=2)

    print(f"instance for {sid} -> {out}")

if __name__ == "__main__":
    main()

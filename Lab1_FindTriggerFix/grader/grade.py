#!/usr/bin/env python3
"""
CS 165 Lab 1 -- autograder.

Usage:
    python3 grade.py <submission_dir>

<submission_dir> must contain:
    recman.c              the student's PATCHED source
    triggers/bug1.txt ... bug5.txt   one crashing input per bug
    writeup.md            (read by the TA; not auto-scored)

The grader:
  1. builds the student's patched source with AddressSanitizer,
  2. runs each submitted bugN.txt only against the student's patched program;
     the run must exit cleanly,
  3. checks that the student's patched program produces the expected output on
     all benign functional tests.

The grader deliberately does NOT need the student's ID and does NOT build or
run a vulnerable reference program. It does not verify that bugN.txt triggers
Bug N before the patch; the TA assesses that evidence from the student's
writeup and in-lab demo.

Scoring (per bug, out of 3): the corresponding trigger file must run cleanly
on the patched program, and all functional tests must pass.
Prints a report and writes grade.json in <submission_dir>.
"""
import sys, os, json, subprocess, re, tempfile, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
FUNC_DIR = os.path.join(HERE, "functional_tests")
BUGS = ["bug1", "bug2", "bug3", "bug4", "bug5"]
ASAN = ["-g", "-O0", "-fsanitize=address", "-fno-omit-frame-pointer", "-Wall"]

# The first output line contains each student's instance-specific build ID, so
# it is deliberately removed before comparison. The remaining expected output
# is the same for every instance on these short, benign scripts.
EXPECTED_OUTPUTS = {
    "f1.txt": """added 1
name set
str set (5)
id=1 name=alice
  str=hello
""",
    "f2.txt": """added 5
str set (6)
grew to 8
id=5 name=
  str=abcdef
  arr[8]
deleted 5
""",
    "f3.txt": """added 2
added 3
name set
name set
linked 3 -> 2
id=3 name=carol
  link->name=bob
""",
    "f4.txt": """added 7
str set (2)
str set (8)
id=7 name=
  str=replaced
""",
    "f5.txt": """added 9
grew to 4
grew to 16
id=9 name=
  arr[16]
""",
}

def build(src_path, out_path):
    r = subprocess.run(["gcc", *ASAN, "-o", out_path, src_path],
                       capture_output=True, text=True)
    return r.returncode == 0, r.stderr

def run(binary, infile, timeout=15):
    try:
        r = subprocess.run([binary, infile], capture_output=True, text=True,
                           timeout=timeout)
        return r.returncode, r.stdout, r.stderr
    except subprocess.TimeoutExpired:
        return -99, "", "TIMEOUT"

def without_build_banner(stdout):
    """Remove the required, instance-specific first output line."""
    lines = stdout.splitlines(keepends=True)
    if lines and re.fullmatch(r"recman build [0-9a-f]{8}\n?", lines[0]):
        return "".join(lines[1:])
    return stdout

def main():
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    sub = os.path.abspath(sys.argv[1])
    work = tempfile.mkdtemp(prefix="grade_")
    report = {"submission_dir": sub, "bugs": {}, "notes": []}

    stu_src = os.path.join(sub, "recman.c")
    if not os.path.exists(stu_src):
        report["notes"].append("no recman.c submitted")
        stu_ok = False
    else:
        stu_bin = os.path.join(work, "recman")
        stu_ok, estu = build(stu_src, stu_bin)
        if not stu_ok:
            report["notes"].append("student recman.c FAILED TO COMPILE:\n" + estu.strip()[:800])

    # Run submitted bug scripts only on the student's patched program.
    for bug in BUGS:
        trig = os.path.join(sub, "triggers", bug + ".txt")
        entry = {"trigger_present": os.path.exists(trig),
                 "safe_on_patched": False, "points": 0.0}
        if stu_ok and os.path.exists(trig):
            rc, o, e = run(stu_bin, trig)
            entry["student_exit_code"] = rc
            entry["safe_on_patched"] = (rc == 0) and ("AddressSanitizer" not in o + e)
        report["bugs"][bug] = entry

    # Functional check: compare against fixed, ID-independent expected output.
    functional_ok = True
    func_detail = []
    if stu_ok:
        for t in sorted(os.listdir(FUNC_DIR)):
            fp = os.path.join(FUNC_DIR, t)
            rc, so, se = run(stu_bin, fp)
            expected = EXPECTED_OUTPUTS.get(t)
            ok = (expected is not None and rc == 0
                  and without_build_banner(so) == expected
                  and "AddressSanitizer" not in se)
            functional_ok &= ok
            func_detail.append({"test": t, "match": ok})
    report["functional_ok"] = functional_ok
    report["functional_detail"] = func_detail

    total = 0.0
    for bug in BUGS:
        entry = report["bugs"][bug]
        # A trigger file earns credit only when it runs cleanly on the student's
        # patched program and the program remains functionally correct.
        pts = 3.0 if entry["safe_on_patched"] and functional_ok else 0.0
        entry["points"] = pts
        total += pts

    report["autograded_total"] = round(total, 1)
    report["autograded_max"] = 15.0
    report["reminder"] = "Add: station check (3) + submission hygiene (2) = /20."
    shutil.rmtree(work, ignore_errors=True)

    os.makedirs(sub, exist_ok=True)
    json.dump(report, open(os.path.join(sub, "grade.json"), "w"), indent=2)

    print(f"\n=== Lab 1 autograde: {os.path.basename(sub)} ===")
    print(f"student recman.c compiles: {stu_ok}   functional tests clean: {functional_ok}")
    print(f"{'bug':6} {'trigger':8} {'safe':6} pts")
    for b in BUGS:
        en = report["bugs"][b]
        print(f"{b:6} {str(en['trigger_present']):8} "
              f"{str(en['safe_on_patched']):6} {en['points']}")
    for n in report["notes"]:
        print("NOTE:", n)
    print(f"\nAutograded: {report['autograded_total']} / 15   "
          f"(+3 station check, +2 hygiene = /20)")

if __name__ == "__main__":
    main()

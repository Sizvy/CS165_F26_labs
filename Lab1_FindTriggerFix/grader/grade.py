#!/usr/bin/env python3
"""
CS 165 Lab 1 -- autograder.

Usage:
    python3 grade.py <student_id> <submission_dir>

<submission_dir> must contain:
    recman.c              the student's PATCHED source
    triggers/bug1.txt ... bug5.txt   one crashing input per bug
    writeup.md            (read by the TA; not auto-scored)

The grader:
  1. regenerates the student's exact instance (vulnerable source + reference fix),
  2. builds the vulnerable and reference-fixed programs with AddressSanitizer,
  3. builds the student's patched source (compile failure = 0 on the fix half),
  4. for each bug:  award "found"  if the student's trigger makes the VULNERABLE
     build abort with the expected ASan/crash signature;
                    award "fixed"  if that same trigger no longer faults on the
     student's patched build AND all benign functional tests still match the
     reference-fixed output.
Scoring (per bug, out of 3):  found = 1, fixed = 1, functional-clean = shared 1.
Prints a report and writes grade.json in <submission_dir>.
"""
import sys, os, json, tempfile, subprocess, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
PKG  = os.path.dirname(HERE)
sys.path.insert(0, PKG)
import gen_instance as G

FUNC_DIR = os.path.join(HERE, "functional_tests")
BUGS = ["bug1", "bug2", "bug3", "bug4", "bug5"]
ASAN = ["-g", "-O0", "-fsanitize=address", "-fno-omit-frame-pointer", "-Wall"]

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

def faults(rc, out, err):
    blob = out + err
    return (rc != 0) and ("AddressSanitizer" in blob or "SEGV" in blob
                          or "Sanitizer" in blob), blob

def sig_ok(bug, blob):
    return any(s.lower() in blob.lower() for s in G.SIGS[bug])

def func_ok(bug, blob):
    # the crash must occur in the function that owns this bug (distinguishes the
    # two heap-overflow bugs, bug2/cmd_app vs bug4/cmd_grow)
    return any(fn in blob for fn in G.FUNC[bug])

def main():
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    sid, sub = sys.argv[1], sys.argv[2]
    work = tempfile.mkdtemp(prefix="grade_")
    params = G.seeded(sid)

    vuln_src = os.path.join(work, "vuln.c")
    fixed_src = os.path.join(work, "fixed.c")
    student_v = G.render_student(params)
    open(vuln_src, "w").write(student_v)
    open(fixed_src, "w").write(G.make_fixed(student_v))

    report = {"student_id": sid, "build_id": params["build_id"], "bugs": {}, "notes": []}

    vb, e1 = build(vuln_src, os.path.join(work, "vuln"))
    fb, e2 = build(fixed_src, os.path.join(work, "ref_fixed"))
    if not (vb and fb):
        raise SystemExit("internal error: reference build failed\n" + e1 + e2)

    stu_src = os.path.join(sub, "recman.c")
    if not os.path.exists(stu_src):
        report["notes"].append("no recman.c submitted -> fix half unscored")
        stu_ok = False
    else:
        stu_ok, estu = build(stu_src, os.path.join(work, "stu"))
        if not stu_ok:
            report["notes"].append("student recman.c FAILED TO COMPILE:\n" + estu.strip()[:800])

    # functional check: student-patched vs reference-fixed on benign scripts
    functional_ok = True
    func_detail = []
    if stu_ok:
        for t in sorted(os.listdir(FUNC_DIR)):
            fp = os.path.join(FUNC_DIR, t)
            _, ro, _ = run(os.path.join(work, "ref_fixed"), fp)
            rc, so, se = run(os.path.join(work, "stu"), fp)
            ok = (so == ro) and ("AddressSanitizer" not in se)
            functional_ok &= ok
            func_detail.append({"test": t, "match": ok})
    report["functional_ok"] = functional_ok
    report["functional_detail"] = func_detail

    total = 0.0
    for bug in BUGS:
        trig = os.path.join(sub, "triggers", bug + ".txt")
        entry = {"trigger_present": os.path.exists(trig),
                 "found": False, "fixed": False, "points": 0.0}
        if os.path.exists(trig):
            rc, o, e = run(os.path.join(work, "vuln"), trig)
            fault, blob = faults(rc, o, e)
            entry["found"] = bool(fault and sig_ok(bug, blob) and func_ok(bug, blob))
            entry["vuln_signature"] = next((s for s in G.SIGS[bug]
                                            if s.lower() in blob.lower()), None)
            if stu_ok and entry["found"]:
                rc2, o2, e2b = run(os.path.join(work, "stu"), trig)
                fault2, _ = faults(rc2, o2, e2b)
                entry["fixed"] = (not fault2) and functional_ok
        # 1 pt for a valid trigger (found); 2 pts for a patch that both stops
        # the fault and keeps every benign functional test passing (fixed).
        pts = (1.0 if entry["found"] else 0.0) + (2.0 if entry["fixed"] else 0.0)
        entry["points"] = pts
        total += pts
        report["bugs"][bug] = entry

    report["autograded_total"] = round(total, 1)
    report["autograded_max"] = 15.0
    report["reminder"] = "Add: station check (3) + submission hygiene (2) = /20."
    shutil.rmtree(work, ignore_errors=True)

    os.makedirs(sub, exist_ok=True)
    json.dump(report, open(os.path.join(sub, "grade.json"), "w"), indent=2)

    print(f"\n=== Lab 1 autograde: {sid} (build {params['build_id']}) ===")
    print(f"student recman.c compiles: {stu_ok}   functional tests clean: {functional_ok}")
    print(f"{'bug':6} {'trigger':8} {'found':6} {'fixed':6} pts")
    for b in BUGS:
        en = report["bugs"][b]
        print(f"{b:6} {str(en['trigger_present']):8} {str(en['found']):6} "
              f"{str(en['fixed']):6} {en['points']}")
    for n in report["notes"]:
        print("NOTE:", n)
    print(f"\nAutograded: {report['autograded_total']} / 15   "
          f"(+3 station check, +2 hygiene = /20)")

if __name__ == "__main__":
    main()

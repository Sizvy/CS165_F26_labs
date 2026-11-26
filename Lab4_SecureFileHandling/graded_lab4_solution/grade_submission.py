#!/usr/bin/env python3
"""Autograde the testable parts of one Graded Lab 4 submission (instructor only).

usage: python3 grade_submission.py PATH/TO/student/graded_lab4

The script never runs inside the student's folder. It builds two scratch
copies of the pristine starter (../graded_lab4 next to this file):

  repaired:   starter support files + the student's note_service.c
              -> visible functional tests, hidden tests, student exploits
  vulnerable: starter note_service.c + the student's exploit scripts
              -> each exploit must print EXPLOIT SUCCEEDED

Suggested points (the report, 15 points, is graded by hand):
  functional tests 10, exploit 1 15, exploit 2 15,
  update repair 20 (U tests), publish repair 25 (P tests).
Repair points are proportional to the non-regression hidden tests passed;
each failed "(regression)" test deducts 2 points from that area.
"""

from pathlib import Path
import shutil
import subprocess
import sys
import tempfile


HERE = Path(__file__).resolve().parent
STARTER = HERE.parent / "graded_lab4"
SUPPORT = ["Makefile", "lab_support.py", "check_lab.py"]
EXPLOITS = ["exploit_update.py", "exploit_publish.py"]


def sh(arguments, cwd, timeout=120):
    try:
        done = subprocess.run(arguments, cwd=str(cwd), stdout=subprocess.PIPE,
                              stderr=subprocess.STDOUT,
                              universal_newlines=True, timeout=timeout)
        return done.returncode, done.stdout
    except subprocess.TimeoutExpired:
        return None, "timed out"


def prepare(directory, source_dir, source_name="note_service.c"):
    directory.mkdir()
    for name in SUPPORT:
        shutil.copy(str(STARTER / name), str(directory / name))
    shutil.copy(str(source_dir / source_name), str(directory / "note_service.c"))
    code, output = sh(["make", "note_service"], directory)
    if code != 0:
        print(output)
    return code == 0


def run_exploits(directory, submission, expected):
    results = {}
    for name in EXPLOITS:
        if not (submission / name).is_file():
            results[name] = (False, "missing")
            continue
        shutil.copy(str(submission / name), str(directory / name))
        _, output = sh([sys.executable, name], directory, timeout=30)
        last = output.strip().splitlines()[-1] if output.strip() else ""
        results[name] = (expected in output, last)
    return results


def count(output, prefix=""):
    lines = [line for line in output.splitlines()
             if line.startswith(("PASS", "FAIL"))]
    chosen = [line for line in lines if prefix in line]
    return sum(line.startswith("PASS") for line in chosen), len(chosen)


def repair_points(hidden, prefix, weight):
    lines = [line for line in hidden.splitlines()
             if line.startswith(("PASS", "FAIL")) and prefix in line]
    scored = [line for line in lines if "(regression)" not in line]
    regressions = [line for line in lines
                   if "(regression)" in line and line.startswith("FAIL")]
    earned = weight * sum(l.startswith("PASS") for l in scored) / len(scored)
    return max(0.0, earned - 2.0 * len(regressions))


def main():
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    submission = Path(sys.argv[1]).resolve()
    if not (submission / "note_service.c").is_file():
        raise SystemExit("no note_service.c in {}".format(submission))

    scratch = Path(tempfile.mkdtemp(prefix="lab4-grade-"))
    try:
        repaired = scratch / "repaired"
        vulnerable = scratch / "vulnerable"
        points = {}

        print("== student's repaired program ==")
        if prepare(repaired, submission):
            shutil.copy(str(HERE / "hidden_tests.py"), str(repaired))
            _, functional = sh([sys.executable, "check_lab.py"], repaired)
            _, hidden = sh([sys.executable, "hidden_tests.py"], repaired)
            print(functional + hidden)
            f_pass, f_total = count(functional)
            points["functional tests"] = 10.0 * f_pass / f_total
            points["update repair"] = repair_points(hidden, "[U", 20.0)
            points["publish repair"] = repair_points(hidden, "[P", 25.0)
            if f_pass < f_total:
                print("WARNING: functional tests fail; check that the repair "
                      "does not simply reject requests before awarding "
                      "repair points.")
        else:
            print("BUILD FAILED")
            points.update({"functional tests": 0, "update repair": 0,
                           "publish repair": 0})

        print("== student's exploits against the starter program ==")
        prepare(vulnerable, STARTER)
        attack = run_exploits(vulnerable, submission, "EXPLOIT SUCCEEDED")
        for name, (ok, last) in attack.items():
            print("{}  {}: {}".format("PASS" if ok else "FAIL", name, last))
        points["exploit 1"] = 15.0 if attack["exploit_update.py"][0] else 0.0
        points["exploit 2"] = 15.0 if attack["exploit_publish.py"][0] else 0.0

        if repaired.exists() and (repaired / "note_service").exists():
            print("== student's exploits against the repaired program ==")
            defense = run_exploits(repaired, submission, "EXPLOIT BLOCKED")
            for name, (ok, last) in defense.items():
                print("{}  {}: {}".format("PASS" if ok else "FAIL", name, last))

        print("== suggested points (report graded separately, /15) ==")
        for area, value in points.items():
            print("  {:<18} {:5.1f}".format(area, value))
        print("  {:<18} {:5.1f} / 85".format("total", sum(points.values())))
    finally:
        shutil.rmtree(str(scratch))


if __name__ == "__main__":
    main()

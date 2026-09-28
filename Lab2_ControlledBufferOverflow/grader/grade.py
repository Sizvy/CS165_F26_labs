#!/usr/bin/env python3
"""Autograder for CS 165 Lab 2.

Usage: python3 grade.py <student-id> <submission-dir>
"""
import json
import os
import shlex
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
PKG = os.path.dirname(HERE)
sys.path.insert(0, PKG)
import gen_instance as G
import stacklab_common as C

FUNCTIONAL_DIR = os.path.join(HERE, "functional_tests")


def build(source, output, hardened=False):
    flags_text = (C.HARDEN_CFLAGS + " " + C.HARDEN_LDFLAGS) if hardened else (C.VULN_CFLAGS + " " + C.VULN_LDFLAGS)
    result = subprocess.run(["gcc", *shlex.split(flags_text), "-o", output, source],
                            capture_output=True, text=True)
    return result.returncode == 0, result.stderr


def run(binary, input_file, timeout=5):
    try:
        with open(input_file, "rb") as input_handle:
            result = subprocess.run([binary], input=input_handle, capture_output=True, timeout=timeout)
        return (result.returncode, result.stdout.decode("utf-8", "replace"),
                result.stderr.decode("utf-8", "replace"))
    except subprocess.TimeoutExpired:
        return -99, "", "TIMEOUT"


def main():
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    student_id, submission = sys.argv[1:]
    params = C.seeded(student_id)
    token = "LAB2-WIN:" + params["win_token"]
    work = tempfile.mkdtemp(prefix="lab2_grade_")
    report = {"student_id": student_id, "build_id": params["build_id"], "found": False,
              "fixed": False, "functional_ok": False, "hardened": False, "points": 0,
              "notes": []}
    try:
        vulnerable_source = os.path.join(work, "vulnerable.c")
        fixed_source = os.path.join(work, "reference_fixed.c")
        source = C.render_student(params)
        with open(vulnerable_source, "w") as output:
            output.write(source)
        with open(fixed_source, "w") as output:
            output.write(G.make_fixed(source))
        vulnerable_binary = os.path.join(work, "vulnerable")
        reference_binary = os.path.join(work, "reference_fixed")
        if not build(vulnerable_source, vulnerable_binary)[0] or not build(fixed_source, reference_binary)[0]:
            raise SystemExit("internal error: unable to build a reference instance")

        payload = os.path.join(submission, "payload.bin")
        submitted_source = os.path.join(submission, "vault.c")
        if not os.path.exists(payload):
            report["notes"].append("payload.bin is missing")
        else:
            _, output, _ = run(vulnerable_binary, payload)
            report["found"] = token in output
            if not report["found"]:
                report["notes"].append("payload did not reach the expected win() token")

        student_binary = os.path.join(work, "student")
        student_ok = False
        if not os.path.exists(submitted_source):
            report["notes"].append("vault.c is missing")
        else:
            student_ok, stderr = build(submitted_source, student_binary)
            if not student_ok:
                report["notes"].append("vault.c did not compile: " + stderr[:500])

        if student_ok:
            functional = []
            for name in sorted(os.listdir(FUNCTIONAL_DIR)):
                infile = os.path.join(FUNCTIONAL_DIR, name)
                _, expected, _ = run(reference_binary, infile)
                rc, actual, _ = run(student_binary, infile)
                functional.append({"test": name, "match": rc == 0 and actual == expected})
            report["functional_detail"] = functional
            report["functional_ok"] = all(item["match"] for item in functional)

            if os.path.exists(payload) and report["found"]:
                rc, output, _ = run(student_binary, payload)
                report["fixed"] = rc == 0 and token not in output and report["functional_ok"]
                if not report["fixed"]:
                    report["notes"].append("patched program still reaches win(), faults, or changes benign behavior")

            hardened_binary = os.path.join(work, "student_hardened")
            hard_ok, _ = build(submitted_source, hardened_binary, hardened=True)
            if hard_ok and os.path.exists(payload):
                _, output, _ = run(hardened_binary, payload)
                report["hardened"] = token not in output

        report["points"] = (7 if report["found"] else 0) + (7 if report["fixed"] else 0)
        report["autograded_max"] = 14
        report["reminder"] = "Add manual writeup (4) and submission hygiene (2) for /20."
        os.makedirs(submission, exist_ok=True)
        with open(os.path.join(submission, "grade.json"), "w") as output:
            json.dump(report, output, indent=2)
        print(f"Lab 2 autograde: {student_id} (build {params['build_id']})")
        print(f"payload reaches win(): {report['found']}")
        print(f"patched source fixes it: {report['fixed']}")
        print(f"benign tests clean: {report['functional_ok']}")
        print(f"hardened build blocks payload: {report['hardened']}")
        print(f"Autograded: {report['points']} / 14 (+6 manual/hygiene = /20)")
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    main()

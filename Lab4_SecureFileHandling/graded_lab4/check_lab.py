#!/usr/bin/env python3
"""Visible functional tests for CS 165 Graded Lab 4.

These tests check normal behavior only. The starter program passes all of
them, and your repaired program must still pass all of them. Security is
graded separately with hidden adversarial tests based on the requirements in
the lab instructions.
"""

import os

import lab_support as lab


def update_existing_note():
    lab.reset()
    result = lab.run("update", "submission.txt", "revised note")
    ok = (result.returncode == 0
          and lab.read(lab.NOTE) == "revised note\n"
          and lab.gradebook_intact())
    return ok, "update replaces the contents of an existing note"


def update_missing_note():
    lab.reset()
    result = lab.run("update", "missing.txt", "should fail")
    ok = (result.returncode not in (0, None)
          and not (lab.INBOX / "missing.txt").exists()
          and lab.gradebook_intact())
    return ok, "update of a missing note fails and creates nothing"


def invalid_names():
    lab.reset()
    names = ["../gradebook.txt", ".hidden", "", "a/b"]
    ok = all(lab.run(op, name, "x").returncode == 2
             for op in ("update", "publish") for name in names)
    ok = ok and lab.gradebook_intact()
    return ok, "names with '/' or a leading '.' are rejected"


def publish_new_note():
    lab.reset()
    result = lab.run("publish", "news.txt", "fresh news")
    target = lab.PUBLIC / "news.txt"
    ok = (result.returncode == 0
          and target.is_file() and not target.is_symlink()
          and lab.read(target) == "fresh news\n"
          and lab.gradebook_intact())
    return ok, "publish creates a new public note"


def publish_replacement():
    lab.reset()
    result = lab.run("publish", "announcement.txt", "Lab 4 is due Friday.")
    ok = (result.returncode == 0
          and lab.read(lab.ANNOUNCEMENT) == "Lab 4 is due Friday.\n"
          and lab.gradebook_intact())
    return ok, "publish replaces an existing public note"


def publish_leaves_no_extra_files():
    lab.reset()
    lab.run("publish", "news.txt", "one")
    lab.run("publish", "news.txt", "two")
    lab.run("publish", "announcement.txt", "three")
    ok = sorted(os.listdir(str(lab.PUBLIC))) == ["announcement.txt", "news.txt"]
    return ok, "publish leaves no extra files in work/public"


def pause_hooks_present():
    lab.reset()
    update = lab.PausedRun("update", "submission.txt", "paused update")
    update_ok = update.marker == "CHECKED submission.txt"
    update_ok = update_ok and update.resume().returncode == 0
    publish = lab.PausedRun("publish", "announcement.txt", "paused publish")
    publish_ok = publish.marker == "STAGED announcement.txt"
    publish_ok = publish_ok and publish.resume().returncode == 0
    ok = (update_ok and publish_ok
          and lab.read(lab.NOTE) == "paused update\n"
          and lab.read(lab.ANNOUNCEMENT) == "paused publish\n")
    return ok, "--pause prints CHECKED / STAGED and the operation completes"


def bad_operation():
    lab.reset()
    result = lab.run("delete", "submission.txt", "x")
    ok = result.returncode == 2 and lab.read(lab.NOTE) == lab.ORIGINAL_NOTE
    return ok, "unknown operations are rejected"


CHECKS = [
    update_existing_note,
    update_missing_note,
    invalid_names,
    publish_new_note,
    publish_replacement,
    publish_leaves_no_extra_files,
    pause_hooks_present,
    bad_operation,
]


def main():
    failures = 0
    for check in CHECKS:
        try:
            passed, description = check()
        except OSError as error:
            passed, description = False, "{}: {}".format(check.__name__, error)
        print("{}  {}".format("PASS" if passed else "FAIL", description))
        failures += not passed
    lab.reset()
    if failures:
        raise SystemExit("{} functional test(s) failed".format(failures))
    print("all functional tests passed")


if __name__ == "__main__":
    main()

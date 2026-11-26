#!/usr/bin/env python3
"""Hidden adversarial tests for CS 165 Graded Lab 4 (instructor only).

Do not distribute. Copy this file into a graded_lab4 folder that contains a
built note_service, then run:   python3 hidden_tests.py

Each test maps to one security requirement from the instructions. Every
test also requires that work/gradebook.txt is unchanged. The starter
program fails 12 of the 16 tests. The four it already passes are marked
"(regression)": they guard against repairs that break existing protections.
Use grade_submission.py to run these together with the functional tests and
the student's exploits.
"""

import os
import stat

import lab_support as lab


PROTECTED = "../gradebook.txt"
PREDICTABLE = ".news.txt.tmp"   # the starter program's staging name


def publication_ok(result, name="news.txt", message="published\n"):
    target = lab.PUBLIC / name
    return (result.returncode == 0 and target.is_file()
            and not target.is_symlink() and lab.read(target) == message)


# ------------------------------------------------------------------ update

def u1_static_symlink():
    lab.reset()
    lab.NOTE.unlink()
    lab.NOTE.symlink_to(PROTECTED)
    result = lab.run("update", lab.NOTE.name, "attack")
    return result.returncode not in (0, None) and lab.gradebook_intact()


def u2_race_symlink():
    lab.reset()
    service = lab.PausedRun("update", lab.NOTE.name, "attack")
    if service.marker != "CHECKED " + lab.NOTE.name:
        return False
    lab.NOTE.unlink()
    lab.NOTE.symlink_to(PROTECTED)
    result = service.resume()
    return not result.timed_out and lab.gradebook_intact()


def u3_static_hard_link():
    lab.reset()
    lab.NOTE.unlink()
    os.link(str(lab.GRADEBOOK), str(lab.NOTE))
    result = lab.run("update", lab.NOTE.name, "attack")
    return result.returncode not in (0, None) and lab.gradebook_intact()


def u4_race_hard_link():
    lab.reset()
    service = lab.PausedRun("update", lab.NOTE.name, "attack")
    if service.marker != "CHECKED " + lab.NOTE.name:
        return False
    lab.NOTE.unlink()
    os.link(str(lab.GRADEBOOK), str(lab.NOTE))
    result = service.resume()
    return not result.timed_out and lab.gradebook_intact()


def u5_race_fifo():
    lab.reset()
    service = lab.PausedRun("update", lab.NOTE.name, "attack")
    if service.marker != "CHECKED " + lab.NOTE.name:
        return False
    lab.NOTE.unlink()
    os.mkfifo(str(lab.NOTE))
    result = service.resume()
    return not result.timed_out and lab.gradebook_intact()


def u6_static_fifo():
    lab.reset()
    lab.NOTE.unlink()
    os.mkfifo(str(lab.NOTE))
    result = lab.run("update", lab.NOTE.name, "attack")
    return result.returncode not in (0, None) and lab.gradebook_intact()


# ----------------------------------------------------------------- publish

def p1_planted_symlink():
    lab.reset()
    os.symlink(PROTECTED, str(lab.PUBLIC / PREDICTABLE))
    lab.run("publish", "news.txt", "published")
    return lab.gradebook_intact()


def p1_planted_hard_link():
    lab.reset()
    os.link(str(lab.GRADEBOOK), str(lab.PUBLIC / PREDICTABLE))
    lab.run("publish", "news.txt", "published")
    return lab.gradebook_intact()


def p1_planted_regular_file():
    """The attacker pre-creates the staging file and keeps their own copy."""
    lab.reset()
    planted = lab.PUBLIC / PREDICTABLE
    planted.write_text("attacker file\n", encoding="utf-8")
    planted.chmod(0o666)
    planted_inode = planted.stat().st_ino
    result = lab.run("publish", "news.txt", "published")
    target = lab.PUBLIC / "news.txt"
    reused = (result.returncode == 0 and target.exists()
              and target.stat().st_ino == planted_inode)
    untouched = (not planted.exists()
                 or lab.read(planted) == "attacker file\n")
    return not reused and untouched and lab.gradebook_intact()


def p2_planted_names_do_not_block():
    ok = True
    for plant in ("symlink", "regular"):
        lab.reset()
        planted = lab.PUBLIC / PREDICTABLE
        if plant == "symlink":
            os.symlink("does-not-exist", str(planted))
        else:
            planted.write_text("attacker file\n", encoding="utf-8")
        ok = ok and publication_ok(lab.run("publish", "news.txt", "published"))
    return ok and lab.gradebook_intact()


def p3_mode_umask_000():
    lab.reset()
    result = lab.run("publish", "news.txt", "published", umask=0o000)
    target = lab.PUBLIC / "news.txt"
    return (publication_ok(result)
            and stat.S_IMODE(target.stat().st_mode) == 0o644)


def p3_mode_umask_077():
    lab.reset()
    result = lab.run("publish", "news.txt", "published", umask=0o077)
    target = lab.PUBLIC / "news.txt"
    return (publication_ok(result)
            and stat.S_IMODE(target.stat().st_mode) == 0o644)


def p4_atomic_replacement():
    lab.reset()
    service = lab.PausedRun("publish", "announcement.txt", "new version")
    if service.marker != "STAGED announcement.txt":
        return False
    during = lab.read(lab.ANNOUNCEMENT)
    result = service.resume()
    return (during == lab.ORIGINAL_ANNOUNCEMENT
            and publication_ok(result, "announcement.txt", "new version\n"))


def p5_cleanup_after_failure():
    """The final name is a directory, so the last step must fail."""
    lab.reset()
    (lab.PUBLIC / "news.txt").mkdir()
    result = lab.run("publish", "news.txt", "published")
    left = sorted(os.listdir(str(lab.PUBLIC)))
    return (result.returncode not in (0, None)
            and left == ["announcement.txt", "news.txt"]
            and (lab.PUBLIC / "news.txt").is_dir())


def p5_cleanup_after_success_with_plants():
    lab.reset()
    os.symlink("does-not-exist", str(lab.PUBLIC / PREDICTABLE))
    lab.run("publish", "news.txt", "published")
    left = sorted(os.listdir(str(lab.PUBLIC)))
    return left == [PREDICTABLE, "announcement.txt", "news.txt"]


def p6_final_name_symlink():
    lab.reset()
    os.symlink(PROTECTED, str(lab.PUBLIC / "news.txt"))
    result = lab.run("publish", "news.txt", "published")
    return publication_ok(result) and lab.gradebook_intact()


TESTS = [
    ("U2", "(regression) pre-existing symlink is rejected", u1_static_symlink),
    ("U2/U4", "(regression) symlink swapped in after CHECKED cannot redirect update",
     u2_race_symlink),
    ("U3/U5", "pre-existing hard link is rejected before truncation",
     u3_static_hard_link),
    ("U4", "hard link swapped in after CHECKED cannot redirect update",
     u4_race_hard_link),
    ("U4/U6", "FIFO swapped in after CHECKED does not hang the service",
     u5_race_fifo),
    ("U1/U6", "(regression) pre-existing FIFO is rejected promptly", u6_static_fifo),
    ("P1", "planted symlink at staging name cannot redirect publish",
     p1_planted_symlink),
    ("P1", "planted hard link at staging name cannot redirect publish",
     p1_planted_hard_link),
    ("P1", "planted regular file is never reused as the published file",
     p1_planted_regular_file),
    ("P2", "planted staging names do not prevent publication",
     p2_planted_names_do_not_block),
    ("P3", "published mode is 0644 under umask 000", p3_mode_umask_000),
    ("P3", "published mode is 0644 under umask 077", p3_mode_umask_077),
    ("P4", "old version stays readable while publish is paused",
     p4_atomic_replacement),
    ("P5", "no staging file is left after a failed publish",
     p5_cleanup_after_failure),
    ("P5", "no staging file is left after a successful publish",
     p5_cleanup_after_success_with_plants),
    ("P6", "(regression) symlink at the final name is replaced, not followed",
     p6_final_name_symlink),
]


def main():
    failures = 0
    for requirement, description, test in TESTS:
        try:
            passed = bool(test())
        except OSError as error:
            passed = False
            description += " ({})".format(error)
        print("{}  [{}] {}".format("PASS" if passed else "FAIL",
                                   requirement, description))
        failures += not passed
    lab.reset()
    print("{} of {} hidden tests passed".format(len(TESTS) - failures,
                                                len(TESTS)))


if __name__ == "__main__":
    main()

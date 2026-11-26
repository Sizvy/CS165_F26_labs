#!/usr/bin/env python3
"""Sandbox and process helpers for CS 165 Graded Lab 4.

You do not need to modify this file. The exploit skeletons and the checker
import it. It is compatible with Python 3.6 and newer.
"""

import os
from pathlib import Path
import shutil
import subprocess
import sys
import threading


ROOT = Path(__file__).resolve().parent
BINARY = ROOT / "note_service"
WORK = ROOT / "work"
INBOX = WORK / "inbox"
PUBLIC = WORK / "public"
NOTE = INBOX / "submission.txt"
ANNOUNCEMENT = PUBLIC / "announcement.txt"
GRADEBOOK = WORK / "gradebook.txt"

ORIGINAL_NOTE = "original student note\n"
ORIGINAL_ANNOUNCEMENT = "Lab 4 is released.\n"
ORIGINAL_GRADEBOOK = "CS165 GRADES: DO NOT MODIFY\n"

TIMEOUT = 5


# --------------------------------------------------------------- sandbox

def reset():
    """Create a fresh work/ sandbox."""
    _remove_work()
    INBOX.mkdir(parents=True)
    PUBLIC.mkdir()
    NOTE.write_text(ORIGINAL_NOTE, encoding="utf-8")
    ANNOUNCEMENT.write_text(ORIGINAL_ANNOUNCEMENT, encoding="utf-8")
    ANNOUNCEMENT.chmod(0o644)
    GRADEBOOK.write_text(ORIGINAL_GRADEBOOK, encoding="utf-8")


def clean():
    """Remove the sandbox and generated files."""
    _remove_work()
    for path in (ROOT / "__pycache__", ROOT / "note_service.dSYM"):
        if path.exists():
            shutil.rmtree(str(path))


def _remove_work():
    if WORK.is_symlink():
        WORK.unlink()
    elif WORK.exists():
        shutil.rmtree(str(WORK))


def read(path):
    """Return the text of path, or None if it cannot be read."""
    try:
        return Path(path).read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return None


def gradebook_intact():
    return (not GRADEBOOK.is_symlink()
            and read(GRADEBOOK) == ORIGINAL_GRADEBOOK)


# ------------------------------------------------------- running the service

class Result:
    """Outcome of one note_service run. returncode is None after a timeout."""

    def __init__(self, returncode, stdout, stderr):
        self.returncode = returncode
        self.stdout = stdout
        self.stderr = stderr

    @property
    def timed_out(self):
        return self.returncode is None


def _start(arguments, umask=None):
    if not BINARY.is_file():
        raise SystemExit("note_service is missing; run make first")

    def set_umask():
        if umask is not None:
            os.umask(umask)

    return subprocess.Popen(
        [str(BINARY)] + list(arguments),
        cwd=str(ROOT),
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        universal_newlines=True,
        preexec_fn=set_umask,
    )


def _finish(process, input_text=""):
    try:
        stdout, stderr = process.communicate(input_text, timeout=TIMEOUT)
        return Result(process.returncode, stdout, stderr)
    except subprocess.TimeoutExpired:
        process.kill()
        stdout, stderr = process.communicate()
        return Result(None, stdout, stderr)


def run(operation, name, message, umask=None):
    """Run note_service once without pausing."""
    return _finish(_start([operation, name, message], umask))


class PausedRun:
    """Run note_service with --pause and stop at its announce_and_pause() hook.

    After construction, self.marker holds the line the service printed (for
    example "CHECKED submission.txt"), or None if it never reached the hook.
    The service is now waiting. Do your attacker actions, then call resume().
    """

    def __init__(self, operation, name, message, umask=None):
        self.process = _start(["--pause", operation, name, message], umask)
        lines = []
        reader = threading.Thread(
            target=lambda: lines.append(self.process.stdout.readline()))
        reader.daemon = True
        reader.start()
        reader.join(TIMEOUT)
        self.marker = lines[0].strip() if lines and lines[0] else None
        self.result = None
        if self.marker is None:
            self.result = _finish(self.process)

    def resume(self):
        """Let the paused service continue and return its Result."""
        if self.result is None:
            self.result = _finish(self.process, "\n")
        return self.result


# ------------------------------------------------------------ exploit output

def report_exploit(title, succeeded, result):
    """Print a uniform summary for the exploit scripts."""
    print("[result]   service exit status: {}".format(
        "timed out" if result.timed_out else result.returncode))
    if result.stderr.strip():
        print("[result]   service stderr: {}".format(result.stderr.strip()))
    print("[result]   gradebook now contains: {!r}".format(read(GRADEBOOK)))
    if succeeded:
        print("EXPLOIT SUCCEEDED: {}".format(title))
    else:
        print("EXPLOIT BLOCKED: the gradebook was not modified.")


def main():
    if len(sys.argv) != 2 or sys.argv[1] not in {"reset", "clean"}:
        raise SystemExit("usage: python3 lab_support.py {reset|clean}")
    if sys.argv[1] == "reset":
        reset()
        print("created a fresh work/ sandbox")
    else:
        clean()
        print("removed the work/ sandbox")


if __name__ == "__main__":
    main()

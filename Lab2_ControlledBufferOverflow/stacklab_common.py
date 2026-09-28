#!/usr/bin/env python3
"""Shared instance-generation logic for CS 165 Lab 2."""
import hashlib
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def _base_template():
    candidates = (
        os.path.join(HERE, "vault_base.c.tmpl"),
        os.path.join(HERE, "reference", "src", "vault_base.c.tmpl"),
    )
    for path in candidates:
        if os.path.exists(path):
            return path
    return candidates[0]


BASE_TEMPLATE = _base_template()


def seeded(student_id):
    """Return deterministic, non-secret instance parameters for an ID."""
    digest = hashlib.sha256(student_id.encode()).digest()
    build_id = hashlib.sha256(student_id.encode()).hexdigest()[:8]
    return {
        "student_id": student_id,
        "note_size": [40, 48, 56, 64][digest[0] % 4],
        "pad_words": [1, 2, 3, 4][digest[1] % 4],
        "build_id": build_id,
        "win_token": "vault-" + build_id,
    }


def render_student(params, base_path=None):
    with open(base_path or BASE_TEMPLATE) as source:
        text = source.read()
    return (text.replace("@@NOTE_SIZE@@", str(params["note_size"]))
                .replace("@@PAD_WORDS@@", str(params["pad_words"]))
                .replace("@@BUILD_ID@@", params["build_id"])
                .replace("@@WIN_TOKEN@@", params["win_token"]))


VULN_CFLAGS = "-g -O0 -Wall -Wextra -fno-omit-frame-pointer -fno-stack-protector -fno-pie"
VULN_LDFLAGS = "-no-pie -Wl,-z,noexecstack"
HARDEN_CFLAGS = "-g -O2 -Wall -Wextra -fstack-protector-strong -D_FORTIFY_SOURCE=2 -fPIE"
HARDEN_LDFLAGS = "-pie -Wl,-z,relro,-z,now -Wl,-z,noexecstack"

MAKEFILE = f"""UNAME_S := $(shell uname -s)
UNAME_M := $(shell uname -m)
ifneq ($(UNAME_S),Linux)
$(error Lab 2 must be built on the course Linux/x86-64 machine)
endif
ifneq ($(UNAME_M),x86_64)
$(error Lab 2 must be built on the course Linux/x86-64 machine)
endif

CC = gcc
VULN_CFLAGS = {VULN_CFLAGS}
VULN_LDFLAGS = {VULN_LDFLAGS}
HARDEN_CFLAGS = {HARDEN_CFLAGS}
HARDEN_LDFLAGS = {HARDEN_LDFLAGS}

all: vault

vault: vault.c
\t$(CC) $(VULN_CFLAGS) -o $@ $< $(VULN_LDFLAGS)

harden: vault-hardened

vault-hardened: vault.c
\t$(CC) $(HARDEN_CFLAGS) -o $@ $< $(HARDEN_LDFLAGS)

test: vault
\t./vault < tests/accept.bin
\t./vault < tests/reject.bin

clean:
\trm -f vault vault-hardened

tar:
\ttar czf lab2-submission.tgz vault.c payload.bin writeup.md

.PHONY: all harden test clean tar
"""

SAMPLE_INPUTS = {
    "accept.bin": b"OPEN\n",
    "reject.bin": b"NOPE\n",
}


def write_student_files(out_dir, params, base_path=None):
    os.makedirs(os.path.join(out_dir, "tests"), exist_ok=True)
    with open(os.path.join(out_dir, "vault.c"), "w") as output:
        output.write(render_student(params, base_path))
    with open(os.path.join(out_dir, "Makefile"), "w") as output:
        output.write(MAKEFILE)
    for name, data in SAMPLE_INPUTS.items():
        with open(os.path.join(out_dir, "tests", name), "wb") as output:
            output.write(data)

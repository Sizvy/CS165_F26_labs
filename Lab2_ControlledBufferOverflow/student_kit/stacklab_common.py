#!/usr/bin/env python3
"""Student-kit copy of Lab 2's public instance-generation logic."""
import hashlib
import os

HERE = os.path.dirname(os.path.abspath(__file__))
BASE_TEMPLATE = os.path.join(HERE, "vault_base.c.tmpl")


def seeded(student_id):
    digest = hashlib.sha256(student_id.encode()).digest()
    build_id = hashlib.sha256(student_id.encode()).hexdigest()[:8]
    return {
        "student_id": student_id,
        "note_size": [40, 48, 56, 64][digest[0] % 4],
        "pad_words": [1, 2, 3, 4][digest[1] % 4],
        "build_id": build_id,
        "win_token": "vault-" + build_id,
    }


def render_student(params):
    with open(BASE_TEMPLATE) as source:
        text = source.read()
    return (text.replace("@@NOTE_SIZE@@", str(params["note_size"]))
                .replace("@@PAD_WORDS@@", str(params["pad_words"]))
                .replace("@@BUILD_ID@@", params["build_id"])
                .replace("@@WIN_TOKEN@@", params["win_token"]))


MAKEFILE = """UNAME_S := $(shell uname -s)
UNAME_M := $(shell uname -m)
ifneq ($(UNAME_S),Linux)
$(error Lab 2 must be built on the course Linux/x86-64 machine)
endif
ifneq ($(UNAME_M),x86_64)
$(error Lab 2 must be built on the course Linux/x86-64 machine)
endif

CC = gcc
VULN_CFLAGS = -g -O0 -Wall -Wextra -fno-omit-frame-pointer -fno-stack-protector -fno-pie
VULN_LDFLAGS = -no-pie -Wl,-z,noexecstack
HARDEN_CFLAGS = -g -O2 -Wall -Wextra -fstack-protector-strong -D_FORTIFY_SOURCE=2 -fPIE
HARDEN_LDFLAGS = -pie -Wl,-z,relro,-z,now -Wl,-z,noexecstack

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


def write_student_files(out_dir, params):
    os.makedirs(os.path.join(out_dir, "tests"), exist_ok=True)
    with open(os.path.join(out_dir, "vault.c"), "w") as output:
        output.write(render_student(params))
    with open(os.path.join(out_dir, "Makefile"), "w") as output:
        output.write(MAKEFILE)
    for name, data in {"accept.bin": b"OPEN\n", "reject.bin": b"NOPE\n"}.items():
        with open(os.path.join(out_dir, "tests", name), "wb") as output:
            output.write(data)

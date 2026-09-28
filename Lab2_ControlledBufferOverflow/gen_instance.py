#!/usr/bin/env python3
"""Generate instructor materials for one CS 165 Lab 2 student instance."""
import difflib
import json
import os
import sys

from stacklab_common import seeded, render_student, write_student_files

HERE = os.path.dirname(os.path.abspath(__file__))

FIX_OLD = "    memcpy(note, input, len);"
FIX_NEW = (
    "    if (len > sizeof(note)) {\n"
    "        puts(\"(request too large)\");\n"
    "        return;\n"
    "    }\n"
    "    memcpy(note, input, len);"
)


def make_fixed(source):
    if FIX_OLD not in source:
        raise ValueError("reference fix anchor not found")
    return source.replace(FIX_OLD, FIX_NEW, 1)


def main():
    if len(sys.argv) not in (2, 3):
        raise SystemExit("usage: python3 gen_instance.py <student-id> [output-dir]")
    student_id = sys.argv[1]
    output = sys.argv[2] if len(sys.argv) == 3 else os.path.join(HERE, "instances", student_id)
    params = seeded(student_id)
    student_dir = os.path.join(output, "student")
    solution_dir = os.path.join(output, "solution")
    os.makedirs(solution_dir, exist_ok=True)
    write_student_files(student_dir, params)
    vulnerable = render_student(params)
    fixed = make_fixed(vulnerable)
    with open(os.path.join(solution_dir, "vault_fixed.c"), "w") as output_file:
        output_file.write(fixed)
    patch = "".join(difflib.unified_diff(
        vulnerable.splitlines(keepends=True), fixed.splitlines(keepends=True),
        fromfile="vault.c", tofile="vault.c"))
    with open(os.path.join(solution_dir, "reference_fix.patch"), "w") as output_file:
        output_file.write(patch)
    with open(os.path.join(output, "instance.json"), "w") as output_file:
        json.dump(params, output_file, indent=2)
    print(f"instance for {student_id} -> {output}")


if __name__ == "__main__":
    main()

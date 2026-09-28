#!/usr/bin/env python3
"""Generate a personal CS 165 Lab 2 instance."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import stacklab_common as C


def main():
    if len(sys.argv) != 2:
        raise SystemExit("usage: python3 make_vault.py <your-student-id>")
    student_id = sys.argv[1].strip()
    params = C.seeded(student_id)
    C.write_student_files(".", params)
    print(f"Generated vault.c for '{student_id}' (build {params['build_id']}).")
    print("Next: make && ./vault < tests/accept.bin")


if __name__ == "__main__":
    main()

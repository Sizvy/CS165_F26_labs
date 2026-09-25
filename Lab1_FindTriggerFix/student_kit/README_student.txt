CS 165 - Lab 1 : generating your program
=========================================

1. Keep these four files together in one folder:
       make_recman.py
       recman_common.py
       recman_base.c.tmpl
       README_student.txt

2. Generate YOUR copy of the program (use your SID/NetID exactly as told):
       python3 make_recman.py <your-student-id>

   This creates recman.c, a Makefile, and a tests/ folder here.

3. Build and run it:
       make                       # builds with AddressSanitizer
       ./recman tests/sample1.txt

Your program is unique to your id, and it is graded against that same id, so
generate it once with the correct id and work on that file. See the lab handout
for the actual assignment.

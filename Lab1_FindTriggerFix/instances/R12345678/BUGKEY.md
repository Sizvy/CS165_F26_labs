# Lab 1 -- Instructor Answer Key
Student: `R12345678`  ·  build id `7d5c5d89`  ·  NAMELEN=24  MAXREC=64

| Bug | Class | Line in student recman.c | Expected ASan/crash signature |
|-----|-------|--------------------------|-------------------------------|
| bug1 | CWE-121/CWE-787  stack buffer overflow (unbounded copy) | ~58 | stack-buffer-overflow |
| bug2 | CWE-122/CWE-787  heap buffer overflow (append without realloc) | ~74 | heap-buffer-overflow |
| bug3 | CWE-416         use-after-free (dangling link after delete) | ~101 | heap-use-after-free |
| bug4 | CWE-190 -> CWE-122  integer overflow in size calc -> heap overflow | ~80 | heap-buffer-overflow |
| bug5 | CWE-476         NULL pointer dereference (id not present) | ~107 | SEGV, unknown-crash, null |

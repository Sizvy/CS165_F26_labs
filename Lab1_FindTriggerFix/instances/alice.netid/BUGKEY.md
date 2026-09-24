# Lab 1 -- Instructor Answer Key
Student: `alice.netid`  ·  build id `ce799696`  ·  NAMELEN=28  MAXREC=48

| Bug | Class | Line in student recman.c | Expected ASan/crash signature |
|-----|-------|--------------------------|-------------------------------|
| bug1 | CWE-121/CWE-787  stack buffer overflow (unbounded copy) | ~59 | stack-buffer-overflow |
| bug2 | CWE-122/CWE-787  heap buffer overflow (append without realloc) | ~75 | heap-buffer-overflow |
| bug3 | CWE-416         use-after-free (dangling link after delete) | ~102 | heap-use-after-free |
| bug4 | CWE-190 -> CWE-122  integer overflow in size calc -> heap overflow | ~81 | heap-buffer-overflow |
| bug5 | CWE-476         NULL pointer dereference (id not present) | ~108 | SEGV, unknown-crash, null |

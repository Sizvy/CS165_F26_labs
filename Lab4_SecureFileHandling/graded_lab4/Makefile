CC ?= cc
CFLAGS ?= -std=c11 -O0 -g -Wall -Wextra -Wpedantic
# _DARWIN_C_SOURCE exposes O_NOFOLLOW on macOS; it is harmless on Linux.
CPPFLAGS ?= -D_POSIX_C_SOURCE=200809L -D_DARWIN_C_SOURCE

.PHONY: all reset test exploit1 exploit2 clean

all: note_service

note_service: note_service.c
	$(CC) $(CPPFLAGS) $(CFLAGS) $< -o $@

reset:
	python3 lab_support.py reset

test: note_service
	python3 check_lab.py

exploit1: note_service
	python3 exploit_update.py

exploit2: note_service
	python3 exploit_publish.py

clean:
	$(RM) note_service
	python3 lab_support.py clean

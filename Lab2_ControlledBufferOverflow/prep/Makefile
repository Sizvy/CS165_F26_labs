CC = gcc
CFLAGS = -g -O0 -Wall -Wextra -fno-omit-frame-pointer

all: stack_walk

stack_walk: stack_walk.c
	$(CC) $(CFLAGS) -o $@ $<

clean:
	rm -f stack_walk

.PHONY: all clean

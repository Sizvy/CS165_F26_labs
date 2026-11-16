import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { FileBlob, Presentation, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "/Users/Asus/Documents/PhD_Journey/Fall 2026/CS165_F26_labs";
const buildDir = path.join(workspaceDir, ".codex-build/lab4_slides");
const renderDir = path.join(buildDir, "final_renders_v2");
const outputDir = path.join(workspaceDir, "Lab4_SecureFileHandling/slides");
const FINAL_PPTX = path.join(outputDir, "CS165_Ungraded_Lab4_Filesystem_Races_v2.pptx");
const SKILL_DIR = "/Users/Asus/.codex/plugins/cache/openai-primary-runtime/presentations/26.1112.11217/skills/presentations";
const RUNTIME_PYTHON = "/Users/Asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";
const RUNTIME_NODE_MODULES = "/Users/Asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
process.env.RUNTIME_NODE_MODULES = RUNTIME_NODE_MODULES;
const referencePath = path.join(workspaceDir, "olid_slides/CS165_Ungraded_Lab_Fuzzing_Basics.pptx");

const C = {
  navy: "#183B5B",
  blue: "#256D9B",
  teal: "#16858C",
  tealLight: "#DDEFF0",
  text: "#17232D",
  gray: "#56636D",
  pale: "#F3F6F8",
  line: "#D4DEE5",
  red: "#B64242",
  redLight: "#F8EAEA",
  orange: "#C67A16",
  orangeLight: "#F9EEDC",
  green: "#2E7D5B",
  greenLight: "#E5F2EB",
  white: "#FFFFFF",
};

const presentation = Presentation.create({ slideSize: { width: 1280, height: 720 } });

function addText(slide, text, position, options = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position,
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.style = {
    fontSize: options.fontSize ?? 22,
    typeface: options.typeface ?? "Georgia",
    color: options.color ?? C.text,
    bold: options.bold ?? false,
    italic: options.italic ?? false,
    alignment: options.alignment ?? "left",
    verticalAlignment: options.verticalAlignment ?? "top",
    insets: options.insets ?? 0,
    autoFit: options.autoFit ?? "shrinkText",
  };
  return shape;
}

function addBox(slide, position, options = {}) {
  return slide.shapes.add({
    geometry: options.geometry ?? "rect",
    position,
    fill: options.fill ?? C.pale,
    line: {
      style: "solid",
      fill: options.line ?? C.line,
      width: options.lineWidth ?? 1,
    },
  });
}

function addLabelBox(slide, text, position, options = {}) {
  addBox(slide, position, options);
  return addText(slide, text, position, {
    fontSize: options.fontSize ?? 20,
    color: options.color ?? C.navy,
    bold: options.bold ?? true,
    alignment: options.alignment ?? "center",
    verticalAlignment: options.verticalAlignment ?? "middle",
    insets: options.insets ?? 8,
  });
}

function addArrow(slide, position, color = C.gray) {
  return slide.shapes.add({
    geometry: "rightArrow",
    position,
    fill: color,
    line: { style: "solid", fill: color, width: 0 },
  });
}

function baseSlide(title, number, notes = "") {
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addText(slide, title, { left: 64, top: 38, width: 1050, height: 58 }, {
    fontSize: 34, color: C.navy, bold: true, verticalAlignment: "middle",
  });
  addText(slide, String(number).padStart(2, "0"),
    { left: 1150, top: 43, width: 66, height: 34 },
    { fontSize: 16, color: C.gray, bold: true, alignment: "right", verticalAlignment: "middle" });
  addBox(slide, { left: 64, top: 106, width: 1152, height: 3 }, { fill: C.teal, line: C.teal, lineWidth: 0 });
  addText(slide, "CS 165   Ungraded Lab: Secure File Handling",
    { left: 64, top: 680, width: 520, height: 22 },
    { fontSize: 10.5, color: C.gray, verticalAlignment: "middle" });
  slide.speakerNotes.text = notes;
  slide.speakerNotes.setVisible(true);
  return slide;
}

function bulletList(slide, items, position, options = {}) {
  const text = items.map((item) => `• ${item}`).join("\n");
  return addText(slide, text, position, {
    fontSize: options.fontSize ?? 24,
    color: options.color ?? C.text,
    bold: options.bold ?? false,
    verticalAlignment: options.verticalAlignment ?? "top",
    insets: options.insets ?? 0,
  });
}

function codeBox(slide, code, position, options = {}) {
  addBox(slide, position, { fill: options.fill ?? "#F1F3F5", line: options.line ?? C.line });
  return addText(slide, code,
    { left: position.left + 18, top: position.top + 14, width: position.width - 36, height: position.height - 28 },
    { fontSize: options.fontSize ?? 19, typeface: "Georgia", color: options.color ?? C.text,
      bold: options.bold ?? false, verticalAlignment: "top" });
}

function twoColumns(slide, leftTitle, leftBody, rightTitle, rightBody, options = {}) {
  const x1 = 82;
  const x2 = 664;
  addText(slide, leftTitle, { left: x1, top: 144, width: 500, height: 42 },
    { fontSize: 26, color: options.leftColor ?? C.blue, bold: true });
  addText(slide, leftBody, { left: x1, top: 204, width: 500, height: 390 },
    { fontSize: options.fontSize ?? 22, color: C.text });
  addBox(slide, { left: 630, top: 140, width: 2, height: 468 }, { fill: C.line, line: C.line, lineWidth: 0 });
  addText(slide, rightTitle, { left: x2, top: 144, width: 500, height: 42 },
    { fontSize: 26, color: options.rightColor ?? C.teal, bold: true });
  addText(slide, rightBody, { left: x2, top: 204, width: 500, height: 390 },
    { fontSize: options.fontSize ?? 22, color: C.text });
}

// 1. Cover
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addBox(slide, { left: 0, top: 0, width: 24, height: 720 }, { fill: C.teal, line: C.teal, lineWidth: 0 });
  addText(slide, "Secure File Handling", { left: 86, top: 142, width: 780, height: 84 },
    { fontSize: 50, color: C.navy, bold: true, verticalAlignment: "middle" });
  addText(slide, "Filesystem races", { left: 90, top: 238, width: 700, height: 50 },
    { fontSize: 30, color: C.blue });
  addText(slide, "CS 165 Ungraded Lab", { left: 90, top: 314, width: 700, height: 42 },
    { fontSize: 24, color: C.gray });
  addText(slide, "Paths, links, file descriptors, TOCTOU, and a safe repair",
    { left: 90, top: 382, width: 760, height: 92 },
    { fontSize: 25, color: C.text });
  addLabelBox(slide, "CHECK", { left: 952, top: 168, width: 210, height: 76 },
    { fill: C.navy, line: C.navy, color: C.white, fontSize: 20 });
  addArrow(slide, { left: 1030, top: 260, width: 54, height: 34 }, C.teal);
  addLabelBox(slide, "PATH CHANGES", { left: 952, top: 310, width: 210, height: 76 },
    { fill: C.red, line: C.red, color: C.white, fontSize: 18 });
  addArrow(slide, { left: 1030, top: 402, width: 54, height: 34 }, C.teal);
  addLabelBox(slide, "USE", { left: 952, top: 452, width: 210, height: 76 },
    { fill: C.navy, line: C.navy, color: C.white, fontSize: 20 });
  slide.speakerNotes.text = "Introduce the lab as an operating-system security problem. The program performs a reasonable check and a reasonable file operation, but another process changes the pathname between them. Emphasize that no root access or setuid program appears in this practice exercise.";
  slide.speakerNotes.setVisible(true);
}

// 2. Agenda
{
  const slide = baseSlide("What we will cover", 2,
    "Use this slide to set expectations. The first half builds the filesystem model. The second half applies that model to the supplied vulnerable writer and its repair.");
  const rows = [
    ["1", "Names and objects", "How pathnames, directory entries, and file descriptors differ"],
    ["2", "Links and metadata", "Symbolic links, hard links, stat(), and lstat()"],
    ["3", "The race", "The check/use window in note_writer.c"],
    ["4", "The exploit", "A deterministic pathname replacement"],
    ["5", "The repair", "openat(), O_NOFOLLOW, fstat(), and delayed truncation"],
  ];
  rows.forEach((row, i) => {
    const top = 138 + i * 100;
    addLabelBox(slide, row[0], { left: 82, top, width: 58, height: 58 },
      { fill: i < 2 ? C.blue : C.teal, line: i < 2 ? C.blue : C.teal, color: C.white, fontSize: 24 });
    addText(slide, row[1], { left: 170, top: top - 2, width: 350, height: 32 },
      { fontSize: 22, color: C.navy, bold: true });
    addText(slide, row[2], { left: 170, top: top + 34, width: 950, height: 42 },
      { fontSize: 19, color: C.text });
  });
}

// 3. Scenario
{
  const slide = baseSlide("The lab scenario", 3,
    "The note writer models a service with authority to update files. Students do not need a real privileged process to observe the confused-deputy behavior. The protected gradebook acts as the object the service must never modify.");
  addText(slide, "A small program updates one note inside a trusted inbox.",
    { left: 82, top: 140, width: 1080, height: 58 }, { fontSize: 28, color: C.text, bold: true });
  addLabelBox(slide, "note_writer", { left: 92, top: 258, width: 250, height: 94 },
    { fill: C.navy, line: C.navy, color: C.white, fontSize: 24 });
  addArrow(slide, { left: 382, top: 284, width: 92, height: 40 }, C.gray);
  addLabelBox(slide, "work/inbox/\nsubmission.txt", { left: 512, top: 238, width: 300, height: 132 },
    { fill: C.greenLight, line: C.green, color: C.green, fontSize: 22 });
  addText(slide, "Allowed target", { left: 552, top: 388, width: 220, height: 34 },
    { fontSize: 20, color: C.green, bold: true, alignment: "center" });
  addLabelBox(slide, "work/\ngradebook.txt", { left: 900, top: 238, width: 260, height: 132 },
    { fill: C.redLight, line: C.red, color: C.red, fontSize: 22 });
  addText(slide, "Protected target", { left: 920, top: 388, width: 220, height: 34 },
    { fontSize: 20, color: C.red, bold: true, alignment: "center" });
  addText(slide, "Security goal: normal note updates work, and the gradebook never changes.",
    { left: 128, top: 506, width: 1024, height: 70 },
    { fontSize: 27, color: C.navy, bold: true, alignment: "center", verticalAlignment: "middle" });
}

// 4. Pathname
{
  const slide = baseSlide("A pathname starts a lookup", 4,
    "A pathname is a string that tells the kernel where to begin a sequence of directory lookups. The string does not permanently identify one object. Its meaning depends on the directory entries at lookup time.");
  addText(slide, "work/inbox/submission.txt", { left: 140, top: 144, width: 1000, height: 60 },
    { fontSize: 31, color: C.navy, bold: true, alignment: "center" });
  const parts = ["work", "inbox", "submission.txt"];
  parts.forEach((part, i) => {
    const left = 150 + i * 360;
    addLabelBox(slide, part, { left, top: 276, width: 250, height: 92 },
      { fill: C.pale, line: C.blue, color: C.navy, fontSize: 22 });
    if (i < 2) addArrow(slide, { left: left + 278, top: 302, width: 58, height: 34 }, C.gray);
  });
  addText(slide, "Each component uses the directory state that exists during that lookup.",
    { left: 130, top: 452, width: 1020, height: 62 },
    { fontSize: 26, color: C.text, alignment: "center" });
  addText(slide, "Another process may rename, remove, or replace a directory entry.",
    { left: 130, top: 532, width: 1020, height: 62 },
    { fontSize: 24, color: C.red, bold: true, alignment: "center" });
}

// 5. Directory entry and inode
{
  const slide = baseSlide("Directory entries and file objects", 5,
    "Use inode as a useful Unix model, while noting that students only need the distinction between a name and an underlying object. A directory entry associates a name with a filesystem object.");
  addText(slide, "A directory stores mappings from names to filesystem objects.",
    { left: 82, top: 138, width: 1100, height: 58 }, { fontSize: 27, color: C.text });
  addLabelBox(slide, "submission.txt", { left: 110, top: 262, width: 270, height: 86 },
    { fill: C.pale, line: C.blue, color: C.navy, fontSize: 22 });
  addArrow(slide, { left: 410, top: 288, width: 90, height: 36 }, C.gray);
  addLabelBox(slide, "file object\ninode 4102", { left: 540, top: 238, width: 270, height: 134 },
    { fill: C.tealLight, line: C.teal, color: C.teal, fontSize: 22 });
  addText(slide, "contents\nowner and mode\nlink count", { left: 858, top: 248, width: 270, height: 132 },
    { fontSize: 21, color: C.text, alignment: "center", verticalAlignment: "middle" });
  addText(slide, "Changing the directory entry can make the same name refer to another object.",
    { left: 130, top: 470, width: 1020, height: 82 },
    { fontSize: 27, color: C.navy, bold: true, alignment: "center" });
}

// 6. Descriptor
{
  const slide = baseSlide("A file descriptor names an opened object", 6,
    "After open succeeds, the process receives a small integer. The kernel associates that descriptor with the opened object. Later renames or unlinks of the pathname do not redirect the descriptor to a different object.");
  codeBox(slide, "int fd = open(path, O_WRONLY);", { left: 96, top: 150, width: 600, height: 86 }, { fontSize: 23 });
  addLabelBox(slide, "fd = 3", { left: 126, top: 316, width: 200, height: 92 },
    { fill: C.navy, line: C.navy, color: C.white, fontSize: 25 });
  addArrow(slide, { left: 365, top: 344, width: 82, height: 34 }, C.gray);
  addLabelBox(slide, "kernel open-file entry", { left: 488, top: 302, width: 300, height: 120 },
    { fill: C.pale, line: C.blue, color: C.navy, fontSize: 22 });
  addArrow(slide, { left: 830, top: 344, width: 82, height: 34 }, C.gray);
  addLabelBox(slide, "file object\ninode 4102", { left: 950, top: 302, width: 230, height: 120 },
    { fill: C.tealLight, line: C.teal, color: C.teal, fontSize: 22 });
  addText(slide, "write(fd, ...) follows the descriptor binding, not a fresh pathname lookup.",
    { left: 128, top: 504, width: 1024, height: 74 },
    { fontSize: 27, color: C.navy, bold: true, alignment: "center" });
}

// 7. Comparison
{
  const slide = baseSlide("Pathnames and file descriptors", 7,
    "This distinction drives the entire repair. Pathnames support lookup and can change meaning. Descriptors provide a stable reference after a successful open.");
  twoColumns(slide,
    "Pathname",
    "A string used for lookup\n\nResolved again by each pathname operation\n\nMeaning can change when directory entries change\n\nUseful for locating an object",
    "File descriptor",
    "A process-local integer\n\nBound to an object after open succeeds\n\nRename or unlink does not redirect it\n\nUseful for checking and operating on that object",
    { fontSize: 22 });
  addText(slide, "Security checks should describe the same object that the program later modifies.",
    { left: 110, top: 600, width: 1060, height: 46 },
    { fontSize: 23, color: C.navy, bold: true, alignment: "center" });
}

// 8. Symlink
{
  const slide = baseSlide("Symbolic links", 8,
    "A symbolic link stores another pathname. Opening a symlink normally follows that stored pathname. lstat reports information about the link itself, while stat follows the link.");
  addText(slide, "A symbolic link stores a pathname to be resolved later.",
    { left: 82, top: 140, width: 1100, height: 56 }, { fontSize: 27, color: C.text });
  addLabelBox(slide, "submission.txt", { left: 110, top: 276, width: 260, height: 90 },
    { fill: C.orangeLight, line: C.orange, color: C.orange, fontSize: 22 });
  addText(slide, "symlink contents:\n../gradebook.txt", { left: 430, top: 262, width: 300, height: 118 },
    { fontSize: 22, color: C.text, alignment: "center", verticalAlignment: "middle" });
  addArrow(slide, { left: 756, top: 302, width: 84, height: 34 }, C.gray);
  addLabelBox(slide, "gradebook.txt", { left: 884, top: 276, width: 260, height: 90 },
    { fill: C.redLight, line: C.red, color: C.red, fontSize: 22 });
  addText(slide, "A normal open() follows the final symbolic link unless a flag prevents it.",
    { left: 128, top: 470, width: 1024, height: 76 },
    { fontSize: 26, color: C.navy, bold: true, alignment: "center" });
}

// 9. Hard link
{
  const slide = baseSlide("Hard links", 9,
    "A hard link creates another directory entry for the same object. It does not contain a target pathname and it does not look like a symbolic link. The inode link count records how many names refer to the object.");
  addText(slide, "Two names can refer directly to the same file object.",
    { left: 82, top: 138, width: 1100, height: 56 }, { fontSize: 27, color: C.text });
  addLabelBox(slide, "gradebook.txt", { left: 118, top: 250, width: 260, height: 82 },
    { fill: C.redLight, line: C.red, color: C.red, fontSize: 22 });
  addLabelBox(slide, "submission.txt", { left: 118, top: 390, width: 260, height: 82 },
    { fill: C.orangeLight, line: C.orange, color: C.orange, fontSize: 22 });
  addArrow(slide, { left: 426, top: 278, width: 110, height: 30 }, C.gray);
  addArrow(slide, { left: 426, top: 418, width: 110, height: 30 }, C.gray);
  addLabelBox(slide, "same file object\ninode 7790\nst_nlink = 2", { left: 598, top: 288, width: 330, height: 152 },
    { fill: C.pale, line: C.red, color: C.navy, fontSize: 23 });
  addText(slide, "O_NOFOLLOW does not reject a hard link.",
    { left: 958, top: 322, width: 240, height: 84 },
    { fontSize: 22, color: C.red, bold: true, alignment: "center", verticalAlignment: "middle" });
}

// 10. stat and lstat
{
  const slide = baseSlide("stat() and lstat()", 10,
    "Both calls inspect a name. stat follows a final symbolic link and reports the target. lstat reports the link itself. Neither call reserves the object for a later open.");
  twoColumns(slide,
    "stat(path, &st)",
    "Follows a final symbolic link\n\nReports metadata for the target\n\nUseful when the target object is what matters",
    "lstat(path, &st)",
    "Does not follow the final symbolic link\n\nReports metadata for the link\n\nUseful for detecting a link at that instant",
    { fontSize: 23, leftColor: C.blue, rightColor: C.teal });
  addText(slide, "Both calls resolve a pathname. A later open performs another lookup.",
    { left: 120, top: 558, width: 1040, height: 70 },
    { fontSize: 27, color: C.red, bold: true, alignment: "center" });
}

// 11. open flags
{
  const slide = baseSlide("open() and important flags", 11,
    "Review only the flags used in this exercise. O_NOFOLLOW protects the final component at open time. O_CLOEXEC limits descriptor inheritance. O_NONBLOCK avoids waiting forever on an attacker-supplied FIFO. O_TRUNC requires special care.");
  const rows = [
    ["O_WRONLY", "Open for writing"],
    ["O_NOFOLLOW", "Reject a final symbolic link"],
    ["O_CLOEXEC", "Close the descriptor across exec"],
    ["O_NONBLOCK", "Avoid blocking on objects such as FIFOs"],
    ["O_TRUNC", "Set a regular file's length to zero when open succeeds"],
  ];
  rows.forEach((row, i) => {
    const top = 144 + i * 90;
    addText(slide, row[0], { left: 110, top, width: 280, height: 42 },
      { fontSize: 22, color: i === 4 ? C.red : C.blue, bold: true });
    addText(slide, row[1], { left: 420, top, width: 730, height: 48 },
      { fontSize: 22, color: C.text });
    if (i < rows.length - 1) addBox(slide, { left: 105, top: top + 60, width: 1040, height: 1 }, { fill: C.line, line: C.line, lineWidth: 0 });
  });
}

// 12. O_TRUNC
{
  const slide = baseSlide("Why O_TRUNC is dangerous before validation", 12,
    "Opening with O_TRUNC changes the file before the program can call fstat on the descriptor. If the opened object is unsafe, the damage has already happened. The secure sequence opens without O_TRUNC, validates, then calls ftruncate.");
  codeBox(slide, "fd = open(path, O_WRONLY | O_TRUNC);", { left: 210, top: 142, width: 860, height: 82 }, { fontSize: 24 });
  const steps = [
    ["1", "Resolve path"],
    ["2", "Open object"],
    ["3", "Length becomes zero"],
    ["4", "Program receives fd"],
  ];
  steps.forEach((step, i) => {
    const left = 72 + i * 300;
    addLabelBox(slide, step[0], { left: left + 74, top: 284, width: 56, height: 56 },
      { fill: i === 2 ? C.red : C.navy, line: i === 2 ? C.red : C.navy, color: C.white, fontSize: 22 });
    addText(slide, step[1], { left, top: 366, width: 205, height: 72 },
      { fontSize: 20, color: i === 2 ? C.red : C.text, bold: i === 2, alignment: "center" });
    if (i < 3) addArrow(slide, { left: left + 222, top: 298, width: 54, height: 28 }, C.gray);
  });
  addText(slide, "Validation after open cannot restore truncated contents.",
    { left: 130, top: 508, width: 1020, height: 64 },
    { fontSize: 28, color: C.red, bold: true, alignment: "center" });
}

// 13. Lab files
{
  const slide = baseSlide("Files in the ungraded lab", 13,
    "Briefly identify the files students will use. The instructor folder must not be included in the student kit.");
  const left = [
    ["note_writer.c", "The vulnerable C program students repair"],
    ["exploit.py", "A supplied deterministic race demonstration"],
    ["check_lab.py", "Functional and adversarial checks"],
  ];
  const right = [
    ["lab_support.py", "Creates and removes the local sandbox"],
    ["Makefile", "Build, reset, demo, check, and cleanup commands"],
    ["README.md", "The guided student procedure and questions"],
  ];
  left.forEach((row, i) => {
    const top = 160 + i * 132;
    addText(slide, row[0], { left: 82, top, width: 220, height: 34 }, { fontSize: 21, color: C.blue, bold: true });
    addText(slide, row[1], { left: 82, top: top + 44, width: 480, height: 66 }, { fontSize: 19, color: C.text });
  });
  addBox(slide, { left: 630, top: 148, width: 2, height: 430 }, { fill: C.line, line: C.line, lineWidth: 0 });
  right.forEach((row, i) => {
    const top = 160 + i * 132;
    addText(slide, row[0], { left: 680, top, width: 220, height: 34 }, { fontSize: 21, color: C.teal, bold: true });
    addText(slide, row[1], { left: 680, top: top + 44, width: 480, height: 66 }, { fontSize: 19, color: C.text });
  });
}

// 14. Normal use
{
  const slide = baseSlide("Normal note update", 14,
    "Walk through the baseline before discussing the vulnerability. Students should confirm that the program has useful behavior worth preserving.");
  codeBox(slide,
    "$ make\n$ make reset\n$ ./note_writer submission.txt 'revised student note'\nCHECKED submission.txt",
    { left: 86, top: 142, width: 740, height: 236 }, { fontSize: 22 });
  addText(slide, "After the command", { left: 886, top: 154, width: 280, height: 38 },
    { fontSize: 24, color: C.navy, bold: true, alignment: "center" });
  addLabelBox(slide, "submission.txt\nrevised student note", { left: 880, top: 224, width: 290, height: 116 },
    { fill: C.greenLight, line: C.green, color: C.green, fontSize: 20 });
  addLabelBox(slide, "gradebook.txt\nCS165 GRADES: DO NOT MODIFY", { left: 880, top: 382, width: 290, height: 116 },
    { fill: C.pale, line: C.line, color: C.text, fontSize: 18 });
  addText(slide, "The repair must preserve this behavior.",
    { left: 180, top: 528, width: 920, height: 58 },
    { fontSize: 27, color: C.navy, bold: true, alignment: "center" });
}

// 15. Policy
{
  const slide = baseSlide("The security policy", 15,
    "A clear policy gives students a basis for evaluating each proposed repair. The service can update a regular file directly inside the inbox. It should refuse symbolic links and multiply linked files. The protected gradebook must remain unchanged.");
  addText(slide, "Allowed", { left: 100, top: 150, width: 480, height: 44 },
    { fontSize: 27, color: C.green, bold: true });
  bulletList(slide, [
    "Update a regular file directly inside work/inbox",
    "Write the complete requested message",
    "Keep normal command-line behavior",
  ], { left: 100, top: 220, width: 480, height: 280 }, { fontSize: 22 });
  addBox(slide, { left: 630, top: 148, width: 2, height: 420 }, { fill: C.line, line: C.line, lineWidth: 0 });
  addText(slide, "Forbidden", { left: 680, top: 150, width: 480, height: 44 },
    { fontSize: 27, color: C.red, bold: true });
  bulletList(slide, [
    "Follow a symbolic link supplied as the note",
    "Modify a file that has another hard-link name",
    "Change work/gradebook.txt",
  ], { left: 680, top: 220, width: 480, height: 280 }, { fontSize: 22 });
  addText(slide, "A secure solution must satisfy both sides.",
    { left: 160, top: 554, width: 960, height: 56 },
    { fontSize: 27, color: C.navy, bold: true, alignment: "center" });
}

// 16. Vulnerable code
{
  const slide = baseSlide("The vulnerable sequence", 16,
    "Read the code top to bottom. lstat verifies that path currently names a regular file. announce_and_pause exposes the race window. open resolves the same string again and immediately truncates whatever it finds.");
  codeBox(slide,
`if (lstat(path, &checked) < 0) return -1;
if (!S_ISREG(checked.st_mode)) return -1;

announce_and_pause(name, should_pause);

int fd = open(path, O_WRONLY | O_TRUNC | O_CLOEXEC);`,
    { left: 84, top: 138, width: 730, height: 360 }, { fontSize: 21 });
  addText(slide, "Check", { left: 876, top: 160, width: 250, height: 42 },
    { fontSize: 25, color: C.blue, bold: true, alignment: "center" });
  addText(slide, "lstat(path)", { left: 876, top: 214, width: 250, height: 54 },
    { fontSize: 22, color: C.text, alignment: "center" });
  addText(slide, "Window", { left: 876, top: 302, width: 250, height: 42 },
    { fontSize: 25, color: C.orange, bold: true, alignment: "center" });
  addText(slide, "pathname may change", { left: 876, top: 356, width: 250, height: 54 },
    { fontSize: 20, color: C.text, alignment: "center" });
  addText(slide, "Use", { left: 876, top: 446, width: 250, height: 42 },
    { fontSize: 25, color: C.red, bold: true, alignment: "center" });
  addText(slide, "open(path)", { left: 876, top: 500, width: 250, height: 54 },
    { fontSize: 22, color: C.text, alignment: "center" });
}

// 17. TOCTOU
{
  const slide = baseSlide("Time of check and time of use", 17,
    "Define TOCTOU as a race involving a check and a later use of shared state. The bug requires a security decision based on information that may become stale before the operation.");
  addText(slide, "TOCTOU", { left: 120, top: 144, width: 1040, height: 76 },
    { fontSize: 44, color: C.navy, bold: true, alignment: "center" });
  addLabelBox(slide, "Time of check", { left: 112, top: 292, width: 270, height: 92 },
    { fill: C.tealLight, line: C.teal, color: C.teal, fontSize: 24 });
  addArrow(slide, { left: 430, top: 320, width: 88, height: 34 }, C.gray);
  addLabelBox(slide, "Shared state changes", { left: 548, top: 292, width: 270, height: 92 },
    { fill: C.orangeLight, line: C.orange, color: C.orange, fontSize: 22 });
  addArrow(slide, { left: 866, top: 320, width: 88, height: 34 }, C.gray);
  addLabelBox(slide, "Time of use", { left: 984, top: 292, width: 190, height: 92 },
    { fill: C.redLight, line: C.red, color: C.red, fontSize: 24 });
  addText(slide, "The earlier answer may no longer describe the object used later.",
    { left: 120, top: 474, width: 1040, height: 84 },
    { fontSize: 29, color: C.text, bold: true, alignment: "center" });
}

// 18. Benign timeline
{
  const slide = baseSlide("A normal execution timeline", 18,
    "First show the execution with no attacker. Both lookups happen to reach the same object, so the mistake remains hidden during ordinary testing.");
  addText(slide, "writer process", { left: 120, top: 142, width: 300, height: 40 },
    { fontSize: 24, color: C.blue, bold: true });
  addText(slide, "filesystem state", { left: 740, top: 142, width: 360, height: 40 },
    { fontSize: 24, color: C.teal, bold: true });
  const events = [
    ["lstat(path)", "submission.txt names inode 4102"],
    ["regular-file check passes", "no directory entry changes"],
    ["open(path, O_TRUNC)", "submission.txt still names inode 4102"],
    ["write(fd, message)", "inode 4102 receives the message"],
  ];
  events.forEach((event, i) => {
    const top = 220 + i * 96;
    addText(slide, event[0], { left: 120, top, width: 470, height: 44 },
      { fontSize: 21, color: C.text, bold: i === 0 || i === 2 });
    addText(slide, event[1], { left: 740, top, width: 420, height: 50 },
      { fontSize: 20, color: C.text });
    addBox(slide, { left: 630, top: top + 5, width: 34, height: 3 }, { fill: C.line, line: C.line, lineWidth: 0 });
  });
  addText(slide, "Normal tests do not force the dangerous interleaving.",
    { left: 140, top: 604, width: 1000, height: 42 },
    { fontSize: 23, color: C.navy, bold: true, alignment: "center" });
}

// 19. Attack timeline
{
  const slide = baseSlide("The pathname replacement race", 19,
    "The attacker waits until lstat succeeds, removes the checked entry, creates a symlink with the same name, and then allows open to continue. The writer performs a fresh lookup and follows the symlink.");
  addText(slide, "writer", { left: 82, top: 140, width: 270, height: 38 }, { fontSize: 23, color: C.blue, bold: true });
  addText(slide, "attacker", { left: 480, top: 140, width: 270, height: 38 }, { fontSize: 23, color: C.orange, bold: true });
  addText(slide, "meaning of submission.txt", { left: 850, top: 140, width: 330, height: 38 }, { fontSize: 23, color: C.teal, bold: true });
  const rows = [
    ["lstat(path) passes", "wait", "regular note"],
    ["pause", "unlink submission.txt", "no entry"],
    ["pause", "create symlink", "../gradebook.txt"],
    ["open(path, O_TRUNC)", "resume writer", "gradebook target"],
    ["write(fd, message)", "", "gradebook changed"],
  ];
  rows.forEach((row, i) => {
    const top = 208 + i * 78;
    const danger = i >= 3;
    addText(slide, row[0], { left: 82, top, width: 330, height: 42 },
      { fontSize: 19, color: danger ? C.red : C.text, bold: i === 0 || danger });
    addText(slide, row[1], { left: 480, top, width: 300, height: 42 },
      { fontSize: 19, color: i === 1 || i === 2 ? C.orange : C.text, bold: i === 1 || i === 2 });
    addText(slide, row[2], { left: 850, top, width: 330, height: 42 },
      { fontSize: 19, color: danger ? C.red : C.text, bold: danger });
    addBox(slide, { left: 74, top: top + 54, width: 1110, height: 1 }, { fill: C.line, line: C.line, lineWidth: 0 });
  });
}

// 20. Pause
{
  const slide = baseSlide("The deterministic laboratory pause", 20,
    "The pause removes scheduler luck from the exercise. The writer prints a marker after validation and waits for one byte on standard input. The attacker changes the entry, then sends that byte. The pause makes an existing unsafe ordering reliable.");
  codeBox(slide,
`announce_and_pause(name, should_pause);

printf("CHECKED %s\\n", name);
fflush(stdout);
read(STDIN_FILENO, &byte, 1);`,
    { left: 82, top: 142, width: 600, height: 300 }, { fontSize: 21 });
  addText(slide, "Why it exists", { left: 760, top: 158, width: 390, height: 42 },
    { fontSize: 26, color: C.navy, bold: true, alignment: "center" });
  bulletList(slide, [
    "Every student can reproduce the same interleaving",
    "The checker does not depend on timing luck",
    "The class can inspect each event in order",
  ], { left: 760, top: 232, width: 390, height: 240 }, { fontSize: 21 });
  addText(slide, "Removing the pause hides the window. It does not repair the design.",
    { left: 130, top: 532, width: 1020, height: 62 },
    { fontSize: 26, color: C.red, bold: true, alignment: "center" });
}

// 21. Exploit
{
  const slide = baseSlide("What exploit.py does", 21,
    "Students receive this script so the practice lab can focus on understanding and repair. The later graded lab can require them to construct their own exploit.");
  const steps = [
    ["1", "Reset the sandbox and start note_writer --pause"],
    ["2", "Wait for CHECKED submission.txt"],
    ["3", "Unlink the checked note"],
    ["4", "Create submission.txt as a symlink to ../gradebook.txt"],
    ["5", "Resume the writer and inspect the gradebook"],
  ];
  steps.forEach((step, i) => {
    const top = 140 + i * 94;
    addLabelBox(slide, step[0], { left: 86, top, width: 56, height: 56 },
      { fill: i < 2 ? C.blue : (i < 4 ? C.orange : C.red), line: i < 2 ? C.blue : (i < 4 ? C.orange : C.red), color: C.white, fontSize: 22 });
    addText(slide, step[1], { left: 174, top: top + 2, width: 950, height: 54 },
      { fontSize: 22, color: C.text, verticalAlignment: "middle" });
  });
}

// 22. Result
{
  const slide = baseSlide("The observable security failure", 22,
    "Run make demo. Read the output carefully. The writer returns success because open and write worked. The failure is a policy violation rather than a crash.");
  codeBox(slide,
`$ make demo
[writer]   CHECKED submission.txt
[attacker] unlinking work/inbox/submission.txt
[attacker] replacing it with a symlink to ../gradebook.txt
[attacker] allowing the writer to continue
[result]   gradebook now contains:
           'RACE WON: attacker-controlled contents'
VULNERABLE: the checked path named a different file at open().`,
    { left: 86, top: 138, width: 1108, height: 380 }, { fontSize: 19 });
  addText(slide, "A security bug can preserve control flow and still violate an integrity policy.",
    { left: 118, top: 554, width: 1044, height: 58 },
    { fontSize: 27, color: C.navy, bold: true, alignment: "center" });
}

// 23. Recheck
{
  const slide = baseSlide("Why another pathname check still races", 23,
    "A second lstat can reduce one particular window but creates another one. The attacker only needs to change the entry after the final check and before open. Repeating the same pattern cannot make the pathname stable.");
  const blocks = [
    ["lstat(path)", C.blue],
    ["lstat(path) again", C.blue],
    ["attacker replaces entry", C.orange],
    ["open(path)", C.red],
  ];
  blocks.forEach((block, i) => {
    const left = 54 + i * 302;
    addLabelBox(slide, block[0], { left, top: 264, width: 230, height: 94 },
      { fill: i === 2 ? C.orangeLight : (i === 3 ? C.redLight : C.pale), line: block[1], color: block[1], fontSize: 20 });
    if (i < blocks.length - 1) addArrow(slide, { left: left + 244, top: 294, width: 42, height: 30 }, C.gray);
  });
  addText(slide, "The last pathname check always occurs before the pathname use.",
    { left: 130, top: 446, width: 1020, height: 64 },
    { fontSize: 27, color: C.red, bold: true, alignment: "center" });
  addText(slide, "The repair must remove the security dependence on that gap.",
    { left: 130, top: 528, width: 1020, height: 64 },
    { fontSize: 26, color: C.navy, bold: true, alignment: "center" });
}

// 24. Tempting fixes
{
  const slide = baseSlide("Tempting repairs and their limits", 24,
    "Discuss each idea before showing the complete repair. Rejecting slash helps constrain the final component but does not stop replacement of that component. O_NOFOLLOW helps at open time but does not identify hard links or validate file type.");
  const rows = [
    ["Shorter pause", "Changes probability only", C.red],
    ["A second lstat()", "Leaves another check/use window", C.red],
    ["Reject '/' in the name", "Constrains location but not replacement", C.orange],
    ["O_NOFOLLOW alone", "Stops a final symlink but not hard links or wrong file types", C.orange],
    ["Open first and inspect fd", "Provides a stable object for validation and use", C.green],
  ];
  rows.forEach((row, i) => {
    const top = 138 + i * 96;
    addText(slide, row[0], { left: 88, top, width: 330, height: 42 },
      { fontSize: 21, color: row[2], bold: true });
    addText(slide, row[1], { left: 460, top, width: 700, height: 54 },
      { fontSize: 21, color: C.text });
    addBox(slide, { left: 84, top: top + 62, width: 1080, height: 1 }, { fill: C.line, line: C.line, lineWidth: 0 });
  });
}

// 25. Design
{
  const slide = baseSlide("The descriptor-based design", 25,
    "The secure pattern creates one stable reference and applies later checks and writes to that same reference. The pathname still locates the object, but its later meaning no longer controls the write.");
  addText(slide, "One open descriptor connects validation and use.",
    { left: 110, top: 142, width: 1060, height: 58 }, { fontSize: 29, color: C.navy, bold: true, alignment: "center" });
  const blocks = [
    ["openat()", C.blue],
    ["fstat(fd)", C.teal],
    ["ftruncate(fd)", C.green],
    ["write(fd)", C.green],
  ];
  blocks.forEach((block, i) => {
    const left = 62 + i * 305;
    addLabelBox(slide, block[0], { left, top: 290, width: 230, height: 96 },
      { fill: C.pale, line: block[1], color: block[1], fontSize: 22 });
    if (i < 3) addArrow(slide, { left: left + 246, top: 322, width: 42, height: 30 }, C.gray);
  });
  addText(slide, "Every operation after open refers to fd, so pathname replacement cannot redirect it.",
    { left: 120, top: 482, width: 1040, height: 82 },
    { fontSize: 27, color: C.text, bold: true, alignment: "center" });
}

// 26. Trusted directory
{
  const slide = baseSlide("Opening the trusted directory", 26,
    "Opening the inbox creates a stable directory reference. openat then resolves the untrusted final name relative to that descriptor. The exercise treats work/inbox itself as trusted and allows the attacker to manipulate entries inside it.");
  codeBox(slide,
`int dirfd = open("work/inbox",
                 O_RDONLY | O_DIRECTORY | O_CLOEXEC);`,
    { left: 100, top: 154, width: 780, height: 150 }, { fontSize: 22 });
  addLabelBox(slide, "dirfd", { left: 144, top: 394, width: 180, height: 86 },
    { fill: C.navy, line: C.navy, color: C.white, fontSize: 24 });
  addArrow(slide, { left: 362, top: 422, width: 74, height: 32 }, C.gray);
  addLabelBox(slide, "opened directory\nwork/inbox", { left: 476, top: 374, width: 300, height: 126 },
    { fill: C.tealLight, line: C.teal, color: C.teal, fontSize: 22 });
  addText(slide, "O_DIRECTORY rejects a non-directory object.",
    { left: 846, top: 394, width: 320, height: 84 },
    { fontSize: 22, color: C.text, alignment: "center", verticalAlignment: "middle" });
  addText(slide, "The directory descriptor anchors the next lookup.",
    { left: 160, top: 552, width: 960, height: 48 },
    { fontSize: 26, color: C.navy, bold: true, alignment: "center" });
}

// 27. openat
{
  const slide = baseSlide("Opening the note with openat()", 27,
    "The program opens only the final name relative to dirfd. It omits O_TRUNC so nothing destructive happens before validation. O_NOFOLLOW rejects a final symlink. O_NONBLOCK avoids hanging on a FIFO.");
  codeBox(slide,
`int fd = openat(dirfd, name,
                O_WRONLY | O_NOFOLLOW |
                O_CLOEXEC | O_NONBLOCK);`,
    { left: 84, top: 146, width: 660, height: 202 }, { fontSize: 22 });
  const flags = [
    ["O_WRONLY", "The operation needs write access"],
    ["O_NOFOLLOW", "Reject a final symbolic link"],
    ["O_CLOEXEC", "Limit descriptor inheritance"],
    ["O_NONBLOCK", "Avoid waiting on a FIFO"],
  ];
  flags.forEach((row, i) => {
    const top = 144 + i * 96;
    addText(slide, row[0], { left: 808, top, width: 190, height: 36 }, { fontSize: 19, color: C.teal, bold: true });
    addText(slide, row[1], { left: 1000, top, width: 190, height: 60 }, { fontSize: 17.5, color: C.text });
  });
  addText(slide, "O_TRUNC is intentionally absent.",
    { left: 150, top: 532, width: 980, height: 62 },
    { fontSize: 28, color: C.red, bold: true, alignment: "center" });
}

// 28. fstat
{
  const slide = baseSlide("Validating the opened object", 28,
    "fstat examines the object already bound to fd. The regular-file check rejects directories, FIFOs, devices, and other types. The simplified lab policy requires one hard-link name, which rejects the demonstrated hard-link alias.");
  codeBox(slide,
`struct stat opened;
if (fstat(fd, &opened) < 0) goto cleanup;

if (!S_ISREG(opened.st_mode)) goto cleanup;
if (opened.st_nlink != 1) goto cleanup;`,
    { left: 84, top: 140, width: 700, height: 330 }, { fontSize: 21 });
  addText(slide, "The checks describe fd", { left: 842, top: 164, width: 320, height: 48 },
    { fontSize: 26, color: C.navy, bold: true, alignment: "center" });
  addLabelBox(slide, "regular file", { left: 872, top: 250, width: 260, height: 76 },
    { fill: C.greenLight, line: C.green, color: C.green, fontSize: 21 });
  addLabelBox(slide, "st_nlink == 1", { left: 872, top: 354, width: 260, height: 76 },
    { fill: C.greenLight, line: C.green, color: C.green, fontSize: 21 });
  addText(slide, "A later rename or unlink cannot change what fstat(fd) examined.",
    { left: 128, top: 530, width: 1024, height: 70 },
    { fontSize: 26, color: C.navy, bold: true, alignment: "center" });
}

// 29. truncate and write
{
  const slide = baseSlide("Truncation after validation", 29,
    "After fstat accepts the descriptor, the service may perform the destructive step on that descriptor. ftruncate and write do not resolve the pathname again. write_all handles partial writes and EINTR.");
  codeBox(slide,
`announce_and_pause(name, should_pause);

if (ftruncate(fd, 0) < 0) goto cleanup;
if (write_all(fd, message, strlen(message)) < 0)
    goto cleanup;
if (write_all(fd, "\\n", 1) < 0)
    goto cleanup;`,
    { left: 82, top: 138, width: 720, height: 376 }, { fontSize: 20 });
  addText(slide, "Order matters", { left: 864, top: 156, width: 280, height: 42 },
    { fontSize: 27, color: C.navy, bold: true, alignment: "center" });
  const stages = [
    ["1", "open"],
    ["2", "validate"],
    ["3", "pause"],
    ["4", "truncate and write"],
  ];
  stages.forEach((row, i) => {
    const top = 224 + i * 78;
    addLabelBox(slide, row[0], { left: 862, top, width: 46, height: 46 },
      { fill: i === 3 ? C.green : C.teal, line: i === 3 ? C.green : C.teal, color: C.white, fontSize: 18 });
    addText(slide, row[1], { left: 934, top: top + 4, width: 230, height: 38 },
      { fontSize: 20, color: C.text });
  });
  addText(slide, "The pause now occurs after a safe binding and validation.",
    { left: 128, top: 554, width: 1024, height: 52 },
    { fontSize: 25, color: C.navy, bold: true, alignment: "center" });
}

// 30. Secure interleaving
{
  const slide = baseSlide("The same race after the repair", 30,
    "The attacker can still replace the directory entry after the program opens it. The descriptor remains bound to the original note. The writer may update an unlinked object, so availability can fail, but the gradebook remains safe.");
  addText(slide, "writer", { left: 82, top: 140, width: 270, height: 38 }, { fontSize: 23, color: C.blue, bold: true });
  addText(slide, "attacker", { left: 480, top: 140, width: 270, height: 38 }, { fontSize: 23, color: C.orange, bold: true });
  addText(slide, "descriptor and pathname", { left: 850, top: 140, width: 330, height: 38 }, { fontSize: 23, color: C.teal, bold: true });
  const rows = [
    ["openat() returns fd", "wait", "fd refers to note inode 4102"],
    ["fstat(fd) passes", "wait", "fd still refers to inode 4102"],
    ["pause", "replace name with symlink", "name points to gradebook"],
    ["ftruncate(fd)", "resume writer", "fd still refers to inode 4102"],
    ["write(fd)", "", "gradebook unchanged"],
  ];
  rows.forEach((row, i) => {
    const top = 208 + i * 78;
    addText(slide, row[0], { left: 82, top, width: 330, height: 42 },
      { fontSize: 19, color: i >= 3 ? C.green : C.text, bold: i === 0 || i >= 3 });
    addText(slide, row[1], { left: 480, top, width: 300, height: 42 },
      { fontSize: 19, color: i === 2 ? C.orange : C.text, bold: i === 2 });
    addText(slide, row[2], { left: 850, top, width: 330, height: 42 },
      { fontSize: 18.5, color: i === 4 ? C.green : C.text, bold: i === 4 });
    addBox(slide, { left: 74, top: top + 54, width: 1110, height: 1 }, { fill: C.line, line: C.line, lineWidth: 0 });
  });
}

// 31. Hard-link check
{
  const slide = baseSlide("The hard-link test", 31,
    "The checker also constructs submission.txt as a hard link to gradebook.txt. lstat sees an ordinary regular file, and O_NOFOLLOW does not help. fstat reports st_nlink equal to two, so the repaired program rejects it before truncation.");
  addLabelBox(slide, "gradebook.txt", { left: 92, top: 230, width: 250, height: 80 },
    { fill: C.redLight, line: C.red, color: C.red, fontSize: 21 });
  addLabelBox(slide, "submission.txt", { left: 92, top: 386, width: 250, height: 80 },
    { fill: C.orangeLight, line: C.orange, color: C.orange, fontSize: 21 });
  addArrow(slide, { left: 384, top: 254, width: 86, height: 30 }, C.gray);
  addArrow(slide, { left: 384, top: 410, width: 86, height: 30 }, C.gray);
  addLabelBox(slide, "inode 7790\nst_nlink = 2", { left: 510, top: 296, width: 270, height: 112 },
    { fill: C.pale, line: C.red, color: C.navy, fontSize: 23 });
  addText(slide, "fstat(fd)", { left: 854, top: 234, width: 250, height: 48 },
    { fontSize: 25, color: C.teal, bold: true, alignment: "center" });
  addText(slide, "S_ISREG is true\nst_nlink == 1 is false\n\nReject before ftruncate",
    { left: 838, top: 304, width: 290, height: 180 },
    { fontSize: 21, color: C.text, alignment: "center" });
}

// 32. Checker
{
  const slide = baseSlide("What make check verifies", 32,
    "The checker runs each case in a fresh sandbox. Students should use the case names to diagnose which part of their design remains unsafe.");
  const cases = [
    ["Normal update", "The note changes and the gradebook does not", C.green],
    ["Static symlink", "A link present before open is rejected", C.blue],
    ["Replacement race", "Changing the name after the marker cannot redirect fd", C.teal],
    ["Hard link", "A multiply linked file is rejected before truncation", C.orange],
  ];
  cases.forEach((row, i) => {
    const top = 150 + i * 112;
    addLabelBox(slide, String(i + 1), { left: 88, top, width: 58, height: 58 },
      { fill: row[2], line: row[2], color: C.white, fontSize: 22 });
    addText(slide, row[0], { left: 178, top: top - 4, width: 280, height: 36 },
      { fontSize: 22, color: row[2], bold: true });
    addText(slide, row[1], { left: 178, top: top + 38, width: 920, height: 48 },
      { fontSize: 20, color: C.text });
  });
}

// 33. Security properties
{
  const slide = baseSlide("Integrity and availability", 33,
    "Name the property the repair provides. The gradebook's integrity holds because the race cannot redirect fd. An attacker who can remove names from the inbox can still make the requested note update disappear from the directory, which is an availability problem.");
  twoColumns(slide,
    "Integrity",
    "The gradebook contents remain unchanged.\n\nThe descriptor cannot be redirected after open.\n\nThis is the main lab requirement.",
    "Availability",
    "The attacker may unlink the opened note.\n\nThe writer can update an object that no longer has a visible name.\n\nThe practice repair does not prevent this denial of service.",
    { fontSize: 22, leftColor: C.green, rightColor: C.orange });
  addText(slide, "A repair should state which security property it guarantees.",
    { left: 130, top: 576, width: 1020, height: 54 },
    { fontSize: 26, color: C.navy, bold: true, alignment: "center" });
}

// 34. Workflow
{
  const slide = baseSlide("Ungraded lab workflow", 34,
    "Walk students through the order. They should observe the failure before editing, preserve the synchronization interface, implement the descriptor-based sequence, and then use make check.");
  const steps = [
    ["1", "Build and test", "make   make reset   make test"],
    ["2", "Read the program", "Find lstat, the pause, open, and O_TRUNC"],
    ["3", "Observe the exploit", "make demo"],
    ["4", "Repair the sequence", "open directory, openat, fstat, ftruncate, write"],
    ["5", "Verify", "make check"],
  ];
  steps.forEach((step, i) => {
    const top = 132 + i * 104;
    addLabelBox(slide, step[0], { left: 78, top, width: 56, height: 56 },
      { fill: i < 3 ? C.blue : C.teal, line: i < 3 ? C.blue : C.teal, color: C.white, fontSize: 22 });
    addText(slide, step[1], { left: 164, top: top - 2, width: 330, height: 34 },
      { fontSize: 22, color: C.navy, bold: true });
    addText(slide, step[2], { left: 520, top: top - 2, width: 650, height: 52 },
      { fontSize: 20, color: C.text });
  });
}

// 35. Checkoff
{
  const slide = baseSlide("Checkoff questions", 35,
    "Use these prompts for a short oral check. Students should connect their answers to the actual program order and to the descriptor invariant.");
  const questions = [
    "Why do lstat(path) and open(path) describe two separate lookups?",
    "Why does another lstat call leave a race window?",
    "Why must the program omit O_TRUNC until after fstat succeeds?",
    "Which attack does O_NOFOLLOW address?",
    "Why does fstat(fd) remain meaningful after the attacker replaces the name?",
    "Which property does the repair guarantee, and which one can still fail?",
  ];
  bulletList(slide, questions, { left: 94, top: 140, width: 1090, height: 450 }, { fontSize: 22 });
  addText(slide, "Core idea: open one object, validate that object, and modify that same object.",
    { left: 100, top: 590, width: 1080, height: 54 },
    { fontSize: 26, color: C.navy, bold: true, alignment: "center" });
}

async function writeBlob(filePath, blob) {
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

await fs.mkdir(buildDir, { recursive: true });
await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(renderDir, { recursive: true });

const { finalizePresentation } = await import(pathToFileURL(
  path.join(SKILL_DIR, "container_tools/artifact_tool_utils.mjs"),
).href);

const referenceBytes = await fs.readFile(referencePath);
const referenceSha256 = crypto.createHash("sha256").update(referenceBytes).digest("hex");
const stagingDir = path.join(buildDir, ".codex-finalizer-v2");
await fs.mkdir(stagingDir, { recursive: true });
const candidatePath = path.join(stagingDir, "candidate.pptx");
await (await PresentationFile.exportPptx(presentation)).save(candidatePath);

const requirements = {
  explicitTotalSlideCount: 35,
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [],
};
const fontPolicy = {
  basis: "reference",
  families: ["Georgia"],
  referencePath,
  referenceSha256,
};

await finalizePresentation({
  ...requirements,
  workspaceDir,
  candidatePath,
  finalPath: FINAL_PPTX,
  pythonExecutable: RUNTIME_PYTHON,
  integrityValidatorPath: path.join(SKILL_DIR, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(SKILL_DIR, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: [
    "--expected-slide-size-emu", "12192000,6858000",
    "--validate-bullet-geometry",
    "--validate-heading-fit",
  ],
  requiredNativeTableOwnerSlides: [],
  fontPolicy,
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, "validation.json"),
});

const finalDeck = await PresentationFile.importPptx(await FileBlob.load(FINAL_PPTX));
for (const [index, slide] of finalDeck.slides.items.entries()) {
  await writeBlob(
    path.join(renderDir, `slide-${String(index + 1).padStart(2, "0")}.png`),
    await finalDeck.export({ slide, format: "png", scale: 1 }),
  );
}
await writeBlob(
  path.join(renderDir, "montage.webp"),
  await finalDeck.export({ format: "webp", montage: true, scale: 0.35 }),
);

const inspection = await finalDeck.inspect({
  select: "$.slides[*]",
  include: ["index", "title", "elements.kind", "elements.text", "elements.position", "elements.style", "notes.text"],
});
await fs.writeFile(path.join(renderDir, "content.ndjson"), inspection.ndjson);
console.log(JSON.stringify({ finalPath: FINAL_PPTX, slides: finalDeck.slides.items.length, renderDir }));

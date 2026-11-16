import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "/Users/Asus/Documents/PhD_Journey/Fall 2026/CS165_F26_labs";
const buildDir = path.join(workspaceDir, ".codex-build/lab4_slides/edit_v3");
const renderDir = path.join(buildDir, "renders");
const sourcePath = path.join(workspaceDir, "olid_slides/CS165_Ungraded_Lab4_Filesystem_Races_v2.pptx");
const finalPath = path.join(workspaceDir, "olid_slides/CS165_Ungraded_Lab4_Filesystem_Races_v3.pptx");
const skillDir = "/Users/Asus/.codex/plugins/cache/openai-primary-runtime/presentations/26.1112.11217/skills/presentations";
const runtimePython = "/Users/Asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";
process.env.RUNTIME_NODE_MODULES = "/Users/Asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";

async function writeBlob(filePath, blob) {
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

await fs.mkdir(buildDir, { recursive: true });
await fs.mkdir(renderDir, { recursive: true });

const deck = await PresentationFile.importPptx(await FileBlob.load(sourcePath));

const replacements = new Map([
  // Slide 5: introduce the model without unexplained Unix terminology.
  ["sh/v2twb6dw", "A filename refers to an underlying file"],
  ["sh/yhkbe1o7", "A directory connects each filename to an underlying file."],
  ["sh/w32dkbuh", "underlying file"],
  ["sh/x4vedgvm", "contents\nfile type\npermissions\nlink count"],
  ["sh/ahkvi1cb", "Changing a directory entry can make the same filename refer to a different file."],

  // Slide 6: keep the descriptor model concrete.
  ["sh/j6dcr65c", "A file descriptor refers to an opened file"],
  ["sh/w32twb6l", "kernel tracks the opened file"],
  ["sh/5svutgni", "underlying file"],

  // Slide 7: use file consistently in the comparison.
  ["sh/kzmdova1", "A string used for lookup\n\nResolved again by each pathname operation\n\nMeaning can change when directory entries change\n\nUseful for locating a file"],
  ["sh/fi9c369c", "A process-local integer\n\nBound to a file after open succeeds\n\nRename or unlink does not redirect it\n\nUseful for checking and operating on that file"],
  ["sh/baxkjqlk", "Security checks should describe the same file that the program later modifies."],

  // Slide 9: explain hard links without inode numbers.
  ["sh/mdonql4z", "Two names can refer directly to the same underlying file."],
  ["sh/3y107axw", "same underlying file\nlink count = 2"],

  // Slide 12: plain-language step label.
  ["sh/bulo7u58", "Open file"],

  // Slide 18: identify the file by its role.
  ["sh/6hw3y9sb", "submission.txt refers to the original note"],
  ["sh/7mpknmp0", "submission.txt still refers to the original note"],
  ["sh/snylgrql", "the original note receives the message"],

  // Slide 30: the descriptor stays attached to the original note.
  ["sh/onqx8zix", "fd refers to the original note"],
  ["sh/cbaxczit", "fd still refers to the original note"],
  ["sh/7y5kf2pw", "fd still refers to the original note"],

  // Slide 31: connect the two names without an inode label.
  ["sh/it4nexsf", "same underlying file\nst_nlink = 2"],
]);

for (const [id, text] of replacements) {
  deck.resolve(id).text = text;
}

const noteReplacements = new Map([
  ["nt/i107q5of", "Introduce only the distinction between a filename and the stored file. A directory entry connects submission.txt to an underlying file. Another process can replace that entry, so the same filename can later refer to a different file."],
  ["nt/x8f69ofe", "After open succeeds, the process receives a small integer. The kernel associates that descriptor with the opened file. Later renames or unlinks of the pathname do not redirect the descriptor to a different file."],
  ["nt/udsvah03", "A hard link creates another directory entry for the same underlying file. It does not contain a target pathname and it does not look like a symbolic link. The link count records how many names refer to that file."],
]);
for (const [id, text] of noteReplacements) {
  deck.resolve(id).text = text;
}

const affected = [5, 6, 7, 9, 12, 18, 30, 31];
for (const number of affected) {
  const slide = deck.slides.getItem(number - 1);
  await writeBlob(path.join(renderDir, `slide-${String(number).padStart(2, "0")}.png`), await deck.export({ slide, format: "png", scale: 1 }));
  await fs.writeFile(path.join(renderDir, `slide-${String(number).padStart(2, "0")}.layout.json`), await (await slide.export({ format: "layout", detail: "full" })).text());
}

const stagingDir = path.join(buildDir, ".codex-finalizer");
await fs.mkdir(stagingDir, { recursive: true });
const candidatePath = path.join(stagingDir, "candidate.pptx");
await (await PresentationFile.exportPptx(deck)).save(candidatePath);

const sourceBytes = await fs.readFile(sourcePath);
const sourceSha256 = crypto.createHash("sha256").update(sourceBytes).digest("hex");
const { finalizePresentation } = await import(pathToFileURL(path.join(skillDir, "container_tools/artifact_tool_utils.mjs")).href);
await finalizePresentation({
  explicitTotalSlideCount: 35,
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [],
  workspaceDir,
  candidatePath,
  finalPath,
  pythonExecutable: runtimePython,
  integrityValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: [
    "--expected-slide-size-emu", "12192000,6858000",
    "--validate-bullet-geometry",
    "--validate-heading-fit",
  ],
  fontPolicy: {
    basis: "reference",
    families: ["Georgia"],
    referencePath: sourcePath,
    referenceSha256: sourceSha256,
  },
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, "validation.json"),
});

const finalDeck = await PresentationFile.importPptx(await FileBlob.load(finalPath));
for (const [index, slide] of finalDeck.slides.items.entries()) {
  await writeBlob(path.join(renderDir, `final-${String(index + 1).padStart(2, "0")}.png`), await finalDeck.export({ slide, format: "png", scale: 1 }));
}
await writeBlob(path.join(renderDir, "montage.webp"), await finalDeck.export({ format: "webp", montage: true, scale: 0.35 }));
const inspection = await finalDeck.inspect({
  select: "$.slides[*]",
  include: ["index", "title", "elements.text", "elements.position", "elements.style", "notes.text"],
});
await fs.writeFile(path.join(renderDir, "content.ndjson"), inspection.ndjson);
console.log(JSON.stringify({ finalPath, slides: finalDeck.slides.items.length, affected }));

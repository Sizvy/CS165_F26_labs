import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const workspace = "/Users/Asus/Documents/PhD_Journey/Fall 2026/CS165_F26_labs";
const output = path.join(workspace, ".codex-build/lab4_slides/reference_renders");
const files = [
  "olid_slides/01_lab1_orientation.pptx",
  "olid_slides/02_lab2_Buffer_overflow_attack.pptx",
  "olid_slides/03_lab2_ret2win_prep.pptx",
  "olid_slides/CS165_Ungraded_Lab_Fuzzing_Basics.pptx",
];

async function writeBlob(filePath, blob) {
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

await fs.mkdir(output, { recursive: true });
for (const relative of files) {
  const input = path.join(workspace, relative);
  const stem = path.basename(relative, ".pptx");
  const deck = await PresentationFile.importPptx(await FileBlob.load(input));
  const content = await deck.inspect({
    select: "$.slides[*]",
    include: [
      "index", "title", "layout", "elements.kind", "elements.text",
      "elements.position", "elements.style",
    ],
  });
  await fs.writeFile(path.join(output, `${stem}.ndjson`), content.ndjson);
  await writeBlob(
    path.join(output, `${stem}.webp`),
    await deck.export({ format: "webp", montage: true, scale: 0.5 }),
  );
  console.log(JSON.stringify({
    file: relative,
    slides: deck.slides.items.length,
    slideSize: deck.slideSize,
    masters: deck.masters.items.map((item) => item.name),
    layouts: deck.layouts.items.map((item) => item.name),
  }));
}

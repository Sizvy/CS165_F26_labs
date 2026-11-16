import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const workspace = "/Users/Asus/Documents/PhD_Journey/Fall 2026/CS165_F26_labs";
const input = path.join(workspace, "olid_slides/CS165_Ungraded_Lab4_Filesystem_Races_v2.pptx");
const output = path.join(workspace, ".codex-build/lab4_slides/edit_v3_before");
const affected = [5, 6, 9, 18, 30, 31];

async function writeBlob(filePath, blob) {
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

await fs.mkdir(output, { recursive: true });
const deck = await PresentationFile.importPptx(await FileBlob.load(input));
const inspection = await deck.inspect({
  select: "$.slides[*]",
  include: ["id", "index", "title", "layout", "elements.id", "elements.kind", "elements.text", "elements.position", "elements.style", "notes.id", "notes.text"],
});
await fs.writeFile(path.join(output, "content.ndjson"), inspection.ndjson);
for (const number of affected) {
  const slide = deck.slides.getItem(number - 1);
  await writeBlob(path.join(output, `slide-${String(number).padStart(2, "0")}.png`), await deck.export({ slide, format: "png", scale: 1 }));
  await fs.writeFile(path.join(output, `slide-${String(number).padStart(2, "0")}.layout.json`), await (await slide.export({ format: "layout", detail: "full" })).text());
}
await writeBlob(path.join(output, "montage.webp"), await deck.export({ format: "webp", montage: true, scale: 0.35 }));
console.log(JSON.stringify({ slides: deck.slides.items.length, masters: deck.masters.items.map(x => x.name), layouts: deck.layouts.items.map(x => x.name) }));

// Resize the approved, unaltered REP531 artwork for browser install slots.
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const publicDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../public",
);
const image = fs.readFileSync(path.join(publicDir, "rep531-artwork.png"));
const browser = await chromium.launch({ channel: "msedge" });
try {
  const page = await browser.newPage();
  for (const [name, size] of [
    ["icon-192.png", 192],
    ["icon-512.png", 512],
    ["icon-maskable-512.png", 512],
    ["apple-touch-icon.png", 180],
  ]) {
    const encoded = await page.evaluate(
      async ({ data, size }) => {
        const icon = new Image();
        icon.src = `data:image/png;base64,${data}`;
        await icon.decode();
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        const context = canvas.getContext("2d");
        context.fillStyle = "#101010";
        context.fillRect(0, 0, size, size);
        context.drawImage(icon, 0, 0, size, size);
        return canvas.toDataURL("image/png").split(",")[1];
      },
      { data: image.toString("base64"), size },
    );
    fs.writeFileSync(
      path.join(publicDir, name),
      Buffer.from(encoded, "base64"),
    );
  }
} finally {
  await browser.close();
}

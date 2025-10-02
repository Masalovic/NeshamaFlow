import sharp from "sharp";

// Pick any of your SVGs as the source logo
const SRC = "public/avatars/pineapple.svg";

// Ensure the output folder exists (Vite will serve from /public)
const fs = await import("fs/promises");
await fs.mkdir("public/icons", { recursive: true });

// Regular icons
await sharp(SRC).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(SRC).resize(512, 512).png().toFile("public/icons/icon-512.png");

// Maskable icon with padding so Android's circle mask doesn't clip it
const PADDING = 64;
const base = await sharp({
  create: { width: 512, height: 512, channels: 4, background: "#ffffff" },
})
  .png()
  .toBuffer();
const fg = await sharp(SRC)
  .resize(512 - PADDING * 2, 512 - PADDING * 2)
  .png()
  .toBuffer();
await sharp(base)
  .composite([{ input: fg, gravity: "centre" }])
  .toFile("public/icons/maskable-512.png");

console.log(
  "✅ Generated public/icons/icon-192.png, icon-512.png, maskable-512.png"
);

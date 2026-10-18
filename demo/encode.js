/*
 * Re-encodes a recorded webm into GIF / WebP / MP4.
 *
 *   node encode.js [path/to/input.webm]
 */
const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");
const ffmpegPath = require("ffmpeg-static");

const input = process.argv[2] || path.join(__dirname, "out", "demo.webm");
if (!fs.existsSync(input)) {
  console.error("Input not found:", input);
  process.exit(1);
}

const outDir = path.dirname(input);
const base = path.join(outDir, "demo");
const scale = "fps=12,scale=1000:-1:flags=lanczos";

execFileSync(ffmpegPath, [
  "-y",
  "-i",
  input,
  "-vf",
  `${scale},split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
  "-loop",
  "0",
  `${base}.gif`,
]);
execFileSync(ffmpegPath, ["-y", "-i", input, "-vf", scale, "-loop", "0", `${base}.webp`]);
execFileSync(ffmpegPath, [
  "-y",
  "-i",
  input,
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
  `${base}.mp4`,
]);

console.log("GIF:", `${base}.gif`);
console.log("WebP:", `${base}.webp`);
console.log("MP4:", `${base}.mp4`);

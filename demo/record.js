/*
 * Short demo of the upload step only. Templates, thumbnail templates and intros
 * are pre-seeded in mock-api.js (assumed to be configured already). No
 * application code is modified.
 *
 *   cd demo && npm install && npm run record
 *
 * Output: demo/out/demo.webm plus demo.gif / demo.webp / demo.mp4
 */
const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");
const ffmpegPath = require("ffmpeg-static");

const ROOT = path.resolve(__dirname, "..");
const RENDERER_URL =
  "file:///" + path.join(ROOT, "renderer", "index.html").replace(/\\/g, "/");
const OUT_DIR = path.join(__dirname, "out");
const VIDEO_DIR = path.join(OUT_DIR, "video");
const VIEWPORT = { width: 1180, height: 780 };

function encode(webmPath) {
  const gif = path.join(OUT_DIR, "demo.gif");
  const webp = path.join(OUT_DIR, "demo.webp");
  const mp4 = path.join(OUT_DIR, "demo.mp4");
  const scale = "fps=15,scale=1000:-1:flags=lanczos";

  execFileSync(ffmpegPath, [
    "-y",
    "-i",
    webmPath,
    "-vf",
    `${scale},split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
    "-loop",
    "0",
    gif,
  ]);
  execFileSync(ffmpegPath, [
    "-y",
    "-i",
    webmPath,
    "-vf",
    scale,
    "-loop",
    "0",
    webp,
  ]);
  execFileSync(ffmpegPath, [
    "-y",
    "-i",
    webmPath,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    mp4,
  ]);
  return { gif, webp, mp4 };
}

(async () => {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(VIDEO_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: VIDEO_DIR, size: VIEWPORT },
  });
  const page = await context.newPage();
  await page.addInitScript({ path: path.join(__dirname, "mock-api.js") });

  const wait = (ms) => page.waitForTimeout(ms);
  const slowType = (text, delay = 65) => page.keyboard.type(text, { delay });

  const zoom = async (selector, scale = 1.6) => {
    await page.evaluate(
      ({ selector, scale, viewport }) => {
        const app = document.querySelector(".app");
        if (!app) return;
        app.style.transition = "transform 0.8s cubic-bezier(0.33, 1, 0.68, 1)";
        app.style.transformOrigin = "0 0";
        const current = window.__zoom || { tx: 0, ty: 0, s: 1 };
        const target = selector ? document.querySelector(selector) : null;
        if (!target) {
          app.style.transform = "none";
          window.__zoom = { tx: 0, ty: 0, s: 1 };
          return;
        }
        target.scrollIntoView({ block: "center", inline: "nearest" });
        const rect = target.getBoundingClientRect();
        const layoutCx = (rect.left + rect.width / 2 - current.tx) / current.s;
        const layoutCy = (rect.top + rect.height / 2 - current.ty) / current.s;
        const tx = viewport.width / 2 - layoutCx * scale;
        const ty = viewport.height / 2 - layoutCy * scale;
        app.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
        window.__zoom = { tx, ty, s: scale };
      },
      { selector, scale, viewport: VIEWPORT }
    );
    await wait(900);
  };
  const resetZoom = () => zoom(null, 1);

  page.on("pageerror", (err) => console.error("pageerror:", err.message));

  await page.goto(RENDERER_URL);
  await page.waitForSelector("#view-uploads.active");
  await wait(900);

  // Add a video to the queue
  await page.click("#addBtn");
  await page.waitForSelector(".upload-card");
  await wait(900);

  // Title from the existing template (inline parameter chips)
  await zoom(".upload-card .cmd-field", 1.6);
  const titleField = page.locator(".upload-card .cmd-field").first();
  await titleField.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Delete");
  await wait(300);
  await slowType("/template gameplay", 55);
  await wait(600);
  await page.keyboard.press("Tab");
  await wait(600);
  await slowType("Kingdom Come", 55);
  await page.keyboard.press("Tab");
  await wait(350);
  await slowType("12", 90);
  await wait(900);

  // Reference the existing thumbnail template
  await zoom(".upload-card .card-options .opt:nth-child(4)", 1.7);
  const thumbSelect = page
    .locator('.upload-card .opt:has-text("Thumbnail template") select')
    .first();
  await thumbSelect.selectOption({ label: "Gameplay" });
  await wait(1200);

  // Upload with mocked progress
  await zoom(".upload-card .card-actions button.primary", 1.8);
  const upload = page
    .locator(".upload-card .card-actions button.primary")
    .first();
  await upload.click();
  await zoom(".upload-card", 1.4);
  await wait(4300);

  await resetZoom();
  await wait(1800);

  const video = page.video();
  await context.close();
  await browser.close();

  const webm = path.join(OUT_DIR, "demo.webm");
  const recorded = await video.path();
  fs.copyFileSync(recorded, webm);
  fs.rmSync(VIDEO_DIR, { recursive: true, force: true });

  const outputs = encode(webm);
  console.log("Recorded:", webm);
  console.log("GIF:", outputs.gif);
  console.log("WebP:", outputs.webp);
  console.log("MP4:", outputs.mp4);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

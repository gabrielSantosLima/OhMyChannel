/*
 * Short demo focused on the upload step. Template, thumbnail template and intro
 * are pre-seeded in mock-api.js (assumed already configured). The thumbnail
 * template uses a background image (from Downloads/thumb.png by default) and an
 * episode text, to demonstrate the thumbnail feature.
 *
 *   cd demo && npm install && npm run record
 *
 * Output: demo/out/demo.webm plus demo.gif / demo.webp / demo.mp4
 */
const path = require("path");
const fs = require("fs");
const os = require("os");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");
const ffmpegPath = require("ffmpeg-static");

const ROOT = path.resolve(__dirname, "..");
const RENDERER_URL =
  "file:///" + path.join(ROOT, "renderer", "index.html").replace(/\\/g, "/");
const OUT_DIR = path.join(__dirname, "out");
const VIDEO_DIR = path.join(OUT_DIR, "video");
const VIEWPORT = { width: 1180, height: 780 };
const THUMB_PATH =
  process.env.THUMB_IMAGE || path.join(os.homedir(), "Downloads", "thumb.png");

function readImageDataUrl(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mime =
    ext === "jpg" || ext === "jpeg"
      ? "image/jpeg"
      : ext === "webp"
      ? "image/webp"
      : "image/png";
  return `data:${mime};base64,${fs.readFileSync(filePath).toString("base64")}`;
}

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
  execFileSync(ffmpegPath, ["-y", "-i", webmPath, "-vf", scale, "-loop", "0", webp]);
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

  const thumbDataUrl = readImageDataUrl(THUMB_PATH);
  if (thumbDataUrl) {
    await page.addInitScript((dataUrl) => {
      window.__thumbImage = dataUrl;
    }, thumbDataUrl);
  }
  await page.addInitScript({ path: path.join(__dirname, "mock-api.js") });

  const wait = (ms) => page.waitForTimeout(ms);
  const slowType = (text, delay = 65) => page.keyboard.type(text, { delay });

  /*
   * Smoothly zoom so the element is fully visible (fitted inside the viewport)
   * and centered. Tracks the accumulated transform so repeated zooms stay
   * correct. No scrolling is performed (the target is always on screen here),
   * which keeps transitions between elements smooth.
   */
  const zoom = async (selector, maxScale = 1.8) => {
    await page.evaluate(
      ({ selector, maxScale, viewport }) => {
        const app = document.querySelector(".app");
        if (!app) return;
        app.style.transition = "transform 1.1s cubic-bezier(0.4, 0, 0.2, 1)";
        app.style.transformOrigin = "0 0";
        const current = window.__zoom || { tx: 0, ty: 0, s: 1 };
        const target = selector ? document.querySelector(selector) : null;
        if (!target) {
          app.style.transform = "none";
          window.__zoom = { tx: 0, ty: 0, s: 1 };
          return;
        }
        const rect = target.getBoundingClientRect();
        const layoutCx = (rect.left + rect.width / 2 - current.tx) / current.s;
        const layoutCy = (rect.top + rect.height / 2 - current.ty) / current.s;
        const layoutW = rect.width / current.s;
        const layoutH = rect.height / current.s;
        const pad = 70;
        const fit = Math.min(
          (viewport.width - pad * 2) / layoutW,
          (viewport.height - pad * 2) / layoutH
        );
        const scale = Math.min(maxScale, Math.max(1, fit));
        const tx = viewport.width / 2 - layoutCx * scale;
        const ty = viewport.height / 2 - layoutCy * scale;
        app.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
        window.__zoom = { tx, ty, s: scale };
      },
      { selector, maxScale, viewport: VIEWPORT }
    );
    await wait(1250);
  };
  const resetZoom = () => zoom(null, 1);

  page.on("pageerror", (err) => console.error("pageerror:", err.message));

  await page.goto(RENDERER_URL);
  await page.waitForSelector("#view-uploads.active");
  await wait(1200);

  // Add a video to the queue (already on the uploads screen)
  await page.click("#addBtn");
  await page.waitForSelector(".upload-card");
  await wait(900);

  // Title from the existing template (inline parameter chips)
  await zoom(".upload-card .cmd-field");
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

  // Reference the existing thumbnail template (background + episode text)
  await zoom(".upload-card .card-options .opt:nth-child(4)");
  const thumbSelect = page
    .locator('.upload-card .opt:has-text("Thumbnail template") select')
    .first();
  await thumbSelect.selectOption({ label: "Kingdom Come" });
  await wait(1200);

  // Episode value for the thumbnail
  await zoom(".upload-card .card-thumb-values");
  const episodeInput = page
    .locator(".upload-card .card-thumb-values input")
    .first();
  await episodeInput.click();
  await page.keyboard.press("Control+A");
  await slowType("12", 90);
  await wait(1400);

  // Upload — return to the full app view for the progress
  await zoom(".upload-card .card-actions button.primary");
  const upload = page
    .locator(".upload-card .card-actions button.primary")
    .first();
  await upload.click();
  await resetZoom();
  await wait(4800);

  await wait(1200);

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

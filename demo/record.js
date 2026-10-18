/*
 * Records a demo of the real OhMyChannel renderer (renderer/index.html) with a
 * mocked window.api (see mock-api.js). No application code is modified.
 *
 *   cd demo && npm install && npm run record
 *
 * Output: demo/out/demo.webm plus demo.gif / demo.webp / demo.mp4
 *
 * The recording uses a smooth zoom that pans/zooms toward the element being
 * acted on (a common demo effect).
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
  const slowType = (text, delay = 70) =>
    page.keyboard.type(text, { delay });
  const nav = async (view) => {
    await page.click(`.nav-item[data-view="${view}"]`);
    await wait(700);
  };

  // Smoothly zoom into an element (centered) or reset to the full view.
  const zoom = async (selector, scale = 1.6) => {
    await page.evaluate(
      ({ selector, scale, viewport }) => {
        const app = document.querySelector(".app");
        if (!app) return;
        app.style.transition = "transform 0.8s cubic-bezier(0.33, 1, 0.68, 1)";
        app.style.transformOrigin = "0 0";
        const target = selector ? document.querySelector(selector) : null;
        if (!target) {
          app.style.transform = "none";
          return;
        }
        const rect = target.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const tx = viewport.width / 2 - cx * scale;
        const ty = viewport.height / 2 - cy * scale;
        app.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
      },
      { selector, scale, viewport: VIEWPORT }
    );
    await wait(900);
  };
  const resetZoom = () => zoom(null, 1);

  page.on("pageerror", (err) => console.error("pageerror:", err.message));

  await page.goto(RENDERER_URL);
  await page.waitForSelector("#view-uploads.active");
  await wait(1200);

  // Scene 1 — create an intro with transitions and volume
  await nav("intros");
  await zoom("#introName", 1.5);
  await page.click("#introName");
  await slowType("Gameplay Intro", 80);
  await wait(500);

  await zoom("#introFileBtn", 1.5);
  await page.click("#introFileBtn");
  await wait(700);

  await zoom(".intro-transitions", 1.5);
  await page.selectOption("#introVideoEffect", "crossfade");
  await wait(500);
  await page.click("#introVideoDuration");
  await page.keyboard.press("Control+A");
  await slowType("1", 90);
  await page.selectOption("#introAudioEffect", "crossfade");
  await wait(500);
  await page.click("#introAudioDuration");
  await page.keyboard.press("Control+A");
  await slowType("1", 90);
  await wait(400);

  await zoom(".intro-volume", 1.8);
  await page.fill("#introVolume", "80");
  await page.dispatchEvent("#introVolume", "input");
  await wait(900);

  await zoom("#introPreviewBtn", 1.5);
  await page.click("#introPreviewBtn");
  await wait(2200);

  await resetZoom();
  await page.click("#introSave");
  await wait(1200);

  // Scene 2 — create a title template
  await nav("templates");
  await zoom(".tpl-form", 1.5);
  await page.click("#tplName");
  await slowType("gameplay", 80);
  await page.click("#tplParams");
  await slowType("game,episode", 70);
  await page.click("#tplTitle");
  await slowType("{game} #{episode}", 70);
  await wait(600);
  await page.click("#tplAdd");
  await wait(1400);
  await resetZoom();

  // Scene 3 — upload a video using the template and the intro
  await nav("uploads");
  await page.click("#addBtn");
  await page.waitForSelector(".upload-card");
  await wait(900);

  await zoom(".upload-card", 1.45);
  const titleField = page.locator(".upload-card .cmd-field").first();
  await titleField.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Delete");
  await wait(300);
  await slowType("/template gameplay", 60);
  await wait(700);
  await page.keyboard.press("Tab");
  await wait(700);
  await slowType("Kingdom Come", 60);
  await page.keyboard.press("Tab");
  await wait(400);
  await slowType("12", 90);
  await wait(1000);

  const introSelect = page
    .locator('.upload-card .opt:has-text("Intro") select')
    .first();
  await introSelect.selectOption({ label: "Gameplay Intro" });
  await wait(900);

  const action = page
    .locator(".upload-card .card-actions button.primary")
    .first();
  await action.click();
  await wait(7000);

  await resetZoom();
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

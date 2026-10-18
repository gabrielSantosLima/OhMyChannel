/*
 * Records a demo of the real OhMyChannel renderer (renderer/index.html) with a
 * mocked window.api (see mock-api.js). No application code is modified.
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
  const scale = "fps=12,scale=1000:-1:flags=lanczos";

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
  await page.addInitScript({ path: path.join(__dirname, "mock-api.js") });

  const wait = (ms) => page.waitForTimeout(ms);
  const nav = async (view) => {
    await page.click(`.nav-item[data-view="${view}"]`);
    await wait(500);
  };

  page.on("pageerror", (err) => console.error("pageerror:", err.message));

  await page.goto(RENDERER_URL);
  await page.waitForSelector("#view-uploads.active");
  await wait(900);

  // Scene 1 — create an intro with transitions and volume
  await nav("intros");
  await page.fill("#introName", "Gameplay Intro");
  await wait(300);
  await page.click("#introFileBtn");
  await wait(500);
  await page.selectOption("#introVideoEffect", "crossfade");
  await page.fill("#introVideoDuration", "1");
  await page.selectOption("#introAudioEffect", "crossfade");
  await page.fill("#introAudioDuration", "1");
  await page.fill("#introVolume", "80");
  await page.dispatchEvent("#introVolume", "input");
  await wait(500);
  await page.click("#introPreviewBtn");
  await wait(1600);
  await page.click("#introSave");
  await wait(1000);

  // Scene 2 — create a title template
  await nav("templates");
  await page.fill("#tplName", "gameplay");
  await page.fill("#tplParams", "game,episode");
  await page.fill("#tplTitle", "{game} #{episode}");
  await wait(300);
  await page.click("#tplAdd");
  await wait(1000);

  // Scene 3 — upload a video using the template and the intro
  await nav("uploads");
  await page.click("#addBtn");
  await page.waitForSelector(".upload-card");
  await wait(700);

  const titleField = page.locator(".upload-card .cmd-field").first();
  await titleField.click();
  await wait(200);
  await page.keyboard.type("/template gameplay", { delay: 45 });
  await wait(500);
  await page.keyboard.press("Tab");
  await wait(500);
  await page.keyboard.type("Kingdom Come", { delay: 30 });
  await page.keyboard.press("Tab");
  await wait(300);
  await page.keyboard.type("12", { delay: 60 });
  await wait(700);

  const introSelect = page
    .locator('.upload-card .opt:has-text("Intro") select')
    .first();
  await introSelect.selectOption({ label: "Gameplay Intro" });
  await wait(700);

  const action = page.locator(".upload-card .card-actions button.primary").first();
  await action.click();
  // mock render (~2.4s) + auto-submit upload (~2s)
  await wait(6500);

  const video = page.video();
  await context.close();
  await browser.close();

  const webm = path.join(OUT_DIR, "demo.webm");
  await video.saveAs(webm);
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

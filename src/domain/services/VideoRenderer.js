const { spawn, execFileSync } = require("child_process");

class VideoRenderer {
  constructor({ ffmpegPath, ffprobePath }) {
    this.ffmpegPath = ffmpegPath;
    this.ffprobePath = ffprobePath;
  }

  probe(filePath) {
    const output = execFileSync(
      this.ffprobePath,
      [
        "-v",
        "error",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        filePath,
      ],
      { encoding: "utf8" }
    );
    const data = JSON.parse(output);
    const streams = data.streams || [];
    const video = streams.find((stream) => stream.codec_type === "video");
    const hasAudio = streams.some((stream) => stream.codec_type === "audio");
    const duration = Number(data.format && data.format.duration) || 0;
    const fpsRate = (video && video.r_frame_rate) || "30";
    const parts = fpsRate.split("/").map(Number);
    const fps = parts[1] ? parts[0] / parts[1] : Number(parts[0]) || 30;
    return { duration, fps, fpsRate, hasAudio, width: video && video.width };
  }

  buildFilterGraph({ intro, main, width, height, transition, volume }) {
    const scale =
      `scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
      `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,` +
      `fps=${main.fpsRate}`;
    const audioFormat =
      "aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo";
    const introVolume =
      volume == null ? 1 : Math.min(2, Math.max(0, Number(volume)));
    const volumeFilter = introVolume === 1 ? "" : `,volume=${introVolume}`;

    const filters = [
      `[0:v]${scale}[v0]`,
      `[1:v]${scale}[v1]`,
      intro.hasAudio
        ? `[0:a]${audioFormat}${volumeFilter}[a0]`
        : `anullsrc=r=48000:cl=stereo:d=${intro.duration}[a0]`,
      main.hasAudio
        ? `[1:a]${audioFormat}[a1]`
        : `anullsrc=r=48000:cl=stereo:d=${main.duration}[a1]`,
    ];

    const video = transition.video;
    const audio = transition.audio;
    const crossfade = video.effect === "crossfade" || audio.effect === "crossfade";

    if (crossfade) {
      const requested =
        video.effect === "crossfade" ? video.duration : audio.duration;
      const overlap = Math.min(
        Math.max(0.1, requested || 0.1),
        Math.max(0.1, Math.min(intro.duration, main.duration))
      );
      const offset = Math.max(0, intro.duration - overlap);
      filters.push(
        `[v0][v1]xfade=transition=fade:duration=${overlap}:offset=${offset}[v]`
      );
      filters.push(`[a0][a1]acrossfade=d=${overlap}[a]`);
      return { filterGraph: filters.join(";"), total: intro.duration + main.duration - overlap };
    }

    let v0 = "[v0]";
    let v1 = "[v1]";
    let a0 = "[a0]";
    let a1 = "[a1]";

    if (video.effect === "fade") {
      if (video.fadeOut > 0) {
        filters.push(
          `[v0]fade=t=out:st=${Math.max(0, intro.duration - video.fadeOut)}:d=${video.fadeOut}[v0o]`
        );
        v0 = "[v0o]";
      }
      if (video.fadeIn > 0) {
        filters.push(`[v1]fade=t=in:st=0:d=${video.fadeIn}[v1i]`);
        v1 = "[v1i]";
      }
    }
    if (audio.effect === "fade") {
      if (audio.fadeOut > 0) {
        filters.push(
          `[a0]afade=t=out:st=${Math.max(0, intro.duration - audio.fadeOut)}:d=${audio.fadeOut}[a0o]`
        );
        a0 = "[a0o]";
      }
      if (audio.fadeIn > 0) {
        filters.push(`[a1]afade=t=in:st=0:d=${audio.fadeIn}[a1i]`);
        a1 = "[a1i]";
      }
    }

    filters.push(`${v0}${a0}${v1}${a1}concat=n=2:v=1:a=1[v][a]`);
    return { filterGraph: filters.join(";"), total: intro.duration + main.duration };
  }

  render({
    introPath,
    transition,
    videoPath,
    width,
    height,
    outputPath,
    volume,
    onProgress,
    registerAbort,
  }) {
    const intro = this.probe(introPath);
    const main = this.probe(videoPath);
    const { filterGraph, total } = this.buildFilterGraph({
      intro,
      main,
      width,
      height,
      transition,
      volume,
    });

    const args = [
      "-y",
      "-i",
      introPath,
      "-i",
      videoPath,
      "-filter_complex",
      filterGraph,
      "-map",
      "[v]",
      "-map",
      "[a]",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "20",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      "-progress",
      "pipe:1",
      "-nostats",
      outputPath,
    ];

    return new Promise((resolve, reject) => {
      const child = spawn(this.ffmpegPath, args);
      let buffer = "";
      let errorOutput = "";

      child.stdout.on("data", (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          const match = line.match(/out_time_ms=(\d+)/);
          if (match && onProgress && total > 0) {
            const seconds = Number(match[1]) / 1e6;
            onProgress(Math.min(seconds, total), total);
          }
        }
      });

      child.stderr.on("data", (chunk) => {
        errorOutput += chunk.toString();
      });

      if (registerAbort) {
        registerAbort(() => child.kill("SIGKILL"));
      }

      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) resolve(outputPath);
        else {
          reject(
            new Error(
              `ffmpeg exited with code ${code}: ${errorOutput.slice(-600)}`
            )
          );
        }
      });
    });
  }
}

module.exports = { VideoRenderer };

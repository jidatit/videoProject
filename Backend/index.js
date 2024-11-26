const express = require("express");
const cors = require("cors");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static").path;
const path = require("path");
const fs = require("fs");

const app = express();

// Enable CORS
app.use(cors());
app.use(express.json());

// Configure multer for file upload
const upload = multer({ dest: "uploads/" });

// Set the FFmpeg and FFprobe paths
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, "output");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Helper function to get video information
function getVideoInfo(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata);
    });
  });
}

// Helper function to normalize videos
function normalizeVideo(
  inputPath,
  outputPath,
  targetWidth,
  targetHeight,
  targetFps
) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoFilters([
        {
          filter: "scale",
          options: {
            w: targetWidth,
            h: targetHeight,
            force_original_aspect_ratio: "decrease",
            flags: "lanczos",
          },
        },
        {
          filter: "fps",
          options: targetFps,
        },
      ])
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions("-pix_fmt yuv420p") // Ensure compatibility
      .on("end", () => resolve(outputPath))
      .on("error", (err) => reject(err))
      .save(outputPath);
  });
}

// Route for concatenating videos
app.post("/concat-videos", upload.array("videos", 2), async (req, res) => {
  const { start, end } = req.query;

  if (req.files.length !== 2) {
    return res.status(400).send("You must upload exactly two videos.");
  }

  const video1 = req.files[0].path; // Main video
  const video2 = req.files[1].path; // Intro/outro video

  const processedVideo1 = path.join(outputDir, "processed_video1.mp4");
  const muteVideo2 = path.join(outputDir, "mute_video2.mp4");
  const outputPath = path.join(outputDir, "concatenated.mp4");
  const concatListPath = path.join(outputDir, "concat_list.txt");

  try {
    const targetWidth = 1920;
    const targetHeight = 1080;
    const targetFps = 30;

    // Normalize main video
    await normalizeVideo(
      video1,
      processedVideo1,
      targetWidth,
      targetHeight,
      targetFps
    );

    // Normalize and mute intro/outro video
    await new Promise((resolve, reject) => {
      ffmpeg(video2)
        .videoCodec("libx264")
        .size(`${targetWidth}x${targetHeight}`)
        .fps(targetFps)
        .audioCodec("aac")
        .audioFilters("volume=0") // Mute audio
        .output(muteVideo2)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    // Determine concatenation order
    const isStart = start === "true";
    const isEnd = end === "true";

    let concatVideos = [];
    if (isStart && isEnd) {
      concatVideos = [muteVideo2, processedVideo1, muteVideo2];
    } else if (isStart) {
      concatVideos = [muteVideo2, processedVideo1];
    } else if (isEnd) {
      concatVideos = [processedVideo1, muteVideo2];
    } else {
      concatVideos = [processedVideo1];
    }

    // Prepare concat list
    const concatContent =
      concatVideos.map((video) => `file '${video}'`).join("\n") + "\n";
    fs.writeFileSync(concatListPath, concatContent);

    // Concatenate videos
    ffmpeg()
      .input(concatListPath)
      .inputOptions("-f", "concat", "-safe", "0")
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions("-pix_fmt", "yuv420p", "-preset", "fast")
      .on("end", () => {
        res.download(outputPath, (err) => {
          if (err) {
            console.error("Error downloading the file:", err);
          }
          // Clean up temporary files
          [
            video1,
            video2,
            processedVideo1,
            muteVideo2,
            concatListPath,
            outputPath,
          ].forEach((file) => {
            try {
              fs.unlinkSync(file);
            } catch (cleanupErr) {
              console.error("Error during cleanup:", cleanupErr);
            }
          });
        });
      })
      .on("error", (err) => {
        console.error("FFmpeg error:", err);
        res.status(500).send("Video concatenation failed: " + err.message);
      })
      .save(outputPath);
  } catch (err) {
    console.error("Error processing videos:", err);
    res.status(500).send("Error processing videos: " + err.message);
  }
});

// Start the server
const port = 3001;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

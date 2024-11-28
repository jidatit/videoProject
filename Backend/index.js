const express = require("express");
const cors = require("cors");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static").path;
const path = require("path");
const fs = require("fs");

const app = express();
require("dotenv").config();
// Enable CORS
app.use(
  cors({
    origin: [
      `${process.env.FRONTEND_URL}`, // Add your new frontend URL here
    ],
    // credentials: true,
  })
);

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
      .videoCodec("libx264") // Ensure the video codec is set for compatibility
      .audioCodec("aac") // Re-encode the audio to 'aac' for compatibility if needed
      .outputOptions("-pix_fmt yuv420p") // Ensure pixel format compatibility
      .on("end", () => resolve(outputPath))
      .on("error", (err) => reject(err))
      .save(outputPath);
  });
}

app.post("/concat-videos", upload.array("videos", 2), async (req, res) => {
  console.log("API '/concat-videos' hit.");

  try {
    console.log("Request received. Checking uploaded files...");
    if (req.files.length !== 2) {
      console.error("Invalid file count. Files uploaded:", req.files.length);
      return res.status(400).send("You must upload exactly two videos.");
    }
    const { positions, offset } = req.body;
    console.log("Received positions:", positions, "and offset:", offset);

    const video1 = req.files[0].path; // First video (may not have audio)
    const video2 = req.files[1].path; // Second video (has audio or no audio)
    const processedVideo1 = path.join(
      outputDir,
      `processed_${req.files[0].originalname}`
    );
    const processedVideo2 = path.join(
      outputDir,
      `processed_${req.files[1].originalname}`
    );
    const outputPath = path.join(outputDir, "concatenated.mp4");
    const concatListPath = path.join(outputDir, "concat_list.txt");

    console.log("Paths initialized:", {
      video1,
      video2,
      processedVideo1,
      processedVideo2,
      outputPath,
      concatListPath,
    });

    try {
      console.log("Starting video normalization...");
      await normalizeVideo(video1, processedVideo1, 640, 360, 15);
      console.log("Video 1 normalized successfully.");
      await normalizeVideo(video2, processedVideo2, 640, 360, 15);
      console.log("Video 2 normalized successfully.");

      const audio1Path = path.join(outputDir, "audio1.wav");
      console.log("Starting audio extraction for Video 1...");

      ffmpeg(processedVideo1)
        .output(audio1Path)
        .noVideo()
        .audioCodec("pcm_s16le")
        .on("end", () => {
          console.log("Audio extraction for Video 1 completed.");
        })
        .on("error", (err) => {
          console.error("Error extracting audio for Video 1:", err);
        })
        .run();

      console.log("Waiting for audio extraction to complete...");
      await new Promise((resolve, reject) => {
        const audioExtractionTimeout = setInterval(() => {
          if (fs.existsSync(audio1Path)) {
            console.log("Audio file detected:", audio1Path);
            clearInterval(audioExtractionTimeout);
            resolve();
          }
        }, 1000);

        setTimeout(() => {
          clearInterval(audioExtractionTimeout);
          console.error("Audio extraction timed out.");
          reject(new Error("Audio extraction timed out"));
        }, 30000);
      });

      console.log("Parsing positions...");
      const parsedPositions =
        typeof positions === "string" ? JSON.parse(positions) : positions;

      console.log("Parsed positions:", parsedPositions);

      console.log("Generating concat list...");
      if (parsedPositions.start === true && parsedPositions.end === true) {
        fs.writeFileSync(
          concatListPath,
          `file '${processedVideo2}'\nfile '${processedVideo1}'\nfile '${processedVideo2}'`
        );
      } else if (
        parsedPositions.start === true &&
        parsedPositions.end === false
      ) {
        fs.writeFileSync(
          concatListPath,
          `file '${processedVideo2}'\nfile '${processedVideo1}'`
        );
      } else if (
        parsedPositions.end === true &&
        parsedPositions.start === false
      ) {
        fs.writeFileSync(
          concatListPath,
          `file '${processedVideo1}'\nfile '${processedVideo2}'`
        );
      } else {
        throw new Error("Invalid positions: Cannot create concat list.");
      }

      console.log(
        "Concat list file created:",
        fs.readFileSync(concatListPath, "utf-8")
      );

      console.log("Starting video concatenation...");
      ffmpeg()
        .input(concatListPath)
        .inputOptions("-f", "concat", "-safe", "0")
        .input(audio1Path)
        .outputOptions("-map", "0:v")
        .outputOptions("-map", "[delayed_audio]")
        .outputOptions(
          "-filter_complex",
          `[1:a]adelay=${offset * 1000}:all=1[delayed_audio]`
        )
        .outputOptions("-c:v", "copy")
        .outputOptions("-c:a", "aac")
        .outputOptions("-pix_fmt", "yuv420p")
        .on("end", () => {
          console.log("Concatenation completed successfully.");
          res.download(outputPath, (err) => {
            if (err) {
              console.error("Error downloading the file:", err);
              return res.status(500).send("Error downloading the file");
            }

            console.log("Download successful. Cleaning up temporary files...");
            try {
              [
                video1,
                video2,
                processedVideo1,
                processedVideo2,
                concatListPath,
                outputPath,
                audio1Path,
              ].forEach((file) => {
                try {
                  console.log("Deleting file:", file);
                  fs.unlinkSync(file);
                } catch (cleanupErr) {
                  console.error(`Error deleting ${file}:`, cleanupErr);
                }
              });
              console.log("Cleanup completed.");
            } catch (cleanupErr) {
              console.error("Error during cleanup:", cleanupErr);
            }
          });
        })
        .on("error", (err) => {
          console.error("FFmpeg error during concatenation:", err);
          res.status(500).send("Video concatenation failed: " + err.message);
        })
        .save(outputPath);
    } catch (err) {
      console.error("Error processing videos:", err);
      res.status(500).send("Error processing videos: " + err.message);
    }
  } catch (err) {
    console.error("Unhandled error:", {
      message: err.message,
      stack: err.stack,
      name: err.name,
    });
    res.status(500).json({
      error: "Detailed processing error",
      details: err.message,
    });
  }
});

// Start the server
const port = process.env.PORT;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

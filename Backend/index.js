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
  if (req.files.length !== 2) {
    return res.status(400).send("You must upload exactly two videos.");
  }
  const { positions, offset } = req.body;
  console.log("position: " + positions, offset);
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

  try {
    // Normalize both videos (the first video may have no audio, the second video has audio)
    await normalizeVideo(video1, processedVideo1, 640, 360, 15); // Process video1 (first video) at lower quality
    await normalizeVideo(video2, processedVideo2, 640, 360, 15); // Process video2 (second video) at lower quality

    // Extract audio from processed video 1 (if available)
    const audio1Path = path.join(outputDir, "audio1.wav");

    // Extract audio from processed video 1 (if available)
    ffmpeg(processedVideo1)
      .output(audio1Path)
      .noVideo() // Only extract audio
      .audioCodec("pcm_s16le") // Use pcm_s16le codec for raw audio
      .on("end", () => {
        console.log("Audio extraction for video1 completed");
      })
      .on("error", (err) => {
        console.error("Error extracting audio for video1:", err);
      })
      .run();

    // Wait for audio extraction to finish before proceeding with concatenation
    await new Promise((resolve, reject) => {
      const audioExtractionTimeout = setInterval(() => {
        if (fs.existsSync(audio1Path)) {
          clearInterval(audioExtractionTimeout);
          resolve();
        }
      }, 1000);

      setTimeout(() => {
        clearInterval(audioExtractionTimeout);
        reject(new Error("Audio extraction timed out"));
      }, 30000); // Timeout after 30 seconds if audio extraction doesn't finish
    });

    // Create a concat list file (processedVideo2 -> processedVideo1)
    const parsedPositions =
      typeof positions === "string" ? JSON.parse(positions) : positions;

    console.log("Parsed Positions:", parsedPositions); // Debugging log for positions

    // Generate the concat list based on parsedPositions
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
    // Check if concat_list.txt exists
    if (!fs.existsSync(concatListPath)) {
      throw new Error(`Concat list file not found at path: ${concatListPath}`);
    }
    console.log(
      "Concat list file created successfully:",
      fs.readFileSync(concatListPath, "utf-8")
    );

    // Concatenate videos with stream mapping
    ffmpeg()
      .input(concatListPath)
      .inputOptions("-f", "concat", "-safe", "0")
      .input(audio1Path)
      .outputOptions("-map", "0:v") // Map video from concat list
      .outputOptions("-map", "[delayed_audio]") // Map the delayed audio
      .outputOptions(
        "-filter_complex",
        `
      [1:a]adelay=${offset * 1000}:all=1[delayed_audio]
    `
      ) // Explicitly delay the audio using adelay filter
      .outputOptions("-c:v", "copy")
      .outputOptions("-c:a", "aac")
      .outputOptions("-pix_fmt", "yuv420p")
      .on("end", () => {
        res.download(outputPath, (err) => {
          if (err) {
            console.error("Error downloading the file:", err);
            return res.status(500).send("Error downloading the file");
          }

          // Cleanup code
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
                fs.unlinkSync(file);
              } catch (cleanupErr) {
                console.error(`Error deleting ${file}:`, cleanupErr);
              }
            });
          } catch (cleanupErr) {
            console.error("Error during cleanup:", cleanupErr);
          }
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
const port = process.env.PORT;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

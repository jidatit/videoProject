import { useState, useRef, useEffect } from "react";
import { Upload, Image as ImageIcon, Check } from "lucide-react";
import VideoPreviews from "./VideoPreviews";
import FinalResultPreview from "./FinalPreview";
import axios from "axios";

const VideoEditor = () => {
  const [videoSrc, setVideoSrc] = useState(null);
  const [logoSrc, setLogoSrc] = useState(null);
  const [logoPositions, setLogoPositions] = useState({
    start: false,
    end: false,
  });
  const [videoFile1, setVideoFile1] = useState(null);
  const [videoFile2, setVideoFile2] = useState(null);
  const [previewSrc, setPreviewSrc] = useState(null);
  const mainVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const previewVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [concatenatedUrl, setConcatenatedUrl] = useState(null);
  const [colors, setColors] = useState({
    white: false,
    black: false,
  });
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [showEstimatedTime, setShowEstimatedTime] = useState(null);
  const [videoDuration, setVideoDuration] = useState(null);
  const [timeOptions, setTimeOptions] = useState({
    1: false,
    2: false,
    3: false,
  });
  const [logoDuration, setLogoDuration] = useState(1); // State to store the input value

  const handleInputChange = (event) => {
    const value = event.target.value;
    setLogoDuration(value);
  };
  const toggleColors = (color) => {
    setColors((prev) =>
      Object.keys(prev).reduce(
        (acc, key) => ({
          ...acc,
          [key]: key === color,
        }),
        {}
      )
    );
  };

  const toggleTimeOptions = (time) => {
    setTimeOptions((prev) =>
      Object.keys(prev).reduce(
        (acc, key) => ({
          ...acc,
          [key]: key === time,
        }),
        {}
      )
    );
  };
  const generateVideoClip = async (position, colors, timeOptions) => {
    if (!logoSrc) return;
    console.log("position", position);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 640;
    canvas.height = 360;

    // Create a media stream from the canvas
    const stream = canvas.captureStream(90); // 30 FPS
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/mp4",
    });

    chunksRef.current = [];
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      setPreviewSrc(url);
    };

    // Start recording with timeslice to ensure consistent data collection
    mediaRecorder.start(100); // Record in 100ms chunks

    // Create 3-second animation
    const logo = new Image();
    logo.src = logoSrc;

    await new Promise((resolve) => {
      logo.onload = resolve;
    });

    const fps = 30;
    let duration = logoDuration; // Default duration

    // if (timeOptions[1] === true) {
    //   duration = 1; // Set duration to 1 second
    // }
    // if (timeOptions[2] === true) {
    //   duration = 2; // Set duration to 2 seconds
    // }
    // if (timeOptions[3] === true) {
    //   duration = 3; // Set duration to 3 seconds
    // }

    const totalFrames = fps * duration;
    let frame = 0;
    let startTime = null;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      // Ensure we run for exactly 3 seconds
      if (elapsed >= duration * 1000) {
        mediaRecorder.stop();
        return;
      }

      // Calculate current frame based on actual elapsed time
      frame = Math.min(Math.floor((elapsed / 1000) * fps), totalFrames - 1);

      if (colors.white == true) {
        ctx.fillStyle = "white";
      }

      if (colors.black == true) {
        ctx.fillStyle = "black";
      }
      // Clear canvas
      if (colors.white == false && colors.black == false) {
        ctx.fillStyle = "black";
      }

      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Calculate logo size (30% of canvas)
      const maxWidth = canvas.width * 0.3;
      const maxHeight = canvas.height * 0.3;
      let logoWidth = logo.width;
      let logoHeight = logo.height;

      if (logoWidth > maxWidth) {
        const ratio = maxWidth / logoWidth;
        logoWidth *= ratio;
        logoHeight *= ratio;
      }

      if (logoHeight > maxHeight) {
        const ratio = maxHeight / logoHeight;
        logoWidth *= ratio;
        logoHeight *= ratio;
      }

      // Center logo
      const x = (canvas.width - logoWidth) / 2;
      const y = (canvas.height - logoHeight) / 2;

      // Add fade animation
      const progress = elapsed / (duration * 1000);
      ctx.globalAlpha =
        position.start == true || position.end == true
          ? 1 - progress // Fade out for start
          : progress; // Fade in for end

      ctx.drawImage(logo, x, y, logoWidth, logoHeight);

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (logoPositions.start || logoPositions.end) {
      console.log("Animation", logoPositions);
      generateVideoClip(logoPositions, colors, timeOptions);
    }
  }, [logoPositions, logoSrc, colors, logoDuration]);

  const handleVideoUpload = (event) => {
    const file = event.target.files[0];
    setVideoFile1(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);

      // Create a temporary video element to load and get duration
      const tempVideo = document.createElement("video");
      tempVideo.src = url;

      tempVideo.onloadedmetadata = () => {
        const duration = tempVideo.duration; // Duration in seconds
        setVideoDuration(duration);

        // Determine estimated time based on duration ranges
        let estimatedTimeText = "";
        if (duration <= 120) {
          // 1 to 2 minutes
          estimatedTimeText = "1 or half minute";
        } else if (duration <= 240) {
          // 3 to 4 minutes
          estimatedTimeText = "1 or half minutes";
        } else if (duration <= 300) {
          // 5 minutes
          estimatedTimeText = "1 or 2 minutes";
        } else if (duration <= 600) {
          // 6 to 10 minutes
          estimatedTimeText = "3 to 4 minutes";
        } else if (duration <= 1020) {
          // 11 to 17 minutes
          estimatedTimeText = "5 to 6 minutes";
        } else if (duration <= 1520) {
          // 11 to 17 minutes
          estimatedTimeText = "6 to 7 minutes";
        } else if (duration <= 1820) {
          // 11 to 17 minutes
          estimatedTimeText = "7 to 8 minutes";
        } else {
          // Greater than 17 minutes
          estimatedTimeText = "9+ minutes (processing may take longer)";
        }

        setEstimatedTime(estimatedTimeText);
      };
    }
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoSrc(url);
    }
  };

  const togglePosition = (position) => {
    setLogoPositions((prev) => ({
      ...prev,
      [position]: !prev[position],
    }));
  };

  // const getVideoDuration = (videoElement) => {
  //   return new Promise((resolve) => {
  //     videoElement.onloadedmetadata = () => {
  //       resolve(videoElement.duration);
  //     };
  //   });
  // };

  // Function to fetch video as blob

  // Function to get video duration
  const getVideoDuration = (videoElement) => {
    return new Promise((resolve) => {
      videoElement.onloadedmetadata = () => {
        resolve(videoElement.duration);
      };
    });
  };
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const concatenateVideos = async () => {
    try {
      setIsLoading(true);
      setShowEstimatedTime(true);
      const formData = new FormData();

      // Fetch the Blob data from the URL
      const blobResponse = await fetch(previewSrc);
      const blob = await blobResponse.blob();

      // Create files with custom names
      const fileFromBlob = new File([blob], "custom_video2.mp4", {
        type: "video/mp4",
      });
      const firstVideoFile = new File([videoFile1], "custom_video1.mp4", {
        type: "video/mp4",
      });

      // Append videos with custom names
      formData.append("videos", firstVideoFile);
      formData.append("videos", fileFromBlob);
      formData.append("positions", JSON.stringify(logoPositions)); // Send positions as JSON
      if (logoPositions.start == false) {
        formData.append("offset", 0); // Send offset value
      } else {
        formData.append("offset", logoDuration); // Send offset value
      }

      const response = await axios.post(
        "http://localhost:3001/concat-videos",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          responseType: "blob",
        }
      );

      // Create a URL for the downloaded file
      const downloadUrl = URL.createObjectURL(response.data);

      setConcatenatedUrl(downloadUrl);
      setShowEstimatedTime(false);
    } catch (error) {
      console.error(
        "Error uploading videos:",
        error.response ? error.response.data : error.message
      );
      alert("There was an error processing your videos.");
    } finally {
      setShowEstimatedTime(false);
      setIsLoading(false);
    }
  };
  // Add this progress bar component to display the progress
  const ProgressBar = () => (
    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
      <div
        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  );

  const CustomButton = ({ onClick, disabled, children }) => {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`px-6 py-2 rounded-lg border-2 font-semibold text-white transition-colors 
          ${disabled ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
      >
        {children}
      </button>
    );
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-7xl mx-auto bg-gradient-to-br from-white/70 via-white/90 to-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-8">
        {/* <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-8 text-center">
          Professional Video Editor
        </h2> */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Panel - Controls */}
          <div className="space-y-8">
            {/* Upload Section */}
            <div className="space-y-6">
              {/* Video Upload */}
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Upload Video
                </label>
                <label className="flex items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-xl hover:border-indigo-500 hover:bg-gray-50 cursor-pointer group">
                  <div className="space-y-2 text-center">
                    <Upload className="w-8 h-8 mx-auto text-gray-400 group-hover:text-indigo-500 transition-colors" />
                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-indigo-500">
                        Click to upload
                      </span>{" "}
                      or drag and drop
                    </div>
                    <p className="text-xs text-gray-500">MP4, WebM, or AVI</p>
                  </div>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Logo Upload */}
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Upload Logo
                </label>
                <div className="space-y-4">
                  <label className="flex items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-xl hover:border-indigo-500 hover:bg-gray-50 cursor-pointer group">
                    <div className="space-y-2 text-center">
                      <ImageIcon className="w-8 h-8 mx-auto text-gray-400 group-hover:text-indigo-500 transition-colors" />
                      <div className="text-sm text-gray-600">
                        <span className="font-medium text-indigo-500">
                          Upload logo
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, or SVG</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>

                  {logoSrc && (
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Logo Preview
                      </p>
                      <img
                        src={logoSrc}
                        alt="Logo preview"
                        className="w-20 h-20 object-contain mx-auto"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Logo Positions */}
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Logo Frame Placement
              </label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(logoPositions).map(([position, isActive]) => (
                  <button
                    key={position}
                    onClick={() => togglePosition(position)}
                    className={`
                    flex items-center justify-center px-4 py-3 ml-4 rounded-xl transition-all duration-200
                    ${
                      isActive
                        ? "bg-indigo-500 text-white shadow-lg shadow-indigo-200 transform scale-105"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }
                  `}
                  >
                    {isActive && <Check className="w-4 h-4 mr-2" />}
                    {position.charAt(0).toUpperCase() + position.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-6">
              {/* Color Selector */}
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Logo Bg Color
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(colors).map(([color, isActive]) => (
                    <button
                      key={color}
                      onClick={() => toggleColors(color)}
                      className={`
                flex items-center justify-center px-4 py-3 ml-4 rounded-xl transition-all duration-200
                ${
                  isActive
                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-200 transform scale-105"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }
              `}
                    >
                      {isActive && <Check className="w-4 h-4 mr-2" />}
                      {color.charAt(0).toUpperCase() + color.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Selector */}
              <div className="space-y-4 mb-2">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Logo Duration (in seconds)
                </label>
                <div className="relative max-w-sm ">
                  <input
                    type="number"
                    placeholder="Enter duration"
                    value={logoDuration}
                    onChange={handleInputChange}
                    className="
            w-full px-4 py-3 text-gray-700 bg-gray-200 rounded-lg shadow-md border-1 border-gray-300
            focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all duration-200
          "
                  />
                </div>
              </div>
            </div>
          </div>
          {/* Right Panel - Preview */}
          <div className="space-y-6">
            {/* Preview Section */}
            {/* {!concatenatedUrl && (
              <div className="flex">
                <div className=" bg-gray-200 rounded-lg flex items-center justify-center w-full">
                  <p className="text-gray-500">Edit a video to preview</p>
                </div>
              </div>
            )}

            <div className="flex ">
              <canvas ref={canvasRef} className="hidden" />
              {concatenatedUrl && (
                <div>
                  <h3 className="text-lg font-medium mb-2">
                    Concatenated Result
                  </h3>
                  <video
                    src={concatenatedUrl}
                    className="w-full rounded-xl"
                    controls
                    autoPlay
                  />
                </div>
              )}
            </div> */}
            <VideoPreviews
              previewSrc={previewSrc}
              videoSrc={videoSrc}
              previewVideoRef={previewVideoRef}
              mainVideoRef={mainVideoRef}
            />

            {/* Action Buttons */}
          </div>
        </div>

        {/* Video Previews */}
        <FinalResultPreview
          canvasRef={canvasRef}
          concatenatedUrl={concatenatedUrl}
        />
        <div className="flex flex-col gap-y-4 justify-center items-center">
          <div className="flex gap-4 justify-center mt-6">
            <div>
              {isProcessing && (
                <div className="mt-4">
                  <ProgressBar />
                  <p className="text-center text-sm text-gray-600">
                    Processing: {progress}%
                  </p>
                </div>
              )}
              {/* Rest of your component */}
            </div>
            {logoSrc && (
              <button
                onClick={concatenateVideos}
                disabled={isLoading || !previewSrc || !videoSrc}
                className={`
          px-6 py-3 rounded-xl font-medium transition-all duration-200
          ${
            isLoading || !previewSrc || !videoSrc
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-indigo-500 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-200"
          }
        `}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <span className="animate-spin mr-2 border-2 border-white border-t-transparent rounded-full w-4 h-4"></span>
                    Processing...
                  </span>
                ) : (
                  "Add Logo to Video"
                )}
              </button>
            )}

            {concatenatedUrl && (
              <button
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = concatenatedUrl;
                  a.download = "edited-video.mp4";
                  a.click();
                }}
                className="px-6 py-3 bg-green-500 ml-4 text-white rounded-xl font-medium hover:bg-green-600 transition-all duration-200 shadow-lg shadow-green-200"
              >
                Download Video
              </button>
            )}
          </div>
          {showEstimatedTime && (
            <p className="text-gray-600 ml-4 font-radios  ">
              Estimated Processing Time: {estimatedTime}
            </p>
          )}
          {videoDuration && (
            <p className="text-gray-600 font-radios">
              Video Duration: {Math.floor(videoDuration / 60)} min{" "}
              {Math.floor(videoDuration % 60)} sec
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoEditor;

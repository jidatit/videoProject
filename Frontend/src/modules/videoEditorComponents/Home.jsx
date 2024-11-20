import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Play,
  Pause,
  Image as ImageIcon,
  Check,
  Download,
  Sun,
  Contrast,
} from "lucide-react";

const VideoEditor = () => {
  const [videoSrc, setVideoSrc] = useState(null);
  const [logoSrc, setLogoSrc] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [logoPositions, setLogoPositions] = useState({
    start: false,
    overlay: false,
    end: false,
  });
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [filters, setFilters] = useState({
    brightness: 100,
    contrast: 100,
  });
  const [isRecording, setIsRecording] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const handleVideoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
    }
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoSrc(url);
    }
  };

  const startRecording = () => {
    if (canvasRef.current) {
      chunksRef.current = [];
      const stream = canvasRef.current.captureStream(30); // 30 FPS
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
      });

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "edited-video.webm";
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
  };

  const handleDownload = () => {
    if (videoRef.current && !isRecording) {
      startRecording();
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const togglePosition = (position) => {
    setLogoPositions((prev) => ({
      ...prev,
      [position]: !prev[position],
    }));
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const drawFrame = () => {
    if (!canvasRef.current || !videoRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    const video = videoRef.current;

    // Set canvas size to match video
    canvasRef.current.width = video.videoWidth;
    canvasRef.current.height = video.videoHeight;

    // Clear canvas
    ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%)`;
    ctx.drawImage(
      video,
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    // Draw intro/outro logos
    if (logoSrc) {
      const logoImg = new Image();
      logoImg.src = logoSrc;

      const showIntroLogo = currentTime < 2;
      const showOutroLogo = duration > 0 && currentTime > duration - 2;

      if (
        (showIntroLogo && logoPositions.start) ||
        (showOutroLogo && logoPositions.end)
      ) {
        // Draw white background
        ctx.filter = "none";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        // Draw centered logo
        const logoSize =
          Math.min(canvasRef.current.width, canvasRef.current.height) / 3;
        const x = (canvasRef.current.width - logoSize) / 2;
        const y = (canvasRef.current.height - logoSize) / 2;
        ctx.drawImage(logoImg, x, y, logoSize, logoSize);
      }

      // Draw overlay logo
      if (logoPositions.overlay && !showIntroLogo && !showOutroLogo) {
        ctx.filter = "none";
        const overlaySize = canvasRef.current.width / 10;
        ctx.drawImage(
          logoImg,
          canvasRef.current.width - overlaySize - 20,
          20,
          overlaySize,
          overlaySize
        );
      }
    }

    requestAnimationFrame(drawFrame);
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.addEventListener("loadedmetadata", () => {
        setDuration(videoRef.current.duration);
      });

      videoRef.current.addEventListener("ended", () => {
        if (isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
        }
      });
    }

    const animationFrame = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(animationFrame);
  }, [videoSrc, logoSrc, filters, logoPositions, currentTime, duration]);

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      <div className="bg-gray-100 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Video Editor</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Upload Video
              </label>
              <label className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors">
                <Upload className="w-5 h-5 mr-2" />
                Choose Video
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Upload Logo
              </label>
              <div className="space-y-2">
                <label className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg cursor-pointer hover:bg-green-600 transition-colors">
                  <ImageIcon className="w-5 h-5 mr-2" />
                  Choose Logo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
                {logoSrc && (
                  <div className="mt-2 p-2 bg-white rounded-lg">
                    <p className="text-sm font-medium mb-1">Logo Preview:</p>
                    <img
                      src={logoSrc}
                      alt="Logo preview"
                      className="w-16 h-16 object-contain"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Brightness
              </label>
              <input
                type="range"
                min="0"
                max="200"
                value={filters.brightness}
                onChange={(e) =>
                  handleFilterChange("brightness", e.target.value)
                }
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Contrast</label>
              <input
                type="range"
                min="0"
                max="200"
                value={filters.contrast}
                onChange={(e) => handleFilterChange("contrast", e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Logo Positions
          </label>
          <div className="flex flex-wrap gap-4">
            {Object.entries(logoPositions).map(([position, isActive]) => (
              <button
                key={position}
                onClick={() => togglePosition(position)}
                className={`flex items-center px-4 py-2 rounded-lg ${
                  isActive
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                {isActive && <Check className="w-4 h-4 mr-2" />}
                {position.charAt(0).toUpperCase() + position.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          {videoSrc ? (
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                src={videoSrc}
                className="hidden"
                onTimeUpdate={handleTimeUpdate}
              />
              <canvas ref={canvasRef} className="w-full h-full" />

              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30 flex items-center space-x-4">
                <button
                  onClick={togglePlay}
                  className="bg-white/80 p-2 rounded-full hover:bg-white transition-colors"
                  disabled={isRecording}
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6" />
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  className="bg-green-500/80 p-2 rounded-full hover:bg-green-500 transition-colors text-white"
                  disabled={isRecording}
                >
                  <Download className="w-6 h-6" />
                </button>
              </div>
            </div>
          ) : (
            <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Upload a video to preview</p>
            </div>
          )}
        </div>

        {videoSrc && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between items-center text-sm text-gray-600">
              <span>
                {Math.floor(currentTime)}s / {Math.floor(duration)}s
              </span>
              <div className="flex items-center space-x-2">
                <Sun className="w-4 h-4" />
                <span>{filters.brightness}%</span>
                <Contrast className="w-4 h-4 ml-2" />
                <span>{filters.contrast}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoEditor;

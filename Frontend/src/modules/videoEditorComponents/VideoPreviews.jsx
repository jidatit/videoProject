import React from "react";

const VideoPreviewCard = ({ title, videoSrc, videoRef, placeholderText }) => {
  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all duration-300 hover:scale-[1.02] hover:shadow-3xl">
      <div className="p-6">
        <h3 className="text-xl font-semibold font-poppins text-gray-800 mb-4 flex items-center">
          <span className="w-3 h-3 bg-indigo-500 rounded-full mr-3"></span>
          {title}
        </h3>

        {videoSrc ? (
          <div className="relative rounded-xl overflow-hidden group">
            <video
              ref={videoRef}
              src={videoSrc}
              className="w-full rounded-xl transition-transform duration-300 group-hover:scale-100 cursor-pointer"
              controls
            />
            <div className="absolute inset-0 bg-black/10 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <div className="bg-white/80 p-4 rounded-full shadow-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-indigo-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-48 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
            <div className="text-center space-y-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mx-auto text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-gray-600 font-medium">{placeholderText}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const VideoPreviews = ({
  previewSrc,
  videoSrc,
  previewVideoRef,
  mainVideoRef,
}) => {
  return (
    <div className="mt-12 grid grid-rows-1 lg:grid-rows-2 gap-8">
      <VideoPreviewCard
        title="Logo Preview"
        videoSrc={previewSrc}
        videoRef={previewVideoRef}
        placeholderText="Add an Logo Preview"
      />
      <VideoPreviewCard
        title="Main Video"
        videoSrc={videoSrc}
        videoRef={mainVideoRef}
        placeholderText="Upload your main video"
      />
    </div>
  );
};

export default VideoPreviews;

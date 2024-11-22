import React from "react";

const FinalResultPreview = ({ concatenatedUrl, canvasRef }) => {
  return (
    <div className="w-full">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all duration-300 hover:scale-[1.02] hover:shadow-3xl">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
            Final Result
          </h3>
          <canvas ref={canvasRef} className="w-0 h-0" />
          {concatenatedUrl ? (
            <div className="space-y-4">
              <h3 className="text-lg font-medium mb-2">Final Result</h3>
              <video
                src={concatenatedUrl}
                className="w-full rounded-xl"
                controls
                autoPlay
              />
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 h-64 flex items-center justify-center">
              <div className="text-center space-y-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16 mx-auto text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                </svg>
                <p className="text-gray-600 font-medium text-lg">
                  Preview will appear here
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinalResultPreview;

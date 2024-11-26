import { BrowserRouter as Router, Route, Routes } from "react-router-dom"; // Use BrowserRouter instead of Router
import "./App.css";
import "./index.css";
import VideoEditor from "./modules/videoEditorComponents/Home";
import { Toaster, toast } from "sonner";
function App() {
  return (
    <>
      <Toaster position="top-right" richColors />
      <Router>
        {" "}
        {/* BrowserRouter as Router */}
        <Routes>
          <Route path="/" element={<VideoEditor />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;

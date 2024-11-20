import { BrowserRouter as Router, Route, Routes } from "react-router-dom"; // Use BrowserRouter instead of Router
import "./App.css";
import "./index.css";
import VideoEditor from "./modules/videoEditorComponents/Home";

function App() {
  return (
    <Router>
      {" "}
      {/* BrowserRouter as Router */}
      <Routes>
        <Route path="/" element={<VideoEditor />} />
      </Routes>
    </Router>
  );
}

export default App;

import Dashboard from "./assets/pages/Dashboard";
import "./App.css";
import { Route, Routes } from "react-router";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />

    </Routes>
  );
}

export default App;

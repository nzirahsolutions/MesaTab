import Header from "./Components/Header";
import Footer from "./Components/Footer";
import  Home from "./Pages/Home";
import Prompts from "./Pages/Prompts"
import Resources from "./Pages/Resources";
import Events from "./Pages/Events";
import LogIn from "./Pages/User/LogIn";
import SignUp from "./Pages/User/SignUp";
import Profile from "./Pages/User/Profile";
import Motions from "./Pages/Motions";
import {BrowserRouter as Router, Route, Routes} from "react-router-dom";

function App() {

  return (
    <div className="app">
      <Router>
        <Header />
        <main>
        <Routes>
          <Route path="/" element={<Home/>}/>
          <Route path="/prompts" element={<Prompts/>}/>
          <Route path="/motions" element={<Motions/>}/>
          <Route path="/resources" element={<Resources/>}/>
          <Route path="/events" element={<Events/>}/>
          <Route path="/login" element={<LogIn/>}/>
          <Route path="/signup" element={<SignUp/>}/>
          <Route path="/profile" element={<Profile/>}/>
        </Routes>
        </main>
        <Footer />
      </Router>
    </div>
  )
}

export default App

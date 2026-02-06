import Header from "./Components/Header";
import Footer from "./Components/Footer";
import Home from "./Pages/Home";
import Prompts from "./Pages/Prompts"
import Resources from "./Pages/Resources";
import Events from "./Pages/Events";
import Event from "./Pages/Event/Event";
import Tab from "./Pages/Event/Tab";
import LogIn from "./Pages/User/LogIn";
import SignUp from "./Pages/User/SignUp";
import Profile from "./Pages/User/Profile";
import Motions from "./Pages/Motions";
import {BrowserRouter as Router, Route, Routes} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider } from "./Context/AuthProvider";

function App() {

  return (
    <AuthProvider>
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
          <Route path="/:slug" element={<Event/>}/>
          <Route path="/:slug/:tab" element={<Tab/>}/>
        </Routes>
        </main>
        <Footer />
      </Router>
      <ToastContainer />
      </div>
    </AuthProvider>
  )
}

export default App

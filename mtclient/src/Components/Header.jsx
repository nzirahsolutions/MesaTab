import { useContext, useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useParams} from 'react-router-dom';
import { AuthContext } from "../Context/AuthContext";
import {googleLogout} from '@react-oauth/google';
import {IoIosArrowDropdown, IoIosArrowDropup} from 'react-icons/io';

export default function Header() {
  const navigate = useNavigate();
  const {selectedEvent, setSelectedEvent, user, setUser} = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [isTool, setIsTool] = useState(false);
  const toolRef=useRef(null);
  const params=useParams();

  function logout(){
        const token=localStorage.getItem('token');
        if(token) localStorage.removeItem('token');
        googleLogout();
        setUser(null);
        setMenuOpen(false);
    }
  function navigater(to){
    setMenuOpen(false);
    navigate(to);
  }
  useEffect(() => {
          function handlePointerDown(event) {
              if (!toolRef.current?.contains(event.target)) {
                  setToolsOpen(false);
              }
          }
          document.addEventListener('mousedown', handlePointerDown);
          return () => document.removeEventListener('mousedown', handlePointerDown);
      }, []);
  return (
    <>
    {!selectedEvent?
    <>
    <div className='header'>
      <div className='logo'>
        <div>
          <img src="/header.svg" alt="logo.svg"  onClick={()=>{navigater('/'); setMenuOpen(false)}}/>
        </div>
        <span className='☰' onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen? '':'☰'}</span>
      </div>
      <nav>
        <ul>
          <li><NavLink to="/" className={({isActive})=>isActive?'activeLink':''}>Home</NavLink></li>
          <li><NavLink to="/events" className={({isActive})=>isActive?'activeLink':''}>Events</NavLink></li>
          <li><span onClick={()=>setToolsOpen(!toolsOpen)}>Tools {toolsOpen? <IoIosArrowDropup/>: <IoIosArrowDropdown/>}</span>
            <ul className={toolsOpen? 'open':'close'} onClick={()=>setToolsOpen(false)} ref={toolRef}>
              <li><NavLink to="/debatekeeper" className={({isActive})=>isActive?'activeLink':''}>Debate Keeper</NavLink></li>
              <li><NavLink to="/speechkeeper" className={({isActive})=>isActive?'activeLink':''}>Speech Keeper</NavLink></li>
            </ul>
          </li>
          {/* <li><NavLink to="/motions" className={({isActive})=>isActive?'activeLink':''}>Motions</NavLink></li>
          <li><NavLink to="/prompts" className={({isActive})=>isActive?'activeLink':''}>Prompts</NavLink></li>
          <li><NavLink to="/resources" className={({isActive})=>isActive?'activeLink':''}>Resources</NavLink></li> */}
          {user? 
          <li><NavLink to="/" onClick={logout}>Log Out ({user.name.split(' ')[0]})</NavLink></li>
          :
          <li><NavLink to="/login" onClick={()=>setMenuOpen(false)} className={({isActive})=>isActive?'activeLink':''}>Log In</NavLink></li>
          }
        </ul>
      </nav>
    </div>
    <div className={`sideMenu ${menuOpen? 'Open':'Closed'}`}>
        <ul>
          {/* <li onClick={()=>setMenuOpen(false)}>X</li> */}
          <li onClick={()=>setMenuOpen(false)}><NavLink  to="/" className={({isActive})=>isActive?'activeLink':''}>Home</NavLink></li>
          <li onClick={()=>setMenuOpen(false)}><NavLink  to="/events" className={({isActive})=>isActive?'activeLink':''}>Events</NavLink></li>
          <li><span onClick={()=>setToolsOpen(!toolsOpen)}>Tools {toolsOpen? <IoIosArrowDropup/>: <IoIosArrowDropdown/>}</span>
            <ul className={toolsOpen? 'open':'close'} onClick={()=>{setToolsOpen(false); setMenuOpen(false)}} ref={toolRef}>
              <li><NavLink to="/debatekeeper" className={({isActive})=>isActive?'activeLink':''}>Debate Keeper</NavLink></li>
              <li><NavLink to="/speechkeeper" className={({isActive})=>isActive?'activeLink':''}>Speech Keeper</NavLink></li>
            </ul>
          </li>
          {/* <li onClick={()=>setMenuOpen(false)}><NavLink  to="/motions" className={({isActive})=>isActive?'activeLink':''}>Motions</NavLink></li>
          <li onClick={()=>setMenuOpen(false)}><NavLink  to="/prompts" className={({isActive})=>isActive?'activeLink':''}>Prompts</NavLink></li>
          <li onClick={()=>setMenuOpen(false)}><NavLink to="/resources" className={({isActive})=>isActive?'activeLink':''}>Resources</NavLink></li> */}
          {user? 
          <li><NavLink to="/" onClick={logout}>Log Out ({user.name.split(' ')[0]})</NavLink></li>
          :
          <li><NavLink to="/login" onClick={()=>setMenuOpen(false)} className={({isActive})=>isActive?'activeLink':''}>Log In</NavLink></li>
          }
        </ul>
    </div>
    {menuOpen && <div className='area' onClick={()=>setMenuOpen(false)}></div>}
    </>  
    :<>
    <div className='header'>
      <div className='logo'>
        <div>
          <img src="/header.svg" alt="logo.svg" onClick={()=>{navigater(`/`); setMenuOpen(false);setSelectedEvent(null)}}/>
        </div>
      </div>
      <span onClick={()=>{navigater(`/${selectedEvent.slug}`); setMenuOpen(false)}}>{selectedEvent.title}</span>
    </div>
    </>
    }
    </>
  )
}
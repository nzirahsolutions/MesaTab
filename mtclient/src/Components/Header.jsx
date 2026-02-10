import { useContext, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from "../Context/AuthContext";

export default function Header() {
  const navigate = useNavigate();
  const {selectedEvent} = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
    {!selectedEvent?
    <>
    <div className='header'>
      <div className='logo'>
        <div>
          <img src="/header.svg" alt="logo.svg"  onClick={()=>{navigate('/'); setMenuOpen(false)}}/>
        </div>
        <span className='☰' onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen? '':'☰'}</span>
      </div>
      <nav>
        <ul>
          <li><NavLink to="/" className={({isActive})=>isActive?'activeLink':''}>Home</NavLink></li>
          <li><NavLink to="/events" className={({isActive})=>isActive?'activeLink':''}>Events</NavLink></li>
          <li><NavLink to="/motions" className={({isActive})=>isActive?'activeLink':''}>Motions</NavLink></li>
          <li><NavLink to="/prompts" className={({isActive})=>isActive?'activeLink':''}>Prompts</NavLink></li>
          <li><NavLink to="/resources" className={({isActive})=>isActive?'activeLink':''}>Resources</NavLink></li>
        </ul>
      </nav>
    </div>
    <div className={`sideMenu ${menuOpen? 'Open':'Closed'}`}>
        <ul>
          {/* <li onClick={()=>setMenuOpen(false)}>X</li> */}
          <li onClick={()=>setMenuOpen(false)}><NavLink  to="/" className={({isActive})=>isActive?'activeLink':''}>Home</NavLink></li>
          <li onClick={()=>setMenuOpen(false)}><NavLink  to="/events" className={({isActive})=>isActive?'activeLink':''}>Events</NavLink></li>
          <li onClick={()=>setMenuOpen(false)}><NavLink  to="/motions" className={({isActive})=>isActive?'activeLink':''}>Motions</NavLink></li>
          <li onClick={()=>setMenuOpen(false)}><NavLink  to="/prompts" className={({isActive})=>isActive?'activeLink':''}>Prompts</NavLink></li>
          <li onClick={()=>setMenuOpen(false)}><NavLink to="/resources" className={({isActive})=>isActive?'activeLink':''}>Resources</NavLink></li>
        </ul>
    </div>
    {menuOpen && <div className='area' onClick={()=>setMenuOpen(false)}></div>}
    </>  
    :<>
    <div className='header'>
      <div className='logo'>
        <div>
          <img src="/header.svg" alt="logo.svg" onClick={()=>{navigate(`/${selectedEvent.slug}`); setMenuOpen(false)}}/>
        </div>
      </div>
      <span onClick={()=>{navigate(`/${selectedEvent.slug}`); setMenuOpen(false)}}>{selectedEvent.title}</span>
    </div>
    </>
    }
    </>
  )
}
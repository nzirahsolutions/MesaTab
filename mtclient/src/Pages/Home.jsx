import { Auth } from "../Context/Auth";
import {useNavigate} from 'react-router-dom';

export default function Home() {
  const navigate=useNavigate();
  return (
    <>
    <section id='intro'>
      <div className="textBlock">
        <h1>Welcome {Auth.isAuthenticated && Auth.user.name} to MesaTab!</h1>
        <p>For all your tournament tabulation needs. From debate to chess, MesaTab has your back.</p>
      </div>
    </section>
    <section id='CTAs'>
      <h2>What we do</h2>
      <div className="cardsContainer">
        <div className="card">
          <p>Create and run multi-track tournaments with ease</p>
          {Auth.isAuthenticated ?
          <div className="buttonStack">
            <button className="lightButton" onClick={()=>navigate('/events')}>Create Event</button>
            <button className="lightButton"  onClick={()=>navigate('/events')}>Review Events</button>
          </div>:
          <button className="lightButton"  onClick={()=>navigate('/login')}>Log In</button>
          }
                    
        </div>
        <div className="card">
          <p>Browse our database of debate motions</p>
          <div className="buttonStack">
            <button className="lightButton"  onClick={()=>navigate('/motions')}> Debate Motions</button>
          </div>          
        </div>
        <div className="card">
          <p>Browse our database of Public Speaking Prompts</p>
          <div className="buttonStack">
            <button className="lightButton"  onClick={()=>navigate('/prompts')}> Speech Prompts</button>
          </div>          
        </div>
        <div className="card">
          <p>Browse other resources</p>
          <div className="buttonStack">
            <button className="lightButton"  onClick={()=>navigate('/resources')}> Resources</button>
          </div>          
        </div>
      </div>
      
    </section>
    </>
  )
}

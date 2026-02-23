import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../Context/AuthContext";
import { events as Allevents} from "../Context/SampleData";
import {Findbar} from "../Components/Searchbar";
import { toast } from "react-toastify";
import {useNavigate} from 'react-router-dom';


export default function Events() {
  const { user, setSelectedEvent } = useContext(AuthContext);
  const [creating, setCreating] = useState(false);
  const [events, setEvents] = useState([]);
  const [foundEvent, setFoundEvent] = useState({});
  // const [loading, setLoading] = useState(true);
  // const [error, setError] = useState(null);
  const [userEvents,setUserEvents]=useState([]);
  const navigate=useNavigate();

  
  useEffect(() => {
    function fetchEvents() {
    const userEventIds = Array.isArray(user?.events) ? user.events : [];
    // console.log(userEventIds);
    setEvents([...Allevents]);
    const userEventIdSet = new Set(userEventIds);
    // console.log(userEventIdSet);
    const attendedEvents = Allevents.filter(ev => 
      userEventIdSet.has(ev.eventID)
    );
    setUserEvents(attendedEvents);
    // console.log(attendedEvents);
  }
    fetchEvents();
  }, []);

  //console.log(userEvents);
  function findEvent(r){
    const term=r.current.value.toLowerCase();
    const found=events.filter((event)=>event.slug.toLowerCase()===term);
    if(found.length===0){
      toast.error('Event not found');
      setFoundEvent([]);
      return;
    }
    //console.log(found[0]);
    setFoundEvent({...foundEvent, ...found[0]});
  }
  return (
    <>
    <section id='intro'>
      <h1>Events Management</h1>
      <p>Review past events, create new events, manage ongoing events</p>
    </section>
    {user ?<>
    <section id='newEvent'>
        <h2>Create New Event</h2>
         <><p>Tap here to create and new</p><button className="darkButton" onClick={() => setCreating(!creating)}>{creating?'Cancel Create':'Create Event'}</button></> 
        {creating && 
        <form className="textBlock">
          <h1>New Event</h1>
        </form>
        }
    </section>
    <section id="userEvent">
      <h2>User Events</h2>
      <div className="eventList">
        {userEvents.length===0 ? 
        <p>No ongoing events at the moment.</p> 
        : 
        userEvents.map((event)=>(
          <div key={event.eventID} className="eventCard" onClick={()=>{setSelectedEvent({...event}); navigate(`/${event.slug}`)}}>
            <h3>{event.title}</h3>
            <div>{[...new Set(event.tabs.map(t=>t.track))].map((e,i)=><span key={i}>{e}</span>)}</div>
            <div>
              <p>By <strong>{event.organizer}</strong></p>
            </div>
          </div>
        ))}
      </div>
    </section>
    </>
    :<div className="textBlock">
    <p>Please log in to create and manage events</p><button className="darkButton" onClick={()=>navigate('/login')}>Log In</button></div>}
    <section id="otherEvents">
      <h2>Find Event</h2>
      <div className="textBlock">
        <p>Enter the exact event slug</p>
        <Findbar placeholder='e.g: "PAUDC-2023"' onSearch={findEvent} />
      {foundEvent.slug &&
        <div className="eventCard" onClick={()=>{setSelectedEvent({...foundEvent}); navigate(`/${foundEvent.slug}`)}}>
          <h3>{foundEvent.title}</h3>
            <div>{[...new Set(foundEvent.tabs.map(t=>t.track))].map((e,i)=><span key={i}>{e}</span>)}</div>
            <div>
              <p>By <strong>{foundEvent.organizer}</strong></p>
            </div>
          </div>}
      </div>
    </section>
    </>
  )
}

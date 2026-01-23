import { useEffect, useState } from "react";
import { Auth, events as Allevents} from "../Context/Auth";
import {Findbar} from "../Components/Searchbar";
import { toast } from "react-toastify";


export default function Events() {
  const [creating, setCreating] = useState(false);
  const [events, setEvents] = useState([]);
  const [foundEvent, setFoundEvent] = useState({});
  // const [loading, setLoading] = useState(true);
  // const [error, setError] = useState(null);
  const [userEvents,setUserEvents]=useState([]);

  
  useEffect(() => {
    function fetchEvents() {
    let userEventIds = Auth.user.events;
    setEvents([...Allevents]);
    const userEventIdSet = new Set(userEventIds);
    const attendedEvents = Allevents.filter(ev => 
      userEventIdSet.has(ev.id)
    );
    setUserEvents(attendedEvents);
  }
    fetchEvents();
  }, []);

  //console.log(userEvents);
  function findEvent(r){
    const term=r.current.value.toLowerCase();
    const found=events.filter((event)=>event.url.toLowerCase()===term);
    if(found.length===0){
      toast.error('Event not found');
      setFoundEvent([]);
      return;
    }
    console.log(found[0]);
    setFoundEvent({...foundEvent, ...found[0]});
  }
  return (
    <>
    <section id='intro'>
      <h1>Events Management</h1>
      <p>Review past events, create new events, manage ongoing events</p>
    </section>
    <section id='newEvent'>
        <h2>Create New Event</h2>
        {Auth.isAuthenticated ? <><p>Tap here to create and new</p><button className="darkButton" onClick={() => setCreating(!creating)}>{creating?'Cancel Create':'Create Event'}</button></> : <><p>Please log in to create and manage events</p><button className="darkButton">Log In</button></>}
        {creating && 
        <form className="textBlock">
          <h1>New Event</h1>
        </form>
        }
    </section>
    <section id="userEvent">
      <h2>User Events</h2>
      <div className="eventList">
        {userEvents.length===0 ? <p>No ongoing events at the moment.</p> : userEvents.map((event)=>(
          <div key={event.id} className="eventCard">
            <h3>{event.title}</h3>
            <div>{event.tracks.map((e,i)=><span key={i}>{e}</span>)}</div>
            <div>
              <p>By <strong>{event.organizer}</strong></p>
            </div>
          </div>
        ))}
      </div>
    </section>
    <section id="otherEvents">
      <h2>Find Event</h2>
      <div className="textBlock">
        <p>Enter the event's unique url</p>
        <Findbar placeholder='e.g: "PAUDC-2023"' onSearch={findEvent} />
      {foundEvent.url &&
        <div className="eventCard">
          <h3>{foundEvent.title}</h3>
            <div>{foundEvent.tracks.map((e,i)=><span key={i}>{e}</span>)}</div>
            <div>
              <p>By <strong>{foundEvent.organizer}</strong></p>
            </div>
          </div>}
      </div>
    </section>
    </>
  )
}

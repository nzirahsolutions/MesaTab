import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../Context/AuthContext";
import { events as Allevents} from "../Context/SampleData";
import {Findbar} from "../Components/Searchbar";
import { toast } from "react-toastify";
import {useNavigate} from 'react-router-dom';
import axios from 'axios';
import { currentServer } from "../Context/urls";


export default function Events() {
  const { user, setSelectedEvent } = useContext(AuthContext);
  const [creating, setCreating] = useState(false);
  const [events, setEvents] = useState([]);
  const [foundEvent, setFoundEvent] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('Something Went Wrong');
  const [userEvents,setUserEvents]=useState([]);
  const [newEvent,setNewEvent]=useState({title:'', organizer:'',slug:''});
  const navigate=useNavigate();
  const [eventView, setEventView]=useState('review');
  // const tracks=['Spelling Bee', 'Public Speaking','BP Debate', 'WSDC Debate','Chess'];
  // const [eventTabs, setEventTabs]=useState([{title:'',track:''}]);
  
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

  function handleChange(e){
    setError(false);
    setLoading(false);
    setSuccess(false);
    setNewEvent({...newEvent, [e.target.name]:e.target.value})
  }
  function handleSubmit(e){
    e.preventDefault();
    setLoading(true);
    try{
      const res=axios.post(`${currentServer}/event`,newEvent);
      console.log(res);
    }
    catch(err){
      setError(true);
      setErrorMessage(err.message? err.message: 'Something Went Wrong');
    }
  }
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
  function reviewEvents(){
    if (user)
    return(
      <section id="userEvent">
        <h2>User Events</h2>
        <div className="eventList">
          {userEvents.length===0 ? 
          <div className="eventCard"><p>You have no events</p></div> 
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
    );
    return (
      <div className="textBlock">
        <p>Please log in to review your events</p><button className="darkButton" onClick={()=>navigate('/login')}>Log In</button>
      </div>
    );
  }
  function createEvent(){
    if (user)
    return(
      <section id='newEvent'>
        {creating && 
        <form>
          <strong style={{fontSize:'1.5rem'}}>Create New Event</strong>
          <input type="text" name="title" placeholder="Event Title" value={newEvent.title} onChange={handleChange}/>
          <input type="text" name="organizer" placeholder="Event Organizer" value={newEvent.organizer} onChange={handleChange}/>
          <input type="text" name="slug" placeholder="url extension e.g.: lumumba-opens" value={newEvent.slug} onChange={handleChange}/>
          <button className="darkButton" disabled={loading} onClick={handleSubmit}>{loading?'Creating':'Create Event'}</button>
        </form>
        }
    </section>
    );
    
    return (
      <div className="textBlock">
        <p>Please log in to create events</p><button className="darkButton" onClick={()=>navigate('/login')}>Log In</button>
      </div>);
  }
  function findEvents(){
    return(
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
    </section>);
  }
  function viewer(e){
    e!=='create' && setCreating(false);
    e=='create' & creating? setEventView('review')
    :setEventView(e);
  }
  return (
    <>
    <section id='intro'>
      <h1>Events Management</h1>
      <p>Review past events, create new events, manage ongoing events</p>
      <div className="buttonStack" style={{justifySelf:'center',marginBottom:'0.5rem'}}>
        <button className={eventView==='review'? 'lightButton': 'darkButton'} onClick={()=>viewer('review')}>Review</button>
        <button className={eventView==='create'? 'lightButton': 'darkButton'} onClick={()=>{viewer('create'); setCreating(!creating)}}>{creating?'Cancel':'Create'}</button>
        <button className={eventView==='find'? 'lightButton': 'darkButton'} onClick={()=>viewer('find')}>Find</button>
      </div>
    </section>
    {eventView==='review'? reviewEvents(): eventView==='create'? createEvent(): eventView==='find'? findEvents():''}
    </>
  )
}

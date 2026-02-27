import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../Context/AuthContext";
import {Findbar} from "../Components/Searchbar";
import { toast } from "react-toastify";
import {useNavigate} from 'react-router-dom';
import axios from 'axios';
import { currentServer } from "../Context/urls";
import Loading from "../Components/Loading";

export default function Events() {
  const { user } = useContext(AuthContext);
  const [creating, setCreating] = useState(false);
  const [foundEvent, setFoundEvent] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('Something Went Wrong');
  const [successMessage, setSuccessMessage] = useState('Success');
  const [userEvents,setUserEvents]=useState([]);
  const [newEvent,setNewEvent]=useState({title:'', organizer:'',slug:'', ownerId:''});
  const [newDeleteEvent,setNewDeleteEvent]=useState({slug:'', password:''});
  const [deleteStates,setDeleteStates]=useState({loading:false, success:false, error:false, errorMessage:'Something went wrong', successMessage:'Deleted Successfully'});
  const navigate=useNavigate();
  const [eventView, setEventView]=useState('review');
  const defaultEvent={title:'', organizer:'',slug:'', ownerId:''};
  const [loadPage, setLoadPage]=useState(true);
  
  async function fetchUserEvents() {
        if(!user?.id){
          setUserEvents([]);
          return;
        }
        try{
          const res=await axios.get(`${currentServer}/event/user/${user.id}`);
          // console.log(res.data.data);
          setUserEvents([...res.data.data]);
          setLoadPage(false);
        }
        catch(err){
          setUserEvents([]);
          toast.error(err?.response?.data?.message || "Failed to load your events");
        }
    }
  
  useEffect(() => {
    fetchUserEvents();
  }, [user]);

  function handleDeleteOnChange(e){
    setNewDeleteEvent({...newDeleteEvent, [e.target.name]:e.target.value});
    setDeleteStates({...deleteStates, success: false, error:false, loading:false});
  }
  async function handleDelete(e){
    e.preventDefault();
    setDeleteStates({...deleteStates, loading:true});
    try {
      const res=await axios.delete(`${currentServer}/event`,{data:{...newDeleteEvent, ownerId: user.id}});
      setDeleteStates({...deleteStates, successMessage: res?.data?.message || 'Deleted Successfully', loading: false, success: true, error: false});
      fetchUserEvents();
    } 
    catch(err){
      const message= err?.response?.data?.message || "Something went wrong";
      setDeleteStates({...deleteStates, loading: false, success: false, error:true, errorMessage: message})
    }
  }
  function handleChange(e){
    setError(false);
    setLoading(false);
    setSuccess(false);
    setNewEvent({...newEvent, [e.target.name]:e.target.value})
  }
  async function handleSubmit(e){
    e.preventDefault();
    setLoading(true);
    try{
      const res=await axios.post(`${currentServer}/event`,{...newEvent, ownerId: user.id});
      // console.log(res);
      setSuccessMessage(res?.data?.message || 'Successfully Created');
      setLoading(false);
      setSuccess(true);
      setError(false);
      setUserEvents([...userEvents, res.data.data]);
      setNewEvent(defaultEvent);
    }
    catch(err){
      const message= err?.response?.data?.message || "Something went wrong";
      // console.log('catch block');
      // console.log(err);
      setLoading(false);
      setSuccess(false);
      setError(true);
      setErrorMessage(message);
    }
  }
  async function findEvent(r){
    try{
    const slug=r.current.value.toLowerCase();
    const found=await axios.get(`${currentServer}/event/find/${slug}`);
    toast.success('Event Found');
    // console.log(found.data.data);
    setFoundEvent({...found.data.data});
    }
    catch(err){
      const message= err?.response?.data?.message || "Something went wrong";
      // console.log(err);
      toast.error(message);
    }
  }
  function reviewEvents(){
    if (user && !loadPage)
    return(
      <section id="userEvent">
        <h2>User Events</h2>
        <div className="eventList">
          {userEvents.length===0 ? 
          <div className="eventCard"><p>You have no events</p></div> 
          : 
          userEvents.map((event)=>(
            <div key={event.eventId} className="eventCard" onClick={()=>navigate(`/${event.slug}`)}>
              <h3>{event.title}</h3>
              <p style={{margin:'0.3rem'}}><strong>Url: </strong>{event.slug}</p>
              {event.tabs && event.tabs.length!==0?<div>{[...new Set(event.tabs.map(t=>t.track))].map((e,i)=><span key={i}>{e}</span>)}</div>:<p>No Tabs Assigned</p>}
            </div>
          ))}
        </div>
    </section>
    );
    if(user && loadPage) return <Loading/>
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
          {error && <p style={{color:'red'}}>{errorMessage}</p>}
          {success && <p style={{color:'green'}}>{successMessage}</p>}
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
        <div className="eventCard" onClick={()=>navigate(`/${foundEvent.slug}`)}>
          <h3>{foundEvent.title}</h3>
            <p style={{margin:'0.3rem'}}><strong>Url: </strong>{foundEvent.slug}</p>
            {foundEvent.tabs && foundEvent.tabs.length!==0?<div>{[...new Set(foundEvent.tabs.map(t=>t.track))].map((e,i)=><span key={i}>{e}</span>)}</div>:<p>No Tabs Assigned</p>}
            <div>
              <p>By <strong>{foundEvent.organizer}</strong></p>
            </div>
          </div>}
      </div>
    </section>);
  }
  function deleteEvents(){
    if(user)
    return(
      <form onSubmit={handleDelete}>
        <h2>Delete Event</h2>
        <input type="text" name="slug" value={newDeleteEvent.slug} autoComplete="one-time-code" placeholder="Event url" onChange={handleDeleteOnChange}/>
        <input type="password" name="password" value={newDeleteEvent.password} autoComplete="one-time-code" placeholder="Enter password" onChange={handleDeleteOnChange}/>
        <button className="darkButton" disabled={deleteStates.loading}>{deleteStates.loading?'Deleting':'Delete Event'}</button>
        {deleteStates.error && <p style={{color:'red'}}>{deleteStates.errorMessage}</p>}
        {deleteStates.success && <p style={{color:'green'}}>{deleteStates.successMessage}</p>}        
      </form>
    );
    return (
      <div className="textBlock">
        <p>Please log in to delete your events</p><button className="darkButton" onClick={()=>navigate('/login')}>Log In</button>
      </div>);    
  }
  function viewer(e){
    e!=='create' && setCreating(false);
    e==='create' && creating? setEventView('review')
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
        <button className={eventView==='delete'? 'lightButton': 'darkButton'} onClick={()=>viewer('delete')}>Delete</button>
      </div>
    </section>
    {eventView==='review'? reviewEvents(): eventView==='create'? createEvent(): eventView==='find'? findEvents():eventView==='delete'? deleteEvents():''}
    </>
  )
}

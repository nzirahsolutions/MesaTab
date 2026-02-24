import { useNavigate, useParams } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../Context/AuthContext";
import axios from "axios";
import { currentServer } from "../../Context/urls";

export default function Event() {
  const {user} = useContext(AuthContext);
  const navigate=useNavigate();
  const {eventSlug}=useParams();
  const [event, setEvent]=useState(null);
  const [newTab, setNewTab]=useState({title:'', track:'WSDC',slug:''});
  const [loadingPage, setLoadingPage]=useState(true);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('Something Went Wrong');
  const [successMessage, setSuccessMessage] = useState('Success');
  const defaultTab={title:'', track:'WSDC',slug:''};
  const [view, setView]=useState('review');

  async function findEvent(){
    try{
    const found=await axios.get(`${currentServer}/event/find/${eventSlug}`);
    setEvent({...found.data.data[0]});
    setLoadingPage(false);
    }
    catch(err){
      const message= err?.response?.data?.message || "Something went wrong";
      console.log(message);
      navigate('/');
    }
  }
  useEffect(()=>{
    findEvent();
  },[user]);

  function handleChange(e){
    setError(false);
    setLoading(false);
    setSuccess(false);
    setNewTab({...newTab, [e.target.name]:e.target.value});
  }
  async function handleSubmit(e){
    e.preventDefault();
    setLoading(true);
    try{
      const res=await axios.put(`${currentServer}/event/tab`,{...newTab, ownerId: user.id, eventId:event.eventId});
      // console.log(res);
      setSuccessMessage(res?.data?.message || 'Successfully Created');
      setLoading(false);
      setSuccess(true);
      setError(false);
      setNewTab(defaultTab);
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
  function viewer(e){
      e!=='create' && setCreating(false);
      e==='create' && creating? setView('review')
      :setView(e);
    }
  function reviewTabs(){
    return(
      <section>
        <h2>Choose Tab to View</h2>
        <div className="tabList">
          {event.tab? event.tabs.map((tab)=><button key={tab.tabID} className="darkButton" onClick={()=>navigate(`/${event.slug}/${tab.slug}`)}>{tab.title}</button>):<p>No Tab Added</p>}
        </div>
      </section>
    )
  }
  function addTab(){
    return(
    user && user.id===event.ownerId && 
    <section>
      <form onSubmit={handleSubmit}>
        <strong>Add Tab</strong>
        <input type="text" name="title" placeholder="Tab title" value={newTab.title} onChange={handleChange}/>
        <input type="text" name="slug" placeholder="Tab url" value={newTab.slug} onChange={handleChange}/>
        <select name="track" value={newTab.track} onChange={handleChange}>
          <option value="Spelling Bee">Spelling Bee</option>
          <option value="WSDC Debate">WSDC Debate</option>
          <option value="BP Debate">BP Debate</option>
          <option value="Public Speaking">Public Speaking</option>
          <option value="Chess">Chess</option>
        </select>
        <button className="darkButton">Add Tab</button>
        {success && <p style={{color:'green'}}>{successMessage}</p>}
        {error && <p style={{color:'red'}}>{errorMessage}</p>}
      </form>
    </section>
    )
  }
  return (
    loadingPage?<><p>Loading...</p></>:
    <>
    <section id="welcome-section">
      <h1>Welcome to {event.title}</h1>
      <p>Organized by {event.organizer}</p>
    </section>
    {user && user.id===event.ownerId &&
    <div className="buttonStack" style={{justifySelf:'center',marginBottom:'0.5rem'}}>
        <button className={view==='review'? 'lightButton': 'darkButton'} onClick={()=>viewer('review')}>Review</button>
        <button className={view==='create'? 'lightButton': 'darkButton'} onClick={()=>{viewer('create'); setCreating(!creating)}}>{creating?'Cancel':'Add Tab'}</button>
    </div>}
    {view==='review'? reviewTabs(): addTab()}
    </>
  )
}

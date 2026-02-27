import { useNavigate, useParams } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../Context/AuthContext";
import axios from "axios";
import { currentServer } from "../../Context/urls";
import Loading from "../../Components/Loading";

export default function Event() {
  const {user} = useContext(AuthContext);
  const navigate=useNavigate();
  const {eventSlug}=useParams();
  const [event, setEvent]=useState(null);
  const [newTab, setNewTab]=useState({title:'', track:'Spelling Bee',slug:''});
  const [newDeleteTab,setNewDeleteTab]=useState({slug:'',track:'Spelling Bee', password:''});
  const [loadingPage, setLoadingPage]=useState(true);
  const [newTabStates, setNewTabStates]=useState({creating:false, loading: false, error: false, success: false, errorMessage:'Something went wrong', successMessage: 'Success'});
  const [deleteTabStates, setDeleteTabStates]=useState({loading: false, error: false, success: false, errorMessage:'Something went wrong', successMessage: 'Success'});
  const defaultTab={title:'', track:'Spelling Bee',slug:''};
  const defaultNewDeleteTab={slug:'',track:'Spelling Bee', password:''};
  const [view, setView]=useState('review');

  async function findEvent(){
    try{
    const found=await axios.get(`${currentServer}/event/find/${eventSlug}`);
    // console.log({...found.data.data});
    setEvent({...found.data.data});
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

  function handleNewTabChange(e){
    setNewTabStates({...newTabStates, error: false, loading: false, success: false});
    setNewTab({...newTab, [e.target.name]:e.target.value});
  }
  function handleDeleteTabChange(e){
    setDeleteTabStates({...deleteTabStates, error: false, loading: false, success: false});
    setNewDeleteTab({...newDeleteTab, [e.target.name]:e.target.value});
  }
  async function handleNewTabSubmit(e){
    e.preventDefault();
    setNewTabStates({...newTabStates, loading: true});
    // console.log({...newTab});
    try{
      const res=await axios.post(`${currentServer}/event/tab`,{...newTab, ownerId: user.id, eventId:event.eventId});
      // console.log(res);
      setNewTabStates({...newTabStates,successMessage:res?.data?.message || 'Successfully Created', loading: false, success: true, error: false});
      setNewTab(defaultTab);
      setEvent({...event, tabs: [...event.tabs, res.data.data]});
    }
    catch(err){
      const message= err?.response?.data?.message || "Something went wrong";
      // console.log('catch block');
      // console.log(err);
      setNewTabStates({...newTabStates, loading: false, success: false, error: true, errorMessage: message});
    }
  }
  async function handleDeleteTab(e){
    e.preventDefault();
    setDeleteTabStates({...deleteTabStates, loading:true});
    try {
      const res=await axios.delete(`${currentServer}/event/tab`,{data:{...newDeleteTab, ownerId: user.id, eventId: event.eventId}});
      setDeleteTabStates({...deleteTabStates, successMessage: res?.data?.message || 'Deleted Successfully', loading: false, success: true, error: false});
      findEvent();
      setNewDeleteTab(defaultNewDeleteTab);
    } 
    catch(err){
      const message= err?.response?.data?.message || "Something went wrong";
      setDeleteTabStates({...deleteTabStates, loading: false, success: false, error:true, errorMessage: message})
    }
  }
  function viewer(e){
      e!=='create' && setNewTabStates({...newTabStates, creating:false});
      e==='create' && newTabStates.creating? setView('review')
      :setView(e);
    }
  function reviewTabs(){
    return(
      <section>
        <h2 style={{margin:0}}>Choose Tab to View</h2>
        <div className="tabList">
          {event.tabs && event.tabs.length!==0? event.tabs.map((tab)=><div key={tab.tabId}><button className="darkButton" onClick={()=>navigate(`/${event.slug}/${tab.slug}`)}>{tab.title}</button> <p><strong>url: </strong>{tab.slug} <strong>Track: </strong>{tab.track}</p></div>):<p>No Tab Added</p>}
        </div>
      </section>
    )
  }
  function addTab(){
    return(
    user && user.id===event.ownerId && 
    <section>
      <form onSubmit={handleNewTabSubmit}>
        <strong>Add Tab</strong>
        <input type="text" name="title" placeholder="Tab title" value={newTab.title} onChange={handleNewTabChange}/>
        <input type="text" name="slug" placeholder="Tab url" value={newTab.slug} onChange={handleNewTabChange}/>
        <select name="track" value={newTab.track} onChange={handleNewTabChange}>
          <option value="Spelling Bee">Spelling Bee</option>
          <option value="WSDC Debate">WSDC Debate</option>
          <option value="BP Debate">BP Debate</option>
          <option value="Public Speaking">Public Speaking</option>
          <option value="Chess">Chess</option>
        </select>
        <button className="darkButton" disabled={newTabStates.loading}>{newTabStates.loading?'Adding':'Add Tab'}</button>
        {newTabStates.success && <p style={{color:'green'}}>{newTabStates.successMessage}</p>}
        {newTabStates.error && <p style={{color:'red'}}>{newTabStates.errorMessage}</p>}
      </form>
    </section>
    )
  }
  function deleteTab(){
    return(
    user && user.id===event.ownerId && 
    <form onSubmit={handleDeleteTab}>
        <h2>Delete Tab</h2>
        <input type="text" name="slug" value={newDeleteTab.slug} autoComplete="one-time-code" placeholder="Event url" onChange={handleDeleteTabChange}/>
        <select name="track" value={newDeleteTab.track} onChange={handleDeleteTabChange}>
          <option value="Spelling Bee">Spelling Bee</option>
          <option value="WSDC Debate">WSDC Debate</option>
          <option value="BP Debate">BP Debate</option>
          <option value="Public Speaking">Public Speaking</option>
          <option value="Chess">Chess</option>
        </select>
        <input type="password" name="password" value={newDeleteTab.password} autoComplete="one-time-code" placeholder="Enter password" onChange={handleDeleteTabChange}/>
        <button className="darkButton" disabled={deleteTabStates.loading}>{deleteTabStates.loading?'Deleting':'Delete Event'}</button>
        {deleteTabStates.error && <p style={{color:'red'}}>{deleteTabStates.errorMessage}</p>}
        {deleteTabStates.success && <p style={{color:'green'}}>{deleteTabStates.successMessage}</p>}        
      </form>
    )
  }
  return (
    loadingPage? <Loading/>:
    <>
    <section id="welcome-section">
      <h1>Welcome to {event.title}</h1>
      <p>Organized by {event.organizer}</p>
    </section>
    {user && user.id===event.ownerId &&
    <div className="buttonStack" style={{justifySelf:'center',marginBottom:'0.5rem'}}>
        <button className={view==='review'? 'lightButton': 'darkButton'} onClick={()=>viewer('review')}>Review</button>
        <button className={view==='create'? 'lightButton': 'darkButton'} onClick={()=>{viewer('create'); setNewTabStates({...newTabStates, creating: !newTabStates.creating})}}>{newTabStates.creating?'Cancel':'Add Tab'}</button>
        <button className={view==='delete'? 'lightButton': 'darkButton'} onClick={()=>viewer('delete')}>Delete Tab</button>
    </div>}
    {view==='review'? reviewTabs():view==='create'? addTab(): view==='delete'? deleteTab(): ''}
    </>
  )
}

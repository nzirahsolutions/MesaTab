import { useState, useContext, useEffect } from "react";
import {GiBee} from 'react-icons/gi';
import {IoClose} from 'react-icons/io5';
import {RiDeleteBin6Fill} from 'react-icons/ri';
import {FaAngleDoubleUp } from 'react-icons/fa';
import {AuthContext} from '../../../../Context/AuthContext';
import Dropdown from "../../../../Components/Dropdown";
import SpellingBeePublicTab from "./SpellingBeePublicTab";
import axios from 'axios';
import { currentServer } from "../../../../Context/urls";
import Loading from "../../../../Components/Loading";

export default function SpellingAdmin({tab, event}) {
  const [tabItem, setTabItem]=useState('home');
  const [menuOpen, setMenuOpen]=useState(false);
  const {user}= useContext(AuthContext);
  const [access, setAccess]=useState('admin');
  const [pageLoad, setPageLoad]=useState({loading: false, authorized:false});
  const [fullTab, setFulltab]=useState(null);

  const [navState, setNavState]=useState({institution:'review',speller:'review',judge:'review',room:'review',round:'review',word:'review', draw:'review'});

  const [addItems, setAddItems]=useState({institution:{name:'', code:''},speller:{name:'',institution:'',email:''},judge:{name:'',institution:'',email:''}, room:{name:''},round:{name:'', breaks:false, type:'Timed'}, word:{word:''}});

  const [updateItems, setUpdateItems]=useState({institution:{name:'', code:''},speller:{name:'',institution:'',email:''},judge:{name:'',institution:'',email:''}, room:{name:''},round:{name:'', breaks:false, type:'Timed'}, word:{word:''}});

  const [deleteItems, setDeleteItems]=useState({institution:{id:'', name:'', status:false},speller:{id:'',name:'', status:false},judge:{id:'',name:'', status:false}, room:{id:'',name:'', status:false},round:{id:'',name:'', status:false}, word:{id:'',word:'', status:false}});

  const defaultItems={institution:{name:'', code:''},speller:{name:'',institution:'',email:''},judge:{name:'',institution:'',email:''}, room:{name:''},round:{name:'', breaks:false, type:'Timed'}, word:{word:''}};

  const [institutionStates, setInstitutionStates]=useState({addSuccess:false, addError:false, addLoading:false, addErrorMessage:'Something went wrong', addSuccessMessage:'Institution Added',deleteSuccess:false, deleteError:false, deleteLoading:false, deleteErrorMessage:'Something went wrong', deleteSuccessMessage:'Institution Deleted',updateSuccess:false, updateError:false, updateLoading:false, updateErrorMessage:'Something went wrong', updateSuccessMessage:'Institution Updated'});

  const roundTypes=['Timed','Word Limit','Eliminator'];

  async function getFullTab() {
    try {
        const res=await axios.get(`${currentServer}/sb/tab/${tab.tabId}`);
        // console.log(res.data.data);
        setFulltab({...res.data.data});       
    } 
    catch (error) {
        console.log(error);        
    }    
  }
  useEffect(()=>{
    getFullTab();
    setPageLoad({...pageLoad, loading: false, authorized:(user && (user.id===event.ownerId) || tab.tabMasters.find(e=>e.email===user.email))});
  },[]);

  function tabChange(t){
    setTabItem(t);
    setMenuOpen(false);
  }
  function institutionOnChange(e){
    setInstitutionStates({...institutionStates, addSuccess: false, addError: false, addLoading: false, deleteSuccess:false, deleteError: false, deleteLoading: false, updateSuccess: false, updateError: false, updateLoading: false});

    switch(navState.institution){
        case'add':
            setAddItems({...addItems, institution:{...addItems.institution,[e.target.name]:e.target.value}});
            break;
        case 'update':
            setUpdateItems({...updateItems, institution:{...updateItems.institution,[e.target.name]:e.target.value}});
            break;
        case 'delete':
            setDeleteItems({...deleteItems, institution:{...deleteItems.institution,[e.target.name]:e.target.checked}});
            break;
        default: console.log('No Change');
    }
    
  }
  async function submitInstitution(e){
    e.preventDefault();
    switch(navState.institution){
        case'add':
            setInstitutionStates({...institutionStates, addLoading: true});
            // console.log('add inst');
            try {
                const res=await axios.post(`${currentServer}/sb/institution`,{...addItems.institution, tabId: tab.tabId});
                // console.log(res);
                setAddItems({...addItems, institution:{...defaultItems.institution}});
                getFullTab();
                setInstitutionStates({...institutionStates, addError: false, addSuccess: true, addLoading:false, addSuccessMessage:res.data.message});
            } 
            catch (err) {
                const message= err?.response?.data?.message || "Something went wrong";
                setInstitutionStates({...institutionStates, addSuccess: false, addError: true, addLoading: false, addErrorMessage:message});
            }
            break;
        case 'update':
            setInstitutionStates({...institutionStates, updateLoading: true});
            // console.log('add inst');
            try {
                const res=await axios.put(`${currentServer}/sb/institution`,{...updateItems.institution, tabId: tab.tabId});
                // console.log({...updateItems.institution, tabId: tab.tabId});
                setUpdateItems({...updateItems, institution:{...defaultItems.institution}});
                getFullTab();
                setInstitutionStates({...institutionStates, updateError: false, updateSuccess: true, updateLoading:false, updateSuccessMessage:res.data.message});
            } 
            catch (err) {
                const message= err?.response?.data?.message || "Something went wrong";
                setInstitutionStates({...institutionStates, updateSuccess: false, updateError: true, updateLoading: false, updateErrorMessage:message});
            }
            break;
        case 'delete':
            setInstitutionStates({...institutionStates, deleteLoading: true});
            // console.log('delete inst');
            try {
                const res=await axios.delete(`${currentServer}/sb/institution`,{data:{...deleteItems.institution, tabId: tab.tabId}});
                setDeleteItems({...deleteItems, institution:{...defaultItems.institution, status: false}});
                getFullTab();
                setInstitutionStates({...institutionStates, deleteError: false, deleteSuccess: true, deleteLoading:false, deleteSuccessMessage:res.data.message});
            } 
            catch (err) {
                const message= err?.response?.data?.message || "Something went wrong";
                setInstitutionStates({...institutionStates, deleteSuccess: false, deleteError: true, deleteLoading: false, deleteErrorMessage:message});
            }
            break;
        default: console.log('check submitInstitution');
    }
  }

  //return functions
  function home(){
    return(
      <>
      <div className="tabHome">
        <li onClick={()=>tabChange('institutions')}>Institutions</li>
        <li onClick={()=>tabChange('tabMasters')}>Tab Masters</li>
        <li onClick={()=>tabChange('judges')}>Judges</li>
        <li onClick={()=>tabChange('spellers')}>Spellers</li>
        <li onClick={()=>tabChange('rooms')}>Rooms</li>
        <li onClick={()=>tabChange('rounds')}>Rounds</li>
        <li onClick={()=>tabChange('words')}>Words</li>
        <li onClick={()=>tabChange('draws')}>Draws</li>
      </div>
      </>
    )
  }
  function institutions(){
    return(
    <>
    <div className="buttonStack">
        <button className={navState.institution==='review'? 'lightButton':'darkButton'} onClick={()=>setNavState({...navState, institution:'review'})}>Review</button>
        <button className={navState.institution==='add'? 'lightButton':'darkButton'} onClick={()=>setNavState({...navState, institution:'add'})}>Add</button>
        <button className={navState.institution==='update'? 'lightButton':'darkButton'} onClick={()=>setNavState({...navState, institution:'update'})}>Update</button>
        <button className={navState.institution==='delete'? 'lightButton':'darkButton'} onClick={()=>setNavState({...navState, institution:'delete'})}>Delete</button>
    </div>
    {navState.institution==='review'&&
    <section id="institutionReview">
        <h2>Registered Institutions</h2>
        {fullTab.institutions.length>0?<table>
          <thead>
            <tr style={{gridTemplateColumns:'4fr 1fr 1fr 1fr'}}>
              <th>Name</th>
              <th>Code</th>
              <th>Spellers</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {fullTab.institutions.map((p,i)=>
            <tr key={i} style={{gridTemplateColumns:'4fr 1fr 1fr 1fr'}}>
              <td>{p.name}</td>
              <td>{p.code}</td>
              <td>{p.spellers}</td>
              <td style={{display: 'grid', gridAutoFlow:'column', gridAutoColumns:'1rem', justifySelf:'center', gap:'1rem'}}><FaAngleDoubleUp fill="teal" onClick={()=>{
                setUpdateItems({...updateItems, institution:{...p}});
                setNavState({...navState, institution:'update'});
              }}/><RiDeleteBin6Fill fill="red" onClick={()=>{
                setDeleteItems({...updateItems, institution:{...p}});
                setNavState({...navState, institution:'delete'});}}/></td>
            </tr>)}
          </tbody>
        </table>:<p>No Registered Institutions</p>}
    </section>}
    {navState.institution==='add'&&
    <section id="institutionAdd">
        <form onSubmit={submitInstitution}>
            <p><strong>Register an institution</strong></p>
            <input type="text" placeholder="Institution Name" required name="name" value={addItems.institution.name} onChange={institutionOnChange}/>
            <input type="text" placeholder="Institution Code e.g: GHS (Must be Unique) " required name="code" value={addItems.institution.code} onChange={institutionOnChange}/>
            <button className="darkButton" disabled={institutionStates.addLoading}>{institutionStates.addLoading? 'Adding':'Add Institution'}</button>
            {institutionStates.addError &&<p style={{color:'red'}}>{institutionStates.addErrorMessage}</p>}
            {institutionStates.addSuccess &&<p style={{color:'green'}}>{institutionStates.addSuccessMessage}</p>}
        </form>
    </section>}
    {navState.institution==='update' &&
    <section id="institutionUpdate">
        <form onSubmit={submitInstitution}>
            <p><strong>Update {updateItems.institution.name}'s info</strong></p>
            <select onChange={(e)=>{
                e.target.value && setUpdateItems({...updateItems, institution:{...fullTab.institutions.find((s)=>s.code===e.target.value)}});
                // console.log(updateItems.institution)
                }} value={updateItems.institution.code}>
                <option value=""></option>
                {fullTab.institutions.map((s, i)=><option key={i} value={s.code}>{s.name}</option>)}
            </select>
            <input type="text" placeholder="Institution Name" required name="name" value={updateItems.institution.name} onChange={institutionOnChange}/>
            <input type="text" placeholder="Institution Code e.g: GHS (Must be Unique) " required name="code" value={updateItems.institution.code} onChange={institutionOnChange}/>
            <button className="darkButton" disabled={institutionStates.updateLoading}>{institutionStates.updateLoading? 'Updating':'Update Institution'}</button>
            {institutionStates.updateError &&<p style={{color:'red'}}>{institutionStates.updateErrorMessage}</p>}
            {institutionStates.updateSuccess &&<p style={{color:'green'}}>{institutionStates.updateSuccessMessage}</p>}
        </form>
    </section>}
    {navState.institution==='delete' &&
    <section id="institutionDelete">
        <form onSubmit={submitInstitution}>
            <p><strong>Delete {deleteItems.institution.name}?</strong></p>
            <select onChange={(e)=>{
                e.target.value && setDeleteItems({...deleteItems, institution:{...fullTab.institutions.find((s)=>s.code===e.target.value), status: false}});
                // console.log(deleteItems.institution);
                }} value={deleteItems.institution.code}>
                <option value=""></option>
                {fullTab.institutions.map((s, i)=><option key={i} value={s.code}>{s.name}</option>)}
            </select>
            <label>Are you sure?<input type="checkbox" name="status" checked={deleteItems.institution.status} onChange={institutionOnChange} /></label>
            {deleteItems.institution.status &&<p style={{color:'red'}}>Warning: This will delete all judges and spellers registered with this institution</p>}            
            <button className="darkButton" disabled={institutionStates.deleteLoading || !deleteItems.institution.status}>{institutionStates.deleteLoading? 'Deleting':'Delete Institution'}</button>
            {institutionStates.deleteError &&<p style={{color:'red'}}>{institutionStates.deleteErrorMessage}</p>}
            {institutionStates.deleteSuccess &&<p style={{color:'green'}}>{institutionStates.deleteSuccessMessage}</p>}
        </form>
    </section>}
    </>);
  }
  function spellers(){
    return(
    <>
    Spellers
    </>);
  }
  function judges(){
    return(
    <>
    Judges
    </>);
  }
  function tabMasters(){
    return(
    <>
    Tab Masters
    </>);
  }
  function rooms(){
    return(
    <>
    Rooms
    </>);
  }
  function rounds(){
    return(
    <>
    Rounds
    </>);
  }
  function words(){
    return(
    <>
    Words
    </>);
  }
  function draws(){
    return(
    <>
    Draws
    </>);
  }

  return (
    !pageLoad.loading && access==='admin'?
    <>
    <nav className="tabMenu">
          <ul>
            <Dropdown options={[{option:`${tab.title}`, value:'public'}, {option:`${tab.title} (Admin)`, value:'admin'}]} setValue={setAccess}/>
            <li onClick={()=>tabChange('institutions')} className={tabItem==='institutions'?'selectedTabItem':''}>Institutions</li>
            <li onClick={()=>tabChange('tabMasters')} className={tabItem==='tabMasters'?'selectedTabItem':''}>Tab Masters</li>
            <li onClick={()=>tabChange('spellers')} className={tabItem==='spellers'?'selectedTabItem':''}>Spellers</li>
            <li onClick={()=>tabChange('judges')} className={tabItem==='judges'?'selectedTabItem':''}>Judges</li>
            <li onClick={()=>tabChange('rooms')} className={tabItem==='rooms'?'selectedTabItem':''}>Rooms</li>
            <li onClick={()=>tabChange('rounds')} className={tabItem==='rounds'?'selectedTabItem':''}>Rounds</li>
            <li onClick={()=>tabChange('words')} className={tabItem==='words'?'selectedTabItem':''}>Words</li>
            <li onClick={()=>tabChange('draws')} className={tabItem==='draws'?'selectedTabItem':''}>Draws</li>
          </ul>
        </nav>
        <div className="tabSideMenu">
          <nav className="tTitle">
            <Dropdown options={[{option:`${tab.title}`, value:'public'}, {option:`${tab.title} (Admin)`, value:'admin'}]} setValue={setAccess}/>
            <span className='☰' onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen? <IoClose/>:'☰'}</span>
          </nav>
          <nav className={`tSideMenu ${menuOpen? 'Open':'Closed'}`}>
            <ul>
            <span onClick={()=>tabChange('home')}><GiBee fill="teal"/><strong>{tab.title}</strong></span>
            <li onClick={()=>tabChange('institutions')} className={tabItem==='institutions'?'selectedTabItem':''}>Institutions</li>
            <li onClick={()=>tabChange('tabMasters')} className={tabItem==='tabMasters'?'selectedTabItem':''}>Tab Masters</li>
            <li onClick={()=>tabChange('spellers')} className={tabItem==='spellers'?'selectedTabItem':''}>Spellers</li>
            <li onClick={()=>tabChange('judges')} className={tabItem==='judges'?'selectedTabItem':''}>Judges</li>
            <li onClick={()=>tabChange('rooms')} className={tabItem==='rooms'?'selectedTabItem':''}>Rooms</li>
            <li onClick={()=>tabChange('rounds')} className={tabItem==='rounds'?'selectedTabItem':''}>Rounds</li>
            <li onClick={()=>tabChange('words')} className={tabItem==='words'?'selectedTabItem':''}>Words</li>
            <li onClick={()=>tabChange('draws')} className={tabItem==='draws'?'selectedTabItem':''}>Draws</li>
          </ul>
          </nav>
        </div>
        {menuOpen&& <div className="aoe" onClick={()=>setMenuOpen(false)}></div>}
        {
        tabItem==='home'? home():tabItem==='institutions'? institutions():tabItem==='spellers'? spellers():tabItem==='judges'? judges():tabItem==='tabMasters'? tabMasters():tabItem==='rooms'? rooms():tabItem==='rounds'? rounds():tabItem==='words'? words():tabItem==='draws'? draws():''
        }
    </>:!pageLoad.loading && access==='public'?
    <SpellingBeePublicTab tab={tab} event={event}/>:<Loading/>
  )
}

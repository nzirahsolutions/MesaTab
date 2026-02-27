import { useState, useContext } from "react";
import {GiBee} from 'react-icons/gi';
import {IoClose} from 'react-icons/io5';
import {AuthContext} from '../../../../Context/AuthContext';
import Dropdown from "../../../../Components/Dropdown";
import SpellingAdmin from "./SpellingAdmin";
import { useEffect, useRef } from "react";
import { currentServer } from "../../../../Context/urls";
import Loading from "../../../../Components/Loading";
import axios from "axios";

export default function SpellingBeePublicTab({tab, event}) {
  // console.log(tab.title);
  const [tabItem, setTabItem]=useState('home');
  const tabHistoryRef=useRef(false);
  const [participant, setParticipant]=useState('spellers');
  const [menuOpen, setMenuOpen]=useState(false);
  const [viewRound, setViewRound]=useState(null);
  const {user}= useContext(AuthContext);
  const [access, setAccess]=useState('public');
  const [pageLoad, setPageLoad]=useState({loading: true, authorized:false});
  const [fullTab, setFullTab]=useState(null);
  // console.log(tab, event);
  // console.log(access);

  useEffect(() => {
    async function getFullTab() {
      try {
        const res = await axios.get(`${currentServer}/sb/tab/${tab.tabId}`);
        setFullTab({ ...res.data.data });

        const isOwner = !!user && user.id === event.ownerId;
        const isTabMaster =
          !!user &&
          Array.isArray(fullTab?.tabMasters) &&
          fullTab.tabMasters.some((e) => e.email === user.email);

        setPageLoad({ loading: false, authorized: isOwner || isTabMaster });
      } catch (error) {
        console.log(error);
        setPageLoad((prev) => ({ ...prev, loading: false }));
      }
    }

    getFullTab();
  }, [tab.tabId, fullTab, event.ownerId, user]);

   //tab-level navigation
    useEffect(() => {
    // Add one same-route history entry only when entering a non-home tab
    if (tabItem !== "home" && !tabHistoryRef.current) {
      window.history.pushState({ internalTab: true }, "", window.location.href);
      tabHistoryRef.current = true;
    }
  
    // Reset so next time user enters a sub-tab we can add again
    if (tabItem === "home") {
      tabHistoryRef.current = false;
    }
  }, [tabItem]);
  
  useEffect(() => {
    const onPopState = () => {
      // If currently in sub-tab, first back should only return to home tab
      if (tabItem !== "home") {
        setTabItem("home");
        // IMPORTANT: do not pushState here
      }
      // If already home, do nothing; browser back will leave page normally
    };
  
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [tabItem, setTabItem]);

  function tabChange(t){
    setTabItem(t);
    setMenuOpen(false);
  }
  function home(){
    return(
      <>
      <div className="tabHome">
        <li onClick={()=>tabChange('rounds')}>Rounds</li>
        <li onClick={()=>tabChange('spellerTab')}>Speller Tab</li>
        <li onClick={()=>tabChange('words')}>Words</li>
        <li onClick={()=>tabChange('participants')}>Participants</li>
      </div>
      </>
    )
  }
  function rounds(){
    return(
      <>
      {/* {console.log(tab.rounds)} */}
      {fullTab.rounds.length===0?
      <p>No Rounds Have Been Added</p>:
      <div className="results">
      {fullTab.rounds.map((r,i)=>
      <li key={i} onClick={()=>{tabChange('round');setViewRound(r)}}>{r.name}</li>)}
      </div>}
      </>
    )
  }
  function round(){
    return(
      <>
      <section id="other-rounds">
        {fullTab.rounds.length<0?
      <p>No Rounds Were Completed</p>:
      <div className="round-buttons">
      {fullTab.rounds.map((r,i)=>
      <button className={r.name===viewRound.name? 'darkButton':'lightButton'} key={i} onClick={()=>{tabChange('round');setViewRound(r)}}>{r.name}</button>)}
      </div>}
      </section>
      <section id="intro-section">
      <h2 style={{margin:0}}>Results for {viewRound.name}</h2>
      <p style={{margin:'0.5rem'}}>Type of round: <strong>{viewRound.type}</strong></p>
      {viewRound.timeLimit && <p style={{margin:'0.5rem'}}>Time Limit: <strong>{viewRound.timeLimit}</strong></p>}
      {viewRound.wordLimit && <p style={{margin:'0.5rem'}}>Word Limit: <strong>{viewRound.wordLimit}</strong></p>}
      </section>
      <section id="result-section">
        {viewRound.matches.map((m,i)=>
        <div key={i} className="roomCard">
          <div className="roomHeader">
            <h2 style={{margin:'0.1rem'}}>{fullTab.rooms.filter((r)=>r.id===m.roomID)[0].name}</h2>
            <p style={{margin:'0.5rem'}}>Adjudicator: <strong>{fullTab.judges.filter((r)=>r.id===m.judgeID)[0].name}</strong></p>
          </div>
          <div className="roomBody">
            <li><strong>Participant Name</strong> <strong>School Code</strong> <strong>Score</strong></li>
            {m.result.map((r,index)=>
            <li key={index}><span>{fullTab.participants.filter((p)=>p.id===r.participantID)[0].name}</span><span>{tab.participants.filter((p)=>p.id===r.participantID)[0].schoolCode}</span>
            {!viewRound.breaks?<span>{r.score}</span>:<span style={r.status==='won'?{color:'green'}:{color:'red'}}>{r.status}</span>}</li>
            )}
          </div>
        </div>)}
      </section>
      </>
    )
  }
  function spellerTab(){
    return(
      fullTab.standings && fullTab.standings.length>0?
      <>      
      <section id="intro">
        <h1>Speller Tab</h1>
        <p>This is a summary of points accrued during the preliminary rounds of the tournament.</p>
      </section>
      {/* <button onClick={()=>console.log(tab.standings)}>Test</button> */}
      <section id="speller-standings">
        {/* Rank | speller name | school code  | R1  | R2  | R3  |R4  | R5..  | Total */}
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Speller</th>
              <th>School</th>
              {fullTab.rounds.filter((r)=>!r.breaks).map((r,i)=><th key={i}>{r.name}</th>)}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {fullTab.standings.map((s,i)=>
            <tr key={i}>
              <td>{s.rank}</td>
              <td>{s.speller}</td>
              <td>{s.school}</td>
              {s.scores.map((s,i)=><td key={i}>{s? s:'-'}</td>)}
              <td>{s.total}</td>
            </tr>)}
          </tbody>
        </table>
      </section>
      </>
      :<p>No Rounds Compeleted Yet</p>
    )
  }
  function participants(){
    return(
    <div id="participants">
      <div className="round-buttons">
        <button className={participant==='spellers'? 'darkButton':'lightButton'} onClick={()=>setParticipant('spellers')}>Spellers</button>
        <button className={participant==='judges'? 'darkButton':'lightButton'} onClick={()=>setParticipant('judges')}>Judges</button>
        <button className={participant==='institutions'? 'darkButton':'lightButton'} onClick={()=>setParticipant('institutions')}>Institutions</button>
      </div>
      {participant==='spellers'?
      <section id="spellers">
        <h2>Spellers</h2>
        {fullTab.spellingBees.length>0?<table>
          <thead>
            <tr style={{gridTemplateColumns:'repeat(2,1fr)'}}>
              <th>Name</th>
              <th>School</th>
            </tr>
          </thead>
          <tbody>
            {fullTab.spellingBees.map((p,i)=>
            <tr key={i} style={{gridTemplateColumns:'repeat(2,1fr)'}}>
              <td>{p.name}</td>
              <td>{fullTab.institutions.find((s)=>s.id===p.institutionId).name}</td>
            </tr>)}
          </tbody>
        </table>:<p>No Registered Spellers</p>}
      </section>:participant==='judges'?
      <section id="judges">
        <h2>Judges</h2>
        {fullTab.judges.length>0?<table>
          <thead>
            <tr style={{gridTemplateColumns:'1fr'}}>
              <th>Name</th>
            </tr>
          </thead>
          <tbody>
            {fullTab.judges.map((p,i)=>
            <tr key={i} style={{gridTemplateColumns:'1fr'}}>
              <td>{p.name}</td>
            </tr>)}
          </tbody>
        </table>:<p>No Registered Judges</p>}
      </section>:
      <section id="institutions">
        <h2>Institutions</h2>
        {fullTab.institutions.length>0?<table>
          <thead>
            <tr style={{gridTemplateColumns:'2fr 1fr 1fr'}}>
              <th>Name</th>
              <th>Code</th>
              <th>Participants</th>
            </tr>
          </thead>
          <tbody>
            {fullTab.institutions.map((p,i)=>
            <tr key={i} style={{gridTemplateColumns:'2fr 1fr 1fr'}}>
              <td>{p.name}</td>
              <td>{p.code}</td>
              <td>{p.spellers}</td>
            </tr>)}
          </tbody>
        </table>:<p>No Registered Institutions</p>}
      </section>}
    </div>)
  }
  function words(){
    return(
      <>
      <h2>Words</h2>
      <section className="words">
        {fullTab.words.map((w,i)=><div className="word" key={i}>{w.word || w}</div>)}
        {fullTab.words.length===0 && <p>No Words Added</p>}
      </section>
      </>
    )
  }
  return (
    !pageLoad.loading && access==='public'?
    <>
    <nav className="tabMenu">
      <ul>
        {pageLoad.authorized? <Dropdown selectedIdx={0} options={[{option:`${tab.title}`, value:'public'}, {option:`${tab.title} (Admin)`, value:'admin'}]} setValue={setAccess}/>:
        <span onClick={()=>tabChange('home')}><GiBee fill="teal"/><strong>{tab.title}</strong></span>}
        <li onClick={()=>tabChange('rounds')} className={tabItem==='rounds'?'selectedTabItem':''}>Rounds</li>
        <li onClick={()=>tabChange('spellerTab')} className={tabItem==='spellerTab'?'selectedTabItem':''}>Speller Tab</li>
        <li onClick={()=>tabChange('words')} className={tabItem==='words'?'selectedTabItem':''}>Words</li>
        <li onClick={()=>tabChange('participants')} className={tabItem==='participants'?'selectedTabItem':''}>Participants</li>
      </ul>
    </nav>
    <div className="tabSideMenu">
      <nav className="tTitle">
          {pageLoad.authorized? <Dropdown selectedIdx={0} options={[{option:`${tab.title}`, value:'public'}, {option:`${tab.title} (Admin)`, value:'admin'}]} setValue={setAccess}/>:
        <span onClick={()=>tabChange('home')}><GiBee fill="teal"/><strong>{tab.title}</strong></span>}
        <span className='☰' onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen? <IoClose/>:'☰'}</span>
      </nav>
      <nav className={`tSideMenu ${menuOpen? 'Open':'Closed'}`}>
        <ul>
          <span onClick={()=>tabChange('home')}><GiBee fill="teal"/><strong>{tab.title}</strong></span>
          <li onClick={()=>tabChange('rounds')} className={tabItem==='results'?'selectedTabItem':''}>Rounds</li>
        <li onClick={()=>tabChange('spellerTab')} className={tabItem==='spellerTab'?'selectedTabItem':''}>Speller Tab</li>
        <li onClick={()=>tabChange('words')} className={tabItem==='words'?'selectedTabItem':''}>Words</li>
        <li onClick={()=>tabChange('participants')} className={tabItem==='participants'?'selectedTabItem':''}>Participants</li>
        </ul>
      </nav>
    </div>
    {menuOpen&& <div className="aoe" onClick={()=>setMenuOpen(false)}></div>}
    {
      tabItem==='home'? home():tabItem==='rounds'? rounds():tabItem==='round'? round():tabItem==='spellerTab'? spellerTab():tabItem==='participants'? participants():tabItem==='words'? words():''
    }
    </>:!pageLoad.loading && access==='admin'?<SpellingAdmin tab={tab} event={event}/>:<Loading/>
  )
}

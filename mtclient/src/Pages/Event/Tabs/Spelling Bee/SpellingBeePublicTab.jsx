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
    let isMounted = true;

    async function getFullTab() {
      try {
        const res = await axios.get(`${currentServer}/sb/tab/${tab.tabId}`);
        if (!isMounted) return;

        const fetchedTab = res.data?.data || null;
        setFullTab(fetchedTab);

        const isOwner = !!user && user.id === event?.ownerId;
        const isTabMaster =
          !!user &&
          Array.isArray(fetchedTab?.tabMasters) &&
          fetchedTab.tabMasters.some((e) => e.email === user.email);

        setPageLoad({ loading: false, authorized: isOwner || isTabMaster });
      } catch (error) {
        console.error(error);
        if (!isMounted) return;
        setPageLoad({ loading: false, authorized: false });
      }
    }

    getFullTab();
    return () => {
      isMounted = false;
    };
  }, [tab.tabId, event?.ownerId, user]);

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
    const roundsList = fullTab?.rounds ?? [];
    return(
      <>
      {roundsList.length===0?
      <p>No Rounds Have Been Added</p>:
      <div className="results">
      {roundsList.map((r,i)=><li key={i} onClick={()=>{tabChange('round');setViewRound(r)}}>{r.name}</li>)}
      </div>}
      </>
    )
  }
  function round(){
    const roundsList = fullTab?.rounds ?? [];
    const currentRound = viewRound || roundsList[0];
    if (!currentRound) {
      return <p>No round selected. Please choose a round.</p>;
    }

    const roundDraws = (fullTab?.draws ?? []).filter((d) => d.roundId === currentRound.roundId);

    return (
      <>
      <section id="other-rounds">
      {roundsList.length === 0 ? (
        <p>No Rounds Were Completed</p>
      ) : (
      <div className="round-buttons">
        {roundsList.map((r,i)=>(
        <button className={r.name===currentRound.name? 'darkButton':'lightButton'} key={i} onClick={()=>{tabChange('round');setViewRound(r)}}>{r.name}</button>))}
      </div>) }
      </section>
      <section id="intro-section">
      <h2 style={{margin:0}}>Results for {currentRound.name}</h2>
      <p style={{margin:'0.5rem'}}>Type of round: <strong>{currentRound.type}</strong></p>
      {currentRound.timeLimit && <p style={{margin:'0.5rem'}}>Time Limit: <strong>{currentRound.timeLimit}</strong></p>}
      {currentRound.wordLimit && <p style={{margin:'0.5rem'}}>Word Limit: <strong>{currentRound.wordLimit}</strong></p>}
      </section>
      <section id="result-section">
        {roundDraws.length === 0 ? (
          <p>No draw results for this round yet.</p>
        ) : (
          roundDraws.map((draw, i) => (
          <div key={i} className="roomCard">
            <div className="roomHeader">
              <h2 style={{margin:'0.1rem'}}>{draw.room?.name ?? 'Room unknown'}</h2>
              <p style={{margin:'0.5rem'}}>Adjudicators: <strong>{(draw.judges ?? []).map((j) => j?.name).filter(Boolean).join(', ') || 'None'}</strong></p>
            </div>
            <div className="roomBody">
              <li><strong>Speller</strong><strong>Institution</strong> {currentRound.breaks?<strong>Status</strong>:<strong>Score</strong>} </li>
              {(draw.spellers ?? []).map((sp, index) => (
                <li key={index}>
                  <span>{sp?.name ?? 'Unknown'}</span>
                  <span>{fullTab.institutions.find((inst)=>inst.id===sp.institutionId)?.name || '-'}</span>
                  {currentRound.breaks?<span>{sp?.result?.status ?? '-'}</span>:<span>{sp?.result?.score ?? '-'}</span>}
                  
                  
                </li>
              ))}
            </div>
          </div>)))
        }
      </section>
      </>
    )
  }
  function spellerTab(){
    const standings = fullTab?.standings ?? [];
    const prelimRounds = (fullTab?.rounds ?? []).filter((round) => !round.breaks);
    return (
      <>
      <section id="intro">
        <h1>Speller Tab</h1>
        <p>This shows perfomances during the preliminary rounds</p>
      </section>
      {standings.length > 0 ? (
      <section id="speller-standings">
        <table>
          <thead>
            <tr style={{gridTemplateColumns:`3rem minmax(180px, 2fr) minmax(180px, 2fr) repeat(${prelimRounds.length}, minmax(80px, 1fr)) 7rem`}}>
              <th>Rank</th>
              <th>Name</th>
              <th>Institution</th>
              {prelimRounds.map((round) => (
                <th key={round.roundId}>{round.name}</th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((standing, i) => (
              <tr key={standing.standingId ?? i} style={{gridTemplateColumns:`3rem minmax(180px, 2fr) minmax(180px, 2fr) repeat(${prelimRounds.length}, minmax(80px, 1fr)) 7rem`}}>
                <td>{standing.rank ?? '-'}</td>
                <td>{standing.speller?.name ?? '-'}</td>
                <td>{fullTab?.institutions?.find((i2)=>i2.id===standing.speller?.institutionId)?.name ?? '-'}</td>
                {prelimRounds.map((round) => {
                  const roundScore = standing.roundScores?.find((entry) => entry?.roundId === round.roundId);
                  return <td key={round.roundId}>{roundScore?.score ?? '-'}</td>;
                })}
                <td>{standing.totalScore ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      ) : (
        <p>No results have been submitted yet.</p>
      )}
      </>
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
        {fullTab?.spellingBees?.length > 0 ? <table>
          <thead>
            <tr style={{gridTemplateColumns:'repeat(2,1fr)'}}>
              <th>Name</th>
              <th>School</th>
            </tr>
          </thead>
          <tbody>
            {fullTab?.spellingBees?.map((p,i)=>(
            <tr key={i} style={{gridTemplateColumns:'repeat(2,1fr)'}}>
              <td>{p.name}</td>
              <td>{fullTab?.institutions?.find((s)=>s.id===p.institutionId)?.name ?? '-'}</td>
            </tr>))}
          </tbody>
        </table> : <p>No Registered Spellers</p>}
      </section>:participant==='judges'?
      <section id="judges">
        <h2>Judges</h2>
        {fullTab?.judges?.length > 0 ? <table>
          <thead>
            <tr style={{gridTemplateColumns:'1fr'}}>
              <th>Name</th>
            </tr>
          </thead>
          <tbody>
            {fullTab?.judges?.map((p,i)=>(
            <tr key={i} style={{gridTemplateColumns:'1fr'}}>
              <td>{p.name}</td>
            </tr>))}
          </tbody>
        </table>:<p>No Registered Judges</p>}
      </section>:
      <section id="institutions">
        <h2>Institutions</h2>
        {fullTab?.institutions?.length > 0 ? <table>
          <thead>
            <tr style={{gridTemplateColumns:'2fr 1fr 1fr'}}>
              <th>Name</th>
              <th>Code</th>
              <th>Participants</th>
            </tr>
          </thead>
          <tbody>
            {fullTab?.institutions?.map((p,i)=>(
            <tr key={i} style={{gridTemplateColumns:'2fr 1fr 1fr'}}>
              <td>{p.name}</td>
              <td>{p.code}</td>
              <td>{p.spellers}</td>
            </tr>))}
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
        {fullTab?.words?.map((w,i)=><div className="word" key={i}>{w.word || w}</div>)}
        {!fullTab?.words?.length && <p>No Words Added</p>}
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

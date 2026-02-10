import { useState } from "react";
import {GiBee} from 'react-icons/gi';
import {IoClose} from 'react-icons/io5';

export default function SpellingBeeTab({tab}) {
  // console.log(tab.title);
  const [tabItem, setTabItem]=useState('home');
  const [menuOpen, setMenuOpen]=useState(false);
  const [round, setRound]=useState(null);

  function home(){
    return(
      <>
      <div className="tabHome">
        <li onClick={()=>setTabItem('results')}>Results</li>
        <li onClick={()=>setTabItem('spellerTab')}>Speller Tab</li>
        <li onClick={()=>setTabItem('words')}>Words</li>
        <li onClick={()=>setTabItem('participants')}>Participants</li>
        <li onClick={()=>setTabItem('institutions')}>Institutions</li>
      </div>
      </>
    )
  }
  function results(){
    return(
      <>
      {/* {console.log(tab.rounds)} */}
      {tab.rounds.length<0?
      <p>No Rounds Were Completed</p>:
      <div className="results">
      {tab.rounds.map((r,i)=>
      <li key={i} onClick={()=>{setTabItem('round');setRound(r)}}>{r.name}</li>)}
      </div>}
      </>
    )
  }
  function rounds(){
    return(
      <>
      <section id="other-rounds">
        {tab.rounds.length<0?
      <p>No Rounds Were Completed</p>:
      <div className="round-buttons">
      {tab.rounds.map((r,i)=>
      <button className={r.name===round.name? 'darkButton':'lightButton'} key={i} onClick={()=>{setTabItem('round');setRound(r)}}>{r.name}</button>)}
      </div>}
      </section>
      <section id="intro-section">
      <h2 style={{margin:0}}>Results for {round.name}</h2>
      <p style={{margin:'0.5rem'}}>Type of round: <strong>{round.type}</strong></p>
      {round.timeLimit && <p style={{margin:'0.5rem'}}>Time Limit: <strong>{round.timeLimit}</strong></p>}
      {round.wordLimit && <p style={{margin:'0.5rem'}}>Word Limit: <strong>{round.wordLimit}</strong></p>}
      </section>
      <section id="result-section">
        {round.matches.map((m,i)=>
        <div key={i} className="roomCard">
          <div className="roomHeader">
            <h2 style={{margin:'0.1rem'}}>{tab.rooms.filter((r)=>r.id===m.roomID)[0].name}</h2>
            <p style={{margin:'0.5rem'}}>Adjudicator: <strong>{tab.judges.filter((r)=>r.id===m.judgeID)[0].name}</strong></p>
          </div>
          <div className="roomBody">
            <li><strong>Participant Name</strong> <strong>School Code</strong> <strong>Score</strong></li>
            {m.result.map((r,index)=>
            <li key={index}><span>{tab.participants.filter((p)=>p.id===r.participantID)[0].name}</span><span>{tab.participants.filter((p)=>p.id===r.participantID)[0].schoolCode}</span>
            {round.type!=='Eliminator'?<span>{r.score}</span>:<span style={r.status==='won'?{color:'green'}:{color:'red'}}>{r.status}</span>}</li>
            )}
          </div>
        </div>)}
      </section>
      </>
    )
  }
  
  return (
    <>
    <nav className="tabMenu">
      <ul>
        <span onClick={()=>setTabItem('home')}><GiBee fill="teal"/><strong>{tab.title}</strong></span>
        <li onClick={()=>setTabItem('results')}>Results</li>
        <li onClick={()=>setTabItem('spellerTab')}>Speller Tab</li>
        <li onClick={()=>setTabItem('words')}>Words</li>
        <li onClick={()=>setTabItem('participants')}>Participants</li>
        <li onClick={()=>setTabItem('institutions')}>Institutions</li>
      </ul>
    </nav>
    <div className="tabSideMenu">
      <nav className="tTitle">
          <span onClick={()=>setTabItem('home')}><GiBee fill="teal"/><strong>{tab.title}</strong></span>
        <span className='☰' onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen? <IoClose/>:'☰'}</span>
      </nav>
      <nav className={`tSideMenu ${menuOpen? 'Open':'Closed'}`}>
        <ul>
          <li onClick={()=>setTabItem('results')}>Results</li>
        <li onClick={()=>setTabItem('spellerTab')}>Speller Tab</li>
        <li onClick={()=>setTabItem('words')}>Words</li>
        <li onClick={()=>setTabItem('participants')}>Participants</li>
        <li onClick={()=>setTabItem('institutions')}>Institutions</li>
        </ul>
      </nav>
    </div>
    {
      tabItem==='home'? home():tabItem==='results'? results():tabItem==='round'? rounds():''
    }
    </>
  )
}

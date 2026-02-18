import { useState } from "react";
import {GiBee} from 'react-icons/gi';
import {IoClose} from 'react-icons/io5';

export default function SpellingBeeTab({tab}) {
  // console.log(tab.title);
  const [tabItem, setTabItem]=useState('home');
  const [participant, setParticipant]=useState('spellers');
  const [menuOpen, setMenuOpen]=useState(false);
  const [viewRound, setViewRound]=useState(null);

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
      {tab.rounds.length<0?
      <p>No Rounds Were Completed</p>:
      <div className="results">
      {tab.rounds.map((r,i)=>
      <li key={i} onClick={()=>{tabChange('round');setViewRound(r)}}>{r.name}</li>)}
      </div>}
      </>
    )
  }
  function round(){
    return(
      <>
      <section id="other-rounds">
        {tab.rounds.length<0?
      <p>No Rounds Were Completed</p>:
      <div className="round-buttons">
      {tab.rounds.map((r,i)=>
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
            <h2 style={{margin:'0.1rem'}}>{tab.rooms.filter((r)=>r.id===m.roomID)[0].name}</h2>
            <p style={{margin:'0.5rem'}}>Adjudicator: <strong>{tab.judges.filter((r)=>r.id===m.judgeID)[0].name}</strong></p>
          </div>
          <div className="roomBody">
            <li><strong>Participant Name</strong> <strong>School Code</strong> <strong>Score</strong></li>
            {m.result.map((r,index)=>
            <li key={index}><span>{tab.participants.filter((p)=>p.id===r.participantID)[0].name}</span><span>{tab.participants.filter((p)=>p.id===r.participantID)[0].schoolCode}</span>
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
              {tab.rounds.filter((r)=>!r.breaks).map((r,i)=><th key={i}>{r.name}</th>)}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {tab.standings.map((s,i)=>
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
        <table>
          <thead>
            <tr style={{gridTemplateColumns:'repeat(2,1fr)'}}>
              <th>Name</th>
              <th>School</th>
            </tr>
          </thead>
          <tbody>
            {tab.participants.map((p,i)=>
            <tr key={i} style={{gridTemplateColumns:'repeat(2,1fr)'}}>
              <td>{p.name}</td>
              <td>{tab.schools.find((s)=>s.code===p.schoolCode).name}</td>
            </tr>)}
          </tbody>
        </table>
      </section>:participant==='judges'?
      <section id="judges">
        <h2>Judges</h2>
        <table>
          <thead>
            <tr style={{gridTemplateColumns:'1fr'}}>
              <th>Name</th>
            </tr>
          </thead>
          <tbody>
            {tab.judges.map((p,i)=>
            <tr key={i} style={{gridTemplateColumns:'1fr'}}>
              <td>{p.name}</td>
            </tr>)}
          </tbody>
        </table>
      </section>:
      <section id="institutions">
        <h2>Institutions</h2>
        <table>
          <thead>
            <tr style={{gridTemplateColumns:'2fr 1fr 1fr'}}>
              <th>Name</th>
              <th>Code</th>
              <th>Participants</th>
            </tr>
          </thead>
          <tbody>
            {tab.schools.map((p,i)=>
            <tr key={i} style={{gridTemplateColumns:'2fr 1fr 1fr'}}>
              <td>{p.name}</td>
              <td>{p.code}</td>
              <td>{p.participants}</td>
            </tr>)}
          </tbody>
        </table>
      </section>}
    </div>)
  }
  function words(){
    return(
      <>
      <h2>Words</h2>
      <section className="words">
        {tab.words.map((w,i)=><div className="word" key={i}>{w}</div>)}
      </section>
      </>
    )
  }
  return (
    <>
    <nav className="tabMenu">
      <ul>
        <span onClick={()=>tabChange('home')}><GiBee fill="teal"/><strong>{tab.title}</strong></span>
        <li onClick={()=>tabChange('rounds')} className={tabItem==='rounds'?'selectedTabItem':''}>Rounds</li>
        <li onClick={()=>tabChange('spellerTab')} className={tabItem==='spellerTab'?'selectedTabItem':''}>Speller Tab</li>
        <li onClick={()=>tabChange('words')} className={tabItem==='words'?'selectedTabItem':''}>Words</li>
        <li onClick={()=>tabChange('participants')} className={tabItem==='participants'?'selectedTabItem':''}>Participants</li>
      </ul>
    </nav>
    <div className="tabSideMenu">
      <nav className="tTitle">
          <span onClick={()=>tabChange('home')}><GiBee fill="teal"/><strong>{tab.title}</strong></span>
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
    </>
  )
}

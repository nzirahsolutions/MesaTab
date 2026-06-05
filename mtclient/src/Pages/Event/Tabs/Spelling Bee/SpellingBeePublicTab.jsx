import { useState, useContext, useEffect } from "react";
import {GiBee} from 'react-icons/gi';
import {IoClose} from 'react-icons/io5';
import {AuthContext} from '../../../../Context/AuthContext';
import Dropdown from "../../../../Components/Dropdown";
import SpellingAdmin from "./SpellingAdmin";
import SpellingJudgeTab from "./SpellingJudgeTab";
import { currentServer } from "../../../../Context/urls";
import Loading from "../../../../Components/Loading";
import axios from "axios";

export default function SpellingBeePublicTab({tab, event}) {
  const [tabItem, setTabItem]=useState('Rounds');
  const [participant, setParticipant]=useState('spellers');
  const [viewRound, setViewRound]=useState(null);
  const {user, access, setAccess}= useContext(AuthContext);
  const [pageLoad, setPageLoad]=useState({loading: true, adminAuthorized:false, judgeAuthorized:false});
  const [fullTab, setFullTab]=useState(null);

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
        const isJudge =
          !!user &&
          Array.isArray(fetchedTab?.judges) &&
          fetchedTab.judges.some((e) => e.email === user.email);
        
        setPageLoad({
          loading: false,
          adminAuthorized: isOwner || isTabMaster,
          judgeAuthorized: isJudge,
        });
      } 
      catch (error) {
        console.error(error);
        if (!isMounted) return;
        setPageLoad({ loading: false, adminAuthorized: false, judgeAuthorized: false });
      }
    }

    getFullTab();
    return () => {
      isMounted = false;
    };
  }, [tab.tabId, event?.ownerId, user]);

  const [sortStates, setSortStates] = useState({
    spellerTab: { column: 'rank', state: true },
    participants: { column: 'name', state: true },
  });

  function toggleSort(view, col) {
    setSortStates((prev) => {
      const current = prev[view];
      const nextDir = current.column === col && current.state === true ? false : true;

      return {
        ...prev,
        [view]: { column: col, state: nextDir },
      };
    });
  }

  function sortItems(items, view, accessorMap) {
    const { column, state } = sortStates[view];
    const accessor = accessorMap[column] || accessorMap.name;
    if (!accessor) return [...items];

    return [...items].sort((a, b) => {
      const aVal = accessor(a);
      const bVal = accessor(b);

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return state ? aVal - bVal : bVal - aVal;
      }
      if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
        const aNum = aVal ? 1 : 0;
        const bNum = bVal ? 1 : 0;
        return state ? aNum - bNum : bNum - aNum;
      }
      return state
        ? String(aVal ?? '').localeCompare(String(bVal ?? ''))
        : String(bVal ?? '').localeCompare(String(aVal ?? ''));
    });
  }

  function rounds(){
    const roundsList = fullTab?.rounds ?? [];
    return(
      <>
      {roundsList.length===0?
      <p>No Rounds Have Been Added</p>:
      <div className="results">
      {roundsList.map((r,i)=><li key={i} onClick={()=>{setTabItem('round');setViewRound(r)}}>{r.name}</li>)}
      </div>}
      </>
    )
  }
  function outRoundSort(e){
    return e.sort((a,b)=>(b.result?.status ?? "").localeCompare(a.result?.status ?? "")).sort((a,b)=>b.result?.score-a.result?.score)
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
        <button className={r.name===currentRound.name? 'darkButton':'lightButton'} key={i} onClick={()=>{setTabItem('round');setViewRound(r)}}>{r.name}</button>))}
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
              <li><strong>Speller</strong><strong>Institution</strong> {currentRound.breaks && !currentRound.blind?<strong>Status</strong>:!currentRound.breaks && !currentRound.blind?<strong>Score</strong>:''} </li>
              {(outRoundSort(draw.spellers) ?? []).map((sp, index) => (
                <li key={index}>
                  <span>{sp?.name ?? 'Unknown'}</span>
                  <span>{fullTab.institutions.find((inst)=>inst.id===sp.institutionId)?.name || '-'}</span>
                  {!currentRound.blind &&
                  <span>{currentRound.breaks?
                  sp?.result?.status ?? '-':sp?.result?.score ?? '-'}</span>}
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
    const prelimRounds = (fullTab?.rounds ?? []).filter((round) => !round.breaks && !round.blind);
    const someBlind=(fullTab?.rounds ?? []).filter((round) => !round.breaks).map(r=>r.blind).includes(true);
    const sortedStandings = sortItems(standings, 'spellerTab', {
      rank: (item) => item.rank ?? Number.MAX_SAFE_INTEGER,
      name: (item) => item.speller?.name ?? '',
      institution: (item) => fullTab?.institutions?.find((i2)=>i2.id===item.speller?.institutionId)?.name ?? '',
      total: (item) => item.totalScore ?? 0,
    });
    return (
      <>
      <section id="intro">
        <h1>Speller Tab</h1>
        <p>This shows perfomances during the preliminary rounds</p>
      </section>
      {standings.length > 0 ? (
      <section id="speller-standings" className="tableScroll">
        <table>
          <thead>
            <tr style={!someBlind?{gridTemplateColumns:`5rem minmax(180px, 2fr) minmax(180px, 2fr) repeat(${prelimRounds.length}, minmax(80px, 1fr)) 7rem`}:{gridTemplateColumns:`minmax(180px, 2fr) minmax(180px, 2fr) repeat(${prelimRounds.length}, minmax(80px, 1fr))`}}>
              {!someBlind &&<th>Rank <button type="button" className="sortToggle" onClick={() => toggleSort('spellerTab', 'rank')}>
                {sortStates.spellerTab.column === 'rank' && sortStates.spellerTab.state === true ? '\u2b9d' : '\u2b9f'}
              </button></th>}
              <th>Name <button type="button" className="sortToggle" onClick={() => toggleSort('spellerTab', 'name')}>
                {sortStates.spellerTab.column === 'name' && sortStates.spellerTab.state === true ? '\u2b9d' : '\u2b9f'}
              </button></th>
              <th>Institution <button type="button" className="sortToggle" onClick={() => toggleSort('spellerTab', 'institution')}>
                {sortStates.spellerTab.column === 'institution' && sortStates.spellerTab.state === true ? '\u2b9d' : '\u2b9f'}
              </button></th>
              {prelimRounds.map((round) => (
                <th key={round.roundId}>{round.name}</th>
              ))}
              {!someBlind &&<th>Total <button type="button" className="sortToggle" onClick={() => toggleSort('spellerTab', 'total')}>
                {sortStates.spellerTab.column === 'total' && sortStates.spellerTab.state === true ? '\u2b9d' : '\u2b9f'}
              </button></th>}
            </tr>
          </thead>
          <tbody>
            {sortedStandings.map((standing, i) => (
              <tr key={standing.standingId ?? i} style={!someBlind?{gridTemplateColumns:`5rem minmax(180px, 2fr) minmax(180px, 2fr) repeat(${prelimRounds.length}, minmax(80px, 1fr)) 7rem`}:{gridTemplateColumns:`minmax(180px, 2fr) minmax(180px, 2fr) repeat(${prelimRounds.length}, minmax(80px, 1fr))`}}>
                {!someBlind && <td>{standing.rank ?? '-'}</td>}
                <td>{standing.speller?.name ?? '-'}</td>
                <td>{fullTab?.institutions?.find((i2)=>i2.id===standing.speller?.institutionId)?.name ?? '-'}</td>
                {prelimRounds.map((round) => {
                  const roundScore = standing.roundScores?.find((entry) => entry?.roundId === round.roundId);
                  return <td key={round.roundId}>{roundScore?.score ?? '-'}</td>;
                })}
                {!someBlind &&<td>{standing.totalScore ?? 0}</td>}
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
    const sortedParticipants = sortItems(
      participant === 'spellers' ? fullTab?.spellingBees ?? [] : participant === 'judges' ? fullTab?.judges ?? [] : fullTab?.institutions ?? [],
      'participants',
      participant === 'spellers'
        ? {
            name: (item) => item.name,
            school: (item) => fullTab?.institutions?.find((s)=>s.id===item.institutionId)?.name ?? '',
          }
        : participant === 'judges'
        ? {
            name: (item) => item.name,
          }
        : {
            name: (item) => item.name,
            code: (item) => item.code,
            participants: (item) => item.spellers,
          }
    );

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
        {sortedParticipants.length > 0 ? 
        <div className="tableScroll"><table>
          <thead>
            <tr style={{gridTemplateColumns:'repeat(2,1fr)'}}>
              <th>Name <button type="button" className="sortToggle" onClick={() => toggleSort('participants', 'name')}>
                  {sortStates.participants.column === 'name' && sortStates.participants.state === true ? '\u2b9d' : '\u2b9f'}
                </button>
              </th>
              <th>School <button type="button" className="sortToggle" onClick={() => toggleSort('participants', 'school')}>
                  {sortStates.participants.column === 'school' && sortStates.participants.state === true ? '\u2b9d' : '\u2b9f'}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedParticipants.map((p,i)=>(
            <tr key={i} style={{gridTemplateColumns:'repeat(2,1fr)'}}>
              <td>{p.name}</td>
              <td>{fullTab?.institutions?.find((s)=>s.id===p.institutionId)?.name ?? '-'}</td>
            </tr>))}
          </tbody>
        </table>
        </div> : <p>No Registered Spellers</p>}
      </section>:participant==='judges'?
      <section id="judges">
        <h2>Judges</h2>
        {sortedParticipants.length > 0 ? <div className="tableScroll"><table>
          <thead>
            <tr style={{gridTemplateColumns:'1fr'}}>
              <th>Name <button type="button" className="sortToggle" onClick={() => toggleSort('participants', 'name')}>
                  {sortStates.participants.column === 'name' && sortStates.participants.state === true ? '\u2b9d' : '\u2b9f'}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedParticipants.map((p,i)=>(
            <tr key={i} style={{gridTemplateColumns:'1fr'}}>
              <td>{p.name}</td>
            </tr>))}
          </tbody>
        </table></div>:<p>No Registered Judges</p>}
      </section>:
      <section id="institutions">
        <h2>Institutions</h2>
        {sortedParticipants.length > 0 ? <div className="tableScroll"><table>
          <thead>
            <tr style={{gridTemplateColumns:'2fr 1fr 1fr'}}>
              <th>Name <button type="button" className="sortToggle" onClick={() => toggleSort('participants', 'name')}>
                  {sortStates.participants.column === 'name' && sortStates.participants.state === true ? '\u2b9d' : '\u2b9f'}
                </button>
              </th>
              <th>Code <button type="button" className="sortToggle" onClick={() => toggleSort('participants', 'code')}>
                  {sortStates.participants.column === 'code' && sortStates.participants.state === true ? '\u2b9d' : '\u2b9f'}
                </button>
              </th>
              <th>Participants <button type="button" className="sortToggle" onClick={() => toggleSort('participants', 'participants')}>
                  {sortStates.participants.column === 'participants' && sortStates.participants.state === true ? '\u2b9d' : '\u2b9f'}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedParticipants.map((p,i)=>(
            <tr key={i} style={{gridTemplateColumns:'2fr 1fr 1fr'}}>
              <td>{p.name}</td>
              <td>{p.code}</td>
              <td>{p.spellers}</td>
            </tr>))}
          </tbody>
        </table></div>:<p>No Registered Institutions</p>}
      </section>}
    </div>)
  }
  function words(){
    return(
      <>
      <h2>Words</h2>{fullTab.completed?
      <section className="words">
        {fullTab?.words?.map((w,i)=><div className="word" key={i}>{w.word || w}</div>)}
        {!fullTab?.words?.length && <p>No Words Added</p>}
      </section>
      :<>Words will be availed once tournament is over</>}
      </>
    )
  }
  const accessOptions = [
    {option:`${tab.title}`, value:'public'},
    ...(pageLoad.judgeAuthorized ? [{option:`${tab.title} (Judge)`, value:'judge'}] : []),
    ...(pageLoad.adminAuthorized ? [{option:`${tab.title} (Admin)`, value:'admin'}] : []),
  ];

  return (
    !pageLoad.loading && access==='public'?
    <>
    <nav className="tabMenu">
      <ul>
        {pageLoad.adminAuthorized || pageLoad.judgeAuthorized ? 
        <Dropdown selectedIdx={0} options={accessOptions} setValue={setAccess}/>:
        <span onClick={()=>setTabItem('Rounds')}><GiBee fill="teal"/><strong>{tab.title}</strong></span>}
      </ul>
    </nav>
    <div className="buttonStack" style={{width:'98%'}}>
      <button className={tabItem==='Rounds' || tabItem==='round'? 'lightButton': 'darkButton'} onClick={()=>setTabItem('Rounds')} >Rounds</button>
      {["Standings", "Words", "Participants"].map((t,i)=>
      <button className={tabItem===t? 'lightButton': 'darkButton'} onClick={()=>setTabItem(t)} key={i}>{t}</button>)}
    </div>
      {tabItem === "Rounds" && rounds()}
      {tabItem === "round" && round()}
      {tabItem === "Standings" && spellerTab()}
      {tabItem === "Words" && words()}
      {tabItem === "Participants" && participants()}
    </>:!pageLoad.loading && access==='judge'?<SpellingJudgeTab tab={tab} event={event} accessOptions={accessOptions} onAccessChange={setAccess}/>:!pageLoad.loading && access==='admin'?<SpellingAdmin tab={tab} event={event}/>:<Loading/>
  )
}


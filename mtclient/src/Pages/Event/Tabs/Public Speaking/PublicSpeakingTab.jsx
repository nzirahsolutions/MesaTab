import { useState, useContext, useEffect, useRef, useMemo } from "react";
import { GiMicrophone } from "react-icons/gi";
import { IoClose } from "react-icons/io5";
import { AuthContext } from "../../../../Context/AuthContext";
import Dropdown from "../../../../Components/Dropdown";
import PublicSpeakingAdmin from "./PublicSpeakingAdmin";
import PublicSpeakingJudgeTab from "./PublicSpeakingJudgeTab";
import { currentServer } from "../../../../Context/urls";
import Loading from "../../../../Components/Loading";
import axios from "axios";

export default function PublicSpeakingTab({ tab, event }) {
  const [tabItem, setTabItem] = useState("home");
  const tabHistoryRef = useRef(false);
  const [participant, setParticipant] = useState("speakers");
  const [participantSort, setParticipantSort] = useState("name-asc");
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewRoundId, setViewRoundId] = useState(0);
  const { user, access, setAccess } = useContext(AuthContext);
  const [pageLoad, setPageLoad] = useState({ loading: true, adminAuthorized: false, judgeAuthorized: false });
  const [fullTab, setFullTab] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function getFullTab() {
      try {
        const res = await axios.get(`${currentServer}/ps/tab/${tab.tabId}`);
        if (!isMounted) return;
        const fetchedTab = res.data?.data || null;
        setFullTab(fetchedTab);
        const isOwner = !!user && user.id === event?.ownerId;
        const isTabMaster = !!user && (fetchedTab?.tabMasters ?? []).some((entry) => entry.email === user.email);
        const isJudge = !!user && (fetchedTab?.judges ?? []).some((entry) => entry.email === user.email);
        setPageLoad({ loading: false, adminAuthorized: isOwner || isTabMaster, judgeAuthorized: isJudge });
      } catch (error) {
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

  useEffect(() => {
    if (tabItem !== "home" && !tabHistoryRef.current) {
      window.history.pushState({ internalTab: true }, "", window.location.href);
      tabHistoryRef.current = true;
    }
    if (tabItem === "home") tabHistoryRef.current = false;
  }, [tabItem]);

  useEffect(() => {
    const onPopState = () => {
      if (tabItem !== "home") setTabItem("home");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [tabItem]);

  //sort function
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

  const sortedRounds = useMemo(
    () => [...(fullTab?.rounds ?? [])].sort((a, b) => a.number - b.number || a.roundId - b.roundId),
    [fullTab]
  );
  const sortedPrompts = useMemo(
    () =>
      [...(fullTab?.speechPrompts ?? [])].sort((a, b) => {
        const roundA = sortedRounds.find((round) => round.roundId === a.roundId)?.number ?? 0;
        const roundB = sortedRounds.find((round) => round.roundId === b.roundId)?.number ?? 0;
        return roundA - roundB || a.speechType.localeCompare(b.speechType);
      }),
    [fullTab, sortedRounds]
  );

  useEffect(() => {
    if (!viewRoundId && sortedRounds.length) {
      setViewRoundId(sortedRounds[0].roundId);
    }
  }, [sortedRounds, viewRoundId]);

  useEffect(() => {
    setParticipantSort("name-asc");
  }, [participant]);

  function tabChange(nextTab) {
    setTabItem(nextTab);
    setMenuOpen(false);
  }

  function home() {
    return (
      <div className="tabHome">
        <li onClick={() => tabChange("rounds")}>Rounds</li>
        <li onClick={() => tabChange("speakerTab")}>Speaker Tab</li>
        <li onClick={() => tabChange("prompts")}>Speech Prompts</li>
        <li onClick={() => tabChange("participants")}>Participants</li>
      </div>
    );
  }

  function rounds() {
    return sortedRounds.length === 0 ? (
      <p>No Rounds Have Been Added</p>
    ) : (
      <div className="results">
        {sortedRounds.map((round) => (
          <li key={round.roundId} onClick={() => { setViewRoundId(round.roundId); tabChange("round"); }}>
            {round.name}
          </li>
        ))}
      </div>
    );
  }

  function round() {
    const currentRound = sortedRounds.find((roundItem) => roundItem.roundId === viewRoundId) ?? sortedRounds[0];
    if (!currentRound) return <p>No round selected.</p>;

    const roundPrompt = sortedPrompts.find((prompt) => prompt.roundId === currentRound.roundId) ?? null;
    const showPrompt = !!fullTab?.completed || !!roundPrompt?.visible;
    const roundDraws = [...(fullTab?.draws ?? [])]
      .filter((draw) => draw.roundId === currentRound.roundId)
      .sort((a, b) => (a.room?.name ?? "").localeCompare(b.room?.name ?? ""));

    return (
      <>
        <section id="other-rounds">
          <div className="round-buttons">
            {sortedRounds.map((item) => (
              <button key={item.roundId} className={item.roundId === currentRound.roundId ? "darkButton" : "lightButton"} onClick={() => setViewRoundId(item.roundId)}>
                {item.name}
              </button>
            ))}
          </div>
        </section>
        <section id="intro-section">
          <h2 style={{ margin: 0 }}>{currentRound.name}</h2>
          <p style={{ margin: "0.5rem" }}>Speech Duration: <strong>{currentRound.speechDuration} minutes</strong></p>
          <p style={{ margin: "0.5rem" }}>
            Prompt: <strong>{showPrompt && roundPrompt ? roundPrompt.speechPrompt : "Not yet visible"}</strong>
            {showPrompt && roundPrompt ? ` (${roundPrompt.speechType})` : ""}
          </p>
        </section>
        <section id="result-section">
          {roundDraws.length === 0 ? <p>No draw results for this round yet.</p> : roundDraws.map((draw) => (
            <div key={draw.drawId} className="roomCard">
              <div className="roomHeader">
                <h2 style={{ margin: 0 }}>{draw.room?.name ?? "Room"}</h2>
                <p style={{ margin: "0.5rem" }}>
                  Adjudicators: <strong>{(draw.judges ?? []).map((judge) => judge?.name).filter(Boolean).join(", ") || "None"}</strong>
                </p>
              </div>
              <div className="roomBody">
                <li style={{ gridTemplateColumns: currentRound.breaks && !currentRound.blind ? "3fr 2fr 1fr 1fr" : "3fr 2fr 1fr", gap: "0.5rem" }}>
                  <strong>Speaker</strong>
                  <strong>Institution</strong>
                  {!currentRound.blind && <strong>Score</strong>}
                  {currentRound.breaks && !currentRound.blind && <strong>Status</strong>}
                </li>
                {(draw.speakers ?? []).map((speaker) => (
                  <li key={speaker.id} style={{ gridTemplateColumns: currentRound.breaks && !currentRound.blind ? "3fr 2fr 1fr 1fr" : "3fr 2fr 1fr", gap: "0.5rem" }}>
                    <span>{speaker.name}</span>
                    <span>{fullTab?.institutions?.find((entry) => entry.id === speaker.institutionId)?.name ?? "-"}</span>
                    {!currentRound.blind && <span>{speaker.result?.score ?? "-"}</span>}
                    {currentRound.breaks && !currentRound.blind && <span>{speaker.result?.status ?? "-"}</span>}
                  </li>
                ))}
              </div>
            </div>
          ))}
        </section>
      </>
    );
  }

  function speakerTab() {
    const standings = fullTab?.standings ?? [];
    const prelimRounds = (fullTab?.rounds ?? []).filter((round) => !round.breaks && !round.blind);
    const someBlind=(fullTab?.rounds ?? []).filter((round) => !round.breaks).map(r=>r.blind).includes(true);
    const sortedStandings = sortItems(standings, 'spellerTab', {
      rank: (item) => item.rank ?? Number.MAX_SAFE_INTEGER,
      name: (item) => item.speaker?.name ?? '',
      institution: (item) => fullTab?.institutions?.find((i2)=>i2.id===item.speaker?.institutionId)?.name ?? '',
      total: (item) => item.totalScore ?? 0,
      average: (item) => item.averageScore ?? 0,
    });
    return (
      <>
      <section id="intro">
        <h1>Speaker Tab</h1>
        <p>This shows perfomances during the preliminary rounds</p>
      </section>
      {standings.length > 0 ? (
      <section id="speaker-standings" className="tableScroll">
        <table>
          <thead>
            <tr style={!someBlind?{gridTemplateColumns:`5rem minmax(180px, 2fr) minmax(180px, 2fr) repeat(${prelimRounds.length}, minmax(80px, 1fr)) 1fr 1fr`}:{gridTemplateColumns:`minmax(180px, 2fr) minmax(180px, 2fr) repeat(${prelimRounds.length}, minmax(80px, 1fr))`}}>
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
              {!someBlind &&<th>Average <button type="button" className="sortToggle" onClick={() => toggleSort('spellerTab', 'average')}>
                {sortStates.spellerTab.column === 'total' && sortStates.spellerTab.state === true ? '\u2b9d' : '\u2b9f'}
              </button></th>}
              {!someBlind &&<th>Total <button type="button" className="sortToggle" onClick={() => toggleSort('spellerTab', 'total')}>
                {sortStates.spellerTab.column === 'total' && sortStates.spellerTab.state === true ? '\u2b9d' : '\u2b9f'}
              </button></th>}
            </tr>
          </thead>
          <tbody>
            {sortedStandings.map((standing, i) => (
              <tr key={standing.standingId ?? i} style={!someBlind?{gridTemplateColumns:`5rem minmax(180px, 2fr) minmax(180px, 2fr) repeat(${prelimRounds.length}, minmax(80px, 1fr)) 1fr 1fr`}:{gridTemplateColumns:`minmax(180px, 2fr) minmax(180px, 2fr) repeat(${prelimRounds.length}, minmax(80px, 1fr))`}}>
                {!someBlind && <td>{standing.rank ?? '-'}</td>}
                <td>{standing.speaker?.name ?? '-'}</td>
                <td>{fullTab?.institutions?.find((i2)=>i2.id===standing.speaker?.institutionId)?.name ?? '-'}</td>
                {prelimRounds.map((round) => {
                  const roundScore = standing.roundScores?.find((entry) => entry?.roundId === round.roundId);
                  return <td key={round.roundId}>{roundScore?.score ?? '-'}</td>;
                })}
                {!someBlind &&<td>{standing.averageScore ?? 0}</td>}
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

  function prompts() {
    return (
      <div className="results">
        {sortedPrompts.map((prompt) => {
          const roundInfo = sortedRounds.find((item) => item.roundId === prompt.roundId);
          const canShow = !!fullTab?.completed || !!prompt.visible;
          return (
            <div key={prompt.id} className="roomCard">
              <div className="roomHeader">
                <h2 style={{ margin: 0 }}>{roundInfo?.name ?? "Round"}</h2>
                <p style={{ margin: "0.5rem" }}>Type: <strong>{prompt.speechType}</strong></p>
              </div>
              <div className="roomBody">
                <p style={{ margin: 0 }}>{canShow ? prompt.speechPrompt : "Prompt not yet visible"}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function participants() {
    const sortedParticipants = sortItems(
      participant === 'speakers' ? fullTab?.speakers ?? [] : participant === 'judges' ? fullTab?.judges ?? [] : fullTab?.institutions ?? [],
      'participants',
      participant === 'speakers'
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
            participants: (item) => item.speakers,
          }
    );

    return(
    <div id="participants">
      <div className="round-buttons">
        <button className={participant==='speakers'? 'darkButton':'lightButton'} onClick={()=>setParticipant('speakers')}>Speakers</button>
        <button className={participant==='judges'? 'darkButton':'lightButton'} onClick={()=>setParticipant('judges')}>Judges</button>
        <button className={participant==='institutions'? 'darkButton':'lightButton'} onClick={()=>setParticipant('institutions')}>Institutions</button>
      </div>
      {participant==='speakers'?
      <section id="speakers">
        <h2>speakers</h2>
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
        </div> : <p>No Registered speakers</p>}
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
              <td>{p.speakers}</td>
            </tr>))}
          </tbody>
        </table></div>:<p>No Registered Institutions</p>}
      </section>}
    </div>)
  }

  const accessOptions = [
    { option: `${tab.title}`, value: "public" },
    ...(pageLoad.judgeAuthorized ? [{ option: `${tab.title} (Judge)`, value: "judge" }] : []),
    ...(pageLoad.adminAuthorized ? [{ option: `${tab.title} (Admin)`, value: "admin" }] : []),
  ];

  if (!pageLoad.loading && access === "judge") return <PublicSpeakingJudgeTab tab={tab} event={event} accessOptions={accessOptions} />;
  if (!pageLoad.loading && access === "admin") return <PublicSpeakingAdmin tab={tab} event={event} />;

  return !pageLoad.loading && access === "public" ? (
    <>
      <nav className="tabMenu">
        <ul>
          {pageLoad.adminAuthorized || pageLoad.judgeAuthorized ? <Dropdown selectedIdx={0} options={accessOptions} setValue={setAccess} /> : <span onClick={() => tabChange("home")}><GiMicrophone fill="teal" /><strong>{tab.title}</strong></span>}
          <li onClick={() => tabChange("rounds")} className={tabItem === "rounds" ? "selectedTabItem" : ""}>Rounds</li>
          <li onClick={() => tabChange("speakerTab")} className={tabItem === "speakerTab" ? "selectedTabItem" : ""}>Speaker Tab</li>
          <li onClick={() => tabChange("prompts")} className={tabItem === "prompts" ? "selectedTabItem" : ""}>Speech Prompts</li>
          <li onClick={() => tabChange("participants")} className={tabItem === "participants" ? "selectedTabItem" : ""}>Participants</li>
        </ul>
      </nav>
      <div className="tabSideMenu">
        <nav className="tTitle">
          {pageLoad.adminAuthorized || pageLoad.judgeAuthorized ? <Dropdown selectedIdx={0} options={accessOptions} setValue={setAccess} /> : <span onClick={() => tabChange("home")}><GiMicrophone fill="teal" /><strong>{tab.title}</strong></span>}
          <span className="menuToggle" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <IoClose /> : "Menu"}</span>
        </nav>
        <nav className={`tSideMenu ${menuOpen ? "Open" : "Closed"}`}>
          <ul>
            <span onClick={() => tabChange("home")}><GiMicrophone fill="teal" /><strong>{tab.title}</strong></span>
            <li onClick={() => tabChange("rounds")} className={tabItem === "rounds" ? "selectedTabItem" : ""}>Rounds</li>
            <li onClick={() => tabChange("speakerTab")} className={tabItem === "speakerTab" ? "selectedTabItem" : ""}>Speaker Tab</li>
            <li onClick={() => tabChange("prompts")} className={tabItem === "prompts" ? "selectedTabItem" : ""}>Speech Prompts</li>
            <li onClick={() => tabChange("participants")} className={tabItem === "participants" ? "selectedTabItem" : ""}>Participants</li>
          </ul>
        </nav>
      </div>
      {menuOpen && <div className="aoe" onClick={() => setMenuOpen(false)}></div>}
      {tabItem === "home" ? home() : tabItem === "rounds" ? rounds() : tabItem === "round" ? round() : tabItem === "speakerTab" ? speakerTab() : tabItem === "prompts" ? prompts() : participants()}
    </>
  ) : <Loading />;
}

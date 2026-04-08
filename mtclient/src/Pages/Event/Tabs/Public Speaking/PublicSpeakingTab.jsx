import { useState, useContext, useEffect, useRef, useMemo } from "react";
import { GiBee } from "react-icons/gi";
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
  const [standingSort, setStandingSort] = useState("rank");
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
  const sortedSpeakerRoster = useMemo(
    () => [...(fullTab?.speakers ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [fullTab]
  );
  const sortedJudgeRoster = useMemo(
    () => [...(fullTab?.judges ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [fullTab]
  );
  const sortedInstitutionRoster = useMemo(
    () => [...(fullTab?.institutions ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [fullTab]
  );
  const sortedStandings = useMemo(() => {
    const standings = [...(fullTab?.standings ?? [])];
    switch (standingSort) {
      case "total":
        return standings.sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0) || (a.rank ?? 9999) - (b.rank ?? 9999));
      case "average":
        return standings.sort((a, b) => (b.averageScore ?? 0) - (a.averageScore ?? 0) || (a.rank ?? 9999) - (b.rank ?? 9999));
      case "name":
        return standings.sort((a, b) => (a.speaker?.name ?? "").localeCompare(b.speaker?.name ?? ""));
      default:
        return standings.sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999) || (b.totalScore ?? 0) - (a.totalScore ?? 0));
    }
  }, [fullTab, standingSort]);
  const participantSortOptions = useMemo(
    () =>
      participant === "institutions"
        ? [
            { option: "Name A-Z", value: "name-asc" },
            { option: "Name Z-A", value: "name-desc" },
            { option: "Code A-Z", value: "code-asc" },
          ]
        : [
            { option: "Name A-Z", value: "name-asc" },
            { option: "Name Z-A", value: "name-desc" },
            { option: "Institution A-Z", value: "institution-asc" },
          ],
    [participant]
  );
  const participantItems = useMemo(() => {
    const baseItems =
      participant === "speakers"
        ? [...sortedSpeakerRoster]
        : participant === "judges"
          ? [...sortedJudgeRoster]
          : [...sortedInstitutionRoster];

    if (participant === "institutions") {
      if (participantSort === "name-desc") return baseItems.sort((a, b) => b.name.localeCompare(a.name));
      if (participantSort === "code-asc") return baseItems.sort((a, b) => (a.code ?? "").localeCompare(b.code ?? ""));
      return baseItems.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (participantSort === "name-desc") return baseItems.sort((a, b) => b.name.localeCompare(a.name));
    if (participantSort === "institution-asc") {
      return baseItems.sort((a, b) => {
        const institutionA = fullTab?.institutions?.find((entry) => entry.id === a.institutionId)?.name ?? "";
        const institutionB = fullTab?.institutions?.find((entry) => entry.id === b.institutionId)?.name ?? "";
        return institutionA.localeCompare(institutionB) || a.name.localeCompare(b.name);
      });
    }
    return baseItems.sort((a, b) => a.name.localeCompare(b.name));
  }, [fullTab, participant, participantSort, sortedInstitutionRoster, sortedJudgeRoster, sortedSpeakerRoster]);

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
          <p style={{ margin: "0.5rem" }}>Speech Duration: <strong>{currentRound.speechDuration} seconds</strong></p>
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
    const standingSortOptions = [
      { option: "Rank", value: "rank" },
      { option: "Total Score", value: "total" },
      { option: "Average Score", value: "average" },
      { option: "Speaker Name", value: "name" },
    ];

    return (
      <>
        <section id="intro">
          <h1>Speaker Tab</h1>
          <Dropdown
            options={standingSortOptions}
            setValue={setStandingSort}
            selectedIdx={Math.max(0, standingSortOptions.findIndex((option) => option.value === standingSort))}
          />
        </section>
        <section className="tableScroll">
          <table>
            <thead>
              <tr style={{ gridTemplateColumns: "5rem minmax(180px, 2fr) minmax(180px, 2fr) 7rem 7rem 7rem" }}>
                <th>Rank</th>
                <th>Name</th>
                <th>Institution</th>
                <th>Total</th>
                <th>Average</th>
                <th>Apps</th>
              </tr>
            </thead>
            <tbody>
              {sortedStandings.map((standing) => (
                <tr key={standing.standingId} style={{ gridTemplateColumns: "5rem minmax(180px, 2fr) minmax(180px, 2fr) 7rem 7rem 7rem" }}>
                  <td>{standing.rank ?? "-"}</td>
                  <td>{standing.speaker?.name ?? "-"}</td>
                  <td>{fullTab?.institutions?.find((entry) => entry.id === standing.speaker?.institutionId)?.name ?? "-"}</td>
                  <td>{standing.totalScore ?? 0}</td>
                  <td>{standing.averageScore ?? 0}</td>
                  <td>{standing.appearances ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </>
    );
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
    return (
      <div id="participants">
        <div className="round-buttons">
          <button className={participant === "speakers" ? "darkButton" : "lightButton"} onClick={() => setParticipant("speakers")}>Speakers</button>
          <button className={participant === "judges" ? "darkButton" : "lightButton"} onClick={() => setParticipant("judges")}>Judges</button>
          <button className={participant === "institutions" ? "darkButton" : "lightButton"} onClick={() => setParticipant("institutions")}>Institutions</button>
        </div>
        <Dropdown
          key={participant}
          options={participantSortOptions}
          setValue={setParticipantSort}
          selectedIdx={Math.max(0, participantSortOptions.findIndex((option) => option.value === participantSort))}
        />
        <div className="results">
          {participantItems.map((item) => (
            <div key={item.id} className="roomCard">
              <div className="roomHeader">
                <h2 style={{ margin: 0 }}>{item.name}</h2>
                {participant === "speakers" && <p style={{ margin: "0.5rem" }}>{fullTab?.institutions?.find((entry) => entry.id === item.institutionId)?.name ?? "-"}</p>}
                {participant === "judges" && <p style={{ margin: "0.5rem" }}>{fullTab?.institutions?.find((entry) => entry.id === item.institutionId)?.name ?? "-"}</p>}
                {participant === "institutions" && <p style={{ margin: "0.5rem" }}>Code: <strong>{item.code}</strong></p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
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
          {pageLoad.adminAuthorized || pageLoad.judgeAuthorized ? <Dropdown selectedIdx={0} options={accessOptions} setValue={setAccess} /> : <span onClick={() => tabChange("home")}><GiBee fill="teal" /><strong>{tab.title}</strong></span>}
          <li onClick={() => tabChange("rounds")} className={tabItem === "rounds" ? "selectedTabItem" : ""}>Rounds</li>
          <li onClick={() => tabChange("speakerTab")} className={tabItem === "speakerTab" ? "selectedTabItem" : ""}>Speaker Tab</li>
          <li onClick={() => tabChange("prompts")} className={tabItem === "prompts" ? "selectedTabItem" : ""}>Speech Prompts</li>
          <li onClick={() => tabChange("participants")} className={tabItem === "participants" ? "selectedTabItem" : ""}>Participants</li>
        </ul>
      </nav>
      <div className="tabSideMenu">
        <nav className="tTitle">
          {pageLoad.adminAuthorized || pageLoad.judgeAuthorized ? <Dropdown selectedIdx={0} options={accessOptions} setValue={setAccess} /> : <span onClick={() => tabChange("home")}><GiBee fill="teal" /><strong>{tab.title}</strong></span>}
          <span className="menuToggle" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <IoClose /> : "Menu"}</span>
        </nav>
        <nav className={`tSideMenu ${menuOpen ? "Open" : "Closed"}`}>
          <ul>
            <span onClick={() => tabChange("home")}><GiBee fill="teal" /><strong>{tab.title}</strong></span>
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

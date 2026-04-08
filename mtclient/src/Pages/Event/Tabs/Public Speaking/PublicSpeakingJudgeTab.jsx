import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { GiBee } from "react-icons/gi";
import { IoClose } from "react-icons/io5";
import axios from "axios";
import { AuthContext } from "../../../../Context/AuthContext";
import Dropdown from "../../../../Components/Dropdown";
import Loading from "../../../../Components/Loading";
import Cell from "../../../../Components/Cell";
import { currentServer } from "../../../../Context/urls";

export default function PublicSpeakingJudgeTab({ tab, event, accessOptions }) {
  const { user, setAccess } = useContext(AuthContext);
  const [tabItem, setTabItem] = useState("home");
  const tabHistoryRef = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewRoundId, setViewRoundId] = useState(0);
  const [pageLoad, setPageLoad] = useState({ loading: true, authorized: false });
  const [fullTab, setFullTab] = useState(null);
  const [roomDrafts, setRoomDrafts] = useState({});
  const [saveState, setSaveState] = useState({
    loading: false,
    success: false,
    error: false,
    message: "",
    roomKey: "",
  });

  async function getFullTab() {
    try {
      const res = await axios.get(`${currentServer}/ps/tab/${tab.tabId}`);
      const fetchedTab = res.data?.data ?? null;
      const isJudge =
        !!user &&
        Array.isArray(fetchedTab?.judges) &&
        fetchedTab.judges.some((judge) => judge.email === user.email);

      if (!isJudge) setAccess("public");
      setFullTab(fetchedTab);
      setPageLoad({ loading: false, authorized: isJudge });
    } catch (error) {
      console.error(error);
      setPageLoad({ loading: false, authorized: false });
    }
  }

  useEffect(() => {
    getFullTab();
  }, [tab.tabId, event?.ownerId, user]);

  useEffect(() => {
    if (tabItem !== "home" && !tabHistoryRef.current) {
      window.history.pushState({ internalTab: true }, "", window.location.href);
      tabHistoryRef.current = true;
    }

    if (tabItem === "home") {
      tabHistoryRef.current = false;
    }
  }, [tabItem]);

  useEffect(() => {
    const onPopState = () => {
      if (tabItem !== "home") {
        setTabItem("home");
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [tabItem]);

  const judge = useMemo(() => {
    if (!user || !Array.isArray(fullTab?.judges)) return null;
    return fullTab.judges.find((item) => item.email === user.email) ?? null;
  }, [fullTab, user]);

  const allocatedDraws = useMemo(() => {
    if (!judge || !Array.isArray(fullTab?.draws)) return [];
    return fullTab.draws.filter((draw) =>
      (draw.judges ?? []).some((item) => item?.id === judge.id)
    );
  }, [fullTab, judge]);

  const allocatedRounds = useMemo(() => {
    if (!Array.isArray(fullTab?.rounds)) return [];
    return fullTab.rounds
      .filter((round) => allocatedDraws.some((draw) => draw.roundId === round.roundId))
      .sort((a, b) => a.number - b.number || a.roundId - b.roundId);
  }, [allocatedDraws, fullTab]);

  useEffect(() => {
    if (!viewRoundId && allocatedRounds.length) {
      setViewRoundId(allocatedRounds[0].roundId);
    }
  }, [allocatedRounds, viewRoundId]);

  function tabChange(nextTab) {
    setTabItem(nextTab);
    setMenuOpen(false);
  }

  function updateRoomDraft(roundId, roomId, speakerId, patch) {
    const roomKey = `${roundId}-${roomId}`;
    const sourceDraw =
      roomDrafts[roomKey] ??
      allocatedDraws.find((draw) => draw.roundId === roundId && draw.room?.id === roomId);

    if (!sourceDraw) return;

    setSaveState((prev) => ({ ...prev, success: false, error: false, message: "", roomKey: "" }));
    setRoomDrafts((prev) => ({
      ...prev,
      [roomKey]: {
        ...sourceDraw,
        speakers: (sourceDraw.speakers ?? []).map((speaker) =>
          speaker.id === speakerId
            ? {
                ...speaker,
                result: {
                  ...(speaker.result ?? {}),
                  ...patch,
                },
              }
            : speaker
        ),
      },
    }));
  }

  async function submitRoomResults(roundId, roomId) {
    const roomKey = `${roundId}-${roomId}`;
    const draw =
      roomDrafts[roomKey] ??
      allocatedDraws.find((item) => item.roundId === roundId && item.room?.id === roomId);
    const round = fullTab?.rounds?.find((item) => item.roundId === roundId);

    if (!draw || !round) return;

    setSaveState({ loading: true, success: false, error: false, message: "", roomKey });

    try {
      const payload = {
        tabId: tab.tabId,
        roundId,
        roomId,
        updates: (draw.speakers ?? []).map((speaker) => ({
          speakerId: speaker.id,
          score: speaker.result?.score ?? fullTab.minScore,
          ...(round.breaks ? { status: speaker.result?.status ?? "Incomplete" } : {}),
        })),
      };

      const res = await axios.post(`${currentServer}/ps/result/batch`, payload);
      await getFullTab();
      setRoomDrafts((prev) => {
        const next = { ...prev };
        delete next[roomKey];
        return next;
      });
      setSaveState({
        loading: false,
        success: true,
        error: false,
        message: res.data?.message ?? "Ballot submitted",
        roomKey,
      });
    } catch (error) {
      const message = error?.response?.data?.message ?? "Something went wrong";
      setSaveState({
        loading: false,
        success: false,
        error: true,
        message,
        roomKey,
      });
    }
  }

  function home() {
    return (
      <div className="tabHome">
        <li onClick={() => tabChange("ballots")}>My Ballots</li>
        <li onClick={() => tabChange("rounds")}>My Rounds</li>
      </div>
    );
  }

  function rounds() {
    return allocatedRounds.length === 0 ? (
      <p>No rooms have been allocated to you yet.</p>
    ) : (
      <div className="results">
        {allocatedRounds.map((round) => (
          <li
            key={round.roundId}
            onClick={() => {
              setViewRoundId(round.roundId);
              tabChange("ballots");
            }}
          >
            {round.name}
          </li>
        ))}
      </div>
    );
  }

  function ballots() {
    const currentRound =
      allocatedRounds.find((round) => round.roundId === viewRoundId) ?? allocatedRounds[0];
    const roundDraws = allocatedDraws
      .filter((draw) => draw.roundId === currentRound?.roundId)
      .sort((a, b) => (a.room?.name ?? "").localeCompare(b.room?.name ?? ""));

    if (!currentRound) {
      return <p>No rooms have been allocated to you yet.</p>;
    }

    return (
      <>
        <section id="other-rounds">
          <div className="round-buttons">
            {allocatedRounds.map((round) => (
              <button
                key={round.roundId}
                className={round.roundId === currentRound.roundId ? "darkButton" : "lightButton"}
                onClick={() => setViewRoundId(round.roundId)}
              >
                {round.name}
              </button>
            ))}
          </div>
        </section>
        <section id="result-section">
          {roundDraws.length === 0 ? (
            <p>No room allocation found for this round.</p>
          ) : (
            roundDraws.map((draw) => {
              const roomKey = `${draw.roundId}-${draw.room.id}`;
              const roomData = roomDrafts[roomKey] ?? draw;
              return (
                <div key={roomKey} className="roomCard">
                  <div className="roomHeader">
                    <h2 style={{ margin: 0 }}>{draw.room.name}</h2>
                    <p style={{ margin: "0.3rem 0" }}>
                      Speech Duration: <strong>{currentRound.speechDuration}s</strong>
                    </p>
                    {draw.prompt && (
                      <p style={{ margin: "0.3rem 0" }}>
                        Prompt: <strong>{draw.prompt.speechPrompt}</strong> ({draw.prompt.speechType})
                      </p>
                    )}
                    <p style={{ margin: "0.3rem 0" }}>
                      Adjudicators:{" "}
                      <strong>
                        {(draw.judges ?? []).map((item) => item?.name).filter(Boolean).join(", ") || "None"}
                      </strong>
                    </p>
                    {saveState.roomKey === roomKey && saveState.error && <p style={{ color: "red", margin: 0 }}>{saveState.message}</p>}
                    {saveState.roomKey === roomKey && saveState.success && <p style={{ color: "green", margin: 0 }}>{saveState.message}</p>}
                  </div>
                  <div className="roomBody">
                    <li style={{ gridTemplateColumns: currentRound.breaks ? "3fr 2fr 1fr 1fr" : "3fr 2fr 1fr", gap: "0.5rem" }}>
                      <strong>Speaker</strong>
                      <strong>Institution</strong>
                      <strong>Score</strong>
                      {currentRound.breaks && <strong>Status</strong>}
                    </li>
                    {(roomData.speakers ?? []).map((speaker) => (
                      <li key={speaker.id} style={{ gridTemplateColumns: currentRound.breaks ? "3fr 2fr 1fr 1fr" : "3fr 2fr 1fr", gap: "0.5rem" }}>
                        <span>{speaker.name}</span>
                        <span>{fullTab?.institutions?.find((item) => item.id === speaker.institutionId)?.code ?? "-"}</span>
                        <Cell
                          value={speaker.result?.score ?? fullTab.minScore}
                          min={fullTab.minScore}
                          max={fullTab.maxScore}
                          onChange={(score) => updateRoomDraft(draw.roundId, draw.room.id, speaker.id, { score })}
                        />
                        {currentRound.breaks && (
                          <select
                            value={speaker.result?.status ?? "Incomplete"}
                            onChange={(e) => updateRoomDraft(draw.roundId, draw.room.id, speaker.id, { status: e.target.value })}
                          >
                            <option value="Incomplete">Incomplete</option>
                            <option value="Eliminated">Eliminated</option>
                            <option value="Pass">Pass</option>
                          </select>
                        )}
                      </li>
                    ))}
                  </div>
                  <button className="darkButton" disabled={saveState.loading && saveState.roomKey === roomKey} onClick={() => submitRoomResults(draw.roundId, draw.room.id)}>
                    {saveState.loading && saveState.roomKey === roomKey ? "Saving" : "Submit Ballot"}
                  </button>
                </div>
              );
            })
          )}
        </section>
      </>
    );
  }

  const selectedIdx = Math.max(0, accessOptions.findIndex((option) => option.value === "judge"));

  if (pageLoad.loading) return <Loading />;

  return (
    <>
      <nav className="tabMenu">
        <ul>
          <Dropdown options={accessOptions} setValue={setAccess} selectedIdx={selectedIdx} />
          <li onClick={() => tabChange("rounds")} className={tabItem === "rounds" ? "selectedTabItem" : ""}>My Rounds</li>
          <li onClick={() => tabChange("ballots")} className={tabItem === "ballots" ? "selectedTabItem" : ""}>My Ballots</li>
        </ul>
      </nav>
      <div className="tabSideMenu">
        <nav className="tTitle">
          <Dropdown options={accessOptions} setValue={setAccess} selectedIdx={selectedIdx} />
          <span className="menuToggle" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <IoClose /> : "Menu"}</span>
        </nav>
        <nav className={`tSideMenu ${menuOpen ? "Open" : "Closed"}`}>
          <ul>
            <span onClick={() => tabChange("home")}><GiBee fill="teal" /><strong>{tab.title}</strong></span>
            <li onClick={() => tabChange("rounds")} className={tabItem === "rounds" ? "selectedTabItem" : ""}>My Rounds</li>
            <li onClick={() => tabChange("ballots")} className={tabItem === "ballots" ? "selectedTabItem" : ""}>My Ballots</li>
          </ul>
        </nav>
      </div>
      {menuOpen && <div className="aoe" onClick={() => setMenuOpen(false)}></div>}
      {tabItem === "home" ? home() : tabItem === "rounds" ? rounds() : ballots()}
    </>
  );
}

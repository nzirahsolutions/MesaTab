import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { GiBee } from "react-icons/gi";
import { IoClose } from "react-icons/io5";
import axios from "axios";
import { AuthContext } from "../../../../Context/AuthContext";
import Dropdown from "../../../../Components/Dropdown";
import Loading from "../../../../Components/Loading";
import ToggleButton from "../../../../Components/ToggleButton";
import Cell from "../../../../Components/Cell";
import { currentServer } from "../../../../Context/urls";

const speechTypes = [
  "narrative",
  "dilemma",
  "philosophical",
  "informative",
  "inspirational",
  "impromptu",
  "selling",
  "special occassion",
  "creative",
  "other",
];

const breakPhases = ["Triples", "Doubles", "Octos", "Quarters", "Semis", "Finals"];

export default function PublicSpeakingAdmin({ tab, event }) {
  const { user, access, setAccess } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tabItem, setTabItem] = useState("configuration");
  const tabHistoryRef = useRef(false);
  const [pageLoad, setPageLoad] = useState({ loading: true, adminAuthorized: false, judgeAuthorized: false });
  const [fullTab, setFullTab] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [configForm, setConfigForm] = useState({ title: "", slug: "", minScore: 30, maxScore: 90, completed: false, cups: [] });
  const [institutionForm, setInstitutionForm] = useState({ id: null, name: "", code: "" });
  const [tabMasterForm, setTabMasterForm] = useState({ id: null, name: "", institutionId: 0, email: "" });
  const [speakerForm, setSpeakerForm] = useState({ id: null, name: "", institutionId: 0, email: "", available: true });
  const [judgeForm, setJudgeForm] = useState({ id: null, name: "", institutionId: 0, email: "", available: true });
  const [roomForm, setRoomForm] = useState({ id: null, name: "", available: true });
  const [roundForm, setRoundForm] = useState({ id: null, name: "", number: "", speechDuration: "", breaks: false, blind: false, completed: false, breakCategory: "", breakPhase: "" });
  const [promptForm, setPromptForm] = useState({ id: null, roundId: "", speechPrompt: "", speechType: "narrative", visible: false });
  const [drawForm, setDrawForm] = useState({ roundId: "", powerPair: true, breakRoundId: "", preview: null });
  const [resultForm, setResultForm] = useState({ roundId: "", roomId: "", draft: null });

  async function getFullTab() {
    try {
      const res = await axios.get(`${currentServer}/ps/tab/${tab.tabId}`);
      const fetchedTab = res.data?.data ?? null;
      setFullTab(fetchedTab);
      setConfigForm({
        title: fetchedTab.title,
        slug: fetchedTab.slug,
        minScore: fetchedTab.minScore,
        maxScore: fetchedTab.maxScore,
        completed: fetchedTab.completed,
        cups: fetchedTab.cups ?? [],
      });

      const isOwner = !!user && user.id === event?.ownerId;
      const isTabMaster = !!user && (fetchedTab?.tabMasters ?? []).some((entry) => entry.email === user.email);
      const isJudge = !!user && (fetchedTab?.judges ?? []).some((entry) => entry.email === user.email);
      const adminAuthorized = isOwner || isTabMaster;
      setPageLoad({ loading: false, adminAuthorized, judgeAuthorized: isJudge });
      if (!adminAuthorized && access === "admin") setAccess("public");
    } catch (error) {
      console.error(error);
      setPageLoad({ loading: false, adminAuthorized: false, judgeAuthorized: false });
    }
  }

  useEffect(() => {
    getFullTab();
  }, [tab.tabId, event?.ownerId, user]);

  useEffect(() => {
    if (tabItem !== "configuration" && !tabHistoryRef.current) {
      window.history.pushState({ internalTab: true }, "", window.location.href);
      tabHistoryRef.current = true;
    }
    if (tabItem === "configuration") tabHistoryRef.current = false;
  }, [tabItem]);

  useEffect(() => {
    const onPopState = () => {
      if (tabItem !== "configuration") setTabItem("configuration");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [tabItem]);

  const accessOptions = [
    { option: `${tab.title}`, value: "public" },
    ...(pageLoad.judgeAuthorized ? [{ option: `${tab.title} (Judge)`, value: "judge" }] : []),
    ...(pageLoad.adminAuthorized ? [{ option: `${tab.title} (Admin)`, value: "admin" }] : []),
  ];

  const sortedRounds = useMemo(() => [...(fullTab?.rounds ?? [])].sort((a, b) => a.number - b.number || a.roundId - b.roundId), [fullTab]);
  const sortedInstitutions = useMemo(() => [...(fullTab?.institutions ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [fullTab]);
  const sortedTabMasters = useMemo(() => [...(fullTab?.tabMasters ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [fullTab]);
  const sortedSpeakers = useMemo(() => [...(fullTab?.speakers ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [fullTab]);
  const sortedJudges = useMemo(() => [...(fullTab?.judges ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [fullTab]);
  const sortedRooms = useMemo(() => [...(fullTab?.rooms ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [fullTab]);
  const sortedPrompts = useMemo(
    () =>
      [...(fullTab?.speechPrompts ?? [])].sort((a, b) => {
        const roundA = sortedRounds.find((round) => round.roundId === a.roundId)?.number ?? 0;
        const roundB = sortedRounds.find((round) => round.roundId === b.roundId)?.number ?? 0;
        return roundA - roundB || a.speechType.localeCompare(b.speechType);
      }),
    [fullTab, sortedRounds]
  );
  const sortedResultsRooms = useMemo(
    () =>
      [...(fullTab?.draws ?? [])]
        .filter((draw) => draw.roundId === Number(resultForm.roundId))
        .sort((a, b) => (a.room?.name ?? "").localeCompare(b.room?.name ?? "")),
    [fullTab, resultForm.roundId]
  );
  const currentDraw = fullTab?.draws?.find((draw) => draw.roundId === Number(resultForm.roundId) && draw.room?.id === Number(resultForm.roomId)) ?? null;

  function flash(type, text) {
    setMessage({ type, text });
  }

  async function saveConfig(e) {
    e.preventDefault();
    try {
      const res = await axios.put(`${currentServer}/ps/tab/update`, { ...configForm, tabId: tab.tabId });
      flash("success", res.data?.message ?? "Configuration updated");
      await getFullTab();
    } catch (error) {
      flash("error", error?.response?.data?.message ?? "Failed to update configuration");
    }
  }

  async function submitEntity(endpoint, form, resetForm) {
    try {
      const res = form.id
        ? await axios.put(`${currentServer}/ps/${endpoint}`, { ...form, tabId: tab.tabId })
        : await axios.post(`${currentServer}/ps/${endpoint}`, { ...form, tabId: tab.tabId });
      flash("success", res.data?.message ?? "Saved");
      resetForm();
      await getFullTab();
    } catch (error) {
      flash("error", error?.response?.data?.message ?? "Failed to save");
    }
  }

  async function deleteEntity(endpoint, payload) {
    if (!window.confirm("Delete this item?")) return;
    try {
      const res = await axios.delete(`${currentServer}/ps/${endpoint}`, { data: { ...payload, tabId: tab.tabId } });
      flash("success", res.data?.message ?? "Deleted");
      await getFullTab();
    } catch (error) {
      flash("error", error?.response?.data?.message ?? "Failed to delete");
    }
  }

  async function generateDraw(e) {
    e.preventDefault();
    try {
      const res = await axios.post(`${currentServer}/ps/draw/generate`, { tabId: tab.tabId, roundId: Number(drawForm.roundId), powerPair: drawForm.powerPair });
      flash("success", res.data?.message ?? "Draw generated");
      await getFullTab();
    } catch (error) {
      flash("error", error?.response?.data?.message ?? "Failed to generate draw");
    }
  }

  async function previewBreak(e) {
    e.preventDefault();
    try {
      const res = await axios.post(`${currentServer}/ps/draw/breaks`, { tabId: tab.tabId, roundId: Number(drawForm.breakRoundId) });
      setDrawForm((prev) => ({ ...prev, preview: res.data?.data ?? null }));
      flash("success", res.data?.message ?? "Break preview generated");
    } catch (error) {
      flash("error", error?.response?.data?.message ?? "Failed to preview break draw");
    }
  }

  async function generateBreakDraw() {
    try {
      const res = await axios.post(`${currentServer}/ps/draw/break-generate`, { tabId: tab.tabId, roundId: Number(drawForm.breakRoundId) });
      flash("success", res.data?.message ?? "Break draw generated");
      await getFullTab();
    } catch (error) {
      flash("error", error?.response?.data?.message ?? "Failed to generate break draw");
    }
  }

  async function deleteDraw(roundId) {
    if (!window.confirm("Delete the draw for this round?")) return;
    try {
      const res = await axios.delete(`${currentServer}/ps/draw/delete`, { data: { tabId: tab.tabId, roundId } });
      flash("success", res.data?.message ?? "Draw deleted");
      await getFullTab();
    } catch (error) {
      flash("error", error?.response?.data?.message ?? "Failed to delete draw");
    }
  }

  function updateResultDraft(speakerId, patch) {
    setResultForm((prev) => {
      if (!prev.draft) return prev;
      return {
        ...prev,
        draft: {
          ...prev.draft,
          speakers: prev.draft.speakers.map((speaker) =>
            speaker.id === speakerId
              ? { ...speaker, result: { ...(speaker.result ?? {}), ...patch } }
              : speaker
          ),
        },
      };
    });
  }

  async function saveRoomResults(e) {
    e.preventDefault();
    if (!resultForm.draft) return;
    try {
      const payload = {
        tabId: tab.tabId,
        roundId: Number(resultForm.roundId),
        roomId: Number(resultForm.roomId),
        updates: resultForm.draft.speakers.map((speaker) => ({
          speakerId: speaker.id,
          score: speaker.result?.score ?? fullTab.minScore,
          ...(sortedRounds.find((round) => round.roundId === Number(resultForm.roundId))?.breaks ? { status: speaker.result?.status ?? "Incomplete" } : {}),
        })),
      };
      const res = await axios.post(`${currentServer}/ps/result/batch`, payload);
      flash("success", res.data?.message ?? "Results saved");
      await getFullTab();
    } catch (error) {
      flash("error", error?.response?.data?.message ?? "Failed to save results");
    }
  }

  useEffect(() => {
    if (!currentDraw) {
      setResultForm((prev) => ({ ...prev, draft: null }));
      return;
    }
    setResultForm((prev) => ({ ...prev, draft: JSON.parse(JSON.stringify(currentDraw)) }));
  }, [resultForm.roundId, resultForm.roomId, currentDraw?.drawId]);

  function renderMessage() {
    return message.text ? <p style={{ color: message.type === "error" ? "red" : "green" }}>{message.text}</p> : null;
  }

  if (pageLoad.loading || access !== "admin") return <Loading />;

  return (
    <>
      <nav className="tabMenu">
        <ul>
          <Dropdown options={accessOptions} setValue={setAccess} selectedIdx={Math.max(0, accessOptions.findIndex((option) => option.value === "admin"))} />
          {["configuration", "institutions", "tabMasters", "speakers", "judges", "rooms", "rounds", "prompts", "draws", "results"].map((item) => (
            <li key={item} onClick={() => setTabItem(item)} className={tabItem === item ? "selectedTabItem" : ""}>{item[0].toUpperCase() + item.slice(1)}</li>
          ))}
        </ul>
      </nav>
      <div className="tabSideMenu">
        <nav className="tTitle">
          <Dropdown options={accessOptions} setValue={setAccess} selectedIdx={Math.max(0, accessOptions.findIndex((option) => option.value === "admin"))} />
          <span className="menuToggle" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <IoClose /> : "Menu"}</span>
        </nav>
        <nav className={`tSideMenu ${menuOpen ? "Open" : "Closed"}`}>
          <ul>
            <span onClick={() => setTabItem("configuration")}><GiBee fill="teal" /><strong>{tab.title}</strong></span>
            {["configuration", "institutions", "tabMasters", "speakers", "judges", "rooms", "rounds", "prompts", "draws", "results"].map((item) => (
              <li key={item} onClick={() => setTabItem(item)} className={tabItem === item ? "selectedTabItem" : ""}>{item[0].toUpperCase() + item.slice(1)}</li>
            ))}
          </ul>
        </nav>
      </div>
      {menuOpen && <div className="aoe" onClick={() => setMenuOpen(false)}></div>}
      {renderMessage()}
      {tabItem === "configuration" && (
        <form onSubmit={saveConfig}>
          <h2>{fullTab?.title}</h2>
          <label>Title <input type="text" value={configForm.title} onChange={(e) => setConfigForm((prev) => ({ ...prev, title: e.target.value }))} /></label><br />
          <label>Slug <input type="text" value={configForm.slug} onChange={(e) => setConfigForm((prev) => ({ ...prev, slug: e.target.value }))} /></label><br />
          <label>Min Score <input type="number" value={configForm.minScore} onChange={(e) => setConfigForm((prev) => ({ ...prev, minScore: Number(e.target.value) }))} /></label><br />
          <label>Max Score <input type="number" value={configForm.maxScore} onChange={(e) => setConfigForm((prev) => ({ ...prev, maxScore: Number(e.target.value) }))} /></label><br />
          <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>Completed <ToggleButton state={configForm.completed} setState={() => setConfigForm((prev) => ({ ...prev, completed: !prev.completed }))} /></label>
          <h3>Cups</h3>
          {configForm.cups.map((cup, index) => (
            <div key={cup.id ?? `cup-${index}`} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: "0.5rem" }}>
              <input value={cup.cupCategory} onChange={(e) => setConfigForm((prev) => ({ ...prev, cups: prev.cups.map((item, itemIdx) => itemIdx === index ? { ...item, cupCategory: e.target.value } : item) }))} />
              <input type="number" value={cup.cupOrder} onChange={(e) => setConfigForm((prev) => ({ ...prev, cups: prev.cups.map((item, itemIdx) => itemIdx === index ? { ...item, cupOrder: Number(e.target.value) } : item) }))} />
              <input type="number" value={cup.breakNumber} onChange={(e) => setConfigForm((prev) => ({ ...prev, cups: prev.cups.map((item, itemIdx) => itemIdx === index ? { ...item, breakNumber: Number(e.target.value) } : item) }))} />
              <input type="number" value={cup.breakCapacity} onChange={(e) => setConfigForm((prev) => ({ ...prev, cups: prev.cups.map((item, itemIdx) => itemIdx === index ? { ...item, breakCapacity: Number(e.target.value) } : item) }))} />
              <button type="button" className="lightButton" onClick={() => setConfigForm((prev) => ({ ...prev, cups: prev.cups.filter((_, itemIdx) => itemIdx !== index) }))}>Remove</button>
            </div>
          ))}
          <button type="button" className="lightButton" onClick={() => setConfigForm((prev) => ({ ...prev, cups: [...prev.cups, { cupCategory: "", cupOrder: prev.cups.length + 1, breakNumber: 1, breakCapacity: 5 }] }))}>Add Cup</button>
          <button className="darkButton">Save Configuration</button>
        </form>
      )}
      {tabItem === "institutions" && (
        <>
          <form onSubmit={(e) => { e.preventDefault(); submitEntity("institution", institutionForm, () => setInstitutionForm({ id: null, name: "", code: "" })); }}>
            <h2>Institutions</h2>
            <input placeholder="Institution Name" value={institutionForm.name} onChange={(e) => setInstitutionForm((prev) => ({ ...prev, name: e.target.value }))} />
            <input placeholder="Code" value={institutionForm.code} onChange={(e) => setInstitutionForm((prev) => ({ ...prev, code: e.target.value }))} />
            <button className="darkButton">{institutionForm.id ? "Update" : "Add"} Institution</button>
          </form>
          <div className="results">{sortedInstitutions.map((item) => <div className="roomCard" key={item.id}><div className="roomHeader"><h2 style={{ margin: 0 }}>{item.name}</h2><p>{item.code}</p></div><button className="lightButton" onClick={() => setInstitutionForm(item)}>Edit</button><button className="lightButton" onClick={() => deleteEntity("institution", { id: item.id })}>Delete</button></div>)}</div>
        </>
      )}
      {tabItem === "tabMasters" && (
        <>
          <form onSubmit={(e) => { e.preventDefault(); submitEntity("tabMaster", tabMasterForm, () => setTabMasterForm({ id: null, name: "", institutionId: 0, email: "" })); }}>
            <h2>Tab Masters</h2>
            <input placeholder="Name" value={tabMasterForm.name} onChange={(e) => setTabMasterForm((prev) => ({ ...prev, name: e.target.value }))} />
            <input placeholder="Email" value={tabMasterForm.email} onChange={(e) => setTabMasterForm((prev) => ({ ...prev, email: e.target.value }))} />
            <select value={tabMasterForm.institutionId} onChange={(e) => setTabMasterForm((prev) => ({ ...prev, institutionId: Number(e.target.value) }))}><option value={0}>Select Institution</option>{sortedInstitutions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <button className="darkButton">{tabMasterForm.id ? "Update" : "Add"} Tab Master</button>
          </form>
          <div className="results">{sortedTabMasters.map((item) => <div className="roomCard" key={item.id}><div className="roomHeader"><h2 style={{ margin: 0 }}>{item.name}</h2><p>{item.email}</p></div><button className="lightButton" onClick={() => setTabMasterForm(item)}>Edit</button><button className="lightButton" onClick={() => deleteEntity("tabMaster", { id: item.id })}>Delete</button></div>)}</div>
        </>
      )}
      {tabItem === "speakers" && (
        <>
          <form onSubmit={(e) => { e.preventDefault(); submitEntity("speaker", speakerForm, () => setSpeakerForm({ id: null, name: "", institutionId: 0, email: "", available: true })); }}>
            <h2>Speakers</h2>
            <input placeholder="Name" value={speakerForm.name} onChange={(e) => setSpeakerForm((prev) => ({ ...prev, name: e.target.value }))} />
            <input placeholder="Email" value={speakerForm.email} onChange={(e) => setSpeakerForm((prev) => ({ ...prev, email: e.target.value }))} />
            <select value={speakerForm.institutionId} onChange={(e) => setSpeakerForm((prev) => ({ ...prev, institutionId: Number(e.target.value) }))}><option value={0}>Select Institution</option>{sortedInstitutions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>Available <ToggleButton state={speakerForm.available} setState={() => setSpeakerForm((prev) => ({ ...prev, available: !prev.available }))} /></label>
            <button className="darkButton">{speakerForm.id ? "Update" : "Add"} Speaker</button>
          </form>
          <div className="results">{sortedSpeakers.map((item) => <div className="roomCard" key={item.id}><div className="roomHeader"><h2 style={{ margin: 0 }}>{item.name}</h2><p>{fullTab?.institutions?.find((entry) => entry.id === item.institutionId)?.code ?? "-"}</p></div><button className="lightButton" onClick={() => setSpeakerForm(item)}>Edit</button><button className="lightButton" onClick={() => deleteEntity("speaker", { id: item.id })}>Delete</button></div>)}</div>
        </>
      )}
      {tabItem === "judges" && (
        <>
          <form onSubmit={(e) => { e.preventDefault(); submitEntity("judge", judgeForm, () => setJudgeForm({ id: null, name: "", institutionId: 0, email: "", available: true })); }}>
            <h2>Judges</h2>
            <input placeholder="Name" value={judgeForm.name} onChange={(e) => setJudgeForm((prev) => ({ ...prev, name: e.target.value }))} />
            <input placeholder="Email" value={judgeForm.email} onChange={(e) => setJudgeForm((prev) => ({ ...prev, email: e.target.value }))} />
            <select value={judgeForm.institutionId} onChange={(e) => setJudgeForm((prev) => ({ ...prev, institutionId: Number(e.target.value) }))}><option value={0}>Select Institution</option>{sortedInstitutions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>Available <ToggleButton state={judgeForm.available} setState={() => setJudgeForm((prev) => ({ ...prev, available: !prev.available }))} /></label>
            <button className="darkButton">{judgeForm.id ? "Update" : "Add"} Judge</button>
          </form>
          <div className="results">{sortedJudges.map((item) => <div className="roomCard" key={item.id}><div className="roomHeader"><h2 style={{ margin: 0 }}>{item.name}</h2><p>{item.email}</p></div><button className="lightButton" onClick={() => setJudgeForm(item)}>Edit</button><button className="lightButton" onClick={() => deleteEntity("judge", { id: item.id })}>Delete</button></div>)}</div>
        </>
      )}
      {tabItem === "rooms" && (
        <>
          <form onSubmit={(e) => { e.preventDefault(); submitEntity("room", roomForm, () => setRoomForm({ id: null, name: "", available: true })); }}>
            <h2>Rooms</h2>
            <input placeholder="Name" value={roomForm.name} onChange={(e) => setRoomForm((prev) => ({ ...prev, name: e.target.value }))} />
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>Available <ToggleButton state={roomForm.available} setState={() => setRoomForm((prev) => ({ ...prev, available: !prev.available }))} /></label>
            <button className="darkButton">{roomForm.id ? "Update" : "Add"} Room</button>
          </form>
          <div className="results">{sortedRooms.map((item) => <div className="roomCard" key={item.id}><div className="roomHeader"><h2 style={{ margin: 0 }}>{item.name}</h2></div><button className="lightButton" onClick={() => setRoomForm(item)}>Edit</button><button className="lightButton" onClick={() => deleteEntity("room", { id: item.id })}>Delete</button></div>)}</div>
        </>
      )}
      {tabItem === "rounds" && (
        <>
          <form onSubmit={(e) => { e.preventDefault(); submitEntity("round", roundForm, () => setRoundForm({ id: null, name: "", number: "", speechDuration: "", breaks: false, blind: false, completed: false, breakCategory: "", breakPhase: "" })); }}>
            <h2>Rounds</h2>
            <input placeholder="Name" value={roundForm.name} onChange={(e) => setRoundForm((prev) => ({ ...prev, name: e.target.value }))} />
            <input placeholder="Number" type="number" value={roundForm.number} onChange={(e) => setRoundForm((prev) => ({ ...prev, number: e.target.value }))} />
            <input placeholder="Speech Duration (s)" type="number" value={roundForm.speechDuration} onChange={(e) => setRoundForm((prev) => ({ ...prev, speechDuration: e.target.value }))} />
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>Breaks <ToggleButton state={roundForm.breaks} setState={() => setRoundForm((prev) => ({ ...prev, breaks: !prev.breaks }))} /></label>
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>Blind <ToggleButton state={roundForm.blind} setState={() => setRoundForm((prev) => ({ ...prev, blind: !prev.blind }))} /></label>
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>Completed <ToggleButton state={roundForm.completed} setState={() => setRoundForm((prev) => ({ ...prev, completed: !prev.completed }))} /></label>
            {roundForm.breaks && <>
              <select value={roundForm.breakCategory} onChange={(e) => setRoundForm((prev) => ({ ...prev, breakCategory: e.target.value }))}><option value="">Select Cup</option>{(fullTab?.cups ?? []).map((item) => <option key={item.id} value={item.id}>{item.cupCategory}</option>)}</select>
              <select value={roundForm.breakPhase} onChange={(e) => setRoundForm((prev) => ({ ...prev, breakPhase: e.target.value }))}><option value="">Select Break Phase</option>{breakPhases.map((phase) => <option key={phase} value={phase}>{phase}</option>)}</select>
            </>}
            <button className="darkButton">{roundForm.id ? "Update" : "Add"} Round</button>
          </form>
          <div className="results">{sortedRounds.map((item) => <div className="roomCard" key={item.roundId}><div className="roomHeader"><h2 style={{ margin: 0 }}>{item.name}</h2><p>#{item.number} • {item.speechDuration}s</p></div><button className="lightButton" onClick={() => setRoundForm({ id: item.roundId, name: item.name, number: item.number, speechDuration: item.speechDuration, breaks: item.breaks, blind: item.blind, completed: item.completed, breakCategory: item.cupCategoryId ?? "", breakPhase: item.breakPhase ?? "" })}>Edit</button><button className="lightButton" onClick={() => deleteEntity("round", { id: item.roundId })}>Delete</button></div>)}</div>
        </>
      )}
      {tabItem === "prompts" && (
        <>
          <form onSubmit={(e) => { e.preventDefault(); submitEntity("prompt", promptForm, () => setPromptForm({ id: null, roundId: "", speechPrompt: "", speechType: "narrative", visible: false })); }}>
            <h2>Speech Prompts</h2>
            <select value={promptForm.roundId} onChange={(e) => setPromptForm((prev) => ({ ...prev, roundId: e.target.value }))}><option value="">Select Round</option>{sortedRounds.map((item) => <option key={item.roundId} value={item.roundId}>{item.name}</option>)}</select>
            <select value={promptForm.speechType} onChange={(e) => setPromptForm((prev) => ({ ...prev, speechType: e.target.value }))}>{speechTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select>
            <input placeholder="Speech Prompt" value={promptForm.speechPrompt} onChange={(e) => setPromptForm((prev) => ({ ...prev, speechPrompt: e.target.value }))} />
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>Visible <ToggleButton state={promptForm.visible} setState={() => setPromptForm((prev) => ({ ...prev, visible: !prev.visible }))} /></label>
            <button className="darkButton">{promptForm.id ? "Update" : "Add"} Prompt</button>
          </form>
          <div className="results">{sortedPrompts.map((item) => <div className="roomCard" key={item.id}><div className="roomHeader"><h2 style={{ margin: 0 }}>{sortedRounds.find((round) => round.roundId === item.roundId)?.name ?? "Round"}</h2><p>{item.speechType}</p></div><div className="roomBody"><p style={{ margin: 0 }}>{item.speechPrompt}</p></div><button className="lightButton" onClick={() => setPromptForm(item)}>Edit</button><button className="lightButton" onClick={() => deleteEntity("prompt", { id: item.id })}>Delete</button></div>)}</div>
        </>
      )}
      {tabItem === "draws" && (
        <>
          <form onSubmit={generateDraw}>
            <h2>Preliminary Draws</h2>
            <select value={drawForm.roundId} onChange={(e) => setDrawForm((prev) => ({ ...prev, roundId: e.target.value }))}><option value="">Select Round</option>{sortedRounds.filter((item) => !item.breaks).map((item) => <option key={item.roundId} value={item.roundId}>{item.name}</option>)}</select>
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>Power Pair <ToggleButton state={drawForm.powerPair} setState={() => setDrawForm((prev) => ({ ...prev, powerPair: !prev.powerPair }))} /></label>
            <button className="darkButton">Generate Draw</button>
          </form>
          <form onSubmit={previewBreak}>
            <h2>Break Draws</h2>
            <select value={drawForm.breakRoundId} onChange={(e) => setDrawForm((prev) => ({ ...prev, breakRoundId: e.target.value }))}><option value="">Select Break Round</option>{sortedRounds.filter((item) => item.breaks).map((item) => <option key={item.roundId} value={item.roundId}>{item.name}</option>)}</select>
            <button className="lightButton">Preview Break Draw</button>
            <button type="button" className="darkButton" onClick={generateBreakDraw}>Generate Break Draw</button>
          </form>
          {drawForm.preview && <div className="roomCard"><div className="roomHeader"><h2 style={{ margin: 0 }}>{drawForm.preview.targetRound?.name}</h2></div><div className="roomBody">{(drawForm.preview.allocations ?? []).map((allocation, index) => <p key={index} style={{ margin: 0 }}>Room {allocation.roomId}: {allocation.allocatedSpeakers?.length ?? 0} speakers</p>)}</div></div>}
          <div className="results">{sortedRounds.map((item) => <div className="roomCard" key={item.roundId}><div className="roomHeader"><h2 style={{ margin: 0 }}>{item.name}</h2></div><div className="roomBody"><p style={{ margin: 0 }}>{(fullTab?.draws ?? []).filter((draw) => draw.roundId === item.roundId).length} rooms drawn</p></div><button className="lightButton" onClick={() => deleteDraw(item.roundId)}>Delete Draw</button></div>)}</div>
        </>
      )}
      {tabItem === "results" && (
        <form onSubmit={saveRoomResults}>
          <h2>Room Results</h2>
          <select value={resultForm.roundId} onChange={(e) => setResultForm((prev) => ({ ...prev, roundId: e.target.value, roomId: "", draft: null }))}><option value="">Select Round</option>{sortedRounds.map((item) => <option key={item.roundId} value={item.roundId}>{item.name}</option>)}</select>
          <select value={resultForm.roomId} onChange={(e) => setResultForm((prev) => ({ ...prev, roomId: e.target.value }))}><option value="">Select Room</option>{sortedResultsRooms.map((draw) => <option key={draw.drawId} value={draw.room.id}>{draw.room.name}</option>)}</select>
          {resultForm.draft && (
            <div className="roomCard">
              <div className="roomHeader"><h2 style={{ margin: 0 }}>{resultForm.draft.room.name}</h2></div>
              <div className="roomBody">
                {resultForm.draft.speakers.map((speaker) => (
                  <li key={speaker.id} style={{ gridTemplateColumns: sortedRounds.find((round) => round.roundId === Number(resultForm.roundId))?.breaks ? "3fr 1fr 1fr 1fr" : "3fr 1fr 1fr", gap: "0.5rem" }}>
                    <span>{speaker.name}</span>
                    <span>{fullTab?.institutions?.find((entry) => entry.id === speaker.institutionId)?.code ?? "-"}</span>
                    <Cell value={speaker.result?.score ?? fullTab.minScore} min={fullTab.minScore} max={fullTab.maxScore} onChange={(score) => updateResultDraft(speaker.id, { score })} />
                    {sortedRounds.find((round) => round.roundId === Number(resultForm.roundId))?.breaks && (
                      <select value={speaker.result?.status ?? "Incomplete"} onChange={(e) => updateResultDraft(speaker.id, { status: e.target.value })}>
                        <option value="Incomplete">Incomplete</option>
                        <option value="Eliminated">Eliminated</option>
                        <option value="Pass">Pass</option>
                      </select>
                    )}
                  </li>
                ))}
              </div>
            </div>
          )}
          <button className="darkButton">Save Room Results</button>
        </form>
      )}
    </>
  );
}

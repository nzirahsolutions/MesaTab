import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { GiMicrophone} from "react-icons/gi";
import { IoClose } from "react-icons/io5";
import axios from "axios";
import { AuthContext } from "../../../../Context/AuthContext";
import {RiDeleteBin6Fill} from 'react-icons/ri';
import {FaAngleDoubleUp } from 'react-icons/fa';
import Dropdown from "../../../../Components/Dropdown";
import Loading from "../../../../Components/Loading";
import ToggleButton from "../../../../Components/ToggleButton";
import Cell from "../../../../Components/Cell";
import Toast from "../../../../Components/Toast";
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

export default function PublicSpeakingAdmin({ tab, event }) {
  const { user, access, setAccess } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tabItem, setTabItem] = useState("home");
  const tabHistoryRef = useRef(false);
  const [pageLoad, setPageLoad] = useState({ loading: true, adminAuthorized: false, judgeAuthorized: false });
  const [fullTab, setFullTab] = useState(null);
  const [configForm, setConfigForm] = useState({ title: "", slug: "", minScore: 30, maxScore: 90, completed: false, cups: [] });
  const [institutionForm, setInstitutionForm] = useState({ id: null, name: "", code: "" });
  const [tabMasterForm, setTabMasterForm] = useState({ id: null, name: "", institutionId: 0, email: "" });
  const [speakerForm, setSpeakerForm] = useState({ id: null, name: "", institutionId: 0, email: "", available: true });
  const [judgeForm, setJudgeForm] = useState({ id: null, name: "", institutionId: 0, email: "", available: true });
  const [roomForm, setRoomForm] = useState({ id: null, name: "", available: true });
  const [roundForm, setRoundForm] = useState({ id: null, name: "", number: "", speechDuration: "", breaks: false, blind: false, completed: false, breakCategory: "", breakPhase: "" });
  const [promptForm, setPromptForm] = useState({ id: null, roundId: "", speechPrompt: "", speechType: "narrative", visible: false });
  const [drawForm, setDrawForm] = useState({ roundId: "", powerPair: true, breakRoundId: "", preview: null });
  const [drawUpdateForm, setDrawUpdateForm]= useState({roundId:0,room1:0, room2:0, swapState:0, judge1:0, judge2:0, speaker1:0, speaker2:0})
  const [resultForm, setResultForm] = useState({ roundId: "", roomId: "", draft: null });
  const newItems={
    institution:{id: null, name: "", code: ""}, 
    tabMaster:{id: null, name: "", institutionId: 0, email: ""}, 
    speaker:{id: null, name: "", institutionId: 0, email: "", available: true},
    judge:{id: null, name: "", institutionId: 0, email: "", available: true},
    room:{id: null, name: "", available: true}, 
    round:{id: null, name: "", number: "", speechDuration: "", breaks: false, blind: false, completed: false, breakCategory: "", breakPhase: ""}, 
    prompt:{id: null, roundId: "", speechPrompt: "", speechType: "narrative", visible: false}, 
    draw:{roundId: "", powerPair: true, breakRoundId: "", preview: null},
    drawUpdate: {roundId:0, room1:0, room2:0, swapState:0, judge1:0, judge2:0, speaker1:0, speaker2:0},
    result:{roundId: "", roomId: "", draft: null}
  };
  const [toasts, setToasts]=useState([]);
  const [sortStates, setSortStates]=useState({institutions:{column:'name', state:true}, tabMasters:{column:'name', state:true}, judges:{column:'name', state:true}, speakers:{column:'name', state:true}, rooms:{column:'name', state:true}, rounds:{column:'number', state:true}, prompts:{column:'round', state:true}});
    //state true for ascending, false for desc
  const dialogRef=useRef(null);
  const dialogRef2=useRef(null);
  const [drawView, setDrawView]=useState('prelim');
  const drawViews=['prelim', 'breaks'];
  

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

  const accessOptions = [
    { option: `${tab.title}`, value: "public" },
    ...(pageLoad.judgeAuthorized ? [{ option: `${tab.title} (Judge)`, value: "judge" }] : []),
    ...(pageLoad.adminAuthorized ? [{ option: `${tab.title} (Admin)`, value: "admin" }] : []),
  ];

  const sortedResultsRooms = useMemo(
    () =>
      [...(fullTab?.draws ?? [])]
        .filter((draw) => draw.roundId === Number(resultForm.roundId))
        .sort((a, b) => (a.room?.name ?? "").localeCompare(b.room?.name ?? "")),
    [fullTab, resultForm.roundId]
  );
  const currentDraw = fullTab?.draws?.find((draw) => draw.roundId === Number(resultForm.roundId) && draw.room?.id === Number(resultForm.roomId)) ?? null;

  async function saveConfig(e) {
    e.preventDefault();
    try {
      const res = await axios.put(`${currentServer}/ps/tab/update`, { ...configForm, tabId: tab.tabId });
      setToast('success', res.data?.message ?? "Configuration updated");
      await getFullTab();
    } catch (error) {
      setToast('error', error?.response?.data?.message ?? "Failed to update configuration");
    }
  }

  async function submitEntity(endpoint, form, resetForm) {
    try {
      const res = form.id
        ? await axios.put(`${currentServer}/ps/${endpoint}`, { ...form, tabId: tab.tabId })
        : await axios.post(`${currentServer}/ps/${endpoint}`, { ...form, tabId: tab.tabId });
      setToast("success", res.data?.message ?? "Saved");
      resetForm();
      await getFullTab();
    } catch (error) {
      setToast("error", error?.response?.data?.message ?? "Failed to save");
    }
  }

  async function deleteEntity(endpoint, payload) {
    if (!window.confirm("Delete this item?")) return;
    try {
      const res = await axios.delete(`${currentServer}/ps/${endpoint}`, { data: { ...payload, tabId: tab.tabId } });
      setToast("success", res.data?.message ?? "Deleted");
      await getFullTab();
    } catch (error) {
      setToast("error", error?.response?.data?.message ?? "Failed to delete");
    }
  }

  async function generateDraw(e) {
    e.preventDefault();
    try {
      const res = await axios.post(`${currentServer}/ps/draw/generate`, { tabId: tab.tabId, roundId: Number(drawForm.roundId), powerPair: drawForm.powerPair });
      setToast("success", res.data?.message ?? "Draw generated");
      await getFullTab();
    } catch (error) {
      setToast("error", error?.response?.data?.message ?? "Failed to generate draw");
    }
  }
  async function updateDraw(e) {
    e.preventDefault();
    console.log(drawUpdateForm)
    try {
      const res = await axios.post(`${currentServer}/ps/draw/update`, { tabId: tab.tabId,...drawUpdateForm });
      setToast("success", res.data?.message ?? "Draw updated");
      await getFullTab();
    } catch (error) {
      setToast("error", error?.response?.data?.message ?? "Failed to update draw");
    }
  }

  async function previewBreak(e) {
    e.preventDefault();
    try {
      const res = await axios.post(`${currentServer}/ps/draw/breaks`, { tabId: tab.tabId, roundId: Number(drawForm.breakRoundId) });
      setDrawForm((prev) => ({ ...prev, preview: res.data?.data ?? null }));
      setToast("success", res.data?.message ?? "Break preview generated");
    } catch (error) {
      setToast("error", error?.response?.data?.message ?? "Failed to preview break draw");
    }
  }

  async function generateBreakDraw() {
    try {
      const res = await axios.post(`${currentServer}/ps/draw/break-generate`, { tabId: tab.tabId, roundId: Number(drawForm.breakRoundId) });
      setToast("success", res.data?.message ?? "Break draw generated");
      await getFullTab();
    } catch (error) {
      setToast("error", error?.response?.data?.message ?? "Failed to generate break draw");
    }
  }

  async function deleteDraw(roundId) {
    if (!window.confirm("Delete the draw for this round?")) return;
    try {
      const res = await axios.delete(`${currentServer}/ps/draw/delete`, { data: { tabId: tab.tabId, roundId } });
      setToast("success", res.data?.message ?? "Draw deleted");
      await getFullTab();
    } catch (error) {
      setToast("error", error?.response?.data?.message ?? "Failed to delete draw");
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
    const sortedRounds=fullTab?.rounds ||[];
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
      setToast("success", res.data?.message ?? "Results saved");
      await getFullTab();
    } catch (error) {
      setToast("error", error?.response?.data?.message ?? "Failed to save results");
    }
  }

  useEffect(() => {
    if (!currentDraw) {
      setResultForm((prev) => ({ ...prev, draft: null }));
      return;
    }
    setResultForm((prev) => ({ ...prev, draft: JSON.parse(JSON.stringify(currentDraw)) }));
  }, [resultForm.roundId, resultForm.roomId, currentDraw?.drawId]);

  function setToast(type, message){
    setToasts((prev)=>[...prev, {id: Date.now(),type, message}]);
  }
   
  //sort actions
  function toggleSort(view,col){
    setSortStates((prev)=>{
        const current= prev[view];
        const nextDir= current.column===col && current.state===true? false: true;

        return{
            ...prev,
            [view]:{column: col, state: nextDir},
        };
    });
  }

  function sortItems(items, view, accessorMap) {
    const { column, state } = sortStates[view];
    const accessor = accessorMap[column];
    
    if (!accessor) {
        console.warn(`No accessor found for column: ${column}`);
        return [...items];
    }    
    return [...items].sort((a, b) => {
        const aVal = accessor(a);
        const bVal = accessor(b);
        // Handle numbers
        if (typeof aVal === "number" && typeof bVal === "number") {
        return state === true ? aVal - bVal : bVal - aVal;
        }        
        // Handle booleans (true before false when ascending)
        if (typeof aVal === "boolean" && typeof bVal === "boolean") {
        const aNum = aVal ? 1 : 0;
        const bNum = bVal ? 1 : 0;
        return state === true ? aNum - bNum : bNum - aNum;
        }        
        // Handle strings
        return state === true
        ? String(aVal ?? "").localeCompare(String(bVal ?? ""))
        : String(bVal ?? "").localeCompare(String(aVal ?? ""));
    });
  }
  function showForm(entity){
    const sortedRounds=fullTab?.rounds|| [];
    const sortedInstitutions=fullTab?.institutions||[];
    const selectedRound= sortedRounds.find(r=> r.roundId===resultForm.roundId)?.name || '';
    const incompleteRounds=fullTab.rounds.filter(r=> r.completed===false) || [];
    switch(entity){
      case 'institution':
        return(
          <dialog ref={dialogRef}>
            <form onSubmit={(e) => { e.preventDefault(); submitEntity("institution", institutionForm, () => setInstitutionForm({ id: null, name: "", code: "" })); }} method="modal">
            <p><strong>Institution</strong></p>
            <input placeholder="Institution Name" value={institutionForm.name} onChange={(e) => setInstitutionForm((prev) => ({ ...prev, name: e.target.value }))} />
            <input placeholder="Code" value={institutionForm.code} onChange={(e) => setInstitutionForm((prev) => ({ ...prev, code: e.target.value }))} />
            <button className="darkButton">{institutionForm.id ? "Update" : "Add"} Institution</button>
            <button type="button" className="darkButton" onClick={()=>dialogRef.current.close()}>Cancel</button>
          </form>
          </dialog>
        )
      case 'tabMaster':
        return(
          <dialog ref={dialogRef}>
            <form onSubmit={(e) => { e.preventDefault(); submitEntity("tabMaster", tabMasterForm, () => setTabMasterForm({ id: null, name: "", institutionId: 0, email: "" })); }}>
            <h2>Tab Masters</h2>
            <input placeholder="Name" value={tabMasterForm.name} onChange={(e) => setTabMasterForm((prev) => ({ ...prev, name: e.target.value }))} />
            <input type="email" placeholder="Email" value={tabMasterForm.email} onChange={(e) => setTabMasterForm((prev) => ({ ...prev, email: e.target.value }))} />
            <select value={tabMasterForm.institutionId} onChange={(e) => setTabMasterForm((prev) => ({ ...prev, institutionId: Number(e.target.value) }))}><option value={0}>Select Institution</option>{sortedInstitutions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <button className="darkButton">{tabMasterForm.id ? "Update" : "Add"} Tab Master</button>
            <button type="button" className="darkButton" onClick={()=>dialogRef.current.close()}>Cancel</button>
          </form>
          </dialog>
        )
      case 'judge':
        return(
          <dialog ref={dialogRef}>
            <form onSubmit={(e) => { e.preventDefault(); submitEntity("judge", judgeForm, () => setJudgeForm({ id: null, name: "", institutionId: 0, email: "", available: true })); }}>
            <h2>Judges</h2>
            <input placeholder="Name" value={judgeForm.name} onChange={(e) => setJudgeForm((prev) => ({ ...prev, name: e.target.value }))} />
            <input type="email" placeholder="Email" value={judgeForm.email} onChange={(e) => setJudgeForm((prev) => ({ ...prev, email: e.target.value }))} />
            <select value={judgeForm.institutionId} onChange={(e) => setJudgeForm((prev) => ({ ...prev, institutionId: Number(e.target.value) }))}><option value={0}>Select Institution</option>{sortedInstitutions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>Available <ToggleButton state={judgeForm.available} setState={() => setJudgeForm((prev) => ({ ...prev, available: !prev.available }))} /></label>
            <button className="darkButton">{judgeForm.id ? "Update" : "Add"} Judge</button>
            <button type="button" className="darkButton" onClick={()=>dialogRef.current.close()}>Cancel</button>
          </form>
          </dialog>
        )
      case 'speaker':
        return(
          <dialog ref={dialogRef}>
            <form onSubmit={(e) => { e.preventDefault(); submitEntity("speaker", speakerForm, () => setSpeakerForm({ id: null, name: "", institutionId: 0, email: "", available: true })); }}>
            <h2>Speakers</h2>
            <input placeholder="Name" value={speakerForm.name} onChange={(e) => setSpeakerForm((prev) => ({ ...prev, name: e.target.value }))} />
            <input type="email" placeholder="Email" value={speakerForm.email} onChange={(e) => setSpeakerForm((prev) => ({ ...prev, email: e.target.value }))} />
            <select value={speakerForm.institutionId} onChange={(e) => setSpeakerForm((prev) => ({ ...prev, institutionId: Number(e.target.value) }))}><option value={0}>Select Institution</option>{sortedInstitutions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>Available <ToggleButton state={speakerForm.available} setState={() => setSpeakerForm((prev) => ({ ...prev, available: !prev.available }))} /></label>
            <button className="darkButton">{speakerForm.id ? "Update" : "Add"} Speaker</button>
            <button type="button" className="darkButton" onClick={()=>dialogRef.current.close()}>Cancel</button>
          </form>
          </dialog>
        )
      case 'room':
        return(
          <dialog ref={dialogRef}>
            <form onSubmit={(e) => { e.preventDefault(); submitEntity("room", roomForm, () => setRoomForm({ id: null, name: "", available: true })); }}>
            <h2>Rooms</h2>
            <input placeholder="Name" value={roomForm.name} onChange={(e) => setRoomForm((prev) => ({ ...prev, name: e.target.value }))} />
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>Available <ToggleButton state={roomForm.available} setState={() => setRoomForm((prev) => ({ ...prev, available: !prev.available }))} /></label>
            <button className="darkButton">{roomForm.id ? "Update" : "Add"} Room</button>
            <button type="button" className="darkButton" onClick={()=>dialogRef.current.close()}>Cancel</button>
          </form>
          </dialog>
        )
      case 'round':
        return(
          <dialog ref={dialogRef}>
            <form onSubmit={(e) => { e.preventDefault(); submitEntity("round", roundForm, () => setRoundForm({ id: null, name: "", number: "", speechDuration: "", breaks: false, blind: false, completed: false, breakCategory: "", breakPhase: "" })); }}>
            <h2>Rounds</h2>
            <input placeholder="Name" value={roundForm.name} onChange={(e) => setRoundForm((prev) => ({ ...prev, name: e.target.value }))} />
            <input placeholder="Number" type="number" value={roundForm.number} onChange={(e) => setRoundForm((prev) => ({ ...prev, number: e.target.value }))} />
            <input placeholder="Speech Duration (min)" type="number" value={roundForm.speechDuration} min={1} onChange={(e) => setRoundForm((prev) => ({ ...prev, speechDuration: e.target.value }))} />
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>Blind <ToggleButton state={roundForm.blind} setState={() => setRoundForm((prev) => ({ ...prev, blind: !prev.blind }))} /></label>
            {roundForm.id &&<label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>Completed <ToggleButton state={roundForm.completed} setState={() => setRoundForm((prev) => ({ ...prev, completed: !prev.completed }))} /></label>}
            <button className="darkButton">{roundForm.id ? "Update" : "Add Prelim"} Round</button>
            <button type="button" className="darkButton" onClick={()=>dialogRef.current.close()}>Cancel</button>
          </form>
          </dialog>
        )
      case 'prompt':
        return(
          <dialog ref={dialogRef}>
            <form onSubmit={(e) => { e.preventDefault(); submitEntity("prompt", promptForm, () => setPromptForm({ id: null, roundId: "", speechPrompt: "", speechType: "narrative", visible: false })); }}>
            <h2>Speech Prompts</h2>
            <select value={promptForm.roundId} onChange={(e) => setPromptForm((prev) => ({ ...prev, roundId: e.target.value }))}><option value="">Select Round</option>{fullTab.rounds.map((item) => <option key={item.roundId} value={item.roundId}>{item.name}</option>)}</select>
            <select value={promptForm.speechType} onChange={(e) => setPromptForm((prev) => ({ ...prev, speechType: e.target.value }))}>{speechTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select>
            <input placeholder="Speech Prompt" value={promptForm.speechPrompt} onChange={(e) => setPromptForm((prev) => ({ ...prev, speechPrompt: e.target.value }))} />
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>Visible <ToggleButton state={promptForm.visible} setState={() => setPromptForm((prev) => ({ ...prev, visible: !prev.visible }))} /></label>
            <button className="darkButton">{promptForm.id ? "Update" : "Add"} Prompt</button>
            <button type="button" className="darkButton" onClick={()=>dialogRef.current.close()}>Cancel</button>
          </form>
          </dialog>
        )
      case 'generateDraw':
        return(
          <dialog ref={dialogRef}>
            <form onSubmit={generateDraw}>
              <h2>Preliminary Draws</h2>
              <select value={drawForm.roundId} onChange={(e) => setDrawForm((prev) => ({ ...prev, roundId: e.target.value }))}><option value="">Select Round</option>{sortedRounds.filter((item) => !item.breaks).map((item) => <option key={item.roundId} value={item.roundId}>{item.name}</option>)}</select>
              <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>Power Pair <ToggleButton state={drawForm.powerPair} setState={() => setDrawForm((prev) => ({ ...prev, powerPair: !prev.powerPair }))} /></label>
              <button className="darkButton">Generate Draw</button>
              <button type="button" className="darkButton" onClick={()=>dialogRef.current.close()}>Cancel</button>
            </form>
          </dialog>
        )
      case 'previewBreaks':
        return(
          <dialog ref={dialogRef}>
            <form onSubmit={previewBreak}>
              <h2>Break Draws</h2>
              <select value={drawForm.breakRoundId} onChange={(e) => setDrawForm((prev) => ({ ...prev, breakRoundId: e.target.value }))}><option value="">Select Break Round</option>{sortedRounds.filter((item) => item.breaks).map((item) => <option key={item.roundId} value={item.roundId}>{item.name}</option>)}</select>
              <button className="lightButton">Preview Break Draw</button>
              <button type="button" className="darkButton" onClick={generateBreakDraw}>Generate Break Draw</button>
              <button type="button" className="darkButton" onClick={()=>dialogRef.current.close()}>Cancel</button>
            </form>
          </dialog>
        )
      case 'updateDraw':
        return(
          <dialog ref={dialogRef2}>
            <form onSubmit={updateDraw}>
              <p><strong>Update Draw</strong></p>
              <select name="roundId" value={drawUpdateForm.roundId} onChange={(e)=>setDrawUpdateForm({...drawUpdateForm, [e.target.name]:Number(e.target.value)})}>
                  <option value={0}>Select Round</option>
                  {incompleteRounds?.map((r)=><option key={r.roundId} value={r.roundId}>{r.name}</option>)}
              </select>
              {!fullTab.draws.find((a)=>a.roundId===drawUpdateForm.roundId)?
              <p>Draw for this round is not out yet</p>
              :            
              <>
              <strong>Updates</strong>
              <select name="swapState" value={drawUpdateForm.swapState} onChange={(e)=>setDrawUpdateForm({...drawUpdateForm, [e.target.name]:Number(e.target.value)})}>
                  <option value={0}>Select Update</option>
                  <option value={1}>Swap Speakers</option>
                  <option value={2}>Swap Judges</option>
                  <option value={3}>Move Speaker</option>
                  <option value={4}>Move Judge</option>
                  <option value={5}>Add Speaker</option>
                  <option value={6}>Add Judge</option>
                  <option value={7}>Swap Rooms</option>
                  <option value={8}>Move Room</option>
              </select>
              {drawUpdateForm.swapState===1 && 
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))'}}>
                  <select name="room1" value={drawUpdateForm.room1} onChange={(e)=>setDrawUpdateForm({...drawUpdateForm, [e.target.name]:Number(e.target.value)})}>
                      <option value={0}>Select First Room</option>
                      {getOccupiedRooms(drawUpdateForm.roundId).map((r,i)=><option key={i} value={r.id}>{r.name}</option>)}
                  </select>
                  <select name="room2" value={drawUpdateForm.room2} onChange={(e)=>setDrawUpdateForm({...drawUpdateForm, [e.target.name]:Number(e.target.value)})}>
                      <option value={0}>Select Second Room</option>
                      {getOccupiedRooms(drawUpdateForm.roundId).map((r,i)=><option key={i} value={r.id}>{r.name}</option>)}
                  </select>
                  <select name="speaker1" value={drawUpdateForm.speaker1} onChange={(e)=>setDrawUpdateForm({...drawUpdateForm, [e.target.name]:Number(e.target.value)})}>
                      <option value={0}>Select speaker in first room</option>
                      {fullTab.draws.find((d)=>d.room.id===drawUpdateForm.room1 && d.roundId===drawUpdateForm.roundId)?.speakers.map((s,i)=><option value={s.id} key={i}>{s.name}</option>)}
                  </select>
                  <select name="speaker2" value={drawUpdateForm.speaker2} onChange={(e)=>setDrawUpdateForm({...drawUpdateForm, [e.target.name]:Number(e.target.value)})}>
                      <option value={0}>Select speaker in second room</option>
                      {fullTab.draws.find((d)=>d.room.id===drawUpdateForm.room2 && d.roundId===drawUpdateForm.roundId)?.speakers.map((s,i)=><option value={s.id} key={i}>{s.name}</option>)}
                  </select>
              </div>
              }
              {drawUpdateForm.swapState===2 && 
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))'}}>
                  <select name="room1" value={drawUpdateForm.room1} onChange={(e)=>setDrawUpdateForm({...drawUpdateForm, [e.target.name]:Number(e.target.value)})}>
                      <option value={0}>Select First Room</option>
                      {getOccupiedRooms(drawUpdateForm.roundId).map((r,i)=><option key={i} value={r.id}>{r.name}</option>)}
                  </select>
                  <select name="room2" value={drawUpdateForm.room2} onChange={(e)=>setDrawUpdateForm({...drawUpdateForm, [e.target.name]:Number(e.target.value)})}>
                      <option value={0}>Select Second Room</option>
                      {getOccupiedRooms(drawUpdateForm.roundId).map((r,i)=><option key={i} value={r.id}>{r.name}</option>)}
                  </select>
                  <select name="judge1" value={drawUpdateForm.judge1} onChange={(e)=>setDrawUpdateForm({...drawUpdateForm, [e.target.name]:Number(e.target.value)})}>
                      <option value={0}>Select judge in first room</option>
                      {fullTab.draws.find((d)=>d.room.id===drawUpdateForm.room1 && d.roundId===drawUpdateForm.roundId)?.judges.map((s,i)=><option value={s.id} key={i}>{s.name}</option>)}
                  </select>
                  <select name="judge2" value={drawUpdateForm.judge2} onChange={(e)=>setDrawUpdateForm({...drawUpdateForm, [e.target.name]:Number(e.target.value)})}>
                      <option value={0}>Select judge in second room</option>
                      {fullTab.draws.find((d)=>d.room.id===drawUpdateForm.room2 && d.roundId===drawUpdateForm.roundId)?.judges.map((s,i)=><option value={s.id} key={i}>{s.name}</option>)}
                  </select>
              </div>
              }
              {drawUpdateForm.swapState===3 && 
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))'}}>
                  <select name="room1" value={drawUpdateForm.room1} onChange={(e)=>setDrawUpdateForm({...drawUpdateForm, [e.target.name]:Number(e.target.value)})}>
                      <option value={0}>Select First Room</option>
                      {getOccupiedRooms(drawUpdateForm.roundId).map((r,i)=><option key={i} value={r.id}>{r.name}</option>)}
                  </select>
                  <select name="room2" value={drawUpdateForm.room2} onChange={(e)=>setDrawUpdateForm({...drawUpdateForm, [e.target.name]:Number(e.target.value)})}>
                      <option value={0}>Select Second Room</option>
                      {getOccupiedRooms(drawUpdateForm.roundId).map((r,i)=><option key={i} value={r.id}>{r.name}</option>)}
                  </select>
                  <select name="speaker1" value={drawUpdateForm.speaker1} onChange={(e)=>setDrawUpdateForm({...drawUpdateForm, [e.target.name]:Number(e.target.value)})}>
                      <option value={0}>Select speaker in first room</option>
                      {fullTab.draws.find((d)=>d.room.id===drawUpdateForm.room1 && d.roundId===drawUpdateForm.roundId)?.speakers.map((s,i)=><option value={s.id} key={i}>{s.name}</option>)}
                  </select>
              </div>
              }
              {drawUpdateForm.swapState===4 && 
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))'}}>
                  <select name="room1" value={drawUpdateForm.room1} onChange={(e)=>setDrawUpdateForm({...drawUpdateForm, [e.target.name]:Number(e.target.value)})}>
                      <option value={0}>Select First Room</option>
                      {getOccupiedRooms(drawUpdateForm.roundId).map((r,i)=><option key={i} value={r.id}>{r.name}</option>)}
                  </select>
                  <select name="room2" value={drawUpdateForm.room2} onChange={(e)=>setDrawUpdateForm({...drawUpdateForm, [e.target.name]:Number(e.target.value)})}>
                      <option value={0}>Select Second Room</option>
                      {getOccupiedRooms(drawUpdateForm.roundId).map((r,i)=><option key={i} value={r.id}>{r.name}</option>)}
                  </select>
                  <select name="judge1" value={drawUpdateForm.judge1} onChange={(e)=>setDrawUpdateForm({...drawUpdateForm, [e.target.name]:Number(e.target.value)})}>
                      <option value={0}>Select judge in first room</option>
                      {fullTab.draws.find((d)=>d.room.id===drawUpdateForm.room1 && d.roundId===drawUpdateForm.roundId)?.judges.map((s,i)=><option value={s.id} key={i}>{s.name}</option>)}
                  </select>
              </div>
              }            
              {drawUpdateForm.swapState===5 && 
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))'}}>
                  <select name="room1" value={drawUpdateForm.room1} onChange={(e)=>setDrawUpdateForm({...drawUpdateForm, [e.target.name]:Number(e.target.value)})}>
                      <option value={0}>Select Room</option>
                      {getOccupiedRooms(drawUpdateForm.roundId).map((r,i)=><option key={i} value={r.id}>{r.name}</option>)}
                  </select>
                  <select name="speaker1" value={drawUpdateForm.speaker1} onChange={(e)=>setDrawUpdateForm({...drawUpdateForm, [e.target.name]:Number(e.target.value)})}>
                      <option value={0}>Select speaker to add to room</option>
                      {getMissing(fullTab.speakers,fullTab.draws.filter(d=>d.roundId===drawUpdateForm.roundId).map(d=>d.speakers).flat()).map((s,i)=><option value={s.id} key={i}>{s.name}</option>)}
                  </select>
              </div>
              }            
              {drawUpdateForm.swapState===6 && 
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))'}}>
                  <select name="room1" value={drawUpdateForm.room1} onChange={(e)=>setDrawUpdateForm({...drawUpdateForm, [e.target.name]:Number(e.target.value)})}>
                      <option value={0}>Select Room</option>
                      {getOccupiedRooms(drawUpdateForm.roundId).map((r,i)=><option key={i} value={r.id}>{r.name}</option>)}
                  </select>
                  <select name="judge1" value={drawUpdateForm.judge1} onChange={(e)=>setDrawUpdateForm({...drawUpdateForm, [e.target.name]:Number(e.target.value)})}>
                      <option value={0}>Select judge to add to room</option>                    
                      {getMissing(fullTab.judges,fullTab.draws.filter(d=>d.roundId===drawUpdateForm.roundId).map(d=>d.judges).flat()).map((s,i)=><option value={s.id} key={i}>{s.name}</option>)}
                  </select>
              </div>
              }
              {drawUpdateForm.swapState===7 && 
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))'}}>
                  <select name="room1" value={drawUpdateForm.room1} onChange={(e)=>setDrawUpdateForm({...drawUpdateForm, [e.target.name]:Number(e.target.value)})}>
                      <option value={0}>Select First Room</option>
                      {getOccupiedRooms(drawUpdateForm.roundId).map((r,i)=><option key={i} value={r.id}>{r.name}</option>)}
                  </select>
                  <select name="room2" value={drawUpdateForm.room2} onChange={(e)=>setDrawUpdateForm({...drawUpdateForm, [e.target.name]:Number(e.target.value)})}>
                      <option value={0}>Select Second Room</option>
                      {getOccupiedRooms(drawUpdateForm.roundId).map((r,i)=><option key={i} value={r.id}>{r.name}</option>)}
                  </select>
              </div>
              }            
              {drawUpdateForm.swapState===8 && 
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))'}}>
                  <select name="room1" value={drawUpdateForm.room1} onChange={(e)=>setDrawUpdateForm({...drawUpdateForm, [e.target.name]:Number(e.target.value)})}>
                      <option value={0}>Select Original Room</option>
                      {getOccupiedRooms(drawUpdateForm.roundId).map((r,i)=><option key={i} value={r.id}>{r.name}</option>)}
                  </select>
                  <select name="room2" value={drawUpdateForm.room2} onChange={(e)=>setDrawUpdateForm({...drawUpdateForm, [e.target.name]:Number(e.target.value)})}>
                      <option value={0}>Select New Room</option>
                      {getEmptyRooms(drawUpdateForm.roundId).map((r,i)=><option key={i} value={r.id}>{r.name}</option>)}
                  </select>
              </div>
              }            
              </>}
              <button className="darkButton">Save Draw Updates</button>
              <button type="button" className="darkButton" onClick={()=>dialogRef2.current.close()}>Cancel</button>
          </form>
          </dialog>
        )
      case 'results':
        return (
          <dialog ref={dialogRef}>
            <form onSubmit={saveRoomResults}>
              <h2> {selectedRound} Results </h2>
              <select value={resultForm.roomId} onChange={(e) => setResultForm((prev) => ({ ...prev, roomId: Number(e.target.value) }))}><option value="">Select Room</option>{sortedResultsRooms.map((draw) => <option key={draw.drawId} value={draw.room.id}>{draw.room.name}</option>)}</select>
              {resultForm.draft && (
                <div className="roomCard">
                  <div className="roomHeader"><h2 style={{ margin: 0 }}>{resultForm.draft.room.name}</h2></div>
                  <div className="roomBody">
                    {resultForm.draft.speakers.map((speaker) => (
                      <li key={speaker.id} style={{ gridTemplateColumns: "1fr 0.5fr 0.5fr", gap: "0.5rem" }}>
                        <span>{speaker.name}</span>
                        <span>{fullTab?.institutions?.find((entry) => entry.id === speaker.institutionId)?.code ?? "-"}</span>
                        {sortedRounds.find((round) => round.roundId === Number(resultForm.roundId))?.breaks ?(
                          <select value={speaker.result?.status ?? "Incomplete"} onChange={(e) => updateResultDraft(speaker.id, { status: e.target.value })}>
                            <option value="Incomplete">Incomplete</option>
                            <option value="Eliminated">Eliminated</option>
                            <option value="Pass">Pass</option>
                          </select>
                        ):(
                        <Cell value={speaker.result?.score ?? fullTab.minScore} min={fullTab.minScore} max={fullTab.maxScore} onChange={(score) => updateResultDraft(speaker.id, { score })} />
                        )}
                      </li>
                    ))}
                  </div>
                </div>
              )}
              <button className="darkButton">Save Room Results</button>
              <button type="button" className="darkButton" onClick={()=>dialogRef.current.close()}>Cancel</button>
            </form>
          </dialog>
        )
      default: console.log('No form to show'); 
    }
  }

  function home(){
    return(
      <div className="tabHome">
        {["configuration", "institutions", "tabMasters", "speakers", "judges", "rooms", "rounds", "prompts", "draws", "results"].map((item) => (
            <li key={item} onClick={() => setTabItem(item)} className={tabItem === item ? "selectedTabItem" : ""}>{item[0].toUpperCase() + item.slice(1)}</li>
          ))}
      </div>
    )
  }
  function configuration(){
    return(
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
              <input value={cup.cupCategory} placeholder="Cup Name, e.g.: Gold" onChange={(e) => setConfigForm((prev) => ({ ...prev, cups: prev.cups.map((item, itemIdx) => itemIdx === index ? { ...item, cupCategory: e.target.value } : item) }))} />
              <input type="number" value={cup.cupOrder} placeholder="Cup Order e.g.: 1 for Gold, 2 for Silver" onChange={(e) => setConfigForm((prev) => ({ ...prev, cups: prev.cups.map((item, itemIdx) => itemIdx === index ? { ...item, cupOrder: Number(e.target.value) } : item) }))} />
              <input type="number" value={cup.breakNumber} placeholder="No of break rounds" onChange={(e) => setConfigForm((prev) => ({ ...prev, cups: prev.cups.map((item, itemIdx) => itemIdx === index ? { ...item, breakNumber: Number(e.target.value) } : item) }))} />
              <input type="number" value={cup.breakCapacity} placeholder="Min Speakers per break Room" onChange={(e) => setConfigForm((prev) => ({ ...prev, cups: prev.cups.map((item, itemIdx) => itemIdx === index ? { ...item, breakCapacity: Number(e.target.value) } : item) }))} />
              <button type="button" className="lightButton" onClick={() => setConfigForm((prev) => ({ ...prev, cups: prev.cups.filter((_, itemIdx) => itemIdx !== index) }))}>Remove</button>
            </div>
          ))}
          <button type="button" className="lightButton" onClick={() => setConfigForm((prev) => ({ ...prev, cups: [...prev.cups, { cupCategory: "", cupOrder: '', breakNumber: '', breakCapacity: '' }] }))}>Add Cup</button>
          <button className="darkButton">Save Configuration</button>
        </form>
      )
  }
  function institutions(){
    const sortedInstitutions = sortItems(fullTab.institutions ?? [], "institutions", {
        name: (item) => item.name,
        code: (item) => item.code,
        speakers: (item) => item.speakers,
        });
    return(
        <>
          <section id="institutions">
            {/* <button onClick={console.log(fullTab)}>Log Full Tab</button> */}
            <h2>Registered Institutions</h2>
            <button className="darkButton" onClick={()=>{dialogRef.current.open=true;setInstitutionForm({...newItems.institution});}}>Add Institution</button>
            {showForm('institution')}
            {sortedInstitutions.length>0?
                    <div className="tableScroll">
                    <table>
                      <thead>
                        <tr style={{gridTemplateColumns:'4fr 1fr 1fr 1fr'}}>
                          <th>Name 
                            <button type="button" className="sortToggle" onClick={() => toggleSort("institutions", "name")}>
                                {sortStates.institutions.column === "name" && sortStates.institutions.state === true
                                ? '\u2b9d'
                                : '\u2b9f'}
                            </button>
                          </th>
                          <th>Code  
                            <button type="button" className="sortToggle" onClick={() => toggleSort("institutions", "code")}>
                                {sortStates.institutions.column === "code" && sortStates.institutions.state === true
                                ? '\u2b9d'
                                : '\u2b9f'}
                            </button>
                          </th>
                          <th>Speakers 
                            <button type="button" className="sortToggle" onClick={() => toggleSort("institutions", "speakers")}>
                                {sortStates.institutions.column === "speakers" && sortStates.institutions.state === true
                                ? '\u2b9d'
                                : '\u2b9f'}
                            </button>
                          </th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedInstitutions.map((p,i)=>
                        <tr key={i} style={{gridTemplateColumns:'4fr 1fr 1fr 1fr'}}>
                          <td>{p.name}</td>
                          <td>{p.code}</td>
                          <td>{p.speakers}</td>
                          <td style={{display: 'grid', gridAutoFlow:'column', gridAutoColumns:'1rem', justifySelf:'center', gap:'1rem'}}><FaAngleDoubleUp fill="teal" onClick={()=>{dialogRef.current.open=true; setInstitutionForm(p)}}/><RiDeleteBin6Fill fill="red" onClick={()=>{deleteEntity("institution", { id: p.id })}}/></td>
                        </tr>)}
                      </tbody>
                    </table></div>:<p>No Registered Institutions</p>}
          </section>
        </>
      )
  }
  function tabMasters(){
    const sortedTabMasters = sortItems(fullTab.tabMasters ?? [], "tabMasters", {
        name: (item) => item.name,
        institution: (item) => fullTab.institutions.find((i)=>i.id===item.institutionId)?.name || '',
        email: (item) => item.email,
        });
    return(
        <>
          <section id="tabMasters">
            <h2>Registered Tab Masters ({sortedTabMasters.length})</h2>
            <button className="darkButton" onClick={()=>{dialogRef.current.open=true;setTabMasterForm({...newItems.tabMaster});}}>Add Tab Master</button>
            {showForm('tabMaster')}
        {fullTab.tabMasters?.length>0?
        <div className="tableScroll"><table>
          <thead>
            <tr style={{gridTemplateColumns:'1fr 1fr 1fr 1fr'}}>
              <th>Name <button type="button" className="sortToggle" onClick={() => toggleSort("tabMasters", "name")}>
                {sortStates.tabMasters.column === "name" && sortStates.tabMasters.state === true ? '\u2b9d' : '\u2b9f'}
              </button></th>
              <th>Institution <button type="button" className="sortToggle" onClick={() => toggleSort("tabMasters", "institution")}>
                {sortStates.tabMasters.column === "institution" && sortStates.tabMasters.state === true ? '\u2b9d' : '\u2b9f'}
              </button></th>
              <th>Email <button type="button" className="sortToggle" onClick={() => toggleSort("tabMasters", "email")}>
                {sortStates.tabMasters.column === "email" && sortStates.tabMasters.state === true ? '\u2b9d' : '\u2b9f'}
              </button></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sortedTabMasters.map((p,i)=>
            <tr key={i} style={{gridTemplateColumns:'1fr 1fr 1fr 1fr'}}>
              <td>{p.name}</td>
              <td>{fullTab.institutions.find((inst)=>inst.id===p.institutionId)?.name || '-'}</td>
              <td>{p.email}</td>
              <td style={{display: 'grid', gridAutoFlow:'column', gridAutoColumns:'1rem', justifySelf:'center', gap:'1rem'}}><FaAngleDoubleUp fill="teal" onClick={()=>{dialogRef.current.open=true; setTabMasterForm(p)}}/><RiDeleteBin6Fill fill="red" onClick={()=>{deleteEntity("tabMaster", { id: p.id })}}/></td>
            </tr>)}
          </tbody>
        </table></div>:<p>No Registered Tab Masters</p>}
          </section>
        </>
      )
  }
  function judges(){
    const sortedJudges = sortItems(fullTab.judges ?? [], "judges", {
        name: (item) => item.name,
        institution: (item) => fullTab.institutions.find((i)=>i.id===item.institutionId)?.name || '',
        email: (item) => item.email,
        available: (item) => item.available,
        });
    return(
        <>
          <section id="judges">
            <h2>Registered Judges ({sortedJudges.length})</h2>
            <button className="darkButton" onClick={()=>{dialogRef.current.open=true;setJudgeForm({...newItems.judge});}}>Add Judge</button>
            {showForm('judge')}
        {fullTab.judges?.length>0?
        <div className="tableScroll"><table>
          <thead>
            <tr style={{gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr'}}>
              <th>Name <button type="button" className="sortToggle" onClick={() => toggleSort("judges", "name")}>
                {sortStates.judges.column === "name" && sortStates.judges.state === true ? '\u2b9d' : '\u2b9f'}
              </button></th>
              <th>Institution <button type="button" className="sortToggle" onClick={() => toggleSort("judges", "institution")}>
                {sortStates.judges.column === "institution" && sortStates.judges.state === true ? '\u2b9d' : '\u2b9f'}
              </button></th>
              <th>Email <button type="button" className="sortToggle" onClick={() => toggleSort("judges", "email")}>
                {sortStates.judges.column === "email" && sortStates.judges.state === true ? '\u2b9d' : '\u2b9f'}
              </button></th>
              <th>Available <button type="button" className="sortToggle" onClick={() => toggleSort("judges", "available")}>
                {sortStates.judges.column === "available" && sortStates.judges.state === true ? '\u2b9d' : '\u2b9f'}
              </button></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sortedJudges.map((p,i)=>
            <tr key={i} style={{gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr'}}>
              <td>{p.name}</td>
              <td>{fullTab.institutions.find((inst)=>inst.id===p.institutionId)?.name || '-'}</td>
              <td>{p.email}</td>
              <td>{p.available? '\u2714': '\u2718'}</td>
              <td style={{display: 'grid', gridAutoFlow:'column', gridAutoColumns:'1rem', justifySelf:'center', gap:'1rem'}}><FaAngleDoubleUp fill="teal" onClick={()=>{dialogRef.current.open=true; setJudgeForm(p)}}/><RiDeleteBin6Fill fill="red" onClick={()=>{deleteEntity("judge", { id: p.id })}}/></td>
            </tr>)}
          </tbody>
        </table></div>:<p>No Registered Tab Masters</p>}
          </section>
        </>
      )
  }
  function speakers(){
    const sortedSpeakers = sortItems(fullTab.speakers ?? [], "speakers", {
        name: (item) => item.name,
        school: (item) => fullTab.institutions.find((i)=>i.id===item.institutionId).name,
        available: (item) => item.available,
        });
    return (
        <>
          <section id="speakers">
            <h2>Registered Speakers ({sortedSpeakers.length})</h2>
            <button className="darkButton" onClick={()=>{dialogRef.current.open=true;setSpeakerForm({...newItems.speaker});}}>Add Speaker</button>
            {showForm('speaker')}
        {sortedSpeakers.length>0?
        <div className="tableScroll">
        <table>
          <thead>
            <tr style={{gridTemplateColumns:'1fr 1fr 1fr 1fr'}}>
              <th>Name 
                <button type="button" className="sortToggle" onClick={() => toggleSort("speakers", "name")}>
                    {sortStates.speakers.column === "name" && sortStates.speakers.state === true
                    ? '\u2b9d'
                    : '\u2b9f'}
                </button>
              </th>
              <th>School 
                <button type="button" className="sortToggle" onClick={() => toggleSort("speakers", "school")}>
                    {sortStates.speakers.column === "school" && sortStates.speakers.state === true
                    ? '\u2b9d'
                    : '\u2b9f'}
                </button>
              </th>
              <th>Available 
                <button type="button" className="sortToggle" onClick={() => toggleSort("speakers", "available")}>
                    {sortStates.speakers.column === "available" && sortStates.speakers.state === true
                    ? '\u2b9d'
                    : '\u2b9f'}
                </button>
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sortedSpeakers.map((p,i)=>
            <tr key={i} style={{gridTemplateColumns:'1fr 1fr 1fr 1fr'}}>
              <td>{p.name}</td>
              <td>{fullTab.institutions.find((i)=>i.id===p.institutionId).name}</td>
              <td>{p.available? '\u2714': '\u2718'}</td>
              <td style={{display: 'grid', gridAutoFlow:'column', gridAutoColumns:'1rem', justifySelf:'center', gap:'1rem'}}><FaAngleDoubleUp fill="teal" onClick={()=>{dialogRef.current.open=true; setSpeakerForm(p);}}/><RiDeleteBin6Fill fill="red" onClick={()=>{deleteEntity("speaker", { id: p.id })}}/></td>
            </tr>)}
          </tbody>
        </table></div>:<p>No Registered Speakers</p>}
        </section>
        </>
      )
  }
  function rooms(){
    const sortedRooms = sortItems(fullTab.rooms ?? [], "rooms", {
        name: (item) => item.name,
        available: (item)=> item.available,
        });
    return (
        <>
        <section id="rooms">
            <h2>Registered Rooms</h2>
            <button className="darkButton" onClick={()=>{dialogRef.current.open=true;setRoomForm({...newItems.room});}}>Add Room</button>
            {showForm('room')}
            {fullTab.rooms?.length>0?
            <div className="tableScroll"><table>
              <thead>
                <tr style={{gridTemplateColumns:'1fr 1fr 1fr'}}>
                  <th>Name <button type="button" className="sortToggle" onClick={() => toggleSort("rooms", "name")}>
                    {sortStates.rooms.column === "name" && sortStates.rooms.state === true ? '\u2b9d' : '\u2b9f'}
                  </button></th>
                  <th>Available <button type="button" className="sortToggle" onClick={() => toggleSort("rooms", "available")}>
                    {sortStates.rooms.column === "available" && sortStates.rooms.state === true ? '\u2b9d' : '\u2b9f'}
                  </button></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sortedRooms.map((p,i)=>
                <tr key={i} style={{gridTemplateColumns:'1fr 1fr 1fr'}}>
                  <td>{p.name}</td>
                  <td>{p.available? '\u2714': '\u2718'}</td>
                  <td style={{display: 'grid', gridAutoFlow:'column', gridAutoColumns:'1rem', justifySelf:'center', gap:'1rem'}}><FaAngleDoubleUp fill="teal" onClick={()=>{dialogRef.current.open=true; setRoomForm(p)}}/><RiDeleteBin6Fill fill="red" onClick={()=>{deleteEntity("room", { id: p.id })}}/></td>
                </tr>)}
              </tbody>
            </table></div>:<p>No Registered Rooms</p>}
        </section>
        </>
      )
  }
  function rounds(){
    const sortedRounds = sortItems(fullTab.rounds ?? [], "rounds", {
        number: (item) => item.number,
        name: (item) => item.name,
        breaks: (item) => item.breaks,
        completed: (item) => item.completed,
        blind: (item) => item.blind,
        });
    return (
        <>
        <section id="rounds">
            <h2>Registered Rounds</h2>
            <button className="darkButton" onClick={()=>{dialogRef.current.open=true;setRoundForm({...newItems.round});}}>Add Preliminary Round</button>
            {showForm('round')}
            {sortedRounds.length>0?
            <div className="tableScroll"><table>
              <thead>
                <tr style={{gridTemplateColumns:'0.7fr 1.5fr 1fr 0.8fr 1fr 0.8fr 1fr'}}>
                  <th>Order <button type="button" className="sortToggle" onClick={() => toggleSort("rounds", "number")}>
                    {sortStates.rounds.column === "number" && sortStates.rounds.state === true ? '\u2b9d' : '\u2b9f'}
                  </button></th>
                  <th>Name <button type="button" className="sortToggle" onClick={() => toggleSort("rounds", "name")}>
                    {sortStates.rounds.column === "name" && sortStates.rounds.state === true ? '\u2b9d' : '\u2b9f'}
                  </button></th>
                  <th>Duration </th>
                  <th>Breaks <button type="button" className="sortToggle" onClick={() => toggleSort("rounds", "breaks")}>
                    {sortStates.rounds.column === "breaks" && sortStates.rounds.state === true ? '\u2b9d' : '\u2b9f'}
                  </button></th>
                  <th>Completed <button type="button" className="sortToggle" onClick={() => toggleSort("rounds", "completed")}>
                    {sortStates.rounds.column === "completed" && sortStates.rounds.state === true ? '\u2b9d' : '\u2b9f'}
                  </button></th>
                  <th>Blind <button type="button" className="sortToggle" onClick={() => toggleSort("rounds", "blind")}>
                    {sortStates.rounds.column === "blind" && sortStates.rounds.state === true ? '\u2b9d' : '\u2b9f'}
                  </button></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sortedRounds.map((p,i)=>
                <tr key={i} style={{gridTemplateColumns:'0.7fr 1.5fr 1fr 0.8fr 1fr 0.8fr 1fr'}}>
                  <td>{p.number}</td>
                  <td>{ p.name}</td>
                  <td>{p.speechDuration} min</td>
                  <td>{p.breaks ? 'Yes' : 'No'}</td>
                  <td>{p.completed ? '\u2714' : '\u2718'}</td>
                  <td>{p.blind ? '\u2714' : '\u2718'}</td>
                  <td style={{display: 'grid', gridAutoFlow:'column', gridAutoColumns:'1rem', justifySelf:'center', gap:'1rem'}}><FaAngleDoubleUp fill="teal" onClick={()=>{dialogRef.current.open=true; setRoundForm({...p, id:p.roundId,breakCategory: p.cupCategoryId ?? "", breakPhase: p.breakPhase ?? ""});}}/><RiDeleteBin6Fill fill="red" onClick={()=>{deleteEntity("round", { id: p.roundId })}}/></td>
                </tr>)}
              </tbody>
            </table></div>:<p>No Registered Rounds</p>}
        </section>
        </>
      )
  }
  function prompts(){
    const sortedPrompts = sortItems(fullTab?.speechPrompts ?? [], "prompts", {
        round: (item) => fullTab.rounds.find((i)=>i.roundId===item.roundId).name,
        speechPrompt: (item) => item.speechPrompt,
        speechType: (item) => item.speechType,
        visible: (item) => item.visible,
        });
    return (
        <>
          <section id="speechPrompts">
            <h2>Registered Prompts</h2>
            <button className="darkButton" onClick={()=>{dialogRef.current.open=true;setPromptForm({...newItems.prompt});}}>Add Speech Prompt</button>
            {showForm('prompt')}
            {sortedPrompts.length>0?
            <div className="tableScroll"><table>
              <thead>
                <tr style={{gridTemplateColumns:'1fr 2fr 1fr 0.8fr 1fr'}}>
                  <th>Round <button type="button" className="sortToggle" onClick={() => toggleSort("prompts", "round")}>
                    {sortStates.prompts.column === "round" && sortStates.prompts.state === true ? '\u2b9d' : '\u2b9f'}
                  </button></th>
                  <th>Prompt <button type="button" className="sortToggle" onClick={() => toggleSort("prompts", "speechPrompt")}>
                    {sortStates.prompts.column === "speechPrompt" && sortStates.prompts.state === true ? '\u2b9d' : '\u2b9f'}
                  </button></th>
                  <th>Speech Type <button type="button" className="sortToggle" onClick={() => toggleSort("prompts", "speechType")}>
                    {sortStates.prompts.column === "speechType" && sortStates.prompts.state === true ? '\u2b9d' : '\u2b9f'}</button></th>
                  <th>Visible <button type="button" className="sortToggle" onClick={() => toggleSort("prompts", "visible")}>
                    {sortStates.prompts.column === "visible" && sortStates.prompts.state === true ? '\u2b9d' : '\u2b9f'}
                  </button></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sortedPrompts.map((p,i)=>
                <tr key={i} style={{gridTemplateColumns:'1fr 2fr 1fr 0.8fr 1fr'}}>
                  <td>{fullTab.rounds.find((i)=>i.roundId===p.roundId).name}</td>
                  <td>{ p.speechPrompt}</td>
                  <td>{p.speechType}</td>
                  <td>{p.visible ? '\u2714' : '\u2718'}</td>
                  <td style={{display: 'grid', gridAutoFlow:'column', gridAutoColumns:'1rem', justifySelf:'center', gap:'1rem'}}><FaAngleDoubleUp fill="teal" onClick={()=>{dialogRef.current.open=true; setPromptForm({...p});}}/><RiDeleteBin6Fill fill="red" onClick={()=>{deleteEntity("prompt", { id: p.id })}}/></td>
                </tr>)}
              </tbody>
            </table></div>:<p>No Registered Rounds</p> }

          </section>
          {/* <div className="results">{sortedPrompts.map((item) => <div className="roomCard" key={item.id}><div className="roomHeader"><h2 style={{ margin: 0 }}>{sortedRounds.find((round) => round.roundId === item.roundId)?.name ?? "Round"}</h2><p>{item.speechType}</p></div>
          <div className="roomBody"><p style={{ margin: 0 }}>{item.speechPrompt}</p></div><button className="lightButton" onClick={() => setPromptForm(item)}>Edit</button><button className="lightButton" onClick={() => deleteEntity("prompt", { id: item.id })}>Delete</button></div>)}</div> */}
        </>
      )
  }
  function renderDrawCards(rounds, emptyMessage){
  return rounds.length>0
  ? 
  rounds.map((round)=> {
      const roundDraws = fullTab.draws?.filter((draw)=>draw.roundId===round.roundId) || [];
      return (
          <div key={round.roundId} style={{display:'grid', gap:'0.5rem', margin:'0.5rem', borderRadius:'1rem', padding:'0.5rem'}}>
          <h3 style={{marginBottom:0}}>{round.name}</h3>
          {!roundDraws.length
              ? <p style={{margin:0}}>{emptyMessage} <br />
              <button className="darkButton" onClick={()=>{dialogRef.current.open=true;setDrawForm({...round, breakRoundId: round.roundId});}}>Draw Round</button>
              </p>

              :
              <div style={{display: 'flex', flexDirection:'column', alignItems:'center', gap:'0.5rem'}}>
                <div style={{display: 'grid', gridAutoFlow:'column', gap:'0.5rem'}}>
                  <button className="darkButton" onClick={()=>{dialogRef.current.open=true;setDrawForm({...round, id: round.roundId});}}>Redraw </button>
                  <button disabled={round.completed} className="darkButton" onClick={()=>{dialogRef2.current.open=true;setDrawUpdateForm({...round});}}>Update </button>
                  <button className="darkButton" onClick={() => deleteDraw(round.roundId)}>Delete Draw</button>
                </div>
              <div className="roomCard">
                  <div className="roomHeader" style={{display:'grid',gridAutoFlow:'column', gridTemplateColumns:'1fr 1fr fr'}}>
                      <span>Room</span>
                      <span>Adjudicators</span>
                      <span>Speakers</span>
                  </div>
                  {roundDraws.map((r,n)=>
                  <div key={n} className="roomBody" style={{display:'flex',flexDirection:'row', width:'100%'}}>
                      <p style={{flex:'1', borderBottom:'1px solid #e6e6e6', margin:'0'}}>{r.room.name}</p>
                      <p style={{flex:'1', borderBottom:'1px solid #e6e6e6', margin:'0'}}>{r.judges.map((j,i)=><li style={{display: "block"}} key={i}>{j.name}</li>)}</p>
                      <p style={{flex:'1', borderBottom:'1px solid #e6e6e6', margin:'0'}}>{r.speakers.map((s,i)=><li style={{display: "block"}} key={i}>{s.name}</li>)}</p>
                  </div>)}
              </div>
              </div>
              }
          </div>
      );
      })
  : <p>{emptyMessage}</p>;
  }

  function getMissing(speakers, speakersInDraw){
      const arr1=speakers.map(s=>s.id);
      const arr2=speakersInDraw.map(s=>s.id);
      const missingIds=[
      ...arr1.filter(x => !arr2.includes(x)),
      ...arr2.filter(x => !arr1.includes(x))
      ]
      const missingSpeakers= missingIds.map((i)=>{
          return speakers.find(s=> s.id===i)
      })
      // console.log(missingSpeakers);
      return missingSpeakers; 
  }
  function getEmptyRooms(roundId){
      // console.log(fullTab);
      const rooms=[...fullTab.rooms];
      const currentRoundNumber=fullTab.rounds.find(r=>r.roundId===roundId).number;
      const ongoingRoundIds= fullTab.rounds.filter(r=>r.number===currentRoundNumber).map(r=>r.roundId);
      const occupiedRooms= [...ongoingRoundIds.map(i=>fullTab.draws.filter(d=> d.roundId===i).map(d=>d.room))];
      const availableRoomIds=[...rooms.map(r=>r.id).filter(x => !occupiedRooms[0].map(r=>r.id).includes(x))];
      const availableRooms=rooms.filter(r=>availableRoomIds.includes(r.id));
      // console.log(availableRooms);
      return availableRooms || [];
  }
  function getOccupiedRooms(roundId){
      const currentRoundNumber=fullTab.rounds.find(r=>r.roundId===roundId).number;
      const ongoingRoundIds= fullTab.rounds.filter(r=>r.number===currentRoundNumber).map(r=>r.roundId);
      const occupiedRooms= [...ongoingRoundIds.map(i=>fullTab.draws.filter(d=> d.roundId===i).map(d=>d.room))];
      return occupiedRooms.flat() || [];
  }
  function draws(){
    const preliminaryRounds = fullTab?.rounds?.filter((round)=>!round.breaks) || [];
    const breakRounds = fullTab?.rounds?.filter((round)=>round.breaks) || [];
    return (
        <>
        <div className="buttonStack">
          {drawViews.map((v,i)=><button className={drawView===v? 'lightButton':'darkButton'} onClick={()=>setDrawView(v)} key={i}>{v}</button>)}
        </div>
        {drawView==='prelim' &&
          <section id="prelims">
            <h2>Preliminary Draws</h2>
            {showForm('generateDraw')}
            {showForm('updateDraw')}
            {renderDrawCards(preliminaryRounds,'Draw for this prelim round is not out yet')}
          </section>
        }
        {drawView==='breaks' &&
          <section id="breaks">
            <h2>Preliminary Draws</h2>
            {showForm('previewBreaks')}
            {showForm('updateDraw')}
            {renderDrawCards(breakRounds,'Draw for this prelim round is not out yet')}
            {drawForm.preview && 
              <div className="roomCard">
                <div className="roomHeader">
                  <h2 style={{ margin: 0 }}>{drawForm.preview.targetRound?.name}</h2>
                </div>
                <div className="roomBody">
                  {(drawForm.preview.allocations ?? []).map((allocation, index) => 
                  <p key={index} style={{ margin: 0 }}>Room {allocation.roomId}: {allocation.allocatedSpeakers?.length ?? 0} speakers</p>)}
                </div>
              </div>
            }
          </section>
        }
        </>
      )
  }
  function results(){
    const sortedRounds=fullTab?.rounds || [];
    return (
        <>
        <section id="results">
            <h2>Results</h2>
            {showForm('results')}
            <select value={resultForm.roundId} onChange={(e) =>setResultForm((prev) => ({ ...prev, roundId: Number(e.target.value), roomId: "", draft: null }))}>
              <option value="">Select Round</option>
              {sortedRounds.map((item) => <option key={item.roundId} value={item.roundId}>{item.name}</option>)}
            </select>
            {/* <button onClick={()=>console.log(fullTab)}></button> */}
            {fullTab.draws.find((a)=>a.roundId===resultForm.roundId)?
              fullTab.draws.filter((a)=>a.roundId===resultForm.roundId).map((r,n)=>
              <div className="roomCard" key={n}>
                  <div className="roomHeader">
                      <h2 style={{margin:0}}>{r.room.name}<FaAngleDoubleUp fill="teal" onClick={()=>{dialogRef.current.open=true; setResultForm((prev)=>({ ...prev, roomId: r.room.id }))}}/></h2>
                      <div style={{margin:0}}><strong>Judge(s): </strong><span style={{margin:0}}>{r.judges.map((j, x)=><span key={x}>{j.name}, </span>)      
                      }</span><p style={{display:'grid',gridTemplateColumns:'1fr 0.5fr 0.5fr', textAlign:'start', gap:'0.5rem', marginTop:"0.3rem",marginBottom:'0.3rem', marginLeft:'0.5rem'}}><span>Speaker</span><span>School</span><span>Result</span><span></span></p></div>
                  </div>
                  <div className="roomBody">
                      {(r.speakers ?? []).map((s,y)=>
                      <li style={{gridTemplateColumns:'1fr 0.5fr 0.5fr', textAlign:'start', gap:'0.5rem'}} key={y}>
                          <span>{s.name}</span>
                          <span>{fullTab.institutions.find((i)=>i.id===s.institutionId).code}</span>
                          <span>{fullTab.rounds.find(c=>c.roundId===r.roundId).breaks? s.result?.status?? '-': s.result?.score?? '-'}</span>
                      </li>)}
                  </div>
              </div>):
              <p>Draw for this round is not out yet</p>}
        </section>
        </>
      )
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
          <span className="☰" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <IoClose /> : "☰"}</span>
        </nav>
        <nav className={`tSideMenu ${menuOpen ? "Open" : "Closed"}`}>
          <ul>
            <span onClick={() => setTabItem("configuration")}><GiMicrophone fill="teal" /><strong>{tab.title}</strong></span>
            {["configuration", "institutions", "tabMasters", "speakers", "judges", "rooms", "rounds", "prompts", "draws", "results"].map((item) => (
              <li key={item} onClick={() => setTabItem(item)} className={tabItem === item ? "selectedTabItem" : ""}>{item[0].toUpperCase() + item.slice(1)}</li>
            ))}
          </ul>
        </nav>
      </div>
      {menuOpen && <div className="aoe" onClick={() => setMenuOpen(false)}></div>}
      <Toast toasts={toasts} setToasts={setToasts}/>
      {tabItem === "home" && home()}
      {tabItem === "configuration" && configuration()}
      {tabItem === "institutions" && institutions()}
      {tabItem === "tabMasters" && tabMasters()}
      {tabItem === "speakers" && speakers()}
      {tabItem === "judges" && judges()}
      {tabItem === "rooms" && rooms()}
      {tabItem === "rounds" && rounds()}
      {tabItem === "prompts" && prompts()}
      {tabItem === "draws" && draws()}
      {tabItem === "results" && results()}
    </>
  );
}

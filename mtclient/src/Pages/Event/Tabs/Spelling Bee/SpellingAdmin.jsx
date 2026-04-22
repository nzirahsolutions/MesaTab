import { useState, useContext, useEffect, useRef, useMemo } from "react";
import {GiBee} from 'react-icons/gi';
import {IoClose} from 'react-icons/io5';
import {RiDeleteBin6Fill} from 'react-icons/ri';
import {FaAngleDoubleUp } from 'react-icons/fa';
import {AuthContext} from '../../../../Context/AuthContext';
import Dropdown from "../../../../Components/Dropdown";
import SpellingBeePublicTab from "./SpellingBeePublicTab";
import SpellingJudgeTab from "./SpellingJudgeTab";
import axios from 'axios';
import { currentServer } from "../../../../Context/urls";
import Loading from "../../../../Components/Loading";
import Cell from "../../../../Components/Cell";
import ToggleButton from "../../../../Components/ToggleButton";
import Toast from "../../../../Components/Toast";
import Input from "../../../../Components/Input";

export default function SpellingAdmin({tab, event}) {
  const [tabItem, setTabItem]=useState('home');
  const tabHistoryRef=useRef(false);
  const [menuOpen, setMenuOpen]=useState(false);
  const {user, access, setAccess}= useContext(AuthContext);
  const [pageLoad, setPageLoad]=useState({loading: true, adminAuthorized:false, judgeAuthorized:false});
  const [fullTab, setFulltab]=useState(null);
  const roundTypes=['Timed','Word Limit'];

    const [configForm, setConfigForm] = useState({ title: "", slug: "", minScore: 30, maxScore: 90, completed: false, cups: [] });
    const [institutionForm, setInstitutionForm] = useState({ id: null, name: "", code: "" });
    const [tabMasterForm, setTabMasterForm] = useState({ id: null, name: "", institutionId: 0, email: "" });
    const [spellerForm, setSpellerForm] = useState({ id: null, name: "", institutionId: 0, email: "", available: true });
    const [judgeForm, setJudgeForm] = useState({ id: null, name: "", institutionId: 0, email: "", available: true });
    const [roomForm, setRoomForm] = useState({ id: null, name: "", available: true });
    const [roundForm, setRoundForm] = useState({ id: null, name:'', number:'', breaks:false, type:'Timed', timeLimit:'',wordLimit:'', completed:false, blind:false });
    const [wordForm, setWordForm] = useState({ id: null, word: "" });
    const [drawForm, setDrawForm] = useState({ roundId: "", powerPair: true, breakRoundId: "", preview: null });
    const [drawUpdateForm, setDrawUpdateForm]= useState({roundId:0,room1:0, room2:0, swapState:0, judge1:0, judge2:0, speller1:0, speller2:0})
    const [resultForm, setResultForm] = useState({ roundId: "", roomId: "", draft: null });
    const newItems={
      institution:{id: null, name: "", code: ""}, 
      tabMaster:{id: null, name: "", institutionId: 0, email: ""}, 
      speller:{id: null, name: "", institutionId: 0, email: "", available: true},
      judge:{id: null, name: "", institutionId: 0, email: "", available: true},
      room:{id: null, name: "", available: true}, 
      round:{id: null, name:'', number:'', breaks:false, type:'Timed', timeLimit:'',wordLimit:'', completed:false, blind:false}, 
      word:{id: null, word: ""}, 
      draw:{roundId: "", powerPair: true, breakRoundId: "", preview: null},
      drawUpdate: {roundId:0, room1:0, room2:0, swapState:0, judge1:0, judge2:0, speller1:0, speller2:0},
      result:{roundId: "", roomId: "", draft: null}
    };
    const [sortStates, setSortStates]=useState({institutions:{column:'name', state:true}, tabMasters:{column:'name', state:true}, judges:{column:'name', state:true}, spellers:{column:'name', state:true}, rooms:{column:'name', state:true}, rounds:{column:'number', state:true}, words:{column:'word', state:true}});
    const [toasts, setToasts]=useState([]);
    const dialogRef=useRef(null);
    const dialogRef2=useRef(null);
    const [drawView, setDrawView]=useState('prelim');
    const drawViews=['prelim', 'breaks'];
    const currentDraw = fullTab?.draws?.find((draw) => draw.roundId === Number(resultForm.roundId) && draw.room?.id === Number(resultForm.roomId)) ?? null;

  async function getFullTab() {
    try {
      const res = await axios.get(`${currentServer}/sb/tab/${tab.tabId}`);
      const fetchedTab = res.data?.data ?? null;
      setConfigForm({
        title: fetchedTab.title,
        slug: fetchedTab.slug,
        minScore: fetchedTab.minScore,
        maxScore: fetchedTab.maxScore,
        completed: fetchedTab.completed,
        cups: fetchedTab.cups ?? [],
      });
      setFulltab(fetchedTab);
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
function tabChange(t){
setTabItem(t);
setMenuOpen(false);
}

async function saveConfig(e) {
    e.preventDefault();
    try {
    const res = await axios.put(`${currentServer}/sb/tab/update`, { ...configForm, tabId: tab.tabId });
    setToast('success', res.data?.message ?? "Configuration updated");
    await getFullTab();
    } catch (error) {
    setToast('error', error?.response?.data?.message ?? "Failed to update configuration");
    }
}

async function submitEntity(endpoint, form, resetForm) {
try {
    const res = form.id
    ? await axios.put(`${currentServer}/sb/${endpoint}`, { ...form, tabId: tab.tabId })
    : await axios.post(`${currentServer}/sb/${endpoint}`, { ...form, tabId: tab.tabId });
    setToast("success", res.data?.message ?? "Saved");
    resetForm();
    await getFullTab();
} catch (error) {
    setToast("error", error?.response?.data?.message ?? "Failed to save");
    // console.log(error?.response?.data?.message ?? "Failed to save");
}
}
async function deleteEntity(endpoint, payload) {
if (!window.confirm("Delete this item?")) return;
try {
    const res = await axios.delete(`${currentServer}/sb/${endpoint}`, { data: { ...payload, tabId: tab.tabId } });
    setToast("success", res.data?.message ?? "Deleted");
    await getFullTab();
} catch (error) {
    setToast("error", error?.response?.data?.message ?? "Failed to delete");
}
}

async function generateDraw(e) {
e.preventDefault();
try {
    const res = await axios.post(`${currentServer}/sb/draw/generate`, { tabId: tab.tabId, roundId: Number(drawForm.roundId), powerPair: drawForm.powerPair });
    setToast("success", res.data?.message ?? "Draw generated");
    await getFullTab();
} catch (error) {
    setToast("error", error?.response?.data?.message ?? "Failed to generate draw");
    console.log(error?.response?.data?.message ?? "Failed to update draw")
}
}
async function updateDraw(e) {
e.preventDefault();
try {
    const res = await axios.put(`${currentServer}/sb/draw/update`, { tabId: tab.tabId,...drawUpdateForm });
    setToast("success", res.data?.message ?? "Draw updated");
    await getFullTab();
} catch (error) {
    setToast("error", error?.response?.data?.message ?? "Failed to update draw");
    // console.log(error?.response?.data?.message ?? "Failed to update draw")
}
}
async function previewBreak(e) {
e.preventDefault();
try {
    const res = await axios.post(`${currentServer}/sb/draw/breaks`, { tabId: tab.tabId, roundId: Number(drawForm.breakRoundId) });
    setDrawForm((prev) => ({ ...prev, preview: res.data?.data ?? null }));
    setToast("success", res.data?.message ?? "Break preview generated");
} catch (error) {
    setToast("error", error?.response?.data?.message ?? "Failed to preview break draw");
}
}
async function generateBreakDraw() {
try {
    const res = await axios.post(`${currentServer}/sb/draw/break-generate`, { tabId: tab.tabId, roundId: Number(drawForm.breakRoundId) });
    setToast("success", res.data?.message ?? "Break draw generated");
    await getFullTab();
} catch (error) {
    setToast("error", error?.response?.data?.message ?? "Failed to generate break draw");
}
}
function updateResultDraft(spellerId, patch) {
setResultForm((prev) => {
if (!prev.draft) return prev;
return {
...prev,
draft: {
    ...prev.draft,
    spellers: prev.draft.spellers.map((speller) =>
    speller.id === spellerId
        ? { ...speller, result: { ...(speller.result ?? {}), ...patch } }
        : speller
    ),
},
};
});
}
async function deleteDraw(roundId) {
if (!window.confirm("Delete the draw for this round?")) return;
try {
const res = await axios.delete(`${currentServer}/sb/draw/delete`, { data: { tabId: tab.tabId, roundId } });
setToast("success", res.data?.message ?? "Draw deleted");
await getFullTab();
} catch (error) {
setToast("error", error?.response?.data?.message ?? "Failed to delete draw");
}
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
    updates: resultForm.draft.spellers.map((speller) => ({
        spellerId: speller.id,
        score: speller.result?.score ?? fullTab.minScore,
        ...(sortedRounds.find((round) => round.roundId === Number(resultForm.roundId))?.breaks ? { status: speller.result?.status ?? "Incomplete" } : {}),
    })),
    };
    const res = await axios.post(`${currentServer}/sb/result/batch`, payload);
    setToast("success", res.data?.message ?? "Results saved");
    await getFullTab();
} catch (error) {
    setToast("error", error?.response?.data?.message ?? "Failed to save results");
}
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
            <Input placeholder="Institution Name" value={institutionForm.name} onChange={(e) => setInstitutionForm((prev) => ({ ...prev, name: e.target.value }))} />
            <Input placeholder="Code" value={institutionForm.code} onChange={(e) => setInstitutionForm((prev) => ({ ...prev, code: e.target.value }))} />
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
            <Input placeholder="Name" value={tabMasterForm.name} onChange={(e) => setTabMasterForm((prev) => ({ ...prev, name: e.target.value }))} />
            <Input type="email" placeholder="Email" value={tabMasterForm.email} onChange={(e) => setTabMasterForm((prev) => ({ ...prev, email: e.target.value }))} />
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
            <Input placeholder="Name" value={judgeForm.name} onChange={(e) => setJudgeForm((prev) => ({ ...prev, name: e.target.value }))} />
            <Input type="email" placeholder="Email" value={judgeForm.email} onChange={(e) => setJudgeForm((prev) => ({ ...prev, email: e.target.value }))} />
            <select value={judgeForm.institutionId} onChange={(e) => setJudgeForm((prev) => ({ ...prev, institutionId: Number(e.target.value) }))}><option value={0}>Select Institution</option>{sortedInstitutions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>Available <ToggleButton state={judgeForm.available} setState={() => setJudgeForm((prev) => ({ ...prev, available: !prev.available }))} /></label>
            <button className="darkButton">{judgeForm.id ? "Update" : "Add"} Judge</button>
            <button type="button" className="darkButton" onClick={()=>dialogRef.current.close()}>Cancel</button>
          </form>
          </dialog>
        )
      case 'speller':
        return(
          <dialog ref={dialogRef}>
            <form onSubmit={(e) => { e.preventDefault(); submitEntity("speller", spellerForm, () => setSpellerForm({ id: null, name: "", institutionId: 0, email: "", available: true })); }}>
            <h2>Spellers</h2>
            <Input placeholder="Name" value={spellerForm.name} onChange={(e) => setSpellerForm((prev) => ({ ...prev, name: e.target.value }))} />
            <Input type="email" placeholder="Email" value={spellerForm.email} onChange={(e) => setSpellerForm((prev) => ({ ...prev, email: e.target.value }))} />
            <select value={spellerForm.institutionId} onChange={(e) => setSpellerForm((prev) => ({ ...prev, institutionId: Number(e.target.value) }))}><option value={0}>Select Institution</option>{sortedInstitutions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>Available <ToggleButton state={spellerForm.available} setState={() => setSpellerForm((prev) => ({ ...prev, available: !prev.available }))} /></label>
            <button className="darkButton">{spellerForm.id ? "Update" : "Add"} Speller</button>
            <button type="button" className="darkButton" onClick={()=>dialogRef.current.close()}>Cancel</button>
          </form>
          </dialog>
        )
      case 'room':
        return(
          <dialog ref={dialogRef}>
            <form onSubmit={(e) => { e.preventDefault(); submitEntity("room", roomForm, () => setRoomForm({ id: null, name: "", available: true })); }}>
            <h2>Rooms</h2>
            <Input placeholder="Name" value={roomForm.name} onChange={(e) => setRoomForm((prev) => ({ ...prev, name: e.target.value }))} />
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>Available <ToggleButton state={roomForm.available} setState={() => setRoomForm((prev) => ({ ...prev, available: !prev.available }))} /></label>
            <button className="darkButton">{roomForm.id ? "Update" : "Add"} Room</button>
            <button type="button" className="darkButton" onClick={()=>dialogRef.current.close()}>Cancel</button>
          </form>
          </dialog>
        )
      case 'round':
        return(
          <dialog ref={dialogRef}>
            <form onSubmit={(e) => { e.preventDefault(); submitEntity("round", roundForm, () => setRoundForm({ id: null, name:'', number:'', breaks:false, type:'Timed', timeLimit:'',wordLimit:'', completed:false, blind:false })); }}>
            <h2>Rounds</h2>
            <Input placeholder="Name" value={roundForm.name} onChange={(e) => setRoundForm((prev) => ({ ...prev, name: e.target.value }))} />
            <Input placeholder="Number" type="number" value={roundForm.number} onChange={(e) => setRoundForm((prev) => ({ ...prev, number: e.target.value }))} />
            {!roundForm.breaks &&<select required name="type" value={roundForm.type} onChange={(e) => setRoundForm((prev) => ({ ...prev, type: e.target.value }))}>
                <option value="">Select round type</option>
              {roundTypes.map((t, i)=><option key={i} value={t}>{t}</option>)}
            </select>}
            {roundForm.type==='Timed' && <Input type="number" min="15" name="timeLimit" placeholder="Time Limit (seconds)" value={roundForm.timeLimit || ''} onChange={(e) => setRoundForm((prev) => ({ ...prev, timeLimit: e.target.value }))} required/>}
            {roundForm.type==='Word Limit' && <Input type="number" min="5" name="wordLimit" placeholder="Word Limit" value={roundForm.wordLimit || ''} onChange={(e) => setRoundForm((prev) => ({ ...prev, wordLimit: e.target.value }))} required/>}
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>Blind <ToggleButton state={roundForm.blind} setState={() => setRoundForm((prev) => ({ ...prev, blind: !prev.blind }))} /></label>
            {roundForm.id &&<label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>Completed <ToggleButton state={roundForm.completed} setState={() => setRoundForm((prev) => ({ ...prev, completed: !prev.completed }))} /></label>}
            <button className="darkButton">{roundForm.id ? "Update" : "Add Prelim"} Round</button>
            <button type="button" className="darkButton" onClick={()=>dialogRef.current.close()}>Cancel</button>
          </form>
          </dialog>
        )
      case 'word':
        return(
          <dialog ref={dialogRef}>
            <form onSubmit={(e) => { e.preventDefault(); submitEntity("word", wordForm, () => setWordForm({ id: null, word: ""})); }}>
            <h2>Words</h2>
            <Input placeholder="Word" value={wordForm.word} onChange={(e) => setWordForm((prev) => ({ ...prev, word: e.target.value }))} />
            <button className="darkButton">{wordForm.id ? "Update" : "Add"} Word</button>
            {wordForm.id && <button type="button" className="darkButton" onClick={()=>{dialogRef.current.close(); deleteEntity("word", { id: wordForm.id })}}>Delete Word</button>}
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
                  <option value={1}>Swap Spellers</option>
                  <option value={2}>Swap Judges</option>
                  <option value={3}>Move Speller</option>
                  <option value={4}>Move Judge</option>
                  <option value={5}>Add Speller</option>
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
                  <select name="speller1" value={drawUpdateForm.speller1} onChange={(e)=>setDrawUpdateForm({...drawUpdateForm, [e.target.name]:Number(e.target.value)})}>
                      <option value={0}>Select speller in first room</option>
                      {fullTab.draws.find((d)=>d.room.id===drawUpdateForm.room1 && d.roundId===drawUpdateForm.roundId)?.spellers.map((s,i)=><option value={s.id} key={i}>{s.name}</option>)}
                  </select>
                  <select name="speller2" value={drawUpdateForm.speller2} onChange={(e)=>setDrawUpdateForm({...drawUpdateForm, [e.target.name]:Number(e.target.value)})}>
                      <option value={0}>Select speller in second room</option>
                      {fullTab.draws.find((d)=>d.room.id===drawUpdateForm.room2 && d.roundId===drawUpdateForm.roundId)?.spellers.map((s,i)=><option value={s.id} key={i}>{s.name}</option>)}
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
                  <select name="speller1" value={drawUpdateForm.speller1} onChange={(e)=>setDrawUpdateForm({...drawUpdateForm, [e.target.name]:Number(e.target.value)})}>
                      <option value={0}>Select speller in first room</option>
                      {fullTab.draws.find((d)=>d.room.id===drawUpdateForm.room1 && d.roundId===drawUpdateForm.roundId)?.spellers.map((s,i)=><option value={s.id} key={i}>{s.name}</option>)}
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
                  <select name="speller1" value={drawUpdateForm.speller1} onChange={(e)=>setDrawUpdateForm({...drawUpdateForm, [e.target.name]:Number(e.target.value)})}>
                      <option value={0}>Select speller to add to room</option>
                      {getMissing(fullTab.spellingBees,fullTab.draws.filter(d=>d.roundId===drawUpdateForm.roundId).map(d=>d.spellers).flat()).map((s,i)=><option value={s.id} key={i}>{s.name}</option>)}
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
                  <div className="roomBody" style={{width:'auto'}}>
                    {resultForm.draft.spellers.map((speller) => (
                      <li key={speller.id} style={{ gridTemplateColumns: "1fr 0.5fr 0.5fr", gap: "0.5rem" }}>
                        <span>{speller.name}</span>
                        <span>{fullTab?.institutions?.find((entry) => entry.id === speller.institutionId)?.code ?? "-"}</span>
                        {sortedRounds.find((round) => round.roundId === Number(resultForm.roundId))?.breaks ?(
                          <select value={speller.result?.status ?? "Incomplete"} onChange={(e) => updateResultDraft(speller.id, { status: e.target.value })}>
                            <option value="Incomplete">Incomplete</option>
                            <option value="Eliminated">Eliminated</option>
                            <option value="Pass">Pass</option>
                          </select>
                        ):(
                        <Cell value={speller.result?.score ?? fullTab.minScore} min={0} max={selectedRound.type==='Word Limit'? selectedRound.wordLimit :30} onChange={(score) => updateResultDraft(speller.id, { score })} />
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

//return functions
  function home(){
    return(
      <div className="tabHome">
        {["configuration", "institutions", "tabMasters", "spellers", "judges", "rooms", "rounds", "words", "draws", "results"].map((item) => (
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
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>Completed <ToggleButton state={configForm.completed} setState={() => setConfigForm((prev) => ({ ...prev, completed: !prev.completed }))} /></label>
            <h3>Cups</h3>
            {configForm.cups.map((cup, index) => (
              <div key={cup.id ?? `cup-${index}`} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: "0.5rem" }}>
                <Input value={cup.cupCategory} placeholder="Cup Name" onChange={(e) => setConfigForm((prev) => ({ ...prev, cups: prev.cups.map((item, itemIdx) => itemIdx === index ? { ...item, cupCategory: e.target.value } : item) }))} />
                <Input type="number" value={cup.cupOrder} placeholder="Cup Order" onChange={(e) => setConfigForm((prev) => ({ ...prev, cups: prev.cups.map((item, itemIdx) => itemIdx === index ? { ...item, cupOrder: Number(e.target.value) } : item) }))} />
                <Input type="number" value={cup.breakNumber} placeholder="Break rounds" onChange={(e) => setConfigForm((prev) => ({ ...prev, cups: prev.cups.map((item, itemIdx) => itemIdx === index ? { ...item, breakNumber: Number(e.target.value) } : item) }))} />
                <Input type="number" value={cup.breakCapacity} placeholder="Min Spellers per break Room" onChange={(e) => setConfigForm((prev) => ({ ...prev, cups: prev.cups.map((item, itemIdx) => itemIdx === index ? { ...item, breakCapacity: Number(e.target.value) } : item) }))} />
                <RiDeleteBin6Fill onClick={() => setConfigForm((prev) => ({ ...prev, cups: prev.cups.filter((_, itemIdx) => itemIdx !== index) }))}/>
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
          spellers: (item) => item.spellers,
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
                            <th>Spellers 
                              <button type="button" className="sortToggle" onClick={() => toggleSort("institutions", "spellers")}>
                                  {sortStates.institutions.column === "spellers" && sortStates.institutions.state === true
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
                            <td>{p.spellers}</td>
                            <td style={{display: 'grid', gridAutoFlow:'column', gridAutoColumns:'1rem', justifySelf:'center', gap:'1rem'}}><FaAngleDoubleUp fill="teal" onClick={()=>{dialogRef.current.open=true; setInstitutionForm(p)}}/><RiDeleteBin6Fill fill="red" onClick={()=>{deleteEntity("institution", { id: p.id })}}/></td>
                          </tr>)}
                        </tbody>
                      </table></div>:<p>No Registered Institutions</p>}
            </section>
          </>
        )
    }
  function spellers(){
    const sortedSpellers = sortItems(fullTab.spellingBees ?? [], "spellers", {
        name: (item) => item.name,
        school: (item) => fullTab.institutions.find((i)=>i.id===item.institutionId).name,
        available: (item) => item.available,
        });
    return (
        <>
            <section id="spellers">
            <h2>Registered Spellers ({sortedSpellers.length})</h2>
            <button className="darkButton" onClick={()=>{dialogRef.current.open=true;setSpellerForm({...newItems.speller});}}>Add Speller</button>
            {showForm('speller')}
        {sortedSpellers.length>0?
        <div className="tableScroll">
        <table>
            <thead>
            <tr style={{gridTemplateColumns:'1fr 1fr 0.5fr 0.5fr'}}>
                <th>Name 
                <button type="button" className="sortToggle" onClick={() => toggleSort("spellers", "name")}>
                    {sortStates.spellers.column === "name" && sortStates.spellers.state === true
                    ? '\u2b9d'
                    : '\u2b9f'}
                </button>
                </th>
                <th>School 
                <button type="button" className="sortToggle" onClick={() => toggleSort("spellers", "school")}>
                    {sortStates.spellers.column === "school" && sortStates.spellers.state === true
                    ? '\u2b9d'
                    : '\u2b9f'}
                </button>
                </th>
                <th>Available 
                <button type="button" className="sortToggle" onClick={() => toggleSort("spellers", "available")}>
                    {sortStates.spellers.column === "available" && sortStates.spellers.state === true
                    ? '\u2b9d'
                    : '\u2b9f'}
                </button>
                </th>
                <th></th>
            </tr>
            </thead>
            <tbody>
            {sortedSpellers.map((p,i)=>
            <tr key={i} style={{gridTemplateColumns:'1fr 1fr 0.5fr 0.5fr'}}>
                <td>{p.name}</td>
                <td>{fullTab.institutions.find((i)=>i.id===p.institutionId).name}</td>
                <td>{p.available? '\u2714': '\u2718'}</td>
                <td style={{display: 'grid', gridAutoFlow:'column', gridAutoColumns:'1rem', justifySelf:'center', gap:'1rem'}}><FaAngleDoubleUp fill="teal" onClick={()=>{dialogRef.current.open=true; setSpellerForm(p);}}/><RiDeleteBin6Fill fill="red" onClick={()=>{deleteEntity("speller", { id: p.id })}}/></td>
            </tr>)}
            </tbody>
        </table></div>:<p>No Registered Spellers</p>}
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
            <tr style={{gridTemplateColumns:'1fr 1fr 1fr 0.6fr 0.5fr'}}>
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
            <tr key={i} style={{gridTemplateColumns:'1fr 1fr 1fr 0.6fr 0.5fr'}}>
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
        type: (item) => item.type,
        limit: (item) => item.timeLimit || item.wordLimit || 0,
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
            {fullTab.rounds?.length>0?
            <div className="tableScroll"><table>
            <thead>
                <tr style={{gridTemplateColumns:'0.7fr 1.5fr 1fr 1fr 0.8fr 1fr 0.8fr 1fr'}}>
                <th>Order <button type="button" className="sortToggle" onClick={() => toggleSort("rounds", "number")}>
                    {sortStates.rounds.column === "number" && sortStates.rounds.state === true ? '\u2b9d' : '\u2b9f'}
                </button></th>
                <th>Name <button type="button" className="sortToggle" onClick={() => toggleSort("rounds", "name")}>
                    {sortStates.rounds.column === "name" && sortStates.rounds.state === true ? '\u2b9d' : '\u2b9f'}
                </button></th>
                <th>Type <button type="button" className="sortToggle" onClick={() => toggleSort("rounds", "type")}>
                    {sortStates.rounds.column === "type" && sortStates.rounds.state === true ? '\u2b9d' : '\u2b9f'}
                </button></th>
                <th>Limit <button type="button" className="sortToggle" onClick={() => toggleSort("rounds", "limit")}>
                    {sortStates.rounds.column === "limit" && sortStates.rounds.state === true ? '\u2b9d' : '\u2b9f'}
                </button></th>
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
                <tr key={i} style={{gridTemplateColumns:'0.7fr 1.5fr 1fr 1fr 0.8fr 1fr 0.8fr 1fr'}}>
                <td>{p.number}</td>
                <td>{ p.name}</td>
                <td>{p.type}</td>
                <td>{p.timeLimit || p.wordLimit || '-'}</td>
                <td>{p.breaks ? 'Yes' : 'No'}</td>
                <td>{p.completed ? '\u2714' : '\u2718'}</td>
                <td>{p.blind ? '\u2714' : '\u2718'}</td>
                <td style={{display: 'grid', gridAutoFlow:'column', gridAutoColumns:'1rem', justifySelf:'center', gap:'1rem'}}><FaAngleDoubleUp fill="teal" onClick={()=>{dialogRef.current.open=true; setRoundForm({...p, id:p.roundId});}}/><RiDeleteBin6Fill fill="red" onClick={()=>{deleteEntity("round", { id: p.roundId })}}/></td>
                </tr>)}
            </tbody>
            </table></div>:<p>No Registered Rounds</p>}
          </section>
          </>
        )
    }
  function words(){
    const sortedWords = sortItems(fullTab?.words ?? [], "words", {
        word: (item) => item.word,
        length: (item)=> item.word.length
        });
    return (
        <>
            <section id="Words">
            <h2>Words</h2>
            <button className="darkButton" onClick={()=>{dialogRef.current.open=true; setWordForm({...newItems.word});}}>Add Word</button>
            {showForm('word')}
            {sortedWords.length>0?
            <div>
                <div style={{backgroundColor:'var(--brandcolor)', color:'var(--white-color)', display:'grid', gridAutoFlow:'column', gap:'1rem', width:'fit-content', padding:'0.5rem', justifyContent:'center', justifySelf:'center', borderRadius:'1rem', margin:'0.5rem'}}>
                    <span>Alphabetical<button type="button" className="sortToggle" onClick={() => toggleSort("words", "word")}>
                    {sortStates.words.column === "word" && sortStates.words.state === true ? '\u2b9d' : '\u2b9f'}
                    </button></span>
                    <span>Length<button type="button" className="sortToggle" onClick={() => toggleSort("words", "length")}>
                    {sortStates.words.column === "length" && sortStates.words.state === true ? '\u2b9d' : '\u2b9f'}
                    </button></span>
                </div>
                <div style={{display: 'flex', gap:'1rem',flexWrap:'wrap'}}>
                    {sortedWords.map((p,i)=>
                    <span key={i} style={{backgroundColor:'var(--accentcolor)', borderRadius:'1rem', minWidth:'100px', padding:" 0.5rem 0.5rem"}} onClick={()=>{dialogRef.current.open=true; setWordForm({...p, id: p.id});}}>
                        { p.word }
                    </span>)}
                </div>
                

            {/* <table>
                <thead>
                <tr style={{gridTemplateColumns:'1fr 1fr'}}>
                    <th>Word <button type="button" className="sortToggle" onClick={() => toggleSort("word", "word")}>
                    {sortStates.words.column === "word" && sortStates.words.state === true ? '\u2b9d' : '\u2b9f'}
                    </button></th>
                    <th></th>
                </tr>
                </thead>
                <tbody>
                {sortedWords.map((p,i)=>
                <tr key={i} style={{gridTemplateColumns:'1fr 1fr'}}>
                    <td>{ p.word}</td>
                    <td style={{display: 'grid', gridAutoFlow:'column', gridAutoColumns:'1rem', justifySelf:'center', gap:'1rem'}}><FaAngleDoubleUp fill="teal" onClick={()=>{dialogRef.current.open=true; setWordForm({...p});}}/><RiDeleteBin6Fill fill="red" onClick={()=>{deleteEntity("prompt", { id: p.id })}}/></td>
                </tr>)}
                </tbody>
            </table>*/}
            </div> 
            :<p>No Registered Words</p> }

            </section>
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
                      <span>Spellers</span>
                  </div>
                  {roundDraws.map((r,n)=>
                  <div key={n} className="roomBody" style={{display:'flex',flexDirection:'row', width:'100%'}}>
                      <p style={{flex:'1', borderBottom:'1px solid #e6e6e6', margin:'0'}}>{r.room.name}</p>
                      <p style={{flex:'1', borderBottom:'1px solid #e6e6e6', margin:'0'}}>{r.judges.map((j,i)=><li style={{display: "block"}} key={i}>{j.name}</li>)}</p>
                      <p style={{flex:'1', borderBottom:'1px solid #e6e6e6', margin:'0'}}>{r.spellers.map((s,i)=><li style={{display: "block"}} key={i}>{s.name}</li>)}</p>
                  </div>)}
              </div>
              </div>
              }
          </div>
      );
      })
  : <p>{emptyMessage}</p>;
  }

  function getMissing(spellers, spellersInDraw){
      const arr1=spellers.map(s=>s.id);
      const arr2=spellersInDraw.map(s=>s.id);
      const missingIds=[
      ...arr1.filter(x => !arr2.includes(x)),
      ...arr2.filter(x => !arr1.includes(x))
      ]
      const missingSpellers= missingIds.map((i)=>{
          return spellers.find(s=> s.id===i)
      })
      // console.log(missingSpellers);
      return missingSpellers; 
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
                  <p key={index} style={{ margin: 0 }}>Room {allocation.roomId}: {allocation.allocatedSpellers?.length ?? 0} spellers</p>)}
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
                      }</span><p style={{display:'grid',gridTemplateColumns:'1fr 0.5fr 0.5fr', textAlign:'start', gap:'0.5rem', marginTop:"0.3rem",marginBottom:'0.3rem'}}><span>Speller</span><span>School</span><span>Result</span><span></span></p></div>
                  </div>
                  <div className="roomBody" style={{width:'auto'}}>
                      {(r.spellers ?? []).map((s,y)=>
                      <li style={{display:'grid',gridTemplateColumns:'1fr 0.5fr 0.5fr', textAlign:'start', gap:'0.5rem'}} key={y}>
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

  const adminSelectedIdx = Math.max(0, accessOptions.findIndex((option) => option.value === 'admin'));

  return (
    !pageLoad.loading && access==='admin'?
    <>
    <nav className="tabMenu">
          <ul>
            <Dropdown options={accessOptions} setValue={setAccess} selectedIdx={adminSelectedIdx}/>
            {["configuration", "institutions", "tabMasters", "spellers", "judges", "rooms", "rounds", "words", "draws", "results"].map((item) => (
                <li key={item} onClick={() => setTabItem(item)} className={tabItem === item ? "selectedTabItem" : ""}>{item[0].toUpperCase() + item.slice(1)}</li>
            ))}
          </ul>
        </nav>
        <div className="tabSideMenu">
          <nav className="tTitle">
            <Dropdown selectedIdx={adminSelectedIdx} options={accessOptions} setValue={setAccess}/>
            <span className='☰' onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen? <IoClose/>:'☰'}</span>
          </nav>
          <nav className={`tSideMenu ${menuOpen? 'Open':'Closed'}`}>
            <ul>
            <span onClick={()=>tabChange('home')}><GiBee fill="teal"/><strong>{tab.title}</strong></span>
            {["configuration", "institutions", "tabMasters", "spellers", "judges", "rooms", "rounds", "words", "draws", "results"].map((item) => (
              <li key={item} onClick={() => setTabItem(item)} className={tabItem === item ? "selectedTabItem" : ""}>{item[0].toUpperCase() + item.slice(1)}</li>
            ))}
          </ul>
          </nav>
        </div>
        {menuOpen&& <div className="aoe" onClick={()=>setMenuOpen(false)}></div>}
        <Toast toasts={toasts} setToasts={setToasts}/>
        {/* <button onClick={()=>console.log(fullTab)}></button> */}
        {
        tabItem==='configuration'? configuration():tabItem==='home'? home():tabItem==='institutions'? institutions():tabItem==='spellers'? spellers():tabItem==='judges'? judges():tabItem==='tabMasters'? tabMasters():tabItem==='rooms'? rooms():tabItem==='rounds'? rounds():tabItem==='words'? words():tabItem==='draws'? draws():tabItem==='results'? results():''
        }
    </>:!pageLoad.loading && access==='judge'?
    <SpellingJudgeTab tab={tab} event={event} accessOptions={accessOptions} onAccessChange={setAccess}/>:!pageLoad.loading && access==='public'?
    <SpellingBeePublicTab tab={tab} event={event}/>:<Loading/>
  )
}
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { GiMicrophone} from "react-icons/gi";
import { IoClose } from "react-icons/io5";
import axios from "axios";
import { AuthContext } from "../../../../Context/AuthContext";
import { RiDeleteBin6Fill} from 'react-icons/ri';
import { FaAngleDoubleUp } from 'react-icons/fa';
import Dropdown from "../../../../Components/Dropdown";
import Loading from "../../../../Components/Loading";
import ToggleButton from "../../../../Components/ToggleButton";
import Cell from "../../../../Components/Cell";
import Toast from "../../../../Components/Toast";
import { currentServer } from "../../../../Context/urls";
import Input from "../../../../Components/Input";
import ExcelReader from "../../../../Components/ExcelReader";

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
  const [tabItem, setTabItem] = useState("Configuration");
  const [regItem, setRegItem] = useState("Institutions");
  const [pageLoad, setPageLoad] = useState({ loading: true, adminAuthorized: false, judgeAuthorized: false });
  const [fullTab, setFullTab] = useState(null);
  const [configForm, setConfigForm] = useState({ title: "", slug: "", minScore: 30, maxScore: 90, completed: false, cups: [] });
  const newItems={
    institutionForm:{institutions:[{ id: null, name: "", code: "" }]},
    speakerForm:{speakers:[{ id: null, name: "", institutionId: 0, email: "", available: true}]},
    judgeForm:{judges:[{ id: null, name: "", institutionId: 0, email: "", available: true}]},
    institution:{id: null, name: "", code: ""}, 
    tabMaster:{id: null, name: "", email: ""}, 
    speaker:{id: null, name: "", institutionId: 0, email: "", available: true},
    judge:{id: null, name: "", institutionId: 0, email: "", available: true},
    room:{id: null, name: "", available: true}, 
    round:{id: null, name: "", number: "", speechDuration: "", breaks: false, blind: false, completed: false, breakCategory: "", breakPhase: ""}, 
    prompt:{id: null, roundId: "", speechPrompt: "", speechType: "narrative", visible: false}, 
    draw:{roundId: "", powerPair: true, breakRoundId: "", preview: null},
    drawUpdate: {roundId:0, room1:0, room2:0, swapState:0, judge1:0, judge2:0, speaker1:0, speaker2:0},
    result:{roundId: "", roomId: "", draft: null}
  };
  const [institutionForm, setInstitutionForm] = useState({...newItems.institutionForm});
  const [newInst, setNewInst]=useState({...newItems.institution});
  const [tabMasterForm, setTabMasterForm] = useState({ id: null, name: "", email: "" });
  const [speakerForm, setSpeakerForm] = useState({...newItems.speakerForm});
  const [newSpeaker, setNewSpeaker]= useState({...newItems.speaker});
  const [judgeForm, setJudgeForm] = useState({...newItems.judgeForm});
  const [newJudge, setNewJudge]= useState({...newItems.judge});
  const [roomForm, setRoomForm] = useState({ id: null, name: "", available: true });
  const [roundForm, setRoundForm] = useState({ id: null, name: "", number: "", speechDuration: "", breaks: false, blind: false, completed: false, breakCategory: "", breakPhase: "" });
  const [promptForm, setPromptForm] = useState({ id: null, roundId: "", speechPrompt: "", speechType: "narrative", visible: false });
  const [drawForm, setDrawForm] = useState({ roundId: "", powerPair: true, breakRoundId: "", preview: null });
  const [drawUpdateForm, setDrawUpdateForm]= useState({roundId:0,room1:0, room2:0, swapState:0, judge1:0, judge2:0, speaker1:0, speaker2:0})
  const [resultForm, setResultForm] = useState({ roundId: "", roomId: "", draft: null });
  const [toasts, setToasts]=useState([]);
  const [sortStates, setSortStates]=useState({institutions:{column:'name', state:true}, tabMasters:{column:'name', state:true}, judges:{column:'name', state:true}, speakers:{column:'name', state:true}, rooms:{column:'name', state:true}, rounds:{column:'number', state:true}, prompts:{column:'round', state:true}});
    // state true for ascending, false for desc
  const [importedData, setImportedData]=useState({institutions:null, speakers:null, judges:null})
  const dialogRef=useRef(null);
  const tabRef=useRef(null);
  const [drawView, setDrawView]=useState('prelim');
  const drawViews=['prelim', 'breaks'];
  const [form, setForm]=useState(null);
  

  async function getFullTab() {
    try {
      const res = await axios.get(`${currentServer}/ps/tab/${tab.tabId}`);
      tabRef.current = res.data?.data ?? null;
      setFullTab(tabRef.current);
      setConfigForm({
        title: tabRef.current.title,
        slug: tabRef.current.slug,
        minScore: tabRef.current.minScore,
        maxScore: tabRef.current.maxScore,
        completed: tabRef.current.completed,
        cups: tabRef.current.cups ?? [],
      });
      const isOwner = !!user && user.id === event?.ownerId;
      const isTabMaster = !!user && (tabRef.current?.tabMasters ?? []).some((entry) => entry.email === user.email);
      const isJudge = !!user && (tabRef.current?.judges ?? []).some((entry) => entry.email === user.email);
      const adminAuthorized = isOwner || isTabMaster;
      setPageLoad({ loading: false, adminAuthorized, judgeAuthorized: isJudge });
      if (!adminAuthorized && access === "admin") setAccess("public");
    } 
    catch (error) {
      console.error(error);
      setPageLoad({ loading: false, adminAuthorized: false, judgeAuthorized: false });
    }
  }

  useEffect(() => {
    getFullTab();
  }, []);

  useEffect(()=>{
    function closeDialog(e){
      if(dialogRef.current && !dialogRef.current.contains(e.target)){
          setForm(null);
      }
    }
    document.addEventListener('mousedown', closeDialog);
    document.addEventListener('touchstart', closeDialog);
    return()=>{
      document.removeEventListener('mousedown', closeDialog);
      document.removeEventListener('touchstart', closeDialog);
    }
    },[]);

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

  async function updateEntity(endpoint, form, resetForm){
    try {
      const res =await axios.put(`${currentServer}/ps/${endpoint}`, { ...form, tabId: tab.tabId });
      setToast("success", res.data?.message ?? "Saved");
      resetForm();
      await getFullTab();
      setForm(null);
    } 
    catch (error) {
      setToast("error", error?.response?.data?.message ?? "Failed to save");
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
      setForm(null);
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
      setForm(null);
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
      setForm(null);
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
      setForm(null);
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
      setForm(null);
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
  function showForm(){
    const sortedRounds=fullTab?.rounds|| [];
    const sortedInstitutions=fullTab?.institutions||[];
    const selectedRound= sortedRounds.find(r=> r.roundId===resultForm.roundId)?.name || '';
    const incompleteRounds=fullTab.rounds.filter(r=> r.completed===false) || [];
    switch(form){
      case null: 
        return;
      case 'institution':
        return(
          <dialog ref={dialogRef}>
            <form onSubmit={(e) => { e.preventDefault(); updateEntity("institution", institutionForm, () => setInstitutionForm(newItems.institutionForm)); }}>
            <p><strong>Update Institutions</strong></p>
            <div style={{gridTemplateColumns: 'auto 1fr'}}>
              <strong style={{textAlign:'left', paddingLeft:'1rem'}}>Name</strong>
              <strong style={{textAlign:'right', paddingRight:'1rem'}}>Code</strong>
            </div>            
            {institutionForm.institutions?.map((s,i)=>
            <div key={i} style={{gridTemplateColumns: '1fr 0.3fr'}}>
              <Input placeholder="Institution Name" value={s.name} onChange={(e) => setInstitutionForm((p) =>{
                let institutions2=p.institutions;
                institutions2[i].name=e.target.value;
                return {...p, institutions: institutions2 }
              })}  />
              <Input placeholder="Code" value={s.code} onChange={(e) => setInstitutionForm((p) =>{
                let institutions2=p.institutions;
                institutions2[i].code=e.target.value;
                return {...p, institutions: institutions2}
              })}  />
            </div>)}<div style={{display: 'flex', width:'100%', alignItems:'center', }}>
              <Input type='text' placeholder="Name" style={{flexGrow:'1'}} value={newInst.name} onChange={(e)=>setNewInst((p)=>({...p, name: e.target.value}))}/>
              <Input type='text' placeholder="Code" style={{flexGrow:'1'}} value={newInst.code} onChange={(e)=>setNewInst((p)=>({...p, code: e.target.value}))}/>              
              <button type="button"  className="darkButton" onClick={()=>{setInstitutionForm(p=>({...p,institutions: [...p.institutions, newInst]})); setNewInst({...newItems.institution})}}>+</button>
            </div>
            <div className="importXCL">
              <ExcelReader setData={(n)=>setImportedData(p=>({...p, institutions: n}))} data={importedData.institutions} headers={['name','code']} sheet='institutions'/>
              <button type="button" className="darkButton" disabled={importedData.institutions===null} onClick={()=>setInstitutionForm(p=>{
                let reg= importedData.institutions?.map(d=>({name: d.name, code: d.code, id: null})) || [];
                let reg2= [...p.institutions, ...reg];
                return {...p, institutions: reg2}
              })}>Import</button>
            </div>        
            <button className="darkButton">Update Institutions</button>
            <button type="button" className="darkButton" onClick={()=>{setForm(null)}}>Cancel</button>
          </form>
          </dialog>
        )
      case 'speaker':
        return(
          <dialog ref={dialogRef}>
            <form onSubmit={(e) => { e.preventDefault(); updateEntity("speaker", speakerForm, () => setSpeakerForm(newItems.speakerForm)); }}>
            <p><strong>Update Speakers</strong></p>
            <div style={{gridTemplateColumns: '1fr 1fr 1fr 0.5fr'}}>
              <strong>Name</strong>
              <strong>Email</strong>
              <strong>Institution</strong>
              <strong>Available</strong>
            </div>          
            {speakerForm.speakers?.map((s,i)=>
            <div key={i} style={{gridTemplateColumns: '1fr 1fr 1fr 0.5fr'}}>
              <Input placeholder="Name" required value={s.name} onChange={(e) => setSpeakerForm((p) =>{
                let speakers2=p.speakers;
                speakers2[i].name=e.target.value;
                return {...p, speakers: speakers2 }
              })}  />
              <Input placeholder="Email" type='email' value={s.email} onChange={(e) => setSpeakerForm((p) =>{
                let speakers2=p.speakers;
                speakers2[i].email=e.target.value;
                return {...p, speakers: speakers2}
              })}/>
              <select name="institution" required value={s.institutionId} onChange={(e) => setSpeakerForm((p) =>{
                let speakers2=p.speakers;
                speakers2[i].institutionId= parseInt(e.target.value);
                return {...p, speakers: speakers2}
              })}>
                <option value="">Select Institution</option>
                {sortedInstitutions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <ToggleButton state={s.available} setState={() => setSpeakerForm(prev => ({
                ...prev,
                speakers: prev.speakers.map((sp, idx) => idx === i ? { ...sp, available: !sp.available } : sp)
              }))} />
            </div>)}

            <div style={{display: 'flex', width:'100%', alignItems:'center', }}>
              <Input type='text' placeholder="Name" style={{flexGrow:'1'}} value={newSpeaker.name} onChange={(e)=>setNewSpeaker((p)=>({...p, name: e.target.value}))}/>
              <Input type='text' placeholder="Email" style={{flexGrow:'1'}} value={newSpeaker.email} onChange={(e)=>setNewSpeaker((p)=>({...p, email: e.target.value}))}/>
              <select name="institution" value={newSpeaker.institutionId} onChange={(e) => setNewSpeaker((p)=>({...p, institutionId: parseInt(e.target.value)}))}>
                <option value="">Select Institution</option>
                {sortedInstitutions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <label>Available? <ToggleButton state={newSpeaker.available} setState={() => setNewSpeaker(prev => ({ ...prev, available: !prev.available }))}/></label>              
              <button type="button"  className="darkButton" onClick={()=>{setSpeakerForm(p=>({...p,speakers: [...p.speakers, newSpeaker]})); setNewSpeaker({...newItems.speaker})}}>+</button>
            </div>
            <div className="importXCL">
              <ExcelReader setData={(n)=>setImportedData(p=>({...p, speakers: n}))} data={importedData.speakers} headers={['name','email','institution']} sheet='speakers'/>
              <button type="button" className="darkButton" disabled={importedData.speakers===null} onClick={()=>{setSpeakerForm(p=>{
                let reg= importedData.speakers?.map(d=>{
                  let institutionId= sortedInstitutions.find(i=>i.name===d.institution)?.id;
                  return {id: null, name: d.name, email: d.email, institutionId: institutionId, available: true}
                }) || [];
                let reg2= [...p.speakers, ...reg];
                return {...p, speakers: reg2}
              });
              setImportedData(p=>({...p, speakers: null}));
              }}>Import</button>
            </div>        
            <button className="darkButton">Update Speakers</button>
            <button type="button" className="darkButton" onClick={()=>{setForm(null)}}>Cancel</button>
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
            <button className="darkButton">{tabMasterForm.id ? "Update" : "Add"} Tab Master</button>
            <button type="button" className="darkButton" onClick={()=>setForm(null)}>Cancel</button>
          </form>
          </dialog>
        )
      case 'judge':
        return(
          <dialog ref={dialogRef}>
            <form onSubmit={(e) => { e.preventDefault(); updateEntity("judge", judgeForm, () => setJudgeForm(newItems.judgeForm)); }}>
            <p><strong>Update Judges</strong></p>
            <div style={{gridTemplateColumns: '1fr 1fr 1fr 0.5fr'}}>
              <strong>Name</strong>
              <strong>Email</strong>
              <strong>Institution</strong>
              <strong>Available</strong>
            </div>          
            {judgeForm.judges?.map((s,i)=>
            <div key={i} style={{gridTemplateColumns: '1fr 1fr 1fr 0.5fr'}}>
              <Input placeholder="Name" required value={s.name} onChange={(e) => setJudgeForm((p) =>{
                let judges2=p.judges;
                judges2[i].name=e.target.value;
                return {...p, judges: judges2 }
              })}  />
              <Input placeholder="Email" type='email' value={s.email} onChange={(e) => setJudgeForm((p) =>{
                let judges2=p.judges;
                judges2[i].email=e.target.value;
                return {...p, judges: judges2}
              })}/>
              <select name="institution" required value={s.institutionId} onChange={(e) => setJudgeForm((p) =>{
                let judges2=p.judges;
                judges2[i].institutionId= parseInt(e.target.value);
                return {...p, judges: judges2}
              })}>
                <option value="">Select Institution</option>
                {sortedInstitutions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <ToggleButton state={s.available} setState={() => setJudgeForm(prev => ({
                ...prev,
                judges: prev.judges.map((j, idx) => idx === i ? { ...j, available: !j.available } : j)
              }))} />
            </div>)}

            <div style={{display: 'flex', width:'100%', alignItems:'center', }}>
              <Input type='text' placeholder="Name" style={{flexGrow:'1'}} value={newJudge.name} onChange={(e)=>setNewJudge((p)=>({...p, name: e.target.value}))}/>
              <Input type='text' placeholder="Email" style={{flexGrow:'1'}} value={newJudge.email} onChange={(e)=>setNewJudge((p)=>({...p, email: e.target.value}))}/>
              <select name="institution" value={newJudge.institutionId} onChange={(e) => setNewJudge((p)=>({...p, institutionId: parseInt(e.target.value)}))}>
                <option value="">Select Institution</option>
                {sortedInstitutions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <label>Available? <ToggleButton state={newJudge.available} setState={() => setNewJudge(prev => ({ ...prev, available: !prev.available }))}/></label>              
              <button type="button"  className="darkButton" onClick={()=>{setJudgeForm(p=>({...p,judges: [...p.judges, newJudge]})); setNewJudge({...newItems.judge})}}>+</button>
            </div>
            <div className="importXCL">
              <ExcelReader setData={(n)=>setImportedData(p=>({...p, judges: n}))} data={importedData.judges} headers={['name','email','institution']} sheet='judges'/>
              <button type="button" className="darkButton" disabled={importedData.judges===null} onClick={()=>{setJudgeForm(p=>{
                let reg= importedData.judges?.map(d=>{
                  let institutionId= sortedInstitutions.find(i=>i.name===d.institution)?.id;
                  return {id: null, name: d.name, email: d.email, institutionId: institutionId, available: true}
                }) || [];
                let reg2= [...p.judges, ...reg];
                return {...p, judges: reg2}
              });
              setImportedData(p=>({...p, judges: null}));
              }}>Import</button>
            </div>        
            <button className="darkButton">Update Judges</button>
            {/* <button type="button" className="darkButton" onClick={()=>{console.log(judgeForm)}}>test</button> */}
            <button type="button" className="darkButton" onClick={()=>{setForm(null)}}>Cancel</button>
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
            <button type="button" className="darkButton" onClick={()=>setForm(null)}>Cancel</button>
          </form>
          </dialog>
        )
      case 'round':
        return(
          <dialog ref={dialogRef}>
            <form onSubmit={(e) => { e.preventDefault(); submitEntity("round", roundForm, () => setRoundForm({ id: null, name: "", number: "", speechDuration: "", breaks: false, blind: false, completed: false, breakCategory: "", breakPhase: "" })); }}>
            <h2>Rounds</h2>
            <Input placeholder="Name" value={roundForm.name} onChange={(e) => setRoundForm((prev) => ({ ...prev, name: e.target.value }))} />
            <Input placeholder="Number" type="number" value={roundForm.number} onChange={(e) => setRoundForm((prev) => ({ ...prev, number: e.target.value }))} />
            <Input placeholder="Speech Duration (min)" type="number" value={roundForm.speechDuration} min={1} onChange={(e) => setRoundForm((prev) => ({ ...prev, speechDuration: e.target.value }))} />
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>Blind <ToggleButton state={roundForm.blind} setState={() => setRoundForm((prev) => ({ ...prev, blind: !prev.blind }))} /></label>
            {roundForm.id &&<label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>Completed <ToggleButton state={roundForm.completed} setState={() => setRoundForm((prev) => ({ ...prev, completed: !prev.completed }))} /></label>}
            <button className="darkButton">{roundForm.id ? "Update" : "Add Prelim"} Round</button>
            <button type="button" className="darkButton" onClick={()=>setForm(null)}>Cancel</button>
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
            <Input placeholder="Speech Prompt" value={promptForm.speechPrompt} onChange={(e) => setPromptForm((prev) => ({ ...prev, speechPrompt: e.target.value }))} />
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>Visible <ToggleButton state={promptForm.visible} setState={() => setPromptForm((prev) => ({ ...prev, visible: !prev.visible }))} /></label>
            <button className="darkButton">{promptForm.id ? "Update" : "Add"} Prompt</button>
            <button type="button" className="darkButton" onClick={()=>setForm(null)}>Cancel</button>
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
              <button type="button" className="darkButton" onClick={()=>setForm(null)}>Cancel</button>
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
              <button type="button" className="darkButton" onClick={()=>setForm(null)}>Cancel</button>
            </form>
          </dialog>
        )
      case 'updateDraw':
        return(
          <dialog ref={dialogRef}>
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
              <button type="button" className="darkButton" onClick={()=>setForm(null)}>Cancel</button>
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
                    {resultForm.draft.speakers.map((speaker) => (
                      <li key={speaker.id} style={{ gridTemplateColumns: "1fr 0.5fr 0.5fr 0.5fr", gap: "0.5rem" }}>
                        <span>{speaker.name}</span>
                        <span>{fullTab?.institutions?.find((entry) => entry.id === speaker.institutionId)?.code ?? "-"}</span>
                        <Cell value={speaker.result?.score ?? fullTab.minScore} min={fullTab.minScore} max={fullTab.maxScore} onChange={(score) => updateResultDraft(speaker.id, { score })} />
                        {sortedRounds.find((round) => round.roundId === Number(resultForm.roundId))?.breaks &&(
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
              <button type="button" className="darkButton" onClick={()=>setForm(null)}>Cancel</button>
            </form>
          </dialog>
        )
      default: console.log('No form to show');
    }
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
            <div key={cup.id ?? `cup-${index}`} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(90px,1fr))", gap: "0.5rem", placeItems:'center' }}>
              <Input value={cup.cupCategory} placeholder="Cup Name" onChange={(e) => setConfigForm((prev) => ({ ...prev, cups: prev.cups.map((item, itemIdx) => itemIdx === index ? { ...item, cupCategory: e.target.value } : item) }))} />
              <Input type="number" value={cup.cupOrder} placeholder="Cup Order" onChange={(e) => setConfigForm((prev) => ({ ...prev, cups: prev.cups.map((item, itemIdx) => itemIdx === index ? { ...item, cupOrder: Number(e.target.value) } : item) }))} />
              <Input type="number" value={cup.breakNumber} placeholder="Break rounds" onChange={(e) => setConfigForm((prev) => ({ ...prev, cups: prev.cups.map((item, itemIdx) => itemIdx === index ? { ...item, breakNumber: Number(e.target.value) } : item) }))} />
              <Input type="number" value={cup.breakCapacity} placeholder="Min Speakers per break Room" onChange={(e) => setConfigForm((prev) => ({ ...prev, cups: prev.cups.map((item, itemIdx) => itemIdx === index ? { ...item, breakCapacity: Number(e.target.value) } : item) }))} />
              <RiDeleteBin6Fill onClick={() => setConfigForm((prev) => ({ ...prev, cups: prev.cups.filter((_, itemIdx) => itemIdx !== index) }))}/>
            </div>
          ))}
          <button type="button" className="lightButton" onClick={() => setConfigForm((prev) => ({ ...prev, cups: [...prev.cups, { cupCategory: "", cupOrder: '', breakNumber: '', breakCapacity: '' }] }))}>Add Cup</button>
          <button className="darkButton">Save Configuration</button>
        </form>
      )
  }
  function registration(){
    return(
      <>
      <div className="buttonStack" style={{width:'98%'}}>
        {["Institutions", "Tab", "Speakers", "Judges", "Rooms", "Rounds", "Prompts"].map((t,i)=>
        <button className={regItem===t? 'lightButton': 'darkButton'} onClick={()=>setRegItem(t)} key={i}>{t}</button>)}
      </div>
      {regItem === "Institutions" && institutions()}
      {regItem === "Tab" && tabMasters()}
      {regItem === "Speakers" && speakers()}
      {regItem === "Judges" && judges()}
      {regItem === "Rooms" && rooms()}
      {regItem === "Rounds" && rounds()}
      {regItem === "Prompts" && prompts()}   
      </>
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
            <button className="darkButton" onClick={()=>{setInstitutionForm({institutions: tabRef.current.institutions});setForm('institution');}}>Add/Update Institutions</button>
            {sortedInstitutions.length>0?
                    <div className="tableScroll">
                    <table>
                      <thead>
                        <tr style={{gridTemplateColumns:'2fr 1fr 1fr 1fr'}}>
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
                        <tr key={i} style={{gridTemplateColumns:'2fr 1fr 1fr 1fr'}}>
                          <td>{p.name}</td>
                          <td>{p.code}</td>
                          <td>{p.speakers}</td>
                          <td style={{display: 'grid', gridAutoFlow:'column', gridAutoColumns:'1rem', justifySelf:'center', gap:'1rem'}}><FaAngleDoubleUp fill="teal" onClick={()=>{setForm('institution'); setInstitutionForm(f=>({...f,institutions:[p]}));}}/><RiDeleteBin6Fill fill="red" onClick={()=>{deleteEntity("institution", { id: p.id })}}/></td>
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
        email: (item) => item.email,
        });
    return(
        <>
          <section id="tabMasters">
            <h2>Registered Tab Masters ({sortedTabMasters.length})</h2>
            <button className="darkButton" onClick={()=>{setTabMasterForm({...newItems.tabMaster});setForm('tabMaster')}}>Add Tab Master</button>
        {fullTab.tabMasters?.length>0?
        <div className="tableScroll"><table>
          <thead>
            <tr style={{gridTemplateColumns:'1fr 1fr 1fr'}}>
              <th>Name <button type="button" className="sortToggle" onClick={() => toggleSort("tabMasters", "name")}>
                {sortStates.tabMasters.column === "name" && sortStates.tabMasters.state === true ? '\u2b9d' : '\u2b9f'}
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
              <td>{p.email}</td>
              <td style={{display: 'grid', gridAutoFlow:'column', gridAutoColumns:'1rem', justifySelf:'center', gap:'1rem'}}><FaAngleDoubleUp fill="teal" onClick={()=>{setForm('tabMaster'); setTabMasterForm(p)}}/><RiDeleteBin6Fill fill="red" onClick={()=>{deleteEntity("tabMaster", { id: p.id })}}/></td>
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
            <button className="darkButton" onClick={()=>{setJudgeForm({judges: tabRef.current.judges});setForm('judge')}}>Add/Update Judges</button>
        {fullTab.judges?.length>0?
        <div className="tableScroll"><table>
          <thead>
            <tr style={{gridTemplateColumns:'1fr 1fr 1fr 0.7fr 0.5fr'}}>
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
            <tr key={i} style={{gridTemplateColumns:'1fr 1fr 1fr 0.7fr 0.5fr'}}>
              <td>{p.name}</td>
              <td>{fullTab.institutions.find((inst)=>inst.id===p.institutionId)?.name || '-'}</td>
              <td>{p.email}</td>
              <td>{p.available? '\u2714': '\u2718'}</td>
              <td style={{display: 'grid', gridAutoFlow:'column', gridAutoColumns:'1rem', justifySelf:'center', gap:'1rem'}}><FaAngleDoubleUp fill="teal" onClick={()=>{setForm('judge'); setJudgeForm(f=>({...f, judges:[p]}))}}/><RiDeleteBin6Fill fill="red" onClick={()=>{deleteEntity("judge", { id: p.id })}}/></td>
            </tr>)}
          </tbody>
        </table></div>:<p>No Registered Judges</p>}
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
            <button className="darkButton" onClick={()=>{setSpeakerForm({speakers: tabRef.current.speakers});setForm('speaker')}}>Add/Update Speakers</button>
        {sortedSpeakers.length>0?
        <div className="tableScroll">
        <table>
          <thead>
            <tr style={{gridTemplateColumns:'1fr 1fr 0.8fr 0.5fr'}}>
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
            <tr key={i} style={{gridTemplateColumns:'1fr 1fr 0.8fr 0.5fr'}}>
              <td>{p.name}</td>
              <td>{fullTab.institutions.find((i)=>i.id===p.institutionId).name}</td>
              <td>{p.available? '\u2714': '\u2718'}</td>
              <td style={{display: 'grid', gridAutoFlow:'column', gridAutoColumns:'1rem', justifySelf:'center', gap:'1rem'}}><FaAngleDoubleUp fill="teal" onClick={()=>{setForm('speaker'); setSpeakerForm(f=>({...f,speakers:[p]}));}}/><RiDeleteBin6Fill fill="red" onClick={()=>{deleteEntity("speaker", { id: p.id })}}/></td>
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
            <button className="darkButton" onClick={()=>{setForm('room');setRoomForm({...newItems.room});}}>Add Room</button>
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
                  <td style={{display: 'grid', gridAutoFlow:'column', gridAutoColumns:'1rem', justifySelf:'center', gap:'1rem'}}><FaAngleDoubleUp fill="teal" onClick={()=>{setForm('room'); setRoomForm(p)}}/><RiDeleteBin6Fill fill="red" onClick={()=>{deleteEntity("room", { id: p.id })}}/></td>
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
            <button className="darkButton" onClick={()=>{setForm('round');setRoundForm({...newItems.round});}}>Add Preliminary Round</button>
            {sortedRounds.length>0?
            <div className="tableScroll"><table>
              <thead>
                <tr style={{gridTemplateColumns:'0.7fr 1fr 0.5fr 0.8fr 1fr 0.8fr 0.5fr'}}>
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
                <tr key={i} style={{gridTemplateColumns:'0.7fr 1fr 0.5fr 0.8fr 1fr 0.8fr 0.5fr'}}>
                  <td>{p.number}</td>
                  <td>{ p.name}</td>
                  <td>{p.speechDuration} min</td>
                  <td>{p.breaks ? 'Yes' : 'No'}</td>
                  <td>{p.completed ? '\u2714' : '\u2718'}</td>
                  <td>{p.blind ? '\u2714' : '\u2718'}</td>
                  <td style={{display: 'grid', gridAutoFlow:'column', gridAutoColumns:'1rem', justifySelf:'center', gap:'1rem'}}><FaAngleDoubleUp fill="teal" onClick={()=>{setForm('round'); setRoundForm({...p, id:p.roundId,breakCategory: p.cupCategoryId ?? "", breakPhase: p.breakPhase ?? ""});}}/><RiDeleteBin6Fill fill="red" onClick={()=>{deleteEntity("round", { id: p.roundId })}}/></td>
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
            <button className="darkButton" onClick={()=>{setForm('prompt');setPromptForm({...newItems.prompt});}}>Add Speech Prompt</button>
            {sortedPrompts.length>0?
            <div className="tableScroll"><table>
              <thead>
                <tr style={{gridTemplateColumns:'0.5fr 1fr 0.5fr 0.5fr 0.5fr'}}>
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
                <tr key={i} style={{gridTemplateColumns:'0.5fr 1fr 0.5fr 0.5fr 0.5fr'}}>
                  <td>{fullTab.rounds.find((i)=>i.roundId===p.roundId).name}</td>
                  <td style={{maxWidth:'250px'}}>{ p.speechPrompt}</td>
                  <td>{p.speechType}</td>
                  <td>{p.visible ? '\u2714' : '\u2718'}</td>
                  <td style={{display: 'grid', gridAutoFlow:'column', gridAutoColumns:'1rem', justifySelf:'center', gap:'1rem'}}><FaAngleDoubleUp fill="teal" onClick={()=>{setForm('prompt'); setPromptForm({...p});}}/><RiDeleteBin6Fill fill="red" onClick={()=>{deleteEntity("prompt", { id: p.id })}}/></td>
                </tr>)}
              </tbody>
            </table></div>:<p>No Registered Rounds</p> }

          </section>
        </>
      )
  }
  function renderDrawCards(rounds, emptyMessage, breaks){
  return rounds.length>0
  ? 
  rounds.map((round)=> {
      const roundDraws = fullTab.draws?.filter((draw)=>draw.roundId===round.roundId) || [];
      return (
          <div key={round.roundId} style={{display:'grid', gap:'0.5rem', margin:'0.5rem', borderRadius:'1rem', padding:'0.5rem'}}>
          <h3 style={{marginBottom:0}}>{round.name}</h3>
          {!roundDraws.length
              ? <p style={{margin:0}}>{emptyMessage} <br />
              <button className="darkButton" onClick={()=>{breaks? setForm('previewBreaks') : setForm('generateDraw');setDrawForm({...round, breakRoundId: round.roundId});}}>Draw Round</button>
              </p>              
              :
              <div style={{display: 'flex', flexDirection:'column', alignItems:'center', gap:'0.5rem'}}>
                <div style={{display: 'grid', gridAutoFlow:'column', gap:'0.5rem'}}>
                  <button className="darkButton" onClick={()=>{round.breaks? setForm('previewBreaks'): setForm('generateDraw'); setDrawForm({...round, id: round.roundId, breakRoundId: round.roundId});}}>Redraw </button>
                  <button disabled={round.completed} className="darkButton" onClick={()=>{setForm('updateDraw');setDrawUpdateForm({...round});}}>Update </button>
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
            {renderDrawCards(preliminaryRounds,'Draw for this prelim round is not out yet', false)}
          </section>
        }
        {drawView==='breaks' &&
          <section id="breaks">
            <h2>Preliminary Draws</h2>
            {renderDrawCards(breakRounds,'Draw for this break round is not out yet', true)}
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
            <select value={resultForm.roundId} onChange={(e) =>setResultForm((prev) => ({ ...prev, roundId: Number(e.target.value), roomId: "", draft: null }))}>
              <option value="">Select Round</option>
              {sortedRounds.map((item) => <option key={item.roundId} value={item.roundId}>{item.name}</option>)}
            </select>
            {/* <button onClick={()=>console.log(fullTab)}></button> */}
            {fullTab.draws.find((a)=>a.roundId===resultForm.roundId)?
              fullTab.draws.filter((a)=>a.roundId===resultForm.roundId).map((r,n)=>
              <div className="roomCard" key={n}>
                  <div className="roomHeader">
                      <h2 style={{margin:0}}>{r.room.name}<FaAngleDoubleUp fill="teal" onClick={()=>{setForm('results'); setResultForm((prev)=>({ ...prev, roomId: r.room.id }))}}/></h2>
                      <div style={{margin:0}}><strong>Judge(s): </strong><span style={{margin:0}}>{r.judges.map((j, x)=><span key={x}>{j.name}, </span>)      
                      }</span><p style={{display:'grid',gridTemplateColumns:'1fr 0.5fr 0.5fr', textAlign:'start', gap:'0.5rem', marginTop:"0.3rem",marginBottom:'0.3rem',}}><span>Speaker</span><span>School</span><span>Result</span></p></div>
                  </div>
                  <div className="roomBody" style={{width:'auto'}}>
                      {(r.speakers ?? []).map((s,y)=>
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

  if (pageLoad.loading || access !== "admin") return <Loading />;

  return (
    <>
      <div className="tabMenu">
        <ul>
          <Dropdown options={accessOptions} setValue={setAccess} selectedIdx={Math.max(0, accessOptions.findIndex((option) => option.value === "admin"))} />
        </ul>
      </div>
      <div style={{display: 'flex', gap:'0.5rem', justifyContent:'center',justifySelf:'center', flexWrap:'wrap', margin:'0 0 0.5rem 0'}}>
        {["Configuration", "Registrations", "Draws", "Results"].map((t,i)=>
        <button className={tabItem===t? 'lightButton': 'darkButton'} onClick={()=>setTabItem(t)} key={i}>{t}</button>)}
      </div>
      <Toast toasts={toasts} setToasts={setToasts}/>
      {tabItem === "Configuration" && configuration()}
      {tabItem === "Registrations" && registration()}
      {tabItem === "Draws" && draws()}
      {tabItem === "Results" && results()}
      {showForm()}
    </>
  );
}

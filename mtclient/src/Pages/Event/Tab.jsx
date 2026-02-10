import { useContext } from "react";
import { AuthContext } from "../../Context/AuthContext";
import SpellingBeeTab from "./Tabs/SpellingBeeTab";
import BPDebateTab from "./Tabs/BPDebateTab";
import ChessEliminator from "./Tabs/ChessEliminator";
import ChessSwiss from "./Tabs/ChessSwiss";
import PublicSpeakingTab from "./Tabs/PublicSpeakingTab";
import WSDCTab from "./Tabs/WSDCTab";

export default function Tab() {
  const {tab}=useContext(AuthContext);
  return (
    <>
    {tab?
    <>
    {tab.track==='BP'? <BPDebateTab tab={tab}/>:tab.track==='WSDC'? <WSDCTab tab={tab}/>:tab.track==='PS'?<PublicSpeakingTab tab={tab}/>:tab.track==='Spelling Bee'? <SpellingBeeTab tab={tab}/>:tab.track==='Chess Eliminator'?<ChessEliminator tab={tab}/>: <ChessSwiss tab={tab}/>}
    </>
    :
    <>
    <p>No Tab Selected</p>
    </>
    }    
    </>
  )
}

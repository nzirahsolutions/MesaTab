import SpellingBeePublicTab from "./Tabs/Spelling Bee/SpellingBeePublicTab";
import BPDebatePublicTab from "./Tabs/BP Debate/BPDebatePublicTab";
import ChessPublicTab from "./Tabs/Chess/ChessPublicTab";
import PublicSpeakingPublicTab from "./Tabs/Public Speaking/PublicSpeakingTab";
import WSDCPublicTab from "./Tabs/WSDC Debate/WSDCPublicTab";
import {useParams} from 'react-router-dom';
import axios from 'axios';
import { currentServer } from "../../Context/urls";
import { AuthContext } from "../../Context/AuthContext";
import { useEffect, useContext, useState } from "react";
import Loading from "../../Components/Loading";
import { useNavigate } from "react-router-dom";

export default function Tab() {
  const {tab, eventUrl}= useParams();
  const {user}=useContext(AuthContext);
  const [tabDetails, setTabDetails]=useState({event:{}, tab:null});
  const [pageLoad, setPageLoad]= useState(true);
  const navigate=useNavigate();

  async function getTab(){
    try {
    const res=await axios.get(`${currentServer}/event/${eventUrl}/${tab}`);
    setTabDetails({...tabDetails, event: res.data.data.event, tab: res.data.data.tab}); 
    setPageLoad(false);  
    }
    catch (error) {
    console.log(error);
    navigate(`/${eventUrl}`);  
    } 
  }
  useEffect(()=>{
    getTab();
  },[user]);
  return (
    <>
    {!pageLoad && tabDetails.tab && tabDetails.event?
    <>
    {tabDetails.tab.track==='BP Debate'? <BPDebatePublicTab tab={tabDetails.tab} event={tabDetails.event}/>
    :tabDetails.tab.track==='WSDC Debate'? <WSDCPublicTab tab={tabDetails.tab} event={tabDetails.event}/>
    :tabDetails.tab.track==='Public Speaking'?<PublicSpeakingPublicTab tab={tabDetails.tab} event={tabDetails.event}/>
    :tabDetails.tab.track==='Spelling Bee'? <SpellingBeePublicTab tab={tabDetails.tab} event={tabDetails.event}/>
    :tabDetails.tab.track==='Chess'?<ChessPublicTab tab={tabDetails.tab} event={tabDetails.event}/>: ''}
    </>
    : <Loading/>
    }    
    </>
  )
}

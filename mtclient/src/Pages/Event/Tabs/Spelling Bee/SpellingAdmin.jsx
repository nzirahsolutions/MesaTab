import { useState, useContext, useEffect, useRef } from "react";
import {GiBee} from 'react-icons/gi';
import {IoClose} from 'react-icons/io5';
import {RiDeleteBin6Fill} from 'react-icons/ri';
import {FaAngleDoubleUp } from 'react-icons/fa';
import {AuthContext} from '../../../../Context/AuthContext';
import Dropdown from "../../../../Components/Dropdown";
import SpellingBeePublicTab from "./SpellingBeePublicTab";
import axios from 'axios';
import { currentServer } from "../../../../Context/urls";
import Loading from "../../../../Components/Loading";

export default function SpellingAdmin({tab, event}) {
  const [tabItem, setTabItem]=useState('home');
  const tabHistoryRef=useRef(false);
  const [menuOpen, setMenuOpen]=useState(false);
  const {user}= useContext(AuthContext);
  const [access, setAccess]=useState('admin');
  const [pageLoad, setPageLoad]=useState({loading: true, authorized:false});
  const [fullTab, setFulltab]=useState(null);

  const [navState, setNavState]=useState({institution:'review',tabMaster:'review',speller:'review',judge:'review',room:'review',round:'review',word:'review', draw:'review'});

  const [addItems, setAddItems]=useState({institution:{name:'', code:''}, tabMaster:{name:'',institutionId:'',email:''},speller:{name:'',institutionId:'',email:''},judge:{name:'',institutionId:'',email:''}, room:{name:''},round:{name:'', breaks:false, type:'Timed'}, word:{word:''}});

  const [updateItems, setUpdateItems]=useState({institution:{name:'', code:''},tabMaster:{name:'',institutionId:'',email:''},speller:{name:'',institutionId:'',email:''},judge:{name:'',institutionId:'',email:''}, room:{name:''},round:{name:'', breaks:false, type:'Timed'}, word:{word:''}});

  const [deleteItems, setDeleteItems]=useState({institution:{id:'', name:'', status:false},tabMaster:{id:0,name:'', status:false},speller:{id:0,name:'', status:false},judge:{id:0,name:'', status:false}, room:{id:'',name:'', status:false},round:{id:'',name:'', status:false}, word:{id:'',word:'', status:false}});

  const defaultItems={institution:{name:'', code:'', status:false},tabMaster:{name:'',institutionId:'',email:'', status:false},speller:{name:'',institutionId:'',email:'', status:false},judge:{name:'',institutionId:'',email:'', status:false}, room:{name:'', status:false},round:{name:'', breaks:false, type:'Timed', status:false}, word:{word:'', status:false}};

  const [institutionStates, setInstitutionStates]=useState({addSuccess:false, addError:false, addLoading:false, addErrorMessage:'Something went wrong', addSuccessMessage:'Institution Added',deleteSuccess:false, deleteError:false, deleteLoading:false, deleteErrorMessage:'Something went wrong', deleteSuccessMessage:'Institution Deleted',updateSuccess:false, updateError:false, updateLoading:false, updateErrorMessage:'Something went wrong', updateSuccessMessage:'Institution Updated'});

  const [spellerStates, setSpellerStates]=useState({addSuccess:false, addError:false, addLoading:false, addErrorMessage:'Something went wrong', addSuccessMessage:'Speller Added',deleteSuccess:false, deleteError:false, deleteLoading:false, deleteErrorMessage:'Something went wrong', deleteSuccessMessage:'Speller Deleted',updateSuccess:false, updateError:false, updateLoading:false, updateErrorMessage:'Something went wrong', updateSuccessMessage:'Speller Updated'});

  const [tabMasterStates, setTabMasterStates]=useState({addSuccess:false, addError:false, addLoading:false, addErrorMessage:'Something went wrong', addSuccessMessage:'Tab Master Added',deleteSuccess:false, deleteError:false, deleteLoading:false, deleteErrorMessage:'Something went wrong', deleteSuccessMessage:'Tab Master Deleted',updateSuccess:false, updateError:false, updateLoading:false, updateErrorMessage:'Something went wrong', updateSuccessMessage:'Tab Master Updated'});
  const [judgeStates, setJudgeStates]=useState({addSuccess:false, addError:false, addLoading:false, addErrorMessage:'Something went wrong', addSuccessMessage:'Judge Added',deleteSuccess:false, deleteError:false, deleteLoading:false, deleteErrorMessage:'Something went wrong', deleteSuccessMessage:'Judge Deleted',updateSuccess:false, updateError:false, updateLoading:false, updateErrorMessage:'Something went wrong', updateSuccessMessage:'Judge Updated'});
  const [roomStates, setRoomStates]=useState({addSuccess:false, addError:false, addLoading:false, addErrorMessage:'Something went wrong', addSuccessMessage:'Room Added',deleteSuccess:false, deleteError:false, deleteLoading:false, deleteErrorMessage:'Something went wrong', deleteSuccessMessage:'Room Deleted',updateSuccess:false, updateError:false, updateLoading:false, updateErrorMessage:'Something went wrong', updateSuccessMessage:'Room Updated'});
  const [roundStates, setRoundStates]=useState({addSuccess:false, addError:false, addLoading:false, addErrorMessage:'Something went wrong', addSuccessMessage:'Round Added',deleteSuccess:false, deleteError:false, deleteLoading:false, deleteErrorMessage:'Something went wrong', deleteSuccessMessage:'Round Deleted',updateSuccess:false, updateError:false, updateLoading:false, updateErrorMessage:'Something went wrong', updateSuccessMessage:'Round Updated'});
  const [wordStates, setWordStates]=useState({addSuccess:false, addError:false, addLoading:false, addErrorMessage:'Something went wrong', addSuccessMessage:'Word Added',deleteSuccess:false, deleteError:false, deleteLoading:false, deleteErrorMessage:'Something went wrong', deleteSuccessMessage:'Word Deleted',updateSuccess:false, updateError:false, updateLoading:false, updateErrorMessage:'Something went wrong', updateSuccessMessage:'Word Updated'});

  const roundTypes=['Timed','Word Limit','Eliminator'];

  async function getFullTab() {
    try {
        const res=await axios.get(`${currentServer}/sb/tab/${tab.tabId}`);
        // console.log(res.data.data);
        setFulltab({...res.data.data});       
    } 
    catch (error) {
        console.log(error);        
    }    
  }
  useEffect(() => {
    async function loadPage() {
      try {
        await getFullTab();
      } finally {
        const isOwner = !!user && user.id === event.ownerId;
        const isTabMaster =
          !!user &&
          Array.isArray(fullTab?.tabMasters) &&
          fullTab.tabMasters.some((e) => e.email === user.email);

        setPageLoad({ loading: false, authorized: isOwner || isTabMaster });
      }
    }

    loadPage();
  }, [tab.tabId, fullTab, event.ownerId, user]);
  
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

  function tabChange(t){
    setTabItem(t);
    setMenuOpen(false);
  }
  function institutionOnChange(e){
    setInstitutionStates({...institutionStates, addSuccess: false, addError: false, addLoading: false, deleteSuccess:false, deleteError: false, deleteLoading: false, updateSuccess: false, updateError: false, updateLoading: false});

    switch(navState.institution){
        case'add':
            setAddItems({...addItems, institution:{...addItems.institution,[e.target.name]:e.target.value}});
            break;
        case 'update':
            setUpdateItems({...updateItems, institution:{...updateItems.institution,[e.target.name]:e.target.value}});
            break;
        case 'delete':
            setDeleteItems({...deleteItems, institution:{...deleteItems.institution,[e.target.name]:e.target.checked}});
            break;
        default: console.log('No Change');
    }
    
  }
  function spellerOnChange(e){
    setSpellerStates({...spellerStates, addSuccess: false, addError: false, addLoading: false, deleteSuccess:false, deleteError: false, deleteLoading: false, updateSuccess: false, updateError: false, updateLoading: false});

    switch(navState.speller){
        case'add':
            setAddItems({...addItems, speller:{...addItems.speller,[e.target.name]:e.target.value}});
            break;
        case 'update':
            setUpdateItems({...updateItems, speller:{...updateItems.speller,[e.target.name]:e.target.value}});
            break;
        case 'delete':
            setDeleteItems({...deleteItems, speller:{...deleteItems.speller,[e.target.name]:e.target.checked}});
            break;
        default: console.log('No Change');
    }
  }
  function tabMasterOnChange(e){
    setTabMasterStates({...tabMasterStates, addSuccess: false, addError: false, addLoading: false, deleteSuccess:false, deleteError: false, deleteLoading: false, updateSuccess: false, updateError: false, updateLoading: false});

    switch(navState.tabMaster){
        case'add':
            setAddItems({...addItems, tabMaster:{...addItems.tabMaster,[e.target.name]:e.target.value}});
            break;
        case 'update':
            setUpdateItems({...updateItems, tabMaster:{...updateItems.tabMaster,[e.target.name]:e.target.value}});
            break;
        case 'delete':
            setDeleteItems({...deleteItems, tabMaster:{...deleteItems.tabMaster,[e.target.name]:e.target.checked}});
            break;
        default: console.log('No Change');
    }
  }
  function judgeOnChange(e){
    setJudgeStates({...judgeStates, addSuccess: false, addError: false, addLoading: false, deleteSuccess:false, deleteError: false, deleteLoading: false, updateSuccess: false, updateError: false, updateLoading: false});

    switch(navState.judge){
        case'add':
            setAddItems({...addItems, judge:{...addItems.judge,[e.target.name]:e.target.value}});
            break;
        case 'update':
            setUpdateItems({...updateItems, judge:{...updateItems.judge,[e.target.name]:e.target.value}});
            break;
        case 'delete':
            setDeleteItems({...deleteItems, judge:{...deleteItems.judge,[e.target.name]:e.target.checked}});
            break;
        default: console.log('No Change');
    }
  }
  function roomOnChange(e){
    setRoomStates({...roomStates, addSuccess: false, addError: false, addLoading: false, deleteSuccess:false, deleteError: false, deleteLoading: false, updateSuccess: false, updateError: false, updateLoading: false});

    switch(navState.room){
        case'add':
            setAddItems({...addItems, room:{...addItems.room,[e.target.name]:e.target.value}});
            break;
        case 'update':
            setUpdateItems({...updateItems, room:{...updateItems.room,[e.target.name]:e.target.value}});
            break;
        case 'delete':
            setDeleteItems({...deleteItems, room:{...deleteItems.room,[e.target.name]:e.target.checked}});
            break;
        default: console.log('No Change');
    }
  }
  function roundOnChange(e){
    setRoundStates({...roundStates, addSuccess: false, addError: false, addLoading: false, deleteSuccess:false, deleteError: false, deleteLoading: false, updateSuccess: false, updateError: false, updateLoading: false});
    const value = e.target.type==='checkbox' ? e.target.checked : e.target.value;

    switch(navState.round){
        case'add':
            setAddItems({...addItems, round:{...addItems.round,[e.target.name]:value}});
            break;
        case 'update':
            setUpdateItems({...updateItems, round:{...updateItems.round,[e.target.name]:value}});
            break;
        case 'delete':
            setDeleteItems({...deleteItems, round:{...deleteItems.round,[e.target.name]:value}});
            break;
        default: console.log('No Change');
    }
  }
  function wordOnChange(e){
    setWordStates({...wordStates, addSuccess: false, addError: false, addLoading: false, deleteSuccess:false, deleteError: false, deleteLoading: false, updateSuccess: false, updateError: false, updateLoading: false});

    switch(navState.word){
        case'add':
            setAddItems({...addItems, word:{...addItems.word,[e.target.name]:e.target.value}});
            break;
        case 'update':
            setUpdateItems({...updateItems, word:{...updateItems.word,[e.target.name]:e.target.value}});
            break;
        case 'delete':
            setDeleteItems({...deleteItems, word:{...deleteItems.word,[e.target.name]:e.target.checked}});
            break;
        default: console.log('No Change');
    }
  }
  async function submitInstitution(e){
    e.preventDefault();
    switch(navState.institution){
        case'add':
            setInstitutionStates({...institutionStates, addLoading: true});
            // console.log('add inst');
            try {
                const res=await axios.post(`${currentServer}/sb/institution`,{...addItems.institution, tabId: tab.tabId});
                // console.log(res);
                setAddItems({...addItems, institution:{...defaultItems.institution}});
                getFullTab();
                setInstitutionStates({...institutionStates, addError: false, addSuccess: true, addLoading:false, addSuccessMessage:res.data.message});
            } 
            catch (err) {
                const message= err?.response?.data?.message || "Something went wrong";
                setInstitutionStates({...institutionStates, addSuccess: false, addError: true, addLoading: false, addErrorMessage:message});
            }
            break;
        case 'update':
            setInstitutionStates({...institutionStates, updateLoading: true});
            // console.log('add inst');
            try {
                const res=await axios.put(`${currentServer}/sb/institution`,{...updateItems.institution, tabId: tab.tabId});
                // console.log({...updateItems.institution, tabId: tab.tabId});
                setUpdateItems({...updateItems, institution:{...defaultItems.institution}});
                getFullTab();
                setInstitutionStates({...institutionStates, updateError: false, updateSuccess: true, updateLoading:false, updateSuccessMessage:res.data.message});
            } 
            catch (err) {
                const message= err?.response?.data?.message || "Something went wrong";
                setInstitutionStates({...institutionStates, updateSuccess: false, updateError: true, updateLoading: false, updateErrorMessage:message});
            }
            break;
        case 'delete':
            setInstitutionStates({...institutionStates, deleteLoading: true});
            // console.log('delete inst');
            try {
                const res=await axios.delete(`${currentServer}/sb/institution`,{data:{...deleteItems.institution, tabId: tab.tabId}});
                setDeleteItems({...deleteItems, institution:{...defaultItems.institution, status: false}});
                getFullTab();
                setInstitutionStates({...institutionStates, deleteError: false, deleteSuccess: true, deleteLoading:false, deleteSuccessMessage:res.data.message});
            } 
            catch (err) {
                const message= err?.response?.data?.message || "Something went wrong";
                setInstitutionStates({...institutionStates, deleteSuccess: false, deleteError: true, deleteLoading: false, deleteErrorMessage:message});
            }
            break;
        default: console.log('check submitInstitution');
    }
  }
  async function submitSpeller(e){
    e.preventDefault();
    switch(navState.speller){
        case'add':
            setSpellerStates({...spellerStates, addLoading: true});
            // console.log('add sp');
            try {
                const res=await axios.post(`${currentServer}/sb/speller`,{...addItems.speller, tabId: tab.tabId});
                // console.log(res);
                setAddItems({...addItems, speller:{...defaultItems.speller}});
                getFullTab();
                setSpellerStates({...spellerStates, addError: false, addSuccess: true, addLoading:false, addSuccessMessage:res.data.message});
            } 
            catch (err) {
                const message= err?.response?.data?.message || "Something went wrong";
                setSpellerStates({...spellerStates, addSuccess: false, addError: true, addLoading: false, addErrorMessage:message});
            }
            break;
        case 'update':
            setSpellerStates({...spellerStates, updateLoading: true});
            // console.log('update sp');
            try {
                const res=await axios.put(`${currentServer}/sb/speller`,{...updateItems.speller, tabId: tab.tabId});
                setUpdateItems({...updateItems, speller:{...defaultItems.speller}});
                getFullTab();
                setSpellerStates({...spellerStates, updateError: false, updateSuccess: true, updateLoading:false, updateSuccessMessage:res.data.message});
            } 
            catch (err) {
                const message= err?.response?.data?.message || "Something went wrong";
                setSpellerStates({...spellerStates, updateSuccess: false, updateError: true, updateLoading: false, updateErrorMessage:message});
            }
            break;
        case 'delete':
            setSpellerStates({...spellerStates, deleteLoading: true});
            // console.log('delete sp');
            try {
                const res=await axios.delete(`${currentServer}/sb/speller`,{data:{...deleteItems.speller, tabId: tab.tabId}});
                setDeleteItems({...deleteItems, speller:{...defaultItems.speller, status: false}});
                getFullTab();
                setSpellerStates({...spellerStates, deleteError: false, deleteSuccess: true, deleteLoading:false, deleteSuccessMessage:res.data.message});
            } 
            catch (err) {
                const message= err?.response?.data?.message || "Something went wrong";
                setSpellerStates({...spellerStates, deleteSuccess: false, deleteError: true, deleteLoading: false, deleteErrorMessage:message});
            }
            break;
        default: console.log('check submitSpeller');
    }
  }
  async function submitTabMaster(e){
    e.preventDefault();
    switch(navState.tabMaster){
        case'add':
            setTabMasterStates({...tabMasterStates, addLoading: true});
            try {
                const res=await axios.post(`${currentServer}/sb/tabMaster`,{...addItems.tabMaster, tabId: tab.tabId});
                setAddItems({...addItems, tabMaster:{...defaultItems.tabMaster}});
                getFullTab();
                setTabMasterStates({...tabMasterStates, addError: false, addSuccess: true, addLoading:false, addSuccessMessage:res.data.message});
            } 
            catch (err) {
                const message= err?.response?.data?.message || "Something went wrong";
                setTabMasterStates({...tabMasterStates, addSuccess: false, addError: true, addLoading: false, addErrorMessage:message});
            }
            break;
        case 'update':
            setTabMasterStates({...tabMasterStates, updateLoading: true});
            try {
                const res=await axios.put(`${currentServer}/sb/tabMaster`,{...updateItems.tabMaster, tabId: tab.tabId});
                setUpdateItems({...updateItems, tabMaster:{...defaultItems.tabMaster}});
                getFullTab();
                setTabMasterStates({...tabMasterStates, updateError: false, updateSuccess: true, updateLoading:false, updateSuccessMessage:res.data.message});
            } 
            catch (err) {
                const message= err?.response?.data?.message || "Something went wrong";
                setTabMasterStates({...tabMasterStates, updateSuccess: false, updateError: true, updateLoading: false, updateErrorMessage:message});
            }
            break;
        case 'delete':
            setTabMasterStates({...tabMasterStates, deleteLoading: true});
            try {
                const res=await axios.delete(`${currentServer}/sb/tabMaster`,{data:{...deleteItems.tabMaster, tabId: tab.tabId}});
                setDeleteItems({...deleteItems, tabMaster:{...defaultItems.tabMaster, status: false}});
                getFullTab();
                setTabMasterStates({...tabMasterStates, deleteError: false, deleteSuccess: true, deleteLoading:false, deleteSuccessMessage:res.data.message});
            } 
            catch (err) {
                const message= err?.response?.data?.message || "Something went wrong";
                setTabMasterStates({...tabMasterStates, deleteSuccess: false, deleteError: true, deleteLoading: false, deleteErrorMessage:message});
            }
            break;
        default: console.log('check submitTabMaster');
    }
  }
  async function submitJudge(e){
    e.preventDefault();
    switch(navState.judge){
        case'add':
            setJudgeStates({...judgeStates, addLoading: true});
            try {
                const res=await axios.post(`${currentServer}/sb/judge`,{...addItems.judge, tabId: tab.tabId});
                setAddItems({...addItems, judge:{...defaultItems.judge}});
                getFullTab();
                setJudgeStates({...judgeStates, addError: false, addSuccess: true, addLoading:false, addSuccessMessage:res.data.message});
            } 
            catch (err) {
                const message= err?.response?.data?.message || "Something went wrong";
                setJudgeStates({...judgeStates, addSuccess: false, addError: true, addLoading: false, addErrorMessage:message});
            }
            break;
        case 'update':
            setJudgeStates({...judgeStates, updateLoading: true});
            try {
                const res=await axios.put(`${currentServer}/sb/judge`,{...updateItems.judge, tabId: tab.tabId});
                setUpdateItems({...updateItems, judge:{...defaultItems.judge}});
                getFullTab();
                setJudgeStates({...judgeStates, updateError: false, updateSuccess: true, updateLoading:false, updateSuccessMessage:res.data.message});
            } 
            catch (err) {
                const message= err?.response?.data?.message || "Something went wrong";
                setJudgeStates({...judgeStates, updateSuccess: false, updateError: true, updateLoading: false, updateErrorMessage:message});
            }
            break;
        case 'delete':
            setJudgeStates({...judgeStates, deleteLoading: true});
            try {
                const res=await axios.delete(`${currentServer}/sb/judge`,{data:{...deleteItems.judge, tabId: tab.tabId}});
                setDeleteItems({...deleteItems, judge:{...defaultItems.judge, status: false}});
                getFullTab();
                setJudgeStates({...judgeStates, deleteError: false, deleteSuccess: true, deleteLoading:false, deleteSuccessMessage:res.data.message});
            } 
            catch (err) {
                const message= err?.response?.data?.message || "Something went wrong";
                setJudgeStates({...judgeStates, deleteSuccess: false, deleteError: true, deleteLoading: false, deleteErrorMessage:message});
            }
            break;
        default: console.log('check submitJudge');
    }
  }
  async function submitRoom(e){
    e.preventDefault();
    switch(navState.room){
        case'add':
            setRoomStates({...roomStates, addLoading: true});
            try {
                const res=await axios.post(`${currentServer}/sb/room`,{...addItems.room, tabId: tab.tabId});
                setAddItems({...addItems, room:{...defaultItems.room}});
                getFullTab();
                setRoomStates({...roomStates, addError: false, addSuccess: true, addLoading:false, addSuccessMessage:res.data.message});
            } 
            catch (err) {
                const message= err?.response?.data?.message || "Something went wrong";
                setRoomStates({...roomStates, addSuccess: false, addError: true, addLoading: false, addErrorMessage:message});
            }
            break;
        case 'update':
            setRoomStates({...roomStates, updateLoading: true});
            try {
                const res=await axios.put(`${currentServer}/sb/room`,{...updateItems.room, tabId: tab.tabId});
                setUpdateItems({...updateItems, room:{...defaultItems.room}});
                getFullTab();
                setRoomStates({...roomStates, updateError: false, updateSuccess: true, updateLoading:false, updateSuccessMessage:res.data.message});
            } 
            catch (err) {
                const message= err?.response?.data?.message || "Something went wrong";
                setRoomStates({...roomStates, updateSuccess: false, updateError: true, updateLoading: false, updateErrorMessage:message});
            }
            break;
        case 'delete':
            setRoomStates({...roomStates, deleteLoading: true});
            try {
                const res=await axios.delete(`${currentServer}/sb/room`,{data:{...deleteItems.room, tabId: tab.tabId}});
                setDeleteItems({...deleteItems, room:{...defaultItems.room, status: false}});
                getFullTab();
                setRoomStates({...roomStates, deleteError: false, deleteSuccess: true, deleteLoading:false, deleteSuccessMessage:res.data.message});
            } 
            catch (err) {
                const message= err?.response?.data?.message || "Something went wrong";
                setRoomStates({...roomStates, deleteSuccess: false, deleteError: true, deleteLoading: false, deleteErrorMessage:message});
            }
            break;
        default: console.log('check submitRoom');
    }
  }
  async function submitRound(e){
    e.preventDefault();
    switch(navState.round){
        case'add':
            setRoundStates({...roundStates, addLoading: true});
            try {
                const res=await axios.post(`${currentServer}/sb/round`,{...addItems.round, tabId: tab.tabId});
                setAddItems({...addItems, round:{...defaultItems.round}});
                getFullTab();
                setRoundStates({...roundStates, addError: false, addSuccess: true, addLoading:false, addSuccessMessage:res.data.message});
            } 
            catch (err) {
                const message= err?.response?.data?.message || "Something went wrong";
                setRoundStates({...roundStates, addSuccess: false, addError: true, addLoading: false, addErrorMessage:message});
            }
            break;
        case 'update':
            setRoundStates({...roundStates, updateLoading: true});
            try {
                const res=await axios.put(`${currentServer}/sb/round`,{...updateItems.round, tabId: tab.tabId});
                setUpdateItems({...updateItems, round:{...defaultItems.round}});
                getFullTab();
                setRoundStates({...roundStates, updateError: false, updateSuccess: true, updateLoading:false, updateSuccessMessage:res.data.message});
            } 
            catch (err) {
                const message= err?.response?.data?.message || "Something went wrong";
                setRoundStates({...roundStates, updateSuccess: false, updateError: true, updateLoading: false, updateErrorMessage:message});
            }
            break;
        case 'delete':
            setRoundStates({...roundStates, deleteLoading: true});
            try {
                const res=await axios.delete(`${currentServer}/sb/round`,{data:{...deleteItems.round, tabId: tab.tabId}});
                setDeleteItems({...deleteItems, round:{...defaultItems.round, status: false}});
                getFullTab();
                setRoundStates({...roundStates, deleteError: false, deleteSuccess: true, deleteLoading:false, deleteSuccessMessage:res.data.message});
            } 
            catch (err) {
                const message= err?.response?.data?.message || "Something went wrong";
                setRoundStates({...roundStates, deleteSuccess: false, deleteError: true, deleteLoading: false, deleteErrorMessage:message});
            }
            break;
        default: console.log('check submitRound');
    }
  }
  async function submitWord(e){
    e.preventDefault();
    switch(navState.word){
        case'add':
            setWordStates({...wordStates, addLoading: true});
            try {
                const res=await axios.post(`${currentServer}/sb/word`,{...addItems.word, tabId: tab.tabId});
                setAddItems({...addItems, word:{...defaultItems.word}});
                getFullTab();
                setWordStates({...wordStates, addError: false, addSuccess: true, addLoading:false, addSuccessMessage:res.data.message});
            } 
            catch (err) {
                const message= err?.response?.data?.message || "Something went wrong";
                setWordStates({...wordStates, addSuccess: false, addError: true, addLoading: false, addErrorMessage:message});
            }
            break;
        case 'update':
            setWordStates({...wordStates, updateLoading: true});
            try {
                const res=await axios.put(`${currentServer}/sb/word`,{...updateItems.word, tabId: tab.tabId});
                setUpdateItems({...updateItems, word:{...defaultItems.word}});
                getFullTab();
                setWordStates({...wordStates, updateError: false, updateSuccess: true, updateLoading:false, updateSuccessMessage:res.data.message});
            } 
            catch (err) {
                const message= err?.response?.data?.message || "Something went wrong";
                setWordStates({...wordStates, updateSuccess: false, updateError: true, updateLoading: false, updateErrorMessage:message});
            }
            break;
        case 'delete':
            setWordStates({...wordStates, deleteLoading: true});
            try {
                const res=await axios.delete(`${currentServer}/sb/word`,{data:{...deleteItems.word, tabId: tab.tabId}});
                setDeleteItems({...deleteItems, word:{...defaultItems.word, status: false}});
                getFullTab();
                setWordStates({...wordStates, deleteError: false, deleteSuccess: true, deleteLoading:false, deleteSuccessMessage:res.data.message});
            } 
            catch (err) {
                const message= err?.response?.data?.message || "Something went wrong";
                setWordStates({...wordStates, deleteSuccess: false, deleteError: true, deleteLoading: false, deleteErrorMessage:message});
            }
            break;
        default: console.log('check submitWord');
    }
  }

  //return functions
  function home(){
    return(
      <>
      <div className="tabHome">
        <li onClick={()=>tabChange('institutions')}>Institutions</li>
        <li onClick={()=>tabChange('tabMasters')}>Tab Masters</li>
        <li onClick={()=>tabChange('judges')}>Judges</li>
        <li onClick={()=>tabChange('spellers')}>Spellers</li>
        <li onClick={()=>tabChange('rooms')}>Rooms</li>
        <li onClick={()=>tabChange('rounds')}>Rounds</li>
        <li onClick={()=>tabChange('words')}>Words</li>
        <li onClick={()=>tabChange('draws')}>Draws</li>
      </div>
      </>
    )
  }
  function institutions(){
    return(
    <>
    <div className="buttonStack">
        <button className={navState.institution==='review'? 'lightButton':'darkButton'} onClick={()=>setNavState({...navState, institution:'review'})}>Review</button>
        <button className={navState.institution==='add'? 'lightButton':'darkButton'} onClick={()=>setNavState({...navState, institution:'add'})}>Add</button>
        <button className={navState.institution==='update'? 'lightButton':'darkButton'} onClick={()=>setNavState({...navState, institution:'update'})}>Update</button>
        <button className={navState.institution==='delete'? 'lightButton':'darkButton'} onClick={()=>setNavState({...navState, institution:'delete'})}>Delete</button>
    </div>
    {navState.institution==='review'&&
    <section id="institutionReview">
        <h2>Registered Institutions</h2>
        {fullTab.institutions?.length>0?<table>
          <thead>
            <tr style={{gridTemplateColumns:'4fr 1fr 1fr 1fr'}}>
              <th>Name</th>
              <th>Code</th>
              <th>Spellers</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {fullTab.institutions.map((p,i)=>
            <tr key={i} style={{gridTemplateColumns:'4fr 1fr 1fr 1fr'}}>
              <td>{p.name}</td>
              <td>{p.code}</td>
              <td>{p.spellers}</td>
              <td style={{display: 'grid', gridAutoFlow:'column', gridAutoColumns:'1rem', justifySelf:'center', gap:'1rem'}}><FaAngleDoubleUp fill="teal" onClick={()=>{
                setUpdateItems({...updateItems, institution:{...p}});
                setNavState({...navState, institution:'update'});
              }}/><RiDeleteBin6Fill fill="red" onClick={()=>{
                setDeleteItems({...updateItems, institution:{...p}});
                setNavState({...navState, institution:'delete'});}}/></td>
            </tr>)}
          </tbody>
        </table>:<p>No Registered Institutions</p>}
    </section>}
    {navState.institution==='add'&&
    <section id="institutionAdd">
        <form onSubmit={submitInstitution}>
            <p><strong>Register an institution</strong></p>
            <input type="text" placeholder="Institution Name" required name="name" value={addItems.institution.name} onChange={institutionOnChange}/>
            <input type="text" placeholder="Institution Code e.g: GHS (Must be Unique) " required name="code" value={addItems.institution.code} onChange={institutionOnChange}/>
            <button className="darkButton" disabled={institutionStates.addLoading}>{institutionStates.addLoading? 'Adding':'Add Institution'}</button>
            {institutionStates.addError &&<p style={{color:'red'}}>{institutionStates.addErrorMessage}</p>}
            {institutionStates.addSuccess &&<p style={{color:'green'}}>{institutionStates.addSuccessMessage}</p>}
        </form>
    </section>}
    {navState.institution==='update' &&
    <section id="institutionUpdate">
        <form onSubmit={submitInstitution}>
            <p><strong>Update {updateItems.institution.name}'s info</strong></p>
            <select onChange={(e)=>{
                e.target.value && setUpdateItems({...updateItems, institution:{...fullTab.institutions.find((s)=>s.code===e.target.value)}});
                // console.log(updateItems.institution);
                e.target.value==="" && setUpdateItems({...updateItems, institution:defaultItems.institution});
                }} value={updateItems.institution.code}>
                <option value="">Select an Institution</option>
                {fullTab.institutions.map((s, i)=><option key={i} value={s.code}>{s.name}</option>)}
            </select>
            <input type="text" placeholder="Institution Name" required name="name" value={updateItems.institution.name} onChange={institutionOnChange}/>
            <input type="text" placeholder="Institution Code e.g: GHS (Must be Unique) " required name="code" value={updateItems.institution.code} onChange={institutionOnChange}/>
            <button className="darkButton" disabled={institutionStates.updateLoading}>{institutionStates.updateLoading? 'Updating':'Update Institution'}</button>
            {institutionStates.updateError &&<p style={{color:'red'}}>{institutionStates.updateErrorMessage}</p>}
            {institutionStates.updateSuccess &&<p style={{color:'green'}}>{institutionStates.updateSuccessMessage}</p>}
        </form>
    </section>}
    {navState.institution==='delete' &&
    <section id="institutionDelete">
        <form onSubmit={submitInstitution}>
            <p><strong>Delete {deleteItems.institution.name}?</strong></p>
            <select onChange={(e)=>{
                e.target.value && setDeleteItems({...deleteItems, institution:{...fullTab.institutions.find((s)=>s.code===e.target.value), status: false}});
                e.target.value==="" && setDeleteItems({...deleteItems, institution:defaultItems.institution});
                // console.log(deleteItems.institution);
                }} value={deleteItems.institution.code}>
                <option value="">Select an institution</option>
                {fullTab.institutions.map((s, i)=><option key={i} value={s.code}>{s.name}</option>)}
            </select>
            <label>Are you sure?<input type="checkbox" name="status" checked={deleteItems.institution.status} onChange={institutionOnChange} /></label>
            {deleteItems.institution.status &&<p style={{color:'red'}}>Warning: This will delete all judges and spellers registered with this institution</p>}            
            <button className="darkButton" disabled={institutionStates.deleteLoading || !deleteItems.institution.status}>{institutionStates.deleteLoading? 'Deleting':'Delete Institution'}</button>
            {institutionStates.deleteError &&<p style={{color:'red'}}>{institutionStates.deleteErrorMessage}</p>}
            {institutionStates.deleteSuccess &&<p style={{color:'green'}}>{institutionStates.deleteSuccessMessage}</p>}
        </form>
    </section>}
    </>);
  }
  function spellers(){
    return(
    <>
    <div className="buttonStack">
        <button className={navState.speller==='review'? 'lightButton':'darkButton'} onClick={()=>setNavState({...navState, speller:'review'})}>Review</button>
        <button className={navState.speller==='add'? 'lightButton':'darkButton'} onClick={()=>setNavState({...navState, speller:'add'})}>Add</button>
        <button className={navState.speller==='update'? 'lightButton':'darkButton'} onClick={()=>setNavState({...navState, speller:'update'})}>Update</button>
        <button className={navState.speller==='delete'? 'lightButton':'darkButton'} onClick={()=>setNavState({...navState, speller:'delete'})}>Delete</button>
    </div>
    {navState.speller==='review'&&
    <section id="spellerReview">
        <h2>Registered Spellers</h2>
        {fullTab.spellingBees?.length>0?<table>
          <thead>
            <tr style={{gridTemplateColumns:'1fr 1fr 1fr'}}>
              <th>Name</th>
              <th>School</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {fullTab.spellingBees.map((p,i)=>
            <tr key={i} style={{gridTemplateColumns:'1fr 1fr 1fr'}}>
              <td>{p.name}</td>
              <td>{fullTab.institutions.find((i)=>i.id===p.institutionId).name}</td>
              <td style={{display: 'grid', gridAutoFlow:'column', gridAutoColumns:'1rem', justifySelf:'center', gap:'1rem'}}><FaAngleDoubleUp fill="teal" onClick={()=>{
                setUpdateItems({...updateItems, speller:{...p}});
                setNavState({...navState, speller:'update'});
              }}/><RiDeleteBin6Fill fill="red" onClick={()=>{
                setDeleteItems({...updateItems, speller:{...p}});
                setNavState({...navState, speller:'delete'});}}/></td>
            </tr>)}
          </tbody>
        </table>:<p>No Registered Spellers</p>}
    </section>}
    {navState.speller==='add'&&
    <section id="spellerAdd">
        <form onSubmit={submitSpeller}>
            <p><strong>Register a speller</strong></p>
            <input type="text" placeholder="Speller Name" required name="name" value={addItems.speller.name} onChange={spellerOnChange}/>
            <input type="email" placeholder="email " name="email" value={addItems.speller.email} onChange={spellerOnChange}/>
            <select required name="institutionId" onChange={spellerOnChange} value={addItems.speller.institutionId}>
                <option value=''>Choose Institution</option>
                {fullTab.institutions.map((s, i)=><option key={i} value={s.id}>{s.name}</option>)}
            </select>
            <button className="darkButton" disabled={spellerStates.addLoading}>{spellerStates.addLoading? 'Registering':'Register Speller'}</button>
            {spellerStates.addError &&<p style={{color:'red'}}>{spellerStates.addErrorMessage}</p>}
            {spellerStates.addSuccess &&<p style={{color:'green'}}>{spellerStates.addSuccessMessage}</p>}
        </form>
    </section>}
    {navState.speller==='update' &&
    <section id="spellerUpdate">
        <form onSubmit={submitSpeller}>
            <p><strong>Update {updateItems.speller.name}'s info</strong></p>
            <select onChange={(e)=>{
                e.target.value && setUpdateItems({...updateItems, speller:{...fullTab.spellingBees.find((s)=>s.id===parseInt(e.target.value))}});
                e.target.value==='' && setUpdateItems({...updateItems, speller:defaultItems.speller});
                }} value={updateItems.speller.id}>
                <option value="">Select a speller</option>
                {fullTab.spellingBees.map((s, i)=><option key={i} value={s.id}>{s.name}</option>)}
            </select>
            <input type="text" placeholder="Speller Name" required name="name" value={updateItems.speller.name} onChange={spellerOnChange}/>
            <input type="text" placeholder="Speller Email" name="email" value={updateItems.speller.email} onChange={spellerOnChange}/>
            <button className="darkButton" disabled={spellerStates.updateLoading}>{spellerStates.updateLoading? 'Updating':'Update Speller'}</button>
            {spellerStates.updateError &&<p style={{color:'red'}}>{spellerStates.updateErrorMessage}</p>}
            {spellerStates.updateSuccess &&<p style={{color:'green'}}>{spellerStates.updateSuccessMessage}</p>}
        </form>
    </section>}
    {navState.speller==='delete' &&
    <section id="spellerDelete">
        <form onSubmit={submitSpeller}>
            <p><strong>Delete {deleteItems.speller.name}?</strong></p>
            <select onChange={(e)=>{
                e.target.value && setDeleteItems({...deleteItems, speller:{...fullTab.spellingBees.find((s)=>s.id===parseInt(e.target.value)), status: false}});
                }} value={deleteItems.speller.id}>
                <option value="">Select Speller</option>
                {fullTab.spellingBees.map((s, i)=><option key={i} value={s.id}>{s.name}</option>)}
            </select>
            <label>Are you sure?<input type="checkbox" name="status" checked={deleteItems.speller.status} onChange={spellerOnChange} /></label>
            {/* {deleteItems.speller.status &&<p style={{color:'red'}}>Warning: This will delete all judges and spellers registered with this institution</p>}             */}
            <button className="darkButton" disabled={spellerStates.deleteLoading || !deleteItems.speller.status}>{spellerStates.deleteLoading? 'Deleting':'Delete Speller'}</button>
            {spellerStates.deleteError &&<p style={{color:'red'}}>{spellerStates.deleteErrorMessage}</p>}
            {spellerStates.deleteSuccess &&<p style={{color:'green'}}>{spellerStates.deleteSuccessMessage}</p>}
        </form>
    </section>}
    </>);
  }
  function judges(){
    return(
    <>
    <div className="buttonStack">
        <button className={navState.judge==='review'? 'lightButton':'darkButton'} onClick={()=>setNavState({...navState, judge:'review'})}>Review</button>
        <button className={navState.judge==='add'? 'lightButton':'darkButton'} onClick={()=>setNavState({...navState, judge:'add'})}>Add</button>
        <button className={navState.judge==='update'? 'lightButton':'darkButton'} onClick={()=>setNavState({...navState, judge:'update'})}>Update</button>
        <button className={navState.judge==='delete'? 'lightButton':'darkButton'} onClick={()=>setNavState({...navState, judge:'delete'})}>Delete</button>
    </div>
    {navState.judge==='review'&&
    <section id="judgeReview">
        <h2>Registered Judges</h2>
        {fullTab.judges?.length>0?<table>
          <thead>
            <tr style={{gridTemplateColumns:'1fr 1fr 1fr'}}>
              <th>Name</th>
              <th>Institution</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {fullTab.judges.map((p,i)=>
            <tr key={i} style={{gridTemplateColumns:'1fr 1fr 1fr'}}>
              <td>{p.name}</td>
              <td>{fullTab.institutions.find((inst)=>inst.id===p.institutionId)?.name || '-'}</td>
              <td style={{display: 'grid', gridAutoFlow:'column', gridAutoColumns:'1rem', justifySelf:'center', gap:'1rem'}}><FaAngleDoubleUp fill="teal" onClick={()=>{
                setUpdateItems({...updateItems, judge:{...p}});
                setNavState({...navState, judge:'update'});
              }}/><RiDeleteBin6Fill fill="red" onClick={()=>{
                setDeleteItems({...deleteItems, judge:{...p, status:false}});
                setNavState({...navState, judge:'delete'});}}/></td>
            </tr>)}
          </tbody>
        </table>:<p>No Registered Judges</p>}
    </section>}
    {navState.judge==='add'&&
    <section id="judgeAdd">
        <form onSubmit={submitJudge}>
            <p><strong>Register a judge</strong></p>
            <input type="text" placeholder="Judge Name" required name="name" value={addItems.judge.name} onChange={judgeOnChange}/>
            <input type="email" placeholder="email" name="email" value={addItems.judge.email} onChange={judgeOnChange}/>
            <select required name="institutionId" onChange={judgeOnChange} value={addItems.judge.institutionId}>
                <option value=''>Choose Institution</option>
                {fullTab.institutions.map((s, i)=><option key={i} value={s.id}>{s.name}</option>)}
            </select>
            <button className="darkButton" disabled={judgeStates.addLoading}>{judgeStates.addLoading? 'Registering':'Register Judge'}</button>
            {judgeStates.addError &&<p style={{color:'red'}}>{judgeStates.addErrorMessage}</p>}
            {judgeStates.addSuccess &&<p style={{color:'green'}}>{judgeStates.addSuccessMessage}</p>}
        </form>
    </section>}
    {navState.judge==='update' &&
    <section id="judgeUpdate">
        <form onSubmit={submitJudge}>
            <p><strong>Update {updateItems.judge.name}'s info</strong></p>
            <select onChange={(e)=>{
                e.target.value && setUpdateItems({...updateItems, judge:{...fullTab.judges.find((s)=>s.id===parseInt(e.target.value))}});
                e.target.value==='' && setUpdateItems({...updateItems, judge:defaultItems.judge});
                }} value={updateItems.judge.id}>
                <option value="">Select a judge</option>
                {fullTab.judges.map((s, i)=><option key={i} value={s.id}>{s.name}</option>)}
            </select>
            <input type="text" placeholder="Judge Name" required name="name" value={updateItems.judge.name} onChange={judgeOnChange}/>
            <input type="text" placeholder="Judge Email" name="email" value={updateItems.judge.email} onChange={judgeOnChange}/>
            <select required name="institutionId" onChange={judgeOnChange} value={updateItems.judge.institutionId}>
                <option value=''>Choose Institution</option>
                {fullTab.institutions.map((s, i)=><option key={i} value={s.id}>{s.name}</option>)}
            </select>
            <button className="darkButton" disabled={judgeStates.updateLoading}>{judgeStates.updateLoading? 'Updating':'Update Judge'}</button>
            {judgeStates.updateError &&<p style={{color:'red'}}>{judgeStates.updateErrorMessage}</p>}
            {judgeStates.updateSuccess &&<p style={{color:'green'}}>{judgeStates.updateSuccessMessage}</p>}
        </form>
    </section>}
    {navState.judge==='delete' &&
    <section id="judgeDelete">
        <form onSubmit={submitJudge}>
            <p><strong>Delete {deleteItems.judge.name}?</strong></p>
            <select onChange={(e)=>{
                e.target.value && setDeleteItems({...deleteItems, judge:{...fullTab.judges.find((s)=>s.id===parseInt(e.target.value)), status: false}});
                e.target.value==='' && setDeleteItems({...deleteItems, judge:{id:0,name:'',status:false}});
                }} value={deleteItems.judge.id}>
                <option value="">Select Judge</option>
                {fullTab.judges.map((s, i)=><option key={i} value={s.id}>{s.name}</option>)}
            </select>
            <label>Are you sure?<input type="checkbox" name="status" checked={deleteItems.judge.status} onChange={judgeOnChange} /></label>
            <button className="darkButton" disabled={judgeStates.deleteLoading || !deleteItems.judge.status}>{judgeStates.deleteLoading? 'Deleting':'Delete Judge'}</button>
            {judgeStates.deleteError &&<p style={{color:'red'}}>{judgeStates.deleteErrorMessage}</p>}
            {judgeStates.deleteSuccess &&<p style={{color:'green'}}>{judgeStates.deleteSuccessMessage}</p>}
        </form>
    </section>}
    </>);
  }
  function tabMasters(){
    return(
    <>
    <div className="buttonStack">
        <button className={navState.tabMaster==='review'? 'lightButton':'darkButton'} onClick={()=>setNavState({...navState, tabMaster:'review'})}>Review</button>
        <button className={navState.tabMaster==='add'? 'lightButton':'darkButton'} onClick={()=>setNavState({...navState, tabMaster:'add'})}>Add</button>
        <button className={navState.tabMaster==='update'? 'lightButton':'darkButton'} onClick={()=>setNavState({...navState, tabMaster:'update'})}>Update</button>
        <button className={navState.tabMaster==='delete'? 'lightButton':'darkButton'} onClick={()=>setNavState({...navState, tabMaster:'delete'})}>Delete</button>
    </div>
    {navState.tabMaster==='review'&&
    <section id="tabMasterReview">
        <h2>Registered Tab Masters</h2>
        {fullTab.tabMasters?.length>0?<table>
          <thead>
            <tr style={{gridTemplateColumns:'1fr 1fr 1fr'}}>
              <th>Name</th>
              <th>Institution</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {fullTab.tabMasters.map((p,i)=>
            <tr key={i} style={{gridTemplateColumns:'1fr 1fr 1fr'}}>
              <td>{p.name}</td>
              <td>{fullTab.institutions.find((inst)=>inst.id===p.institutionId)?.name || '-'}</td>
              <td style={{display: 'grid', gridAutoFlow:'column', gridAutoColumns:'1rem', justifySelf:'center', gap:'1rem'}}><FaAngleDoubleUp fill="teal" onClick={()=>{
                setUpdateItems({...updateItems, tabMaster:{...p}});
                setNavState({...navState, tabMaster:'update'});
              }}/><RiDeleteBin6Fill fill="red" onClick={()=>{
                setDeleteItems({...deleteItems, tabMaster:{...p, status:false}});
                setNavState({...navState, tabMaster:'delete'});}}/></td>
            </tr>)}
          </tbody>
        </table>:<p>No Registered Tab Masters</p>}
    </section>}
    {navState.tabMaster==='add'&&
    <section id="tabMasterAdd">
        <form onSubmit={submitTabMaster}>
            <p><strong>Register a tab master</strong></p>
            <input type="text" placeholder="Tab Master Name" required name="name" value={addItems.tabMaster.name} onChange={tabMasterOnChange}/>
            <input type="email" placeholder="email" required name="email" value={addItems.tabMaster.email} onChange={tabMasterOnChange}/>
            <select required name="institutionId" onChange={tabMasterOnChange} value={addItems.tabMaster.institutionId}>
                <option value=''>Choose Institution</option>
                {fullTab.institutions.map((s, i)=><option key={i} value={s.id}>{s.name}</option>)}
            </select>
            <button className="darkButton" disabled={tabMasterStates.addLoading}>{tabMasterStates.addLoading? 'Adding':'Add Tab Master'}</button>
            {tabMasterStates.addError &&<p style={{color:'red'}}>{tabMasterStates.addErrorMessage}</p>}
            {tabMasterStates.addSuccess &&<p style={{color:'green'}}>{tabMasterStates.addSuccessMessage}</p>}
        </form>
    </section>}
    {navState.tabMaster==='update' &&
    <section id="tabMasterUpdate">
        <form onSubmit={submitTabMaster}>
            <p><strong>Update {updateItems.tabMaster.name}'s info</strong></p>
            <select onChange={(e)=>{
                e.target.value && setUpdateItems({...updateItems, tabMaster:{...fullTab.tabMasters.find((s)=>s.id===parseInt(e.target.value))}});
                e.target.value==='' && setUpdateItems({...updateItems, tabMaster:defaultItems.tabMaster});
                }} value={updateItems.tabMaster.id}>
                <option value="">Select a tab master</option>
                {fullTab.tabMasters.map((s, i)=><option key={i} value={s.id}>{s.name}</option>)}
            </select>
            <input type="text" placeholder="Tab Master Name" required name="name" value={updateItems.tabMaster.name} onChange={tabMasterOnChange}/>
            <input type="text" placeholder="Tab Master Email" required name="email" value={updateItems.tabMaster.email} onChange={tabMasterOnChange}/>
            <select required name="institutionId" onChange={tabMasterOnChange} value={updateItems.tabMaster.institutionId}>
                <option value=''>Choose Institution</option>
                {fullTab.institutions.map((s, i)=><option key={i} value={s.id}>{s.name}</option>)}
            </select>
            <button className="darkButton" disabled={tabMasterStates.updateLoading}>{tabMasterStates.updateLoading? 'Updating':'Update Tab Master'}</button>
            {tabMasterStates.updateError &&<p style={{color:'red'}}>{tabMasterStates.updateErrorMessage}</p>}
            {tabMasterStates.updateSuccess &&<p style={{color:'green'}}>{tabMasterStates.updateSuccessMessage}</p>}
        </form>
    </section>}
    {navState.tabMaster==='delete' &&
    <section id="tabMasterDelete">
        <form onSubmit={submitTabMaster}>
            <p><strong>Delete {deleteItems.tabMaster.name}?</strong></p>
            <select onChange={(e)=>{
                e.target.value && setDeleteItems({...deleteItems, tabMaster:{...fullTab.tabMasters.find((s)=>s.id===parseInt(e.target.value)), status: false}});
                e.target.value==='' && setDeleteItems({...deleteItems, tabMaster:{id:0,name:'',status:false}});
                }} value={deleteItems.tabMaster.id}>
                <option value="">Select Tab Master</option>
                {fullTab.tabMasters.map((s, i)=><option key={i} value={s.id}>{s.name}</option>)}
            </select>
            <label>Are you sure?<input type="checkbox" name="status" checked={deleteItems.tabMaster.status} onChange={tabMasterOnChange} /></label>
            <button className="darkButton" disabled={tabMasterStates.deleteLoading || !deleteItems.tabMaster.status}>{tabMasterStates.deleteLoading? 'Deleting':'Delete Tab Master'}</button>
            {tabMasterStates.deleteError &&<p style={{color:'red'}}>{tabMasterStates.deleteErrorMessage}</p>}
            {tabMasterStates.deleteSuccess &&<p style={{color:'green'}}>{tabMasterStates.deleteSuccessMessage}</p>}
        </form>
    </section>}
    </>);
  }
  function rooms(){
    return(
    <>
    <div className="buttonStack">
        <button className={navState.room==='review'? 'lightButton':'darkButton'} onClick={()=>setNavState({...navState, room:'review'})}>Review</button>
        <button className={navState.room==='add'? 'lightButton':'darkButton'} onClick={()=>setNavState({...navState, room:'add'})}>Add</button>
        <button className={navState.room==='update'? 'lightButton':'darkButton'} onClick={()=>setNavState({...navState, room:'update'})}>Update</button>
        <button className={navState.room==='delete'? 'lightButton':'darkButton'} onClick={()=>setNavState({...navState, room:'delete'})}>Delete</button>
    </div>
    {navState.room==='review'&&
    <section id="roomReview">
        <h2>Registered Rooms</h2>
        {fullTab.rooms?.length>0?<table>
          <thead>
            <tr style={{gridTemplateColumns:'1fr 1fr'}}>
              <th>Name</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {fullTab.rooms.map((p,i)=>
            <tr key={i} style={{gridTemplateColumns:'1fr 1fr'}}>
              <td>{p.name}</td>
              <td style={{display: 'grid', gridAutoFlow:'column', gridAutoColumns:'1rem', justifySelf:'center', gap:'1rem'}}><FaAngleDoubleUp fill="teal" onClick={()=>{
                setUpdateItems({...updateItems, room:{...p}});
                setNavState({...navState, room:'update'});
              }}/><RiDeleteBin6Fill fill="red" onClick={()=>{
                setDeleteItems({...deleteItems, room:{...p, status:false}});
                setNavState({...navState, room:'delete'});}}/></td>
            </tr>)}
          </tbody>
        </table>:<p>No Registered Rooms</p>}
    </section>}
    {navState.room==='add'&&
    <section id="roomAdd">
        <form onSubmit={submitRoom}>
            <p><strong>Add room</strong></p>
            <input type="text" placeholder="Room Name" required name="name" value={addItems.room.name} onChange={roomOnChange}/>
            <button className="darkButton" disabled={roomStates.addLoading}>{roomStates.addLoading? 'Adding':'Add Room'}</button>
            {roomStates.addError &&<p style={{color:'red'}}>{roomStates.addErrorMessage}</p>}
            {roomStates.addSuccess &&<p style={{color:'green'}}>{roomStates.addSuccessMessage}</p>}
        </form>
    </section>}
    {navState.room==='update' &&
    <section id="roomUpdate">
        <form onSubmit={submitRoom}>
            <p><strong>Update {updateItems.room.name}</strong></p>
            <select onChange={(e)=>{
                e.target.value && setUpdateItems({...updateItems, room:{...fullTab.rooms.find((s)=>s.id===parseInt(e.target.value))}});
                e.target.value==='' && setUpdateItems({...updateItems, room:defaultItems.room});
                }} value={updateItems.room.id}>
                <option value="">Select a room</option>
                {fullTab.rooms.map((s, i)=><option key={i} value={s.id}>{s.name}</option>)}
            </select>
            <input type="text" placeholder="Room Name" required name="name" value={updateItems.room.name} onChange={roomOnChange}/>
            <button className="darkButton" disabled={roomStates.updateLoading}>{roomStates.updateLoading? 'Updating':'Update Room'}</button>
            {roomStates.updateError &&<p style={{color:'red'}}>{roomStates.updateErrorMessage}</p>}
            {roomStates.updateSuccess &&<p style={{color:'green'}}>{roomStates.updateSuccessMessage}</p>}
        </form>
    </section>}
    {navState.room==='delete' &&
    <section id="roomDelete">
        <form onSubmit={submitRoom}>
            <p><strong>Delete {deleteItems.room.name}?</strong></p>
            <select onChange={(e)=>{
                e.target.value && setDeleteItems({...deleteItems, room:{...fullTab.rooms.find((s)=>s.id===parseInt(e.target.value)), status: false}});
                e.target.value==='' && setDeleteItems({...deleteItems, room:{id:'',name:'',status:false}});
                }} value={deleteItems.room.id}>
                <option value="">Select Room</option>
                {fullTab.rooms.map((s, i)=><option key={i} value={s.id}>{s.name}</option>)}
            </select>
            <label>Are you sure?<input type="checkbox" name="status" checked={deleteItems.room.status} onChange={roomOnChange} /></label>
            <button className="darkButton" disabled={roomStates.deleteLoading || !deleteItems.room.status}>{roomStates.deleteLoading? 'Deleting':'Delete Room'}</button>
            {roomStates.deleteError &&<p style={{color:'red'}}>{roomStates.deleteErrorMessage}</p>}
            {roomStates.deleteSuccess &&<p style={{color:'green'}}>{roomStates.deleteSuccessMessage}</p>}
        </form>
    </section>}
    </>);
  }
  function rounds(){
    return(
    <>
    <div className="buttonStack">
        <button className={navState.round==='review'? 'lightButton':'darkButton'} onClick={()=>setNavState({...navState, round:'review'})}>Review</button>
        <button className={navState.round==='add'? 'lightButton':'darkButton'} onClick={()=>setNavState({...navState, round:'add'})}>Add</button>
        <button className={navState.round==='update'? 'lightButton':'darkButton'} onClick={()=>setNavState({...navState, round:'update'})}>Update</button>
        <button className={navState.round==='delete'? 'lightButton':'darkButton'} onClick={()=>setNavState({...navState, round:'delete'})}>Delete</button>
    </div>
    {navState.round==='review'&&
    <section id="roundReview">
        <h2>Registered Rounds</h2>
        {fullTab.rounds?.length>0?<table>
          <thead>
            <tr style={{gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr'}}>
              <th>Name</th>
              <th>Type</th>
              <th>Limit</th>
              <th>Breaks</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {fullTab.rounds.map((p,i)=>
            <tr key={i} style={{gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr'}}>
              <td>{p.name}</td>
              <td>{p.type}</td>
              <td>{p.timeLimit || p.wordLimit || '-'}</td>
              <td>{p.breaks ? 'Yes' : 'No'}</td>
              <td style={{display: 'grid', gridAutoFlow:'column', gridAutoColumns:'1rem', justifySelf:'center', gap:'1rem'}}><FaAngleDoubleUp fill="teal" onClick={()=>{
                setUpdateItems({...updateItems, round:{...p}});
                setNavState({...navState, round:'update'});
              }}/><RiDeleteBin6Fill fill="red" onClick={()=>{
                setDeleteItems({...deleteItems, round:{...p, status:false}});
                setNavState({...navState, round:'delete'});}}/></td>
            </tr>)}
          </tbody>
        </table>:<p>No Registered Rounds</p>}
    </section>}
    {navState.round==='add'&&
    <section id="roundAdd">
        <form onSubmit={submitRound}>
            <p><strong>Add round</strong></p>
            <input type="text" placeholder="Round Name" required name="name" value={addItems.round.name} onChange={roundOnChange}/>
            <select required name="type" value={addItems.round.type} onChange={roundOnChange}>
              {roundTypes.map((t, i)=><option key={i} value={t}>{t}</option>)}
            </select>
            {addItems.round.type==='Timed' && <input type="number" min="15" name="timeLimit" placeholder="Time Limit (seconds)" value={addItems.round.timeLimit || ''} onChange={roundOnChange} required/>}
            {addItems.round.type==='Word Limit' && <input type="number" min="5" name="wordLimit" placeholder="Word Limit" value={addItems.round.wordLimit || ''} onChange={roundOnChange} required/>}
            <label>Break Round?<input type="checkbox" name="breaks" checked={!!addItems.round.breaks} onChange={roundOnChange} /></label>
            <button className="darkButton" disabled={roundStates.addLoading}>{roundStates.addLoading? 'Adding':'Add Round'}</button>
            {roundStates.addError &&<p style={{color:'red'}}>{roundStates.addErrorMessage}</p>}
            {roundStates.addSuccess &&<p style={{color:'green'}}>{roundStates.addSuccessMessage}</p>}
        </form>
    </section>}
    {navState.round==='update' &&
    <section id="roundUpdate">
        <form onSubmit={submitRound}>
            <p><strong>Update {updateItems.round.name}</strong></p>
            <select onChange={(e)=>{
                e.target.value && setUpdateItems({...updateItems, round:{...fullTab.rounds.find((s)=>s.roundId===parseInt(e.target.value))}});
                e.target.value==='' && setUpdateItems({...updateItems, round:defaultItems.round});
                }} value={updateItems.round.roundId || ''}>
                <option value="">Select a round</option>
                {fullTab.rounds.map((s, i)=><option key={i} value={s.roundId}>{s.name}</option>)}
            </select>
            <input type="text" placeholder="Round Name" required name="name" value={updateItems.round.name} onChange={roundOnChange}/>
            <select required name="type" value={updateItems.round.type} onChange={roundOnChange}>
              {roundTypes.map((t, i)=><option key={i} value={t}>{t}</option>)}
            </select>
            {updateItems.round.type==='Timed' && <input type="number" min="1" name="timeLimit" placeholder="Time Limit (seconds)" value={updateItems.round.timeLimit || ''} onChange={roundOnChange} required/>}
            {updateItems.round.type==='Word Limit' && <input type="number" min="1" name="wordLimit" placeholder="Word Limit" value={updateItems.round.wordLimit || ''} onChange={roundOnChange} required/>}
            <label>Break Round?<input type="checkbox" name="breaks" checked={!!updateItems.round.breaks} onChange={roundOnChange} /></label>
            <label>Completed?<input type="checkbox" name="completed" checked={!!updateItems.round.completed} onChange={roundOnChange} /></label>
            <button className="darkButton" disabled={roundStates.updateLoading}>{roundStates.updateLoading? 'Updating':'Update Round'}</button>
            {roundStates.updateError &&<p style={{color:'red'}}>{roundStates.updateErrorMessage}</p>}
            {roundStates.updateSuccess &&<p style={{color:'green'}}>{roundStates.updateSuccessMessage}</p>}
        </form>
    </section>}
    {navState.round==='delete' &&
    <section id="roundDelete">
        <form onSubmit={submitRound}>
            <p><strong>Delete {deleteItems.round.name}?</strong></p>
            <select onChange={(e)=>{
                e.target.value && setDeleteItems({...deleteItems, round:{...fullTab.rounds.find((s)=>s.roundId===parseInt(e.target.value)), status: false}});
                e.target.value==='' && setDeleteItems({...deleteItems, round:{id:'',name:'',status:false}});
                }} value={deleteItems.round.roundId || ''}>
                <option value="">Select Round</option>
                {fullTab.rounds.map((s, i)=><option key={i} value={s.roundId}>{s.name}</option>)}
            </select>
            <label>Are you sure?<input type="checkbox" name="status" checked={deleteItems.round.status} onChange={roundOnChange} /></label>
            <button className="darkButton" disabled={roundStates.deleteLoading || !deleteItems.round.status}>{roundStates.deleteLoading? 'Deleting':'Delete Round'}</button>
            {roundStates.deleteError &&<p style={{color:'red'}}>{roundStates.deleteErrorMessage}</p>}
            {roundStates.deleteSuccess &&<p style={{color:'green'}}>{roundStates.deleteSuccessMessage}</p>}
        </form>
    </section>}
    </>);
  }
  function words(){
    return(
    <>
    <div className="buttonStack">
        <button className={navState.word==='review'? 'lightButton':'darkButton'} onClick={()=>setNavState({...navState, word:'review'})}>Review</button>
        <button className={navState.word==='add'? 'lightButton':'darkButton'} onClick={()=>setNavState({...navState, word:'add'})}>Add</button>
        <button className={navState.word==='update'? 'lightButton':'darkButton'} onClick={()=>setNavState({...navState, word:'update'})}>Update</button>
        <button className={navState.word==='delete'? 'lightButton':'darkButton'} onClick={()=>setNavState({...navState, word:'delete'})}>Delete</button>
    </div>
    {navState.word==='review'&&
    <section id="wordReview">
        <h2>Words</h2>
        {fullTab.words?.length>0?<table>
          <thead>
            <tr style={{gridTemplateColumns:'1fr 1fr'}}>
              <th>Word</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {fullTab.words.map((p,i)=>
            <tr key={i} style={{gridTemplateColumns:'1fr 1fr'}}>
              <td>{p.word}</td>
              <td style={{display: 'grid', gridAutoFlow:'column', gridAutoColumns:'1rem', justifySelf:'center', gap:'1rem'}}><FaAngleDoubleUp fill="teal" onClick={()=>{
                setUpdateItems({...updateItems, word:{...p}});
                setNavState({...navState, word:'update'});
              }}/><RiDeleteBin6Fill fill="red" onClick={()=>{
                setDeleteItems({...deleteItems, word:{...p, status:false}});
                setNavState({...navState, word:'delete'});}}/></td>
            </tr>)}
          </tbody>
        </table>:<p>No Words Added</p>}
    </section>}
    {navState.word==='add'&&
    <section id="wordAdd">
        <form onSubmit={submitWord}>
            <p><strong>Add word</strong></p>
            <input type="text" placeholder="Word" required name="word" value={addItems.word.word} onChange={wordOnChange}/>
            <button className="darkButton" disabled={wordStates.addLoading}>{wordStates.addLoading? 'Adding':'Add Word'}</button>
            {wordStates.addError &&<p style={{color:'red'}}>{wordStates.addErrorMessage}</p>}
            {wordStates.addSuccess &&<p style={{color:'green'}}>{wordStates.addSuccessMessage}</p>}
        </form>
    </section>}
    {navState.word==='update' &&
    <section id="wordUpdate">
        <form onSubmit={submitWord}>
            <p><strong>Update word</strong></p>
            <select onChange={(e)=>{
                e.target.value && setUpdateItems({...updateItems, word:{...fullTab.words.find((s)=>s.id===parseInt(e.target.value))}});
                e.target.value==='' && setUpdateItems({...updateItems, word:defaultItems.word});
                }} value={updateItems.word.id || ''}>
                <option value="">Select a word</option>
                {fullTab.words.map((s, i)=><option key={i} value={s.id}>{s.word}</option>)}
            </select>
            <input type="text" placeholder="Word" required name="word" value={updateItems.word.word || ''} onChange={wordOnChange}/>
            <button className="darkButton" disabled={wordStates.updateLoading}>{wordStates.updateLoading? 'Updating':'Update Word'}</button>
            {wordStates.updateError &&<p style={{color:'red'}}>{wordStates.updateErrorMessage}</p>}
            {wordStates.updateSuccess &&<p style={{color:'green'}}>{wordStates.updateSuccessMessage}</p>}
        </form>
    </section>}
    {navState.word==='delete' &&
    <section id="wordDelete">
        <form onSubmit={submitWord}>
            <p><strong>Delete word?</strong></p>
            <select onChange={(e)=>{
                e.target.value && setDeleteItems({...deleteItems, word:{...fullTab.words.find((s)=>s.id===parseInt(e.target.value)), status: false}});
                e.target.value==='' && setDeleteItems({...deleteItems, word:{id:'',word:'',status:false}});
                }} value={deleteItems.word.id || ''}>
                <option value="">Select Word</option>
                {fullTab.words.map((s, i)=><option key={i} value={s.id}>{s.word}</option>)}
            </select>
            <label>Are you sure?<input type="checkbox" name="status" checked={deleteItems.word.status} onChange={wordOnChange} /></label>
            <button className="darkButton" disabled={wordStates.deleteLoading || !deleteItems.word.status}>{wordStates.deleteLoading? 'Deleting':'Delete Word'}</button>
            {wordStates.deleteError &&<p style={{color:'red'}}>{wordStates.deleteErrorMessage}</p>}
            {wordStates.deleteSuccess &&<p style={{color:'green'}}>{wordStates.deleteSuccessMessage}</p>}
        </form>
    </section>}
    </>);
  }
  function draws(){
    return(
    <>
    Draws
    </>);
  }

  return (
    !pageLoad.loading && access==='admin'?
    <>
    <nav className="tabMenu">
          <ul>
            <Dropdown options={[{option:`${tab.title}`, value:'public'}, {option:`${tab.title} (Admin)`, value:'admin'}]} setValue={setAccess} selectedIdx={1}/>
            <li onClick={()=>tabChange('institutions')} className={tabItem==='institutions'?'selectedTabItem':''}>Institutions</li>
            <li onClick={()=>tabChange('tabMasters')} className={tabItem==='tabMasters'?'selectedTabItem':''}>Tab Masters</li>
            <li onClick={()=>tabChange('spellers')} className={tabItem==='spellers'?'selectedTabItem':''}>Spellers</li>
            <li onClick={()=>tabChange('judges')} className={tabItem==='judges'?'selectedTabItem':''}>Judges</li>
            <li onClick={()=>tabChange('rooms')} className={tabItem==='rooms'?'selectedTabItem':''}>Rooms</li>
            <li onClick={()=>tabChange('rounds')} className={tabItem==='rounds'?'selectedTabItem':''}>Rounds</li>
            <li onClick={()=>tabChange('words')} className={tabItem==='words'?'selectedTabItem':''}>Words</li>
            <li onClick={()=>tabChange('draws')} className={tabItem==='draws'?'selectedTabItem':''}>Draws</li>
          </ul>
        </nav>
        <div className="tabSideMenu">
          <nav className="tTitle">
            <Dropdown selectedIdx={1} options={[{option:`${tab.title}`, value:'public'}, {option:`${tab.title} (Admin)`, value:'admin'}]} setValue={setAccess}/>
            <span className='☰' onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen? <IoClose/>:'☰'}</span>
          </nav>
          <nav className={`tSideMenu ${menuOpen? 'Open':'Closed'}`}>
            <ul>
            <span onClick={()=>tabChange('home')}><GiBee fill="teal"/><strong>{tab.title}</strong></span>
            <li onClick={()=>tabChange('institutions')} className={tabItem==='institutions'?'selectedTabItem':''}>Institutions</li>
            <li onClick={()=>tabChange('tabMasters')} className={tabItem==='tabMasters'?'selectedTabItem':''}>Tab Masters</li>
            <li onClick={()=>tabChange('spellers')} className={tabItem==='spellers'?'selectedTabItem':''}>Spellers</li>
            <li onClick={()=>tabChange('judges')} className={tabItem==='judges'?'selectedTabItem':''}>Judges</li>
            <li onClick={()=>tabChange('rooms')} className={tabItem==='rooms'?'selectedTabItem':''}>Rooms</li>
            <li onClick={()=>tabChange('rounds')} className={tabItem==='rounds'?'selectedTabItem':''}>Rounds</li>
            <li onClick={()=>tabChange('words')} className={tabItem==='words'?'selectedTabItem':''}>Words</li>
            <li onClick={()=>tabChange('draws')} className={tabItem==='draws'?'selectedTabItem':''}>Draws</li>
          </ul>
          </nav>
        </div>
        {menuOpen&& <div className="aoe" onClick={()=>setMenuOpen(false)}></div>}
        {
        tabItem==='home'? home():tabItem==='institutions'? institutions():tabItem==='spellers'? spellers():tabItem==='judges'? judges():tabItem==='tabMasters'? tabMasters():tabItem==='rooms'? rooms():tabItem==='rounds'? rounds():tabItem==='words'? words():tabItem==='draws'? draws():''
        }
    </>:!pageLoad.loading && access==='public'?
    <SpellingBeePublicTab tab={tab} event={event}/>:<Loading/>
  )
}

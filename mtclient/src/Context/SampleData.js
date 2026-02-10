import { SpellingBeeTab } from "./SampleTabData/SBdata";
import { BPData } from "./SampleTabData/BPdata";
import { WSDCData } from "./SampleTabData/WSDCdata";
import { PStab } from "./SampleTabData/PSdata";
import { ChessTabEliminator } from "./SampleTabData/chessDataEliminator";
import { ChessTab } from "./SampleTabData/chessDataSwiss";

export const events=[
  {eventID:1, title:'Illouwa 3.0', organizer:'JDS', date:'2024-07-01',slug:'illouwa3', 
    tabs:[
      {track:'BP Debate', title:'Debate Seniors', tabID:1},
      {track:'BP Debate', title:'Debate Juniors', tabID:2},
        {track:'Spelling Bee', title:'Spelling Bee Juniors', tabID:4},
        {track:'Spelling Bee', title:'Spelling Bee Seniors', tabID:5},
        {track:'Chess', title:'Chess Open', tabID:3},
    ]},
  {eventID:2, title:'Tech Symposium', organizer:'Tech Club', date:'2024-08-15', slug:'Spelling Bee', tabs:[
      {track:'Chess', title:'Chess Open', tabID:1},
      {track:'Worlds Debate', title:'Debate Seniors', tabID:2},
      {track:'Worlds Debate', title:'Debate Juniors', tabID:3},
    ]},
  {eventID:3, title:'Art Festival', organizer:'Art Society', date:'2024-09-10', slug:'artfest24', tabs:[
      {track:'BP Debate', title:'Debate Seniors', tabID:1},
      {track:'BP Debate', title:'Debate Juniors', tabID:2},
    ]},
  {eventID:4, title:'Taji Metropolitan 1.0', organizer:'ACD', date:'2026-01-31', slug:'TajiMetropolitan1',
    tabs:[
        {track:'WSDC Debate', title:'Debate Juniors', tabID:2},
        {track:'WSDC Debate', title:'Debate Seniors', tabID:1},
        {track:'Public Speaking', title:'Public Speaking Juniors', tabID:3},
        {track:'Public Speaking', title:'Public Speaking Seniors', tabID:4},
        {track:'Spelling Bee', title:'Spelling Bee Juniors', tabID:5},
        {track:'Spelling Bee', title:'Spelling Bee Seniors', tabID:6},
    ]
  },
  {eventID:5, title:'MT Opens', organizer:'Nzirah', date:'2026-02-14', slug:'mtopens',
    tabs:[
        {...SpellingBeeTab},
        {...WSDCData},
        {...BPData},
        {...PStab},
        {...ChessTab},
        {...ChessTabEliminator},
    ]
  },
];

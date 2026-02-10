import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../Context/AuthContext";

export default function Event() {
  const {selectedEvent, setTab} = useContext(AuthContext);
  //console.log(selectedEvent);
  const navigate=useNavigate();
  const event = {...selectedEvent};
  return (
    <>
    <section id="welcome-section">
      <h1>Welcome to {event.title}</h1>
      <p>Organized by {event.organizer}</p>
    </section>
    <section>
      <h2>Choose Tab to View</h2>
      <div className="tabList">
        {event.tabs.map((tab)=><button key={tab.tabID} className="darkButton" onClick={()=>{navigate(`/${event.slug}/${tab.title}`); setTab(tab)}}>{tab.title}</button>)}
      </div>
    </section>
    </>
  )
}

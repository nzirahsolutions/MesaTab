import React, { useEffect, useRef, useState } from 'react';
import {IoIosArrowDropdown, IoIosArrowDropup} from 'react-icons/io'

export default function Dropdown({options, selectedIdx,setValue}) {
    // const options=[
    //     {option:'Option 1', value:'Option 1'},
    //     {option:'Option 2', value:'Option 2'},
    //     {option:'Option 3', value:'Option 3'},
    // ];
    const [dropdown, setDropdown]=useState({dropped:false, selected:options[selectedIdx]});
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handlePointerDown(event) {
            if (!dropdownRef.current?.contains(event.target)) {
                setDropdown((prev) => ({ ...prev, dropped: false }));
            }
        }

        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, []);
  return (
    <div className='dropdown' ref={dropdownRef}>        
        <div onClick={()=>setDropdown({...dropdown, dropped:!dropdown.dropped})}
        className='selected'>{dropdown.selected.option} {dropdown.dropped? <IoIosArrowDropup color='hsl(234, 61%, 12%)'/>:<IoIosArrowDropdown color='hsl(234, 61%, 12%)'/>}</div>
        <div className={`options ${dropdown.dropped? 'dropped':''}`}>{options.map((o,i)=><div key={i} className={dropdown.selected.value==o.value?"selectedOption":'otherOptions'} onClick={()=>{setDropdown({...dropdown, dropped:false, selected:{...o}}); setValue(o.value)}
        }>{o.option}</div>)}</div>
    </div>
  )
}

import {FaSearch, FaArrowCircleRight} from 'react-icons/fa';
import { useState, useRef } from 'react';

export function Findbar( {placeholder, onSearch}) {
    const [searchTerm, setSearchTerm]=useState('');
    const inputRef=useRef(null);

    function handleChange(e){
        setSearchTerm(e.target.value);
    }

  return (
    <div className='search'> 
    <label style={{display:'flex'}}>
        <input type="text" ref={inputRef} value={searchTerm} onChange={handleChange} onKeyDown={(e)=>e.key==='Enter' && onSearch(inputRef)} placeholder={placeholder}/><FaArrowCircleRight size={30} className='icon' onClick={()=>onSearch(inputRef)} />
    </label>
    </div>
  )
}
export default function Searchbar( {placeholder, onSearch}) {
    const [searchTerm, setSearchTerm]=useState('');
    const inputRef=useRef(null);

    function handleChange(e){
        setSearchTerm(e.target.value);
    }
    

  return (
    <div className='search'> 
    <label style={{display:'flex'}}>
        <input type="text" ref={inputRef} value={searchTerm} onChange={handleChange} onKeyDown={(e)=>e.key==='Enter' && onSearch(inputRef)} placeholder={placeholder}/><FaSearch size={30} className='icon' onClick={()=>onSearch(inputRef)}/>
    </label>
    </div>
  )
}
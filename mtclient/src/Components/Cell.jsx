import { useState, useEffect } from "react"

export default function Cell ({value, onChange}) {

    const [cellValue, setCellValue]=useState(value);
    const [edit, setEdit]=useState(false);

    useEffect(() => {
    setCellValue(value ?? 0);
    }, [value]);

    function editValue(e){
        setCellValue(e.target.value);
    }
    function commitValue(v){
        setEdit(false);
        const newValue= parseInt(v)?? 0;
        onChange(newValue);
    }
  return (
    <>
    {edit? 
    <input type="number" className="cell" value={cellValue} onChange={editValue} min={0} max={20} onBlur={()=>commitValue(cellValue)} onKeyDown={(e)=>{
        
        if (e.key === 'Enter') commitValue(cellValue);
        if (e.key === 'Escape') commitValue(cellValue);
    }}/> 
    :
    <p className="cell" style={{margin:0}} onClick={()=>setEdit(true)}>{cellValue}</p>}

    </>
  )
}

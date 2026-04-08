import { useState, useEffect } from "react"

export default function Cell ({value, onChange, min = 0, max = 20}) {

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
        const parsedValue = Number.parseInt(v, 10);
        const fallbackValue = Number.isFinite(parsedValue) ? parsedValue : min;
        const boundedValue = Math.min(max, Math.max(min, fallbackValue));
        onChange(boundedValue);
    }
  return (
    <>
    {edit? 
    <input type="number" className="cell" value={cellValue} onChange={editValue} min={min} max={max} onBlur={()=>commitValue(cellValue)} onKeyDown={(e)=>{
        
        if (e.key === 'Enter') commitValue(cellValue);
        if (e.key === 'Escape') commitValue(cellValue);
    }}/> 
    :
    <p className="cell" style={{margin:0}} onClick={()=>setEdit(true)}>{cellValue}</p>}

    </>
  )
}

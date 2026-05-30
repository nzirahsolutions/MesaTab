import { BsEye, BsEyeSlash } from "react-icons/bs";
import { useState } from "react";

export default function Input({placeholder, value, onChange ,type, name, ...props}) {
  const [psdVisible, setPsdVisible]=useState(false);
  return (
    <div className='customInput' data-float={placeholder}>
        <input name={name} type={type? type==='password'? psdVisible? 'text': type:type: 'text'} onFocus={(e)=>e.target.setAttribute('placeholder','')} onBlur={(e)=>e.target.setAttribute('placeholder',placeholder)} placeholder={placeholder} value={value} onChange={onChange} {...props}/>
        {type==='password'? psdVisible?<BsEye onClick={()=>setPsdVisible(!psdVisible)}/>:<BsEyeSlash onClick={()=>setPsdVisible(!psdVisible)}/>:''}
    </div>
  )
}
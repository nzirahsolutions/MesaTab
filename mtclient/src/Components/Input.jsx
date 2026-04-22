
export default function Input({placeholder, value, onChange ,type}) {
  return (
    <div className='customInput' data-float={placeholder}>
        <input type={type? type: 'text'} onFocus={(e)=>e.target.setAttribute('placeholder','')} onBlur={(e)=>e.target.setAttribute('placeholder',placeholder)} placeholder={placeholder} value={value} onChange={onChange} />
    </div>
  )
}

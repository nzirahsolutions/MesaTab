
export default function ToggleButton({state, setState}) {


  return (
    <div className={state? 'toggleButton active':'toggleButton'} onClick={setState}></div>
  )
}

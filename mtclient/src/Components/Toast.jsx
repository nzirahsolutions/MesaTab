import { useEffect } from "react";
function ToastItem({toast, setToasts}){
    useEffect(()=>{
        const timer=window.setTimeout(()=>{setToasts(prev => prev.filter(t => t.id !== toast.id))},5000);
        return()=> window.clearTimeout(timer);
    },[setToasts, toast.id]);
    return (<div className={toast.type}>
                {toast.message}
                <button onClick={() => setToasts(p => p.filter(t => t.id !== toast.id))}>x</button>
            </div>)
}

export default function Toast({toasts, setToasts}) {
    
  return (
    <div className='toastContainer'>
        {toasts.map((t)=><ToastItem key={t.id} toast={t} setToasts={setToasts}/>)}
    </div>
  )
}

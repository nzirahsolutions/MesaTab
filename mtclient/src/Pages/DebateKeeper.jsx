import React, { useRef, useState, useEffect } from 'react';
import Input from '../Components/Input';
import bellSound from '/bell.mp3';
import { FaBell, FaPause, FaPlay, FaRedo, FaStepBackward, FaStepForward } from 'react-icons/fa';

const defaultValues={
    time:{min:'00', sec:'00'},
    poi:{duration: 15, active: false, color:'var(--brandcolor)'},
    speeches:{index:0, format:'BP'}};

const debateFormatTemplates = [
    {
        format:'British Parlianmentary',
        shortHand:'BP',
        speakers:[
            {role:'Prime Minister', time:{min:'00', sec:'00'}, reply:false},
            {role:'Leader of Opposition', time:{min:'00', sec:'00'}, reply:false},
            {role:'Deputy Prime Minister', time:{min:'00', sec:'00'}, reply:false},
            {role:'Deputy Leader of Opposition', time:{min:'00', sec:'00'}, reply:false},
            {role:'Member of Government', time:{min:'00', sec:'00'}, reply:false},
            {role:'Member of Opposition', time:{min:'00', sec:'00'}, reply:false},
            {role:'Government Whip', time:{min:'00', sec:'00'}, reply:false},
            {role:'Opposition Whip', time:{min:'00', sec:'00'}, reply:false},
            ],
        duration:7,
    },
    {
        format:'World Schools',
        shortHand:'WSDC',
        speakers:[
            {role:'1st Proposition', time:{min:'00', sec:'00'}, reply:false},
            {role:'1st Opposition', time:{min:'00', sec:'00'}, reply:false},
            {role:'2nd Proposition', time:{min:'00', sec:'00'}, reply:false},
            {role:'2nd Opposition', time:{min:'00', sec:'00'}, reply:false},
            {role:'3rd Proposition', time:{min:'00', sec:'00'}, reply:false},
            {role:'3rd Opposition', time:{min:'00', sec:'00'}, reply:false},
            {role:'Opposition Reply', time:{min:'00', sec:'00'}, reply:true},
            {role:'Proposition Reply', time:{min:'00', sec:'00'}, reply:true},
            ],
        duration: 8,
    },
];

function cloneTime(time = defaultValues.time){
    return { ...time };
}

function cloneFormat(format){
    return {
        ...format,
        speakers: format.speakers.map((speaker)=>({
            ...speaker,
            time: cloneTime(speaker.time),
        })),
    };
}

function getFormat(shortHand){
    const template = debateFormatTemplates.find((format)=>format.shortHand===shortHand) ?? debateFormatTemplates[0];
    return cloneFormat(template);
}

export default function DebateKeeper() {
    const [time,setTime]=useState(defaultValues.time);
    const [isSetting, setIsSetting]=useState(false);
    const [isRunning, setIsRunning]=useState(false);
    const [poi, setPoi]=useState(defaultValues.poi);
    const setRef= useRef(null);
    const bellTimeOutRef= useRef(null);
    const bellRef= useRef(new Audio(bellSound));
    const bellRef2= useRef(new Audio(bellSound));
    const intervalRef=useRef(null);
    const poiIntervalRef=useRef(null);
    const timeObject=()=>{
        let min=[];
        let sec=[];
        let c=0;
        while(c<60){
            min.push(c);
            sec.push(c);
            c++;
        }
        min= min.map(m=>{
            return zero(m);
        })
        sec= sec.map(s=>{
            return zero(s);
        })
        return {min:min, sec:sec};
        };
    function zero(m){
        return m>=0 && m<10? '0'+ m.toString(): m.toString();
    }
    const timeArray=timeObject();
    const [currentSpeeches, setCurrentSpeeches]=useState({index:0, format: getFormat(defaultValues.speeches.format)});
    const [color, setColor]=useState('blue');
    const [complete, setComplete]=useState(0);

    useEffect(() => {
            function handlePointerDown(event) {
                if (!setRef.current?.contains(event.target)) {
                    setIsSetting(false);
                }
            }
            document.addEventListener('mousedown', handlePointerDown);
            return () => document.removeEventListener('mousedown', handlePointerDown);
        }, []);
    useEffect(() => {
        return () => {
            clearInterval(intervalRef.current);
            clearInterval(poiIntervalRef.current);
            clearTimeout(bellTimeOutRef.current);
        };
    }, []);

    function stopPOI(){
        clearInterval(poiIntervalRef.current);
        poiIntervalRef.current = null;
        setPoi({ ...defaultValues.poi });
    }

    function stopTimer(){
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        clearTimeout(bellTimeOutRef.current);
        setIsRunning(false);
        stopPOI();
    }

    function getTimingData(){
        const elapsedSeconds = Number(time.min) * 60 + Number(time.sec);
        const activeSpeaker = currentSpeeches.format.speakers[currentSpeeches.index];
        const isReply = Boolean(activeSpeaker?.reply);
        const durationMinutes = Number(currentSpeeches.format.duration) || 0;
        const totalSeconds = isReply
            ? Math.floor((durationMinutes * 60) / 2)
            : durationMinutes * 60;

        return {
            elapsedSeconds,
            isReply,
            safeTotalSeconds: Math.max(1, totalSeconds),
        };
    }

    function updateSpeakerTime(index, nextTime){
        setCurrentSpeeches((prev)=>({
            ...prev,
            format: {
                ...prev.format,
                speakers: prev.format.speakers.map((speaker, speakerIdx)=>
                    speakerIdx === index
                        ? { ...speaker, time: cloneTime(nextTime) }
                        : speaker
                ),
            },
        }));
    }

    function updateTime(){        
        clearInterval(intervalRef.current);
        intervalRef.current = setInterval(()=>{
            setTime(prevTime => {
                const oldSecIdx = Number(prevTime.sec);
                const oldMinIdx = Number(prevTime.min);
                const newSecIdx = oldSecIdx === 59 ? 0 : oldSecIdx + 1;
                let newMinIdx = newSecIdx === 0 ? oldMinIdx + 1 : oldMinIdx;
                newMinIdx= newMinIdx===60? 0: newMinIdx;  
                const newSec = timeArray.sec[newSecIdx];
                const newMin = timeArray.min[newMinIdx];
                return {min: newMin, sec: newSec};
            });
        }, 1000);
    }
    function play(){
        if(isRunning){
            stopTimer();
        } else {
            setIsRunning(true);
            updateTime();
        }
    }
    function reset(){
        stopTimer();
        updateSpeakerTime(currentSpeeches.index, defaultValues.time);
        setTime({ ...defaultValues.time });
    }
    function next(){
        stopTimer();
        const oldIdx=currentSpeeches.index;
        if(oldIdx<currentSpeeches.format.speakers.length-1){
            const nextSpeakerTime = cloneTime(currentSpeeches.format.speakers[oldIdx+1].time);
            setCurrentSpeeches(prev=>({
                ...prev,
                index: oldIdx+1,
                format: {
                    ...prev.format,
                    speakers: prev.format.speakers.map((speaker, speakerIdx)=>
                        speakerIdx === oldIdx
                            ? { ...speaker, time: cloneTime(time) }
                            : speaker
                    ),
                },
            }));
            setTime(nextSpeakerTime);
        }
    }
    function prev(){
        stopTimer();
        const oldIdx=currentSpeeches.index;
        if(oldIdx>0){
            const prevSpeakerTime = cloneTime(currentSpeeches.format.speakers[oldIdx-1].time);
            setCurrentSpeeches(prev=>({
                ...prev,
                index: oldIdx-1,
                format: {
                    ...prev.format,
                    speakers: prev.format.speakers.map((speaker, speakerIdx)=>
                        speakerIdx === oldIdx
                            ? { ...speaker, time: cloneTime(time) }
                            : speaker
                    ),
                },
            }));
            setTime(prevSpeakerTime);
        }
    }
    useEffect(() => {
    function handleDisplay() {
        const { elapsedSeconds, isReply, safeTotalSeconds } = getTimingData();
        const warningStart = Math.max(0, safeTotalSeconds - 60);

        if (!isReply) {
            if (elapsedSeconds < safeTotalSeconds && elapsedSeconds < 60  ) setColor("blue");
            else if (elapsedSeconds < warningStart) {
                setColor("green");
            }
            else if (elapsedSeconds < safeTotalSeconds) {
                setColor("orange");
            }
            else {
                setColor("red");
            }
        } else {
            if (elapsedSeconds < warningStart) setColor("green");
            else if (elapsedSeconds < safeTotalSeconds) setColor("orange");
            else setColor("red");
        }

        const completion = Math.min((elapsedSeconds / safeTotalSeconds) * 100, 100);
        setComplete(completion);
    }
    handleDisplay();
    }, [time.min, time.sec, currentSpeeches]);

    useEffect(()=>{
        function handleBells(){
            if(!isRunning) return;
            const { elapsedSeconds, safeTotalSeconds } = getTimingData();
            const warningStart = Math.max(0, safeTotalSeconds - 60);

            if (elapsedSeconds === warningStart) {
                bellRef.current.play();
            } else if (elapsedSeconds === safeTotalSeconds) {
                bellRef.current.play();
                bellTimeOutRef.current=setTimeout(()=>bellRef2.current.play(),800);
            } else if(elapsedSeconds > safeTotalSeconds && (elapsedSeconds-safeTotalSeconds)%15===0){
                bellRef.current.play();
                bellTimeOutRef.current=setTimeout(()=>bellRef2.current.play(),800);
            }

        }
    handleBells();
    return()=>{
        clearTimeout(bellTimeOutRef.current);
    }
    },[time.min, time.sec, currentSpeeches, isRunning])

    function handlePOI(){
        if(!isRunning || color!=='green' || currentSpeeches.format.speakers[currentSpeeches.index].reply) return;
        if(poi.active) {
            stopPOI();
        }
        else{
            setPoi({ ...defaultValues.poi, active: true, color: 'teal' });
            clearInterval(poiIntervalRef.current);
            poiIntervalRef.current=setInterval(()=>{
                setPoi(prev=>{
                const dur=prev.duration;
                const newDur=dur-1;
                if(newDur>0)
                    return {...prev, duration: newDur};
                else {
                    clearInterval(poiIntervalRef.current);
                    poiIntervalRef.current = null;
                    return {...defaultValues.poi};
                };
                });                  
            },1000);
        }
        }
  return (
    <>
    <div className='debateKeeper'>
        <h3>Debate Keeper</h3>
        <div className="keeperSettings">
            <select name="format" value={currentSpeeches.format.shortHand} onChange={(e)=>{
                stopTimer();
                setCurrentSpeeches({index:0, format: getFormat(e.target.value)});
                setTime({ ...defaultValues.time });
            }}>
                <option value="">Select Format</option>
                {debateFormatTemplates.map((f,i)=><option key={i} value={f.shortHand}>{f.format}</option>)}
            </select>
            <Input type='number' name='speech' placeholder='Speech Duration(min)' value={currentSpeeches.format.duration} onChange={(e)=>{
                const duration = Math.max(1, Number.parseInt(e.target.value, 10) || 1);
                setCurrentSpeeches({
                    ...currentSpeeches,
                    format:{...currentSpeeches.format,duration},
                });
            }} min={1}/>
        </div>
        <div className="display">
            <div className="frame" style={{'--kcolor':color, '--completion': complete}}></div>
            <div className='face'>
                <div className='speaker'>{currentSpeeches.format.speakers[currentSpeeches.index].role}</div>          
                <div className='time' style={{'--kcolor':color, '--completion': complete}} onClick={()=>setIsSetting(true)} onBlur={()=>setIsSetting(false)}>
                    {isSetting? 
                        <div className='timeSet' ref={setRef}>
                            <ul>
                                {timeArray.min.map((m,i)=><li key={i} value={m} onClick={(e)=>setTime({...time, min: zero(e.target.value)})}>{m}</li>)}
                            </ul>
                            <span>:</span>
                            <ul>
                                {timeArray.sec.map((s,i)=><li key={i} value={s} onClick={(e)=>setTime({...time, sec: zero(e.target.value)})}>{s}</li>)}
                            </ul>
                        </div>
                    : <span>{time.min}:{time.sec}</span>
                    }
                </div>
                <div className="poi">
                    <button type="button" className={poi.active ? 'poiButton active' : 'poiButton'} onClick={handlePOI} style={{'--poi':poi.color}}>
                        <span>POI</span>
                        <strong>{poi.active ? zero(poi.duration) : `${defaultValues.poi.duration}s`}</strong>
                    </button>
                </div>           
            </div>
        </div>
        <div className="keeperControls">
            <button type="button" className="keeperButton" onClick={prev} aria-label="Previous speaker">
                <FaStepBackward />
            </button>
            <button type="button" className="keeperButton" onClick={play} aria-label={isRunning ? 'Pause timer' : 'Start timer'}>
                {isRunning ? <FaPause /> : <FaPlay />}
            </button>
            <button type="button" className="keeperButton" onClick={next} aria-label="Next speaker">
                <FaStepForward />
            </button>
            <button type="button" className="keeperButton" onClick={reset} aria-label="Reset timer">
                <FaRedo />
            </button>
            <button type="button" className="keeperButton keeperButtonAccent" onClick={()=> bellRef.current.play()} aria-label="Ring bell">
                <FaBell />
            </button>
        </div>
    </div>
    </>
  )
}

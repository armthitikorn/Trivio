'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, Play, RotateCcw, ShieldCheck, User, ChevronRight, Headphones, CheckCircle2 } from 'lucide-react'

export default function EmployeeMissionHub() {
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState('pin') 
  const [pin, setPin] = useState('')
  const [sessionData, setSessionData] = useState(null)
  const [missions, setMissions] = useState([])
  const [activeMission, setActiveMission] = useState(null)
  const [completedMissions, setCompletedMissions] = useState([])

  // ✅ เพิ่มสถานะ Phase: 'start' | 'recording_1' | 'customer_playing' | 'recording_2' | 'finished'
  const [phase, setPhase] = useState('start')
  const [isRecording, setIsRecording] = useState(false)
  const [firstVoiceUrl, setFirstVoiceUrl] = useState(null) // เสียงพนักงานรอบแรก
  const [secondVoiceUrl, setSecondVoiceUrl] = useState(null) // เสียงพนักงานรอบโต้ตอบ
  
  const mediaRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])

  useEffect(() => { setMounted(true) }, [])

  const resetMissionStates = () => {
    setPhase('start')
    setFirstVoiceUrl(null)
    setSecondVoiceUrl(null)
    setIsRecording(false)
    chunksRef.current = []
  }

  async function handleLogin() {
    if (pin.length < 6) return
    const { data, error } = await supabase.from('game_sessions').select('*').eq('pin', pin).eq('is_active', true)
    if (error || !data || data.length === 0) return alert("ไม่พบรหัส PIN นี้")
    setSessionData(data[0])
    const { data: qData } = await supabase.from('questions').select('*').eq('target_department', data[0].target_department).eq('target_level', data[0].target_level)
    if (qData) setMissions(qData)
    setStep('dashboard')
  }

  // ✅ ปรับปรุงการบันทึกเสียงให้รองรับ 2 รอบ
  async function startRecording() {
    try {
      chunksRef.current = []
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' })
        const url = URL.createObjectURL(blob)
        
        if (phase === 'start') {
          setFirstVoiceUrl(url)
          setPhase('customer_playing') // อัดเสร็จแล้วไป Phase เสียงลูกค้าเล่น
        } else if (phase === 'recording_2') {
          setSecondVoiceUrl(url)
          setPhase('finished') // อัดรอบสองเสร็จแล้วจบ
        }
        setIsRecording(false)
        stream.getTracks().forEach(t => t.stop())
      }
      recorder.start()
      mediaRef.current = recorder
      setIsRecording(true)
    } catch (err) { alert("Mic Error: " + err.message) }
  }

  const stopRecording = () => {
    if (mediaRef.current && mediaRef.current.state === 'recording') mediaRef.current.stop()
  }

  if (!mounted) return null

  // --- UI: LOGIN & DASHBOARD (คงเดิมตามโค้ดคุณ) ---
  if (step === 'pin') return ( /* ... โค้ดส่วน Login เดิม ... */ 
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 text-white font-sans text-center">
      <div className="max-w-md w-full">
        <h1 className="text-3xl font-black mb-10 tracking-tight">Agent Mission Hub</h1>
        <div className="flex gap-2 justify-center mb-10">
          {[...Array(6)].map((_, i) => (<div key={i} className={`w-12 h-16 rounded-2xl border-2 flex items-center justify-center text-2xl font-black ${pin.length > i ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700'}`}>{pin[i] || ''}</div>))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3,4,5,6,7,8,9,0].map(n => (<button key={n} onClick={() => pin.length < 6 && setPin(pin+n)} className="h-16 bg-slate-800 rounded-2xl font-black text-xl hover:bg-slate-700">{n}</button>))}
          <button onClick={() => setPin('')} className="h-16 bg-slate-800 rounded-2xl font-black text-slate-400">CLR</button>
          <button onClick={handleLogin} className="h-16 bg-indigo-600 rounded-2xl font-black flex items-center justify-center"><ArrowRight /></button>
        </div>
      </div>
    </div>
  )

  if (step === 'dashboard') return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <div className="bg-indigo-900 h-48 rounded-b-[50px] p-8 text-white flex flex-col justify-center">
        <h2 className="text-2xl font-black">เริ่มภารกิจใหม่, Agent!</h2>
        <p className="opacity-60 text-[10px] font-bold uppercase tracking-widest">{sessionData?.target_department} • {sessionData?.target_level}</p>
      </div>
      <div className="max-w-xl mx-auto -mt-10 px-6 space-y-4">
        {missions.map((m, idx) => (
          <div key={m.id} onClick={() => { resetMissionStates(); setActiveMission(m); setStep('mission'); }} className="p-6 bg-white rounded-[35px] shadow-sm flex items-center justify-between border-2 border-white hover:border-indigo-200 cursor-pointer transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black">
                {completedMissions.includes(m.id) ? <CheckCircle2 size={20} className="text-green-400" /> : idx + 1}
              </div>
              <div><p className="font-black text-slate-800">{m.category}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{m.question_text}</p></div>
            </div>
            <ChevronRight size={20} className="text-slate-200" />
          </div>
        ))}
      </div>
    </div>
  )

  // --- UI: MISSION (ปรับปรุงลำดับตามโจทย์) ---
  if (step === 'mission') return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col font-sans">
      <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
        <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-8 transition-all ${isRecording ? 'bg-red-500 scale-110 shadow-lg shadow-red-500/50' : phase === 'customer_playing' ? 'bg-orange-500 animate-bounce' : 'bg-indigo-600'}`}>
          {phase === 'customer_playing' ? <Headphones size={60} /> : <User size={60} />}
        </div>
        
        {/* แสดงข้อความตามสถานะ */}
        <div className="mb-6">
          <h2 className="text-2xl font-black uppercase tracking-tight">
            {phase === 'start' && "ขั้นตอนที่ 1: พนักงานเริ่มพูด"}
            {phase === 'customer_playing' && "ลูกค้ากำลังตอบโต้..."}
            {phase === 'recording_2' && "ขั้นตอนที่ 2: ตอบโต้ลูกค้า"}
            {phase === 'finished' && "ภารกิจเสร็จสิ้น"}
          </h2>
          <p className="text-indigo-400 font-bold text-[10px] uppercase tracking-widest mt-2">{activeMission?.category}</p>
        </div>

        <div className="bg-slate-800/50 p-6 rounded-[35px] w-full max-w-sm border border-white/5 shadow-2xl">
          <p className="text-slate-300 italic">
            {phase === 'customer_playing' ? `โจทย์ลูกค้า: "${activeMission?.question_text}"` : "กรุณาบันทึกเสียงเพื่อดำเนินการต่อ"}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-t-[60px] p-12 shadow-[0_-20px_50px_rgba(0,0,0,0.3)] space-y-8">
        <div className="flex justify-center flex-col items-center gap-4">
          
          {/* ✅ ปุ่มอัดเสียงรอบที่ 1 */}
          {phase === 'start' && (
            <div className="text-center">
              <button onPointerDown={startRecording} onPointerUp={stopRecording} className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all ${isRecording ? 'bg-red-500 scale-125' : 'bg-slate-900 text-white'}`}>
                {isRecording ? <Square size={30} fill="currentColor" /> : <Mic size={40} />}
              </button>
              <p className="text-slate-400 font-black text-[10px] mt-4 uppercase tracking-widest">กดค้างเพื่อเริ่มบันทึกเสียงเปิดการขาย</p>
            </div>
          )}

          {/* ✅ Phase: เสียงลูกค้าเล่น (ทำงานอัตโนมัติ) */}
          {phase === 'customer_playing' && activeMission?.audio_question_url && (
            <div className="w-full max-w-sm bg-indigo-600 p-6 rounded-[30px] flex items-center justify-between shadow-xl animate-pulse">
               <div className="flex items-center gap-4">
                 <div className="bg-white/20 p-2 rounded-xl"><Play size={20} fill="white" /></div>
                 <span className="font-black text-[10px] uppercase text-white">Customer Objection Playing...</span>
               </div>
               {/* เมื่อเสียงลูกค้าจบ จะเปลี่ยน Phase ไปที่ recording_2 ทันที */}
               <audio 
                src={supabase.storage.from('recordings').getPublicUrl(activeMission.audio_question_url).data.publicUrl} 
                autoPlay 
                onEnded={() => setPhase('recording_2')} 
                className="hidden" 
               />
               <div className="w-2 h-2 bg-white rounded-full animate-ping" />
            </div>
          )}

          {/* ✅ ปุ่มอัดเสียงรอบที่ 2 (หลังจากเสียงลูกค้าจบ) */}
          {phase === 'recording_2' && (
            <div className="text-center">
              <button onPointerDown={startRecording} onPointerUp={stopRecording} className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all ${isRecording ? 'bg-red-500 scale-125' : 'bg-orange-500 text-white'}`}>
                {isRecording ? <Square size={30} fill="currentColor" /> : <Mic size={40} />}
              </button>
              <p className="text-slate-800 font-black text-[10px] mt-4 uppercase tracking-widest">กดค้างเพื่อตอบโต้ข้อโต้แย้งลูกค้า</p>
            </div>
          )}

          {/* ✅ ปุ่มส่งงานเมื่อเสร็จสิ้น */}
          {phase === 'finished' && (
             <div className="flex gap-4 w-full max-w-sm">
                <button onClick={resetMissionStates} className="flex-1 bg-slate-100 h-20 rounded-[30px] font-black text-slate-700 flex items-center justify-center gap-2"><RotateCcw size={20}/> เริ่มใหม่</button>
                <button onClick={() => { setCompletedMissions([...completedMissions, activeMission.id]); setStep('dashboard'); }} className="flex-1 bg-green-500 h-20 rounded-[30px] font-black text-white flex items-center justify-center gap-2 shadow-xl"><ShieldCheck size={20}/> ส่งงานเข้าระบบ</button>
             </div>
          )}

        </div>
        <button onClick={() => setStep('dashboard')} className="w-full text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] text-center">ยกเลิกภารกิจ</button>
      </div>
    </div>
  )
}

const ArrowRight = () => <span>→</span>
'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, Mic, Square, Play, RotateCcw, ShieldCheck, User, ChevronRight, Star } from 'lucide-react'

export default function EmployeeMissionHub() {
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState('pin') 
  const [pin, setPin] = useState('')
  const [sessionData, setSessionData] = useState(null)
  const [missions, setMissions] = useState([])
  const [activeMission, setActiveMission] = useState(null)
  const [completedMissions, setCompletedMissions] = useState([])

  const [isRecording, setIsRecording] = useState(false)
  const [agentVoiceUrl, setAgentVoiceUrl] = useState(null)
  const [showCustomerResponse, setShowCustomerResponse] = useState(false)

  const mediaRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])

  useEffect(() => { setMounted(true) }, [])

  // ✅ ฟังก์ชันล้างค่า (Reset)
  const resetMission = () => {
    if (agentVoiceUrl) URL.revokeObjectURL(agentVoiceUrl)
    setAgentVoiceUrl(null)
    setShowCustomerResponse(false)
    setIsRecording(false)
    chunksRef.current = []
  }

  // ✅ แก้ปัญหา 406: ใช้การดึงข้อมูลแบบเรียบง่ายที่สุด
  async function handleLogin() {
    if (pin.length < 6) return
    const { data, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('pin', pin)
      .eq('is_active', true)

    if (error || !data || data.length === 0) {
      alert("ไม่พบรหัส PIN นี้")
      return
    }

    const session = data[0]
    setSessionData(session)

    const { data: qData } = await supabase
      .from('questions')
      .select('*')
      .eq('target_department', session.target_department)
      .eq('target_level', session.target_level)
    
    if (qData) setMissions(qData)
    setStep('dashboard')
  }

  // ✅ แก้ปัญหา ReferenceError: ฟังก์ชันต้องชื่อ "startRecording" ให้ตรงกับปุ่ม
  async function startRecording() {
    resetMission()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: 'audio/wav' })
          setAgentVoiceUrl(URL.createObjectURL(blob))
          setShowCustomerResponse(true)
        }
        setIsRecording(false)
        stream.getTracks().forEach(t => t.stop())
      }

      recorder.start()
      mediaRef.current = recorder
      setIsRecording(true)
    } catch (err) { alert("Mic Error: " + err.message) }
  }

  // ✅ ฟังก์ชันหยุดอัด (ต้องชื่อ "stopRecording")
  const stopRecording = () => {
    if (mediaRef.current && mediaRef.current.state === 'recording') {
      mediaRef.current.stop()
    }
  }

  if (!mounted) return null

  // --- UI: LOGIN PIN ---
  if (step === 'pin') return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 text-white font-sans text-center">
      <div className="max-w-md w-full">
        <h1 className="text-3xl font-black mb-10 tracking-tight">Agent Mission Hub</h1>
        <div className="flex gap-2 justify-center mb-10">
          {[...Array(6)].map((_, i) => (<div key={i} className={`w-12 h-16 rounded-2xl border-2 flex items-center justify-center text-2xl font-black ${pin.length > i ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700'}`}>{pin[i] || ''}</div>))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3,4,5,6,7,8,9,0].map(n => (<button key={n} onClick={() => pin.length < 6 && setPin(pin+n)} className="h-16 bg-slate-800 rounded-2xl font-black text-xl hover:bg-slate-700 transition">{n}</button>))}
          <button onClick={() => setPin('')} className="h-16 bg-slate-800 rounded-2xl font-black text-slate-400">CLR</button>
          <button onClick={handleLogin} className="h-16 bg-indigo-600 rounded-2xl font-black flex items-center justify-center shadow-lg"><ArrowRight /></button>
        </div>
      </div>
    </div>
  )

  // --- UI: DASHBOARD ---
  if (step === 'dashboard') return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <div className="bg-indigo-900 h-48 rounded-b-[50px] p-8 text-white relative overflow-hidden flex flex-col justify-center">
        <h2 className="text-2xl font-black relative z-10">เริ่มภารกิจใหม่, Agent!</h2>
        <p className="opacity-60 text-[10px] font-bold uppercase tracking-widest mt-1">{sessionData?.target_department} • {sessionData?.target_level}</p>
      </div>
      <div className="max-w-xl mx-auto -mt-10 px-6 space-y-4">
        {missions.map((m, idx) => (
          <div key={m.id} onClick={() => { resetMission(); setActiveMission(m); setStep('mission'); }} className="p-6 bg-white rounded-[35px] shadow-sm flex items-center justify-between border-2 border-white hover:border-indigo-200 cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black">{idx + 1}</div>
              <div><p className="font-black text-slate-800 leading-tight">{m.category}</p><p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{m.question_text}</p></div>
            </div>
            <ChevronRight size={20} className="text-slate-200" />
          </div>
        ))}
      </div>
    </div>
  )

  // --- UI: MISSION ---
  if (step === 'mission') return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col font-sans">
      <div className="flex-1 flex flex-col items-center justify-center p-10">
        <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-10 transition-all ${isRecording ? 'bg-red-500 scale-110 shadow-lg shadow-red-500/50' : 'bg-indigo-600'}`}>
          <User size={60} />
        </div>
        <h2 className="text-2xl font-black mb-1">{activeMission?.category}</h2>
        <div className="bg-slate-800/50 p-6 rounded-[40px] w-full max-w-sm text-center border border-white/5">
          <p className="text-slate-300 italic">"{activeMission?.question_text}"</p>
        </div>
      </div>
      <div className="bg-white rounded-t-[60px] p-12 shadow-2xl space-y-10">
        <div className="flex justify-center">
          {!agentVoiceUrl ? (
            <button 
              onPointerDown={startRecording} // ✅ ชื่อฟังก์ชันตรงกับที่ประกาศไว้
              onPointerUp={stopRecording}    // ✅ ชื่อฟังก์ชันตรงกับที่ประกาศไว้
              className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all ${isRecording ? 'bg-red-500 scale-125 shadow-red-200' : 'bg-slate-900 text-white shadow-slate-300'}`}
            >
              {isRecording ? <Square fill="currentColor" size={30} /> : <Mic size={40} />}
            </button>
          ) : (
            <div className="flex gap-4 w-full max-w-sm">
              <button onClick={() => resetMission()} className="flex-1 bg-slate-100 h-16 rounded-[30px] font-black text-slate-700 flex items-center justify-center gap-2">อัดใหม่</button>
              <button onClick={() => { setCompletedMissions([...completedMissions, activeMission.id]); setStep('dashboard'); }} className="flex-1 bg-green-500 h-16 rounded-[30px] font-black text-white flex items-center justify-center gap-2 shadow-xl">ส่งงาน</button>
            </div>
          )}
        </div>
        <AnimatePresence>
          {showCustomerResponse && activeMission?.audio_question_url && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-sm mx-auto bg-indigo-600 p-5 rounded-[30px] flex items-center justify-between shadow-xl shadow-indigo-100 border-2 border-indigo-400">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-2xl"><Play size={20} fill="white" /></div>
                <span className="font-black text-[10px] uppercase tracking-widest text-white">Customer Response...</span>
              </div>
              <audio src={supabase.storage.from('recordings').getPublicUrl(activeMission.audio_question_url).data.publicUrl} autoPlay className="hidden" />
              <div className="w-2 h-2 bg-white rounded-full animate-ping" />
            </motion.div>
          )}
        </AnimatePresence>
        <button onClick={() => setStep('dashboard')} className="w-full text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] text-center">กลับหน้าหลัก</button>
      </div>
    </div>
  )
}

// Icon จำลองในกรณีที่ไม่ได้ลง Lucide (กัน Build Error)
const ArrowRight = () => <span>→</span>
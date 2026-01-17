'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, Mic, CheckCircle2, ArrowRight, Headset, Star, User, ChevronRight, Square, Play, RotateCcw, ShieldCheck } from 'lucide-react'

export default function MasterEmployeeHub() {
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState('pin') 
  const [pin, setPin] = useState('')
  const [sessionData, setSessionData] = useState(null)
  const [missions, setMissions] = useState([])
  const [activeMission, setActiveMission] = useState(null)
  const [completedMissions, setCompletedMissions] = useState([])
  const [isRecording, setIsRecording] = useState(false)
  const [agentVoiceUrl, setAgentVoiceUrl] = useState(null)
  const [showResponse, setShowResponse] = useState(false)

  const mediaRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])

  useEffect(() => { setMounted(true) }, [])

  // ✅ ฟังก์ชัน Hard Reset ล้างหน่วยความจำเสียงทิ้งทั้งหมด 100%
  const forceReset = () => {
    if (agentVoiceUrl) URL.revokeObjectURL(agentVoiceUrl)
    setAgentVoiceUrl(null)
    setShowResponse(false)
    setIsRecording(false)
    chunksRef.current = []
    if (mediaRef.current && mediaRef.current.state !== 'inactive') mediaRef.current.stop()
  }

  async function handleLogin() {
    if (pin.length !== 6) return
    const { data } = await supabase.from('game_sessions').select('*').eq('pin', pin).eq('is_active', true).single()
    if (data) {
      setSessionData(data)
      const { data: qData } = await supabase.from('questions').select('*').eq('target_department', data.target_department).eq('target_level', data.target_level)
      if (qData) setMissions(qData)
      setStep('dashboard')
    } else { alert("PIN ไม่ถูกต้อง") }
  }

  async function startRec() {
    try {
      forceReset()
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' })
        setAgentVoiceUrl(URL.createObjectURL(blob))
        setIsRecording(false)
        setShowResponse(true)
        stream.getTracks().forEach(t => t.stop())
      }
      recorder.start(); mediaRef.current = recorder; setIsRecording(true)
    } catch (err) { alert("Mic Error: " + err.message) }
  }

  if (!mounted) return null

  // --- UI: LOGIN PIN ---
  if (step === 'pin') return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 text-white">
      <div className="max-w-md w-full text-center">
        <div className="bg-indigo-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-indigo-500/20"><Headset size={40} /></div>
        <h1 className="text-3xl font-black mb-10 tracking-tight">Agent Mission Hub</h1>
        <div className="flex gap-2 justify-center mb-10">
          {[...Array(6)].map((_, i) => (<div key={i} className={`w-12 h-16 rounded-2xl border-2 flex items-center justify-center text-2xl font-black ${pin.length > i ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 bg-slate-800'}`}>{pin[i] || ''}</div>))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3,4,5,6,7,8,9].map(n => (<button key={n} onClick={() => pin.length < 6 && setPin(pin+n)} className="h-16 bg-slate-800 rounded-2xl font-black text-xl hover:bg-slate-700 active:scale-95 transition">{n}</button>))}
          <button onClick={() => setPin('')} className="h-16 bg-slate-800 rounded-2xl font-black text-slate-400">CLR</button>
          <button onClick={() => pin.length < 6 && setPin(pin+'0')} className="h-16 bg-slate-800 rounded-2xl font-black text-xl">0</button>
          <button onClick={handleLogin} className="h-16 bg-indigo-600 rounded-2xl font-black flex items-center justify-center shadow-lg"><ArrowRight /></button>
        </div>
      </div>
    </div>
  )

  // --- UI: DASHBOARD (Header Fix) ---
  if (step === 'dashboard') return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <div className="bg-indigo-900 h-48 rounded-b-[50px] p-8 text-white relative overflow-hidden flex flex-col justify-center">
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-4"><span className="bg-white/10 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">Training Session</span><span className="flex items-center gap-1 font-bold text-yellow-400"><Star size={16} fill="currentColor" /> {completedMissions.length * 100} XP</span></div>
          <h2 className="text-2xl font-black">พร้อมรับภารกิจใหม่, Agent!</h2>
          <p className="opacity-60 text-[10px] font-bold uppercase tracking-widest">{sessionData?.target_department} • {sessionData?.target_level}</p>
        </div>
        <Phone className="absolute bottom-[-30px] right-5 opacity-10 rotate-12" size={180} />
      </div>
      <div className="max-w-xl mx-auto -mt-10 px-6 space-y-4">
        <div className="bg-white p-6 rounded-[35px] shadow-xl border-4 border-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center font-black text-indigo-600 text-xl italic">{Math.round((completedMissions.length / (missions.length || 1)) * 100)}%</div>
            <p className="font-black text-slate-800">ความคืบหน้าภารกิจ</p>
          </div>
        </div>
        <div className="pt-6 space-y-3">
          {missions.map((m, idx) => {
            const isDone = completedMissions.includes(m.id)
            return (
              <div key={m.id} onClick={() => { forceReset(); setActiveMission(m); setStep('mission'); }} className={`p-6 bg-white rounded-[35px] shadow-sm flex items-center justify-between border-2 transition-all cursor-pointer ${isDone ? 'border-green-500 bg-green-50/20' : 'border-white hover:border-indigo-200'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${isDone ? 'bg-green-500 text-white shadow-lg' : 'bg-slate-900 text-white'}`}>{isDone ? '✓' : idx + 1}</div>
                  <div><p className="font-black text-slate-800 leading-tight">{m.category}</p><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{m.question_text}</p></div>
                </div>
                <ChevronRight size={20} className="text-slate-200" />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  // --- UI: MISSION ---
  if (step === 'mission') return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col font-sans">
      <div className="flex-1 flex flex-col items-center justify-center p-10">
        <div className={`w-32 h-32 rounded-full flex items-center justify-center relative mb-10 transition-all ${isRecording ? 'bg-red-500 shadow-red-500/50 scale-110' : 'bg-indigo-600'}`}>
          <User size={60} /><AnimatePresence>{isRecording && <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute inset-0 bg-red-500 rounded-full" />}</AnimatePresence>
        </div>
        <h2 className="text-2xl font-black mb-1">{activeMission?.category}</h2>
        <p className="text-indigo-400 font-black text-[10px] tracking-[0.4em] uppercase mb-10">Simulator Calling...</p>
        <div className="bg-slate-800/50 p-6 rounded-[40px] w-full max-w-sm text-center border border-white/5"><p className="text-slate-300 italic">"{activeMission?.question_text}"</p></div>
      </div>
      <div className="bg-white rounded-t-[60px] p-12 shadow-2xl space-y-10">
        <div className="flex justify-center">
          {!agentVoiceUrl ? (
            <button onPointerDown={startRec} onPointerUp={() => mediaRef.current?.stop()} className={`w-28 h-28 rounded-full flex items-center justify-center shadow-2xl transition-all ${isRecording ? 'bg-red-500' : 'bg-slate-900 text-white'}`}>{isRecording ? <Square fill="currentColor" size={30} /> : <Mic size={40} />}</button>
          ) : (
            <div className="flex gap-4 w-full max-w-sm">
              <button onClick={() => forceReset()} className="flex-1 bg-slate-100 h-20 rounded-[30px] font-black text-slate-700 flex items-center justify-center gap-2"><RotateCcw size={22} /> อัดใหม่</button>
              <button onClick={() => { setCompletedMissions([...completedMissions, activeMission.id]); setStep('dashboard'); }} className="flex-1 bg-green-500 h-20 rounded-[30px] font-black text-white flex items-center justify-center gap-2 shadow-xl shadow-green-100"><ShieldCheck size={24} /> ส่งงาน</button>
            </div>
          )}
        </div>
        <AnimatePresence>
          {showResponse && activeMission?.audio_question_url && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-sm mx-auto bg-indigo-600 p-6 rounded-[35px] flex items-center justify-between shadow-xl shadow-indigo-100 border-2 border-indigo-400">
              <div className="flex items-center gap-4"><div className="bg-white/20 p-3 rounded-2xl"><Play size={24} fill="white" /></div><span className="font-black text-[10px] uppercase tracking-widest text-white">Customer Response...</span></div>
              <audio src={supabase.storage.from('recordings').getPublicUrl(activeMission.audio_question_url).data.publicUrl} autoPlay className="hidden" />
              <div className="w-2 h-2 bg-white rounded-full animate-ping" />
            </motion.div>
          )}
        </AnimatePresence>
        <button onClick={() => setStep('dashboard')} className="w-full text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] text-center">วางสาย (กลับหน้าหลัก)</button>
      </div>
    </div>
  )
}
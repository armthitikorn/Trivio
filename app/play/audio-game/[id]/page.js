'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, Mic, CheckCircle2, ArrowRight, Headset, Star, User, ChevronRight, Square, Play, RotateCcw, ShieldCheck } from 'lucide-react'

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

  async function handleLogin() {
    if (pin.length !== 6) return
    const { data } = await supabase.from('game_sessions').select('*').eq('pin', pin).eq('is_active', true).single()
    if (data) {
      setSessionData(data)
      const { data: qData } = await supabase.from('questions').select('*').eq('target_department', data.target_department).eq('target_level', data.target_level).order('created_at', { ascending: true })
      if (qData) setMissions(qData)
      setStep('dashboard')
    } else { alert("รหัส PIN ไม่ถูกต้อง") }
  }

  // --- SAFE AUDIO ENGINE (FOR MOBILE) ---
  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); streamRef.current = stream;
    const recorder = new MediaRecorder(stream); chunksRef.current = [];
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
      setAgentVoiceUrl(URL.createObjectURL(blob));
      setIsRecording(false); setShowCustomerResponse(true);
      stream.getTracks().forEach(t => t.stop());
    }
    recorder.start(); mediaRef.current = recorder; setIsRecording(true);
  }

  if (!mounted) return null

  if (step === 'pin') return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 text-white font-sans">
      <div className="max-w-md w-full text-center">
        <div className="bg-indigo-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-10 shadow-2xl"><Headset size={40} /></div>
        <h1 className="text-3xl font-black mb-10 tracking-tight">Agent Mission Hub</h1>
        <div className="flex gap-2 justify-center mb-10">
          {[...Array(6)].map((_, i) => (<div key={i} className={`w-12 h-16 rounded-2xl border-2 flex items-center justify-center text-2xl font-black ${pin.length > i ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700'}`}>{pin[i] || ''}</div>))}
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

  if (step === 'dashboard') return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <div className="bg-indigo-800 h-64 rounded-b-[60px] p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-6"><span className="bg-white/10 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Training Session</span><span className="flex items-center gap-1 font-bold text-yellow-400"><Star size={16} fill="currentColor" /> {completedMissions.length * 100} PTS</span></div>
          <h2 className="text-3xl font-black">เริ่มภารกิจของวันนี้!</h2>
          <p className="opacity-70 font-bold">แผนก: {sessionData?.target_department} | Level: {sessionData?.target_level}</p>
        </div>
        <Phone className="absolute bottom-[-30px] right-5 opacity-10" size={200} />
      </div>
      <div className="max-w-xl mx-auto -mt-12 px-6 space-y-3">
        {missions.map((m, idx) => {
          const isDone = completedMissions.includes(m.id)
          return (
            <div key={m.id} onClick={() => { setActiveMission(m); setStep('mission'); }} className={`p-6 bg-white rounded-[35px] shadow-sm flex items-center justify-between border-2 transition-all cursor-pointer ${isDone ? 'border-green-500 shadow-green-100' : 'border-white hover:border-indigo-200 shadow-slate-100'}`}>
              <div className="flex items-center gap-4"><div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${isDone ? 'bg-green-500 text-white' : 'bg-slate-800 text-white'}`}>{isDone ? <CheckCircle2 size={24} /> : idx + 1}</div><div><p className="font-black text-slate-800 leading-tight">{m.category}</p><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{m.question_text}</p></div></div>
              <ChevronRight size={20} className="text-slate-300" />
            </div>
          )
        })}
      </div>
    </div>
  )

  if (step === 'mission') return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col font-sans">
      
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className={`w-32 h-32 rounded-full flex items-center justify-center relative z-10 transition-all ${isRecording ? 'bg-red-500 shadow-[0_0_50px_rgba(239,68,68,0.5)]' : 'bg-indigo-600'}`}>
          <User size={60} />
          {isRecording && <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute inset-0 bg-red-500 rounded-full" />}
        </div>
        <h2 className="text-2xl font-black mt-8">{activeMission?.category}</h2>
        <p className="text-indigo-400 font-black text-[10px] tracking-[0.3em] uppercase mb-8">Calling Customer...</p>
        <div className="bg-slate-800/40 p-6 rounded-[35px] w-full max-w-sm text-center border border-slate-700/50"><p className="text-slate-300 font-medium italic opacity-80">"{activeMission?.question_text}"</p></div>
      </div>
      <div className="bg-slate-900 rounded-t-[60px] p-10 shadow-2xl space-y-8">
        {!agentVoiceUrl ? (
          <button onPointerDown={startRecording} onPointerUp={() => mediaRef.current?.stop()} className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 scale-125' : 'bg-white text-slate-900'}`}>{isRecording ? <Square fill="currentColor" size={28} /> : <Mic size={35} />}</button>
        ) : (
          <div className="flex gap-4 max-w-sm mx-auto">
            <button onClick={() => {setAgentVoiceUrl(null); setShowCustomerResponse(false);}} className="flex-1 bg-slate-800 h-16 rounded-3xl font-black flex items-center justify-center gap-2"><RotateCcw size={20} /> อัดใหม่</button>
            <button onClick={() => { setCompletedMissions([...completedMissions, activeMission.id]); setStep('dashboard'); }} className="flex-1 bg-green-500 h-16 rounded-3xl font-black flex items-center justify-center gap-2"><ShieldCheck size={20} /> จบภารกิจ</button>
          </div>
        )}
        <AnimatePresence>
          {showCustomerResponse && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-sm mx-auto bg-indigo-600 p-5 rounded-[30px] flex items-center justify-between">
              <div className="flex items-center gap-3"><Play size={20} fill="white" /> <span className="font-black text-[10px] uppercase tracking-widest">Customer Response...</span></div>
              <audio src={supabase.storage.from('recordings').getPublicUrl(activeMission.audio_question_url).data.publicUrl} autoPlay className="hidden" />
              <div className="w-2 h-2 bg-white rounded-full animate-ping" />
            </motion.div>
          )}
        </AnimatePresence>
        <button onClick={() => setStep('dashboard')} className="w-full text-slate-500 font-bold text-[10px] uppercase tracking-widest">วางสาย (กลับหน้าหลัก)</button>
      </div>
    </div>
  )
}
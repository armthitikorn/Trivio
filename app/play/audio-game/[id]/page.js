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
    } else { alert("PIN ไม่ถูกต้อง") }
  }

  // --- SAFE RECORDER FOR MOBILE ---
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAgentVoiceUrl(URL.createObjectURL(blob));
        setIsRecording(false); setShowCustomerResponse(true);
        stream.getTracks().forEach(t => t.stop());
      }
      recorder.start(); mediaRef.current = recorder; setIsRecording(true);
      setShowCustomerResponse(false); setAgentVoiceUrl(null);
    } catch (e) { alert("ไม่สามารถเข้าถึงไมค์ได้: " + e.message); }
  }

  if (!mounted) return null

  if (step === 'pin') return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 text-white font-sans">
      <div className="max-w-md w-full text-center">
        <div className="bg-indigo-600 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-indigo-500/20"><Headset size={48} /></div>
        <h1 className="text-4xl font-black mb-10 tracking-tight">Mission Hub</h1>
        <div className="flex gap-2 justify-center mb-10">
          {[...Array(6)].map((_, i) => (<div key={i} className={`w-12 h-18 rounded-2xl border-2 flex items-center justify-center text-3xl font-black transition-all ${pin.length > i ? 'border-indigo-500 bg-indigo-500/20' : 'border-slate-700 bg-slate-800'}`}>{pin[i] || ''}</div>))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3,4,5,6,7,8,9].map(n => (<button key={n} onClick={() => pin.length < 6 && setPin(pin+n)} className="h-18 bg-slate-800 rounded-3xl font-black text-2xl hover:bg-slate-700 transition active:scale-95">{n}</button>))}
          <button onClick={() => setPin('')} className="h-18 bg-slate-800 rounded-3xl font-black text-slate-400">CLR</button>
          <button onClick={() => pin.length < 6 && setPin(pin+'0')} className="h-18 bg-slate-800 rounded-3xl font-black text-2xl">0</button>
          <button onClick={handleLogin} className="h-18 bg-indigo-600 rounded-3xl font-black flex items-center justify-center shadow-lg"><ArrowRight /></button>
        </div>
      </div>
    </div>
  )

  if (step === 'dashboard') return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-20">
      <div className="bg-indigo-900 h-72 rounded-b-[70px] p-10 text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col justify-end h-full">
          <div className="flex justify-between items-center mb-8"><span className="bg-white/10 px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest">Active Mission</span><span className="flex items-center gap-2 font-black text-yellow-400 bg-black/20 px-4 py-2 rounded-2xl"><Star size={18} fill="currentColor" /> {completedMissions.length * 100} PTS</span></div>
          <h2 className="text-4xl font-black mb-1 leading-none tracking-tight">สวัสดี, นักขายมือทอง!</h2>
          <p className="opacity-60 font-bold">สังกัด: {sessionData?.target_department} | LVL: {sessionData?.target_level}</p>
        </div>
        <Phone className="absolute bottom-[-50px] right-[-20px] opacity-10" size={250} />
      </div>
      <div className="max-w-xl mx-auto -mt-16 px-6 space-y-4">
        <div className="bg-white p-8 rounded-[40px] shadow-2xl shadow-indigo-100 flex items-center justify-between border-4 border-white">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center font-black text-indigo-600 text-2xl italic">{Math.round((completedMissions.length / missions.length) * 100) || 0}%</div>
            <div><p className="font-black text-slate-800 text-lg">Mission Progress</p><p className="text-xs text-slate-400 font-bold tracking-tight">สำเร็จแล้ว {completedMissions.length} / {missions.length} บท</p></div>
          </div>
        </div>
        <div className="pt-10 space-y-4">
          {missions.map((m, idx) => {
            const isDone = completedMissions.includes(m.id)
            return (
              <motion.div whileTap={{ scale: 0.98 }} key={m.id} onClick={() => { setActiveMission(m); setStep('mission'); }} className={`p-6 bg-white rounded-[40px] shadow-sm flex items-center justify-between border-2 transition-all cursor-pointer ${isDone ? 'border-green-500 shadow-green-100' : 'border-white hover:border-indigo-200 shadow-slate-200/50'}`}>
                <div className="flex items-center gap-5"><div className={`w-14 h-14 rounded-[20px] flex items-center justify-center font-black ${isDone ? 'bg-green-500 text-white shadow-lg' : 'bg-slate-900 text-white'}`}>{isDone ? <CheckCircle2 size={28} /> : idx + 1}</div><div><p className="font-black text-slate-800 text-lg leading-tight">{m.category}</p><p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">{m.question_text}</p></div></div>
                <ChevronRight size={24} className="text-slate-200" />
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )

  if (step === 'mission') return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col font-sans overflow-hidden">
      
      <div className="flex-1 flex flex-col items-center justify-center p-10">
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="relative mb-12">
          <div className={`w-36 h-36 rounded-full flex items-center justify-center shadow-3xl relative z-10 transition-all duration-500 ${isRecording ? 'bg-red-500 shadow-red-500/50' : 'bg-indigo-600 shadow-indigo-500/50'}`}><User size={70} /></div>
          {isRecording && <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute inset-0 bg-red-500 rounded-full" />}
        </motion.div>
        <h2 className="text-3xl font-black mb-1 tracking-tight">{activeMission?.category}</h2>
        <p className="text-indigo-400 font-black text-[10px] tracking-[0.4em] uppercase mb-10">Communication Active...</p>
        <div className="bg-white/5 backdrop-blur-md p-8 rounded-[45px] w-full max-w-sm text-center border border-white/10 shadow-2xl"><p className="text-slate-300 font-medium italic leading-relaxed text-lg">"{activeMission?.question_text}"</p></div>
      </div>
      <div className="bg-white rounded-t-[70px] p-12 shadow-[0_-20px_60px_rgba(0,0,0,0.3)] space-y-10">
        <div className="flex justify-center">
          {!agentVoiceUrl ? (
            <button onPointerDown={startRecording} onPointerUp={() => mediaRef.current?.stop()} className={`w-28 h-28 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${isRecording ? 'bg-red-500 scale-125 shadow-red-200' : 'bg-slate-900 text-white shadow-slate-300'}`}>{isRecording ? <Square fill="currentColor" size={32} /> : <Mic size={40} />}</button>
          ) : (
            <div className="flex gap-4 w-full max-w-sm">
              <button onClick={() => {setAgentVoiceUrl(null); setShowCustomerResponse(false);}} className="flex-1 bg-slate-100 h-20 rounded-[30px] font-black text-slate-900 flex items-center justify-center gap-2 hover:bg-slate-200 transition"><RotateCcw size={24} /> อัดใหม่</button>
              <button onClick={() => { setCompletedMissions([...completedMissions, activeMission.id]); setStep('dashboard'); }} className="flex-1 bg-green-500 h-20 rounded-[30px] font-black text-white flex items-center justify-center gap-2 shadow-xl shadow-green-100 hover:bg-green-600 transition"><ShieldCheck size={24} /> จบภารกิจ</button>
            </div>
          )}
        </div>
        <AnimatePresence>
          {showCustomerResponse && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-sm mx-auto bg-indigo-600 p-6 rounded-[35px] flex items-center justify-between shadow-xl shadow-indigo-100">
              <div className="flex items-center gap-4"><div className="bg-white/20 p-3 rounded-2xl"><Play size={24} fill="white" /></div><span className="font-black text-[11px] uppercase tracking-widest text-white">Customer Feedback...</span></div>
              <audio src={supabase.storage.from('recordings').getPublicUrl(activeMission.audio_question_url).data.publicUrl} autoPlay className="hidden" />
              <div className="w-3 h-3 bg-white rounded-full animate-ping" />
            </motion.div>
          )}
        </AnimatePresence>
        <button onClick={() => setStep('dashboard')} className="w-full text-slate-400 font-black text-[11px] uppercase tracking-[0.4em] hover:text-slate-900 transition">วางสาย / กลับหน้าหลัก</button>
      </div>
    </div>
  )
}
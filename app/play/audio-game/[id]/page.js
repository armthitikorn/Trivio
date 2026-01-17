'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Phone, Mic, CheckCircle2, ArrowRight, Headset, Star, User, 
  ChevronRight, Square, Play, RotateCcw, ShieldCheck, AlertCircle 
} from 'lucide-react'

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

  // ✅ ล้างค่าสถานะทุกอย่างของภารกิจ
  const resetMissionState = () => {
    setAgentVoiceUrl(null)
    setShowCustomerResponse(false)
    setIsRecording(false)
    chunksRef.current = []
    if (mediaRef.current && mediaRef.current.state !== 'inactive') {
      mediaRef.current.stop()
    }
  }

  async function handleLogin() {
    if (pin.length !== 6) return
    const { data } = await supabase.from('game_sessions').select('*').eq('pin', pin).eq('is_active', true).single()
    if (data) {
      setSessionData(data)
      const { data: qData } = await supabase.from('questions')
        .select('*')
        .eq('target_department', data.target_department)
        .eq('target_level', data.target_level)
        .order('created_at', { ascending: true })
      if (qData) setMissions(qData)
      setStep('dashboard')
    } else { alert("รหัส PIN ไม่ถูกต้อง") }
  }

  async function startRecording() {
    resetMissionState() // ล้างค่าก่อนอัดใหม่ทุกครั้ง
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const recorder = new MediaRecorder(stream, { mimeType })
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setAgentVoiceUrl(URL.createObjectURL(blob))
        setIsRecording(false)
        setShowCustomerResponse(true)
        stream.getTracks().forEach(t => t.stop())
      }

      recorder.start()
      mediaRef.current = recorder
      setIsRecording(true)
    } catch (err) {
      alert("ไม่สามารถเข้าถึงไมโครโฟนได้: " + err.message)
    }
  }

  const stopRecording = () => {
    if (mediaRef.current && mediaRef.current.state === 'recording') {
      mediaRef.current.stop()
    }
  }

  if (!mounted) return null

  // ---------------------------------------------------------
  // UI: PIN ENTRY
  // ---------------------------------------------------------
  if (step === 'pin') return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 text-white font-sans">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full text-center">
        <div className="bg-indigo-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-indigo-500/20"><Headset size={40} /></div>
        <h1 className="text-3xl font-black mb-10 tracking-tight">Agent Mission Hub</h1>
        <div className="flex gap-2 justify-center mb-10">
          {[...Array(6)].map((_, i) => (<div key={i} className={`w-12 h-16 rounded-2xl border-2 flex items-center justify-center text-2xl font-black transition-all ${pin.length > i ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'border-slate-700 bg-slate-800 text-slate-500'}`}>{pin[i] || ''}</div>))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3,4,5,6,7,8,9].map(n => (<button key={n} onClick={() => pin.length < 6 && setPin(pin+n)} className="h-16 bg-slate-800 rounded-2xl font-black text-xl hover:bg-slate-700 active:scale-95 transition">{n}</button>))}
          <button onClick={() => setPin('')} className="h-16 bg-slate-800 rounded-2xl font-black text-slate-400">CLR</button>
          <button onClick={() => pin.length < 6 && setPin(pin+'0')} className="h-16 bg-slate-800 rounded-2xl font-black text-xl">0</button>
          <button onClick={handleLogin} className="h-16 bg-indigo-600 rounded-2xl font-black flex items-center justify-center shadow-lg hover:bg-indigo-500 transition"><ArrowRight /></button>
        </div>
      </motion.div>
    </div>
  )

  // ---------------------------------------------------------
  // UI: DASHBOARD
  // ---------------------------------------------------------
  if (step === 'dashboard') return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <div className="bg-indigo-800 h-64 rounded-b-[60px] p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-6"><span className="bg-white/10 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">Mission Control</span><span className="flex items-center gap-1 font-bold text-yellow-400"><Star size={16} fill="currentColor" /> {completedMissions.length * 100} XP</span></div>
          <h2 className="text-3xl font-black mb-1 leading-tight text-white">พร้อมสำหรับภารกิจใหม่<br/>หรือยัง, Agent?</h2>
          <p className="opacity-60 font-bold text-sm uppercase tracking-widest mt-2">{sessionData?.target_department} • {sessionData?.target_level}</p>
        </div>
        <Phone className="absolute bottom-[-30px] right-5 opacity-10 rotate-12" size={220} />
      </div>
      <div className="max-w-xl mx-auto -mt-12 px-6 space-y-4">
        <div className="bg-white p-7 rounded-[40px] shadow-2xl shadow-slate-200/50 flex items-center justify-between border-4 border-white">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center font-black text-indigo-600 text-2xl italic">{Math.round((completedMissions.length / missions.length) * 100) || 0}%</div>
            <div><p className="font-black text-slate-800 text-lg">ความคืบหน้า</p><p className="text-xs text-slate-400 font-bold tracking-tight">ทำสำเร็จ {completedMissions.length} จาก {missions.length} บท</p></div>
          </div>
        </div>
        <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-[0.3em] ml-2 mt-10 mb-4">Missions List</h3>
        <div className="space-y-4">
          {missions.map((m, idx) => {
            const isDone = completedMissions.includes(m.id)
            return (
              <motion.div 
                whileTap={{ scale: 0.97 }}
                key={m.id} 
                onClick={() => { resetMissionState(); setActiveMission(m); setStep('mission'); }} 
                className={`p-6 bg-white rounded-[35px] shadow-sm flex items-center justify-between border-2 transition-all cursor-pointer ${isDone ? 'border-green-500 bg-green-50/30' : 'border-white hover:border-indigo-200 shadow-slate-100'}`}
              >
                <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black ${isDone ? 'bg-green-500 text-white shadow-lg' : 'bg-slate-900 text-white shadow-md'}`}>{isDone ? <CheckCircle2 size={28} /> : idx + 1}</div>
                  <div><p className={`font-black text-lg leading-none ${isDone ? 'text-green-700' : 'text-slate-800'}`}>{m.category}</p><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">{m.question_text}</p></div>
                </div>
                <ChevronRight size={24} className={isDone ? 'text-green-400' : 'text-slate-300'} />
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )

  // ---------------------------------------------------------
  // UI: MISSION WORKSPACE
  // ---------------------------------------------------------
  if (step === 'mission') return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col font-sans overflow-hidden">
      
      <div className="flex-1 flex flex-col items-center justify-center p-10 relative">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative mb-12">
          <div className={`w-36 h-36 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.2)] relative z-10 transition-all duration-500 ${isRecording ? 'bg-red-500 shadow-red-500/50 scale-110' : 'bg-indigo-600'}`}><User size={70} /></div>
          {isRecording && <motion.div animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute inset-0 bg-red-500 rounded-full" />}
        </motion.div>
        
        <h2 className="text-3xl font-black mb-1 tracking-tight text-white">{activeMission?.category}</h2>
        <p className="text-indigo-400 font-black text-[10px] tracking-[0.4em] uppercase mb-10">โหมดจำลองการสนทนา</p>
        
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white/5 backdrop-blur-md p-8 rounded-[45px] w-full max-w-sm text-center border border-white/10 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 opacity-30"></div>
           <p className="text-slate-200 font-medium italic text-lg leading-relaxed">"{activeMission?.question_text}"</p>
        </motion.div>
      </div>

      <div className="bg-white rounded-t-[70px] p-12 pb-16 shadow-[0_-20px_50px_rgba(0,0,0,0.3)]">
        <div className="flex flex-col items-center gap-10">
          
          {/* ✅ ส่วนสลับระหว่างปุ่มอัด กับ ปุ่มส่งงาน */}
          {!agentVoiceUrl ? (
            <div className="flex flex-col items-center gap-4">
              <button 
                onPointerDown={startRecording} 
                onPointerUp={stopRecording}
                className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 ${isRecording ? 'bg-red-500 scale-125 shadow-2xl shadow-red-200 ring-8 ring-red-50' : 'bg-slate-900 text-white shadow-2xl shadow-slate-200'}`}
              >
                {isRecording ? <Square fill="currentColor" size={32} /> : <Mic size={45} />}
              </button>
              <p className="font-black text-slate-400 text-[10px] uppercase tracking-[0.3em]">
                {isRecording ? 'ปล่อยเพื่อหยุดอัด' : 'กดค้างเพื่อพูดโต้ตอบ'}
              </p>
            </div>
          ) : (
            <div className="flex gap-4 w-full max-w-sm animate-in fade-in zoom-in-95 duration-500">
              <button 
                onClick={() => { setAgentVoiceUrl(null); setShowCustomerResponse(false); }} 
                className="flex-1 bg-slate-100 h-20 rounded-[30px] font-black text-slate-700 flex items-center justify-center gap-3 hover:bg-slate-200 transition active:scale-95"
              >
                <RotateCcw size={22} /> อัดใหม่
              </button>
              <button 
                onClick={() => { setCompletedMissions([...completedMissions, activeMission.id]); setStep('dashboard'); }} 
                className="flex-2 bg-green-500 h-20 rounded-[30px] font-black text-white flex items-center justify-center gap-3 shadow-xl shadow-green-100 hover:bg-green-600 transition active:scale-95"
              >
                <ShieldCheck size={24} /> จบภารกิจ
              </button>
            </div>
          )}

          {/* เสียงตอบกลับลูกค้า (Auto-Play) */}
          <AnimatePresence>
            {showCustomerResponse && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm bg-indigo-600 p-6 rounded-[35px] flex items-center justify-between shadow-xl shadow-indigo-100 border-2 border-indigo-400">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-2xl"><Play size={24} fill="white" /></div>
                  <div>
                    <p className="font-black text-white text-xs uppercase tracking-widest leading-none">Customer Feedback</p>
                    <p className="text-indigo-200 text-[10px] mt-1 font-bold">กำลังฟังการตอบโต้ของลูกค้า...</p>
                  </div>
                </div>
                <audio 
                  src={supabase.storage.from('recordings').getPublicUrl(activeMission.audio_question_url).data.publicUrl} 
                  autoPlay 
                  className="hidden" 
                />
                <div className="flex gap-1">
                  <span className="w-1.5 h-6 bg-white/40 rounded-full animate-[bounce_1s_infinite_100ms]"></span>
                  <span className="w-1.5 h-8 bg-white rounded-full animate-[bounce_1s_infinite_300ms]"></span>
                  <span className="w-1.5 h-6 bg-white/40 rounded-full animate-[bounce_1s_infinite_500ms]"></span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button onClick={() => setStep('dashboard')} className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] hover:text-slate-800 transition">
            ยกเลิก (กลับหน้าหลัก)
          </button>
        </div>
      </div>
    </div>
  )
}
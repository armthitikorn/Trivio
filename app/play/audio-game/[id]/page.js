'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Phone, Mic, Play, CheckCircle2, Lock, ArrowRight, 
  RotateCcw, Headset, Star, Hash, User, ShieldCheck, ChevronRight, AlertTriangle
} from 'lucide-react'

export default function EmployeeMissionHub() {
  // --- CORE STATES ---
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState('pin')
  const [pin, setPin] = useState('')
  const [sessionData, setSessionData] = useState(null)
  const [missions, setMissions] = useState([])
  const [activeMission, setActiveMission] = useState(null)
  const [completedMissions, setCompletedMissions] = useState([])
  const [errorMsg, setErrorMsg] = useState(null)

  // Recording & Playback
  const [isRecording, setIsRecording] = useState(false)
  const [agentVoiceUrl, setAgentVoiceUrl] = useState(null)
  const [showCustomerResponse, setShowCustomerResponse] = useState(false)

  const mediaRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)

  // ป้องกัน Hydration Error ใน Next.js
  useEffect(() => {
    setMounted(true)
  }, [])

  // --- 1. LOGIN LOGIC ---
  async function handleLogin() {
    try {
      if (pin.length !== 6) return
      const { data, error } = await supabase.from('game_sessions')
        .select('*').eq('pin', pin).eq('is_active', true).single()
      
      if (data) {
        setSessionData(data)
        const { data: qData } = await supabase.from('questions')
          .select('*')
          .eq('target_department', data.target_department)
          .eq('target_level', data.target_level)
          .order('created_at', { ascending: true })
        
        if (qData) setMissions(qData)
        setStep('dashboard')
      } else {
        alert("รหัส PIN ไม่ถูกต้องหรือหมดอายุ")
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล")
    }
  }

  // --- 2. RECORDING LOGIC (HARDENED) ---
  async function startRecording() {
    setErrorMsg(null)
    try {
      // ตรวจสอบว่าเบราว์เซอร์รองรับหรือไม่
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("เบราว์เซอร์ของคุณไม่รองรับการอัดเสียง หรือไม่ได้ใช้ HTTPS")
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' })
        setAgentVoiceUrl(URL.createObjectURL(blob))
        setIsRecording(false)
        setShowCustomerResponse(true)
        
        // ปิดไมค์ทันทีเมื่อหยุด
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
        }
      }

      recorder.start()
      mediaRef.current = recorder
      setIsRecording(true)
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message || "ไม่สามารถเข้าถึงไมโครโฟนได้")
      setIsRecording(false)
    }
  }

  const stopRecording = () => {
    if (mediaRef.current && mediaRef.current.state !== 'inactive') {
      mediaRef.current.stop()
    }
  }

  const completeMission = () => {
    if (!completedMissions.includes(activeMission.id)) {
      setCompletedMissions([...completedMissions, activeMission.id])
    }
    setStep('dashboard')
    setActiveMission(null)
  }

  if (!mounted) return null // ป้องกันหน้าขาวช่วงโหลด

  // --- UI RENDER ---

  // 1. PIN GATE
  if (step === 'pin') return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 text-white font-sans">
      <div className="max-w-md w-full text-center">
        <div className="bg-indigo-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
          <Headset size={40} />
        </div>
        <h1 className="text-3xl font-black mb-2 tracking-tight">Agent Mission Hub</h1>
        <p className="text-slate-400 mb-10 font-medium">กรอก PIN 6 หลักเพื่อเริ่มการฝึกฝน</p>
        
        <div className="flex gap-3 justify-center mb-10">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`w-12 h-16 rounded-2xl border-2 flex items-center justify-center text-2xl font-black transition-all ${pin.length > i ? 'border-indigo-500 bg-indigo-500/20' : 'border-slate-700 bg-slate-800'}`}>
              {pin[i] || ''}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n} onClick={() => pin.length < 6 && setPin(pin+n)} className="h-16 bg-slate-800 rounded-2xl font-black text-xl hover:bg-slate-700 active:scale-95 transition">{n}</button>
          ))}
          <button onClick={() => setPin('')} className="h-16 bg-slate-800 rounded-2xl font-black text-slate-400">CLR</button>
          <button onClick={() => pin.length < 6 && setPin(pin+'0')} className="h-16 bg-slate-800 rounded-2xl font-black text-xl">0</button>
          <button onClick={handleLogin} className="h-16 bg-indigo-600 rounded-2xl font-black flex items-center justify-center"><ArrowRight /></button>
        </div>
      </div>
    </div>
  )

  // 2. DASHBOARD
  if (step === 'dashboard') return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <div className="bg-indigo-800 h-64 rounded-b-[60px] p-8 text-white relative">
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-4">
            <span className="bg-white/10 px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">Training Session</span>
            <span className="text-yellow-400 font-black text-sm flex items-center gap-1"><Star size={14} fill="currentColor" /> {completedMissions.length * 50} XP</span>
          </div>
          <h2 className="text-3xl font-black leading-tight">เริ่มภารกิจของคุณ<br/>ให้สำเร็จ!</h2>
        </div>
        <Phone className="absolute bottom-[-20px] right-10 text-white/10" size={180} />
      </div>

      <div className="max-w-xl mx-auto -mt-12 px-6 space-y-4">
        <div className="bg-white p-6 rounded-[35px] shadow-xl shadow-indigo-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center font-black text-indigo-600">
              {Math.round((completedMissions.length / missions.length) * 100) || 0}%
            </div>
            <div>
              <p className="font-black text-slate-800">Progress</p>
              <p className="text-xs text-slate-400 font-bold">สำเร็จ {completedMissions.length} จาก {missions.length} บท</p>
            </div>
          </div>
        </div>

        <div className="pt-6 space-y-3">
          {missions.map((m, idx) => {
            const isDone = completedMissions.includes(m.id)
            return (
              <div key={m.id} onClick={() => setActiveMission(m) || setStep('mission')} className={`p-5 rounded-[30px] flex items-center justify-between border-2 transition-all cursor-pointer ${isDone ? 'bg-white border-green-500 shadow-lg' : 'bg-white border-white shadow-md'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${isDone ? 'bg-green-500 text-white' : 'bg-slate-800 text-white'}`}>
                    {isDone ? <CheckCircle2 size={24} /> : idx + 1}
                  </div>
                  <div>
                    <p className="font-black text-slate-800">{m.category}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{m.question_text}</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-300" />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  // 3. MISSION (PHONE UI)
  if (step === 'mission') return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="relative mb-8">
          <div className={`w-32 h-32 rounded-full flex items-center justify-center relative z-10 transition-all ${isRecording ? 'bg-red-500 shadow-[0_0_50px_rgba(239,68,68,0.5)]' : 'bg-indigo-600'}`}>
            <User size={60} />
          </div>
          {isRecording && (
            <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute inset-0 bg-red-500 rounded-full" />
          )}
        </div>
        
        <h2 className="text-2xl font-black mb-1">{activeMission?.category}</h2>
        <p className="text-indigo-400 font-black text-[10px] tracking-[0.3em] uppercase mb-8">Calling Customer...</p>

        {errorMsg && (
          <div className="bg-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-2 mb-6 border border-red-500/30">
            <AlertTriangle size={20} />
            <p className="text-xs font-bold">{errorMsg}</p>
          </div>
        )}

        <div className="bg-slate-800/40 border border-slate-700 p-6 rounded-[35px] w-full max-w-sm text-center">
          <p className="text-slate-300 font-medium italic">"{activeMission?.question_text}"</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-t-[60px] p-10 shadow-2xl">
        <div className="max-w-xs mx-auto space-y-8">
          <div className="flex justify-center">
            {!agentVoiceUrl ? (
              <button 
                onClick={!isRecording ? startRecording : stopRecording}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 scale-110' : 'bg-white text-slate-900'}`}
              >
                {isRecording ? <Square fill="currentColor" size={28} /> : <Mic size={35} />}
              </button>
            ) : (
              <div className="flex gap-4 w-full">
                <button onClick={() => {setAgentVoiceUrl(null); setShowCustomerResponse(false);}} className="flex-1 bg-slate-800 h-16 rounded-3xl font-black flex items-center justify-center gap-2"><RotateCcw size={20} /> อัดใหม่</button>
                <button onClick={completeMission} className="flex-1 bg-green-500 h-16 rounded-3xl font-black flex items-center justify-center gap-2"><ShieldCheck size={20} /> ส่งงาน</button>
              </div>
            )}
          </div>

          <AnimatePresence>
            {showCustomerResponse && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-indigo-600 p-5 rounded-[30px] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Play size={20} fill="currentColor" />
                  <span className="font-black text-xs uppercase">เสียงตอบกลับจากลูกค้า</span>
                </div>
                <audio 
                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/recordings/${activeMission.audio_question_url}`} 
                  autoPlay 
                  className="hidden" 
                />
                <div className="w-2 h-2 bg-white rounded-full animate-ping" />
              </motion.div>
            )}
          </AnimatePresence>

          <button onClick={() => setStep('dashboard')} className="w-full text-slate-500 font-bold text-xs">วางสาย (กลับหน้าหลัก)</button>
        </div>
      </div>
    </div>
  )
}
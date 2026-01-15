'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Phone, Mic, Play, CheckCircle2, Lock, ArrowRight, 
  RotateCcw, Headset, Star, Hash, User, ShieldCheck, ChevronRight
} from 'lucide-react'

export default function EmployeeMissionHub() {
  // --- STATES ---
  const [step, setStep] = useState('pin') // pin | dashboard | mission
  const [pin, setPin] = useState('')
  const [sessionData, setSessionData] = useState(null)
  const [missions, setMissions] = useState([])
  const [activeMission, setActiveMission] = useState(null)
  const [completedMissions, setCompletedMissions] = useState([])

  // Recording & Playback
  const [isRecording, setIsRecording] = useState(false)
  const [agentVoiceUrl, setAgentVoiceUrl] = useState(null)
  const [showCustomerResponse, setShowCustomerResponse] = useState(false)

  const mediaRef = useRef(null)
  const chunksRef = useRef([])

  // --- 1. PIN ACCESS ---
  async function handleLogin() {
    if (pin.length !== 6) return
    const { data, error } = await supabase.from('game_sessions')
      .select('*').eq('pin', pin).eq('is_active', true).single()
    
    if (data) {
      setSessionData(data)
      loadMissions(data)
      setStep('dashboard')
    } else {
      alert("ไม่พบรหัส PIN นี้ หรือห้องฝึกปิดไปแล้วครับ")
    }
  }

  // --- 2. LOAD MISSIONS ---
  async function loadMissions(session) {
    const { data } = await supabase.from('questions')
      .select('*')
      .eq('target_department', session.target_department)
      .eq('target_level', session.target_level)
      .order('created_at', { ascending: true })
    
    if (data) setMissions(data)
  }

  // --- 3. MISSION LOGIC ---
  const startMission = (mission) => {
    setActiveMission(mission)
    setAgentVoiceUrl(null)
    setShowCustomerResponse(false)
    setStep('mission')
  }

  // Recording Agent Voice
  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream)
    chunksRef.current = []
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/wav' })
      setAgentVoiceUrl(URL.createObjectURL(blob))
      setIsRecording(false)
      setShowCustomerResponse(true) // เมื่อพูดจบ ให้เปิดระบบเสียงลูกค้า
      stream.getTracks().forEach(t => t.stop())
    }
    recorder.start()
    mediaRef.current = recorder
    setIsRecording(true)
  }

  const stopRecording = () => mediaRef.current?.stop()

  const completeMission = () => {
    if (!completedMissions.includes(activeMission.id)) {
      setCompletedMissions([...completedMissions, activeMission.id])
    }
    setStep('dashboard')
  }

  // --- UI COMPONENTS ---

  // 1. PIN GATE
  if (step === 'pin') return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 text-white font-sans">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full text-center">
        <div className="bg-indigo-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-500/20">
          <Headset size={40} />
        </div>
        <h1 className="text-3xl font-black mb-2">Tele-Sales Simulator</h1>
        <p className="text-slate-400 mb-10 font-medium">กรอกรหัส PIN จากเทรนเนอร์เพื่อเริ่มภารกิจ</p>
        
        <div className="flex gap-3 justify-center mb-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`w-12 h-16 rounded-2xl border-2 flex items-center justify-center text-2xl font-black ${pin.length > i ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-slate-700 bg-slate-800 text-slate-500'}`}>
              {pin[i] || ''}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n} onClick={() => pin.length < 6 && setPin(pin+n)} className="h-16 bg-slate-800 rounded-2xl font-black text-xl hover:bg-slate-700 active:scale-95 transition">
              {n}
            </button>
          ))}
          <button onClick={() => setPin('')} className="h-16 bg-red-500/10 text-red-500 rounded-2xl font-black hover:bg-red-500/20">CLR</button>
          <button onClick={() => pin.length < 6 && setPin(pin+'0')} className="h-16 bg-slate-800 rounded-2xl font-black text-xl hover:bg-slate-700 active:scale-95">0</button>
          <button onClick={handleLogin} disabled={pin.length !== 6} className="h-16 bg-indigo-600 rounded-2xl font-black flex items-center justify-center hover:bg-indigo-500 transition disabled:opacity-50">
            <ArrowRight />
          </button>
        </div>
      </motion.div>
    </div>
  )

  // 2. MISSION DASHBOARD
  if (step === 'dashboard') return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <div className="bg-indigo-700 h-64 rounded-b-[50px] p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-6">
            <span className="bg-white/20 px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase">Agent Profile</span>
            <span className="flex items-center gap-1 font-bold text-yellow-400"><Star size={16} fill="currentColor" /> {completedMissions.length * 100} PTS</span>
          </div>
          <h2 className="text-3xl font-black mb-1">ยินดีต้อนรับ, นักขายมือทอง!</h2>
          <p className="opacity-70 font-medium">แผนก: {sessionData.target_department} | ระดับ: {sessionData.target_level}</p>
        </div>
        <div className="absolute top-0 right-0 p-10 opacity-10"><Phone size={200} /></div>
      </div>

      <div className="max-w-xl mx-auto -mt-16 px-6 space-y-4">
        <div className="bg-white p-6 rounded-[35px] shadow-xl shadow-slate-200/50 flex items-center justify-between border border-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center font-black text-xl italic">
              {Math.round((completedMissions.length / missions.length) * 100) || 0}%
            </div>
            <div>
              <p className="font-black text-slate-800">ความคืบหน้าการฝึก</p>
              <p className="text-sm text-slate-400 font-bold">สำเร็จแล้ว {completedMissions.length} จาก {missions.length} บท</p>
            </div>
          </div>
          <ChevronRight className="text-slate-300" />
        </div>

        <h3 className="font-black text-slate-400 text-xs uppercase tracking-[0.2em] ml-2 mt-8">ภารกิจของคุณ (Mission List)</h3>
        
        {missions.map((m, idx) => {
          const isDone = completedMissions.includes(m.id)
          const isLocked = idx > 0 && !completedMissions.includes(missions[idx-1].id)

          return (
            <motion.div 
              key={m.id}
              whileTap={!isLocked ? { scale: 0.98 } : {}}
              onClick={() => !isLocked && startMission(m)}
              className={`p-5 rounded-[30px] flex items-center justify-between border-2 transition-all ${isDone ? 'bg-white border-green-500 shadow-lg shadow-green-100' : isLocked ? 'bg-slate-100 border-transparent opacity-60' : 'bg-white border-white shadow-md hover:border-indigo-200'}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${isDone ? 'bg-green-500 text-white' : isLocked ? 'bg-slate-200 text-slate-400' : 'bg-slate-800 text-white'}`}>
                  {isDone ? <CheckCircle2 size={24} /> : isLocked ? <Lock size={20} /> : idx + 1}
                </div>
                <div>
                  <p className={`font-black ${isDone ? 'text-green-600' : 'text-slate-800'}`}>{m.category}</p>
                  <p className="text-xs text-slate-400 font-bold tracking-tight">{m.question_text}</p>
                </div>
              </div>
              {!isLocked && <ArrowRight size={20} className={isDone ? 'text-green-500' : 'text-slate-300'} />}
            </motion.div>
          )
        })}
      </div>
    </div>
  )

  // 3. ACTIVE MISSION (PHONE UI)
  if (step === 'mission') return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans flex flex-col">
      {/* Phone Header */}
      <div className="p-8 text-center flex-1 flex flex-col justify-center">
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="relative inline-block mx-auto mb-6">
          <div className="w-32 h-32 bg-indigo-500 rounded-full flex items-center justify-center shadow-3xl shadow-indigo-500/50 relative z-10">
            <User size={60} />
          </div>
          {isRecording && (
            <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute inset-0 bg-indigo-500 rounded-full" />
          )}
        </motion.div>
        
        <h2 className="text-2xl font-black mb-1">บทเรียน: {activeMission.category}</h2>
        <p className="text-indigo-400 font-bold tracking-widest uppercase text-xs mb-4">กำลังอยู่ในสายกับลูกค้า...</p>
        
        <div className="bg-slate-800/50 backdrop-blur-md p-6 rounded-[35px] border border-slate-700/50 max-w-sm mx-auto">
          <p className="text-slate-300 font-medium leading-relaxed">
            {isRecording ? "กำลังบันทึกเสียงของคุณ... พูดบทเสนอขายได้เลย" : "กดปุ่มไมค์ด้านล่างเพื่อเริ่มพูดบทขายของคุณ"}
          </p>
        </div>
      </div>

      {/* Action Area */}
      <div className="bg-slate-900 rounded-t-[50px] p-10 pb-16 shadow-2xl">
        <div className="flex flex-col items-center gap-8">
          
          {/* Main Voice Button */}
          {!agentVoiceUrl ? (
            <button 
              onClick={!isRecording ? startRecording : stopRecording}
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-2xl ${isRecording ? 'bg-red-500 shadow-red-500/30' : 'bg-white text-slate-900 shadow-white/10'}`}
            >
              {isRecording ? <Square fill="currentColor" size={30} /> : <Mic size={35} />}
            </button>
          ) : (
            <div className="flex gap-4 w-full">
              <button onClick={() => setAgentVoiceUrl(null)} className="flex-1 bg-slate-800 h-16 rounded-3xl font-black flex items-center justify-center gap-2 hover:bg-slate-700">
                <RotateCcw size={20} /> อัดใหม่
              </button>
              <button onClick={completeMission} className="flex-[2] bg-green-500 h-16 rounded-3xl font-black flex items-center justify-center gap-2 hover:bg-green-400">
                <ShieldCheck size={20} /> จบภารกิจ
              </button>
            </div>
          )}

          {/* Customer Feedback Area (Only shows after agent records) */}
          <AnimatePresence>
            {showCustomerResponse && activeMission.audio_question_url && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full bg-indigo-600 p-6 rounded-[35px] flex items-center justify-between shadow-xl shadow-indigo-900/40 border border-indigo-400/30">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center"><Play size={20} fill="currentColor" /></div>
                  <div>
                    <p className="font-black text-sm uppercase tracking-wider">เสียงตอบกลับจากลูกค้า</p>
                    <p className="text-xs text-indigo-200 font-medium">ฟังเสียงโต้ตอบของเทรนเนอร์</p>
                  </div>
                </div>
                <audio 
                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/recordings/${activeMission.audio_question_url}`} 
                  autoPlay 
                  controls 
                  className="hidden" 
                />
                <button className="bg-white text-indigo-600 px-5 py-2 rounded-xl font-black text-xs">PLAYING...</button>
              </motion.div>
            )}
          </AnimatePresence>

          <button onClick={() => setStep('dashboard')} className="text-slate-500 font-bold text-sm hover:text-white transition">ยกเลิกภารกิจ</button>
        </div>
      </div>
    </div>
  )
}
'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Phone, Mic, CheckCircle2, ArrowRight, Headset, Star, User, 
  ChevronRight, Square, Play, RotateCcw, ShieldCheck, Headphones
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

  // 1. ป้องกัน Hydration Error และยืนยันการโหลด Client
  useEffect(() => { setMounted(true) }, [])

  // 2. ฟังก์ชันล้างค่าสถานะ (Reset) เพื่อป้องกันการค้างของข้อมูลเก่า
  const resetMissionState = () => {
    setAgentVoiceUrl(null)
    setShowCustomerResponse(false)
    setIsRecording(false)
    chunksRef.current = []
    if (mediaRef.current && mediaRef.current.state !== 'inactive') {
      mediaRef.current.stop()
    }
  }

  // 3. ระบบ Login ด้วย PIN
  async function handleLogin() {
    if (pin.length !== 6) return
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('pin', pin)
        .eq('is_active', true)
        .single()

      if (error || !data) {
        alert("ไม่พบรหัส PIN นี้ หรือรหัสหมดอายุแล้ว")
        return
      }

      setSessionData(data)
      const { data: qData } = await supabase
        .from('questions')
        .select('*')
        .eq('target_department', data.target_department)
        .eq('target_level', data.target_level)
        .order('created_at', { ascending: true })

      if (qData) setMissions(qData)
      setStep('dashboard')
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ")
    }
  }

  // 4. ระบบบันทึกเสียงแบบ Multi-Device (iOS/Android)
  async function startRecording() {
    resetMissionState()
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
      alert("กรุณาอนุญาตการเข้าถึงไมโครโฟนเพื่อเริ่มการฝึก")
    }
  }

  const stopRecording = () => {
    if (mediaRef.current && mediaRef.current.state === 'recording') {
      mediaRef.current.stop()
    }
  }

  if (!mounted) return null

  // --- UI: PIN ENTRY ---
  if (step === 'pin') return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 text-white font-sans">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full text-center">
        <div className="bg-indigo-600 w-24 h-24 rounded-[35px] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-indigo-500/20 rotate-3"><Headset size={48} /></div>
        <h1 className="text-4xl font-black mb-4 tracking-tighter">TRIVIO PLAY</h1>
        <p className="text-slate-400 font-bold mb-10 uppercase tracking-widest text-xs">Mission Control Center 2026</p>
        
        <div className="flex gap-2 justify-center mb-10">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`w-12 h-18 rounded-2xl border-2 flex items-center justify-center text-3xl font-black transition-all ${pin.length > i ? 'border-indigo-500 bg-indigo-500/20 text-white' : 'border-slate-700 bg-slate-800'}`}>
              {pin[i] || ''}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n} onClick={() => pin.length < 6 && setPin(pin+n)} className="h-18 bg-slate-800 rounded-3xl font-black text-2xl hover:bg-slate-700 active:scale-90 transition-all">{n}</button>
          ))}
          <button onClick={() => setPin('')} className="h-18 bg-slate-800/50 rounded-3xl font-black text-slate-500">CLR</button>
          <button onClick={() => pin.length < 6 && setPin(pin+'0')} className="h-18 bg-slate-800 rounded-3xl font-black text-2xl">0</button>
          <button onClick={handleLogin} className="h-18 bg-indigo-600 rounded-3xl font-black flex items-center justify-center shadow-lg hover:bg-indigo-500 transition-all"><ArrowRight size={32}/></button>
        </div>
      </motion.div>
    </div>
  )

  // --- UI: DASHBOARD ---
  if (step === 'dashboard') return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <div className="bg-indigo-900 h-72 rounded-b-[70px] p-10 text-white relative overflow-hidden flex flex-col justify-center">
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-6">
            <span className="bg-white/10 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">Active Mission Hub</span>
            <span className="flex items-center gap-2 font-black text-yellow-400 bg-black/20 px-4 py-2 rounded-2xl"><Star size={18} fill="currentColor" /> {completedMissions.length * 100} XP</span>
          </div>
          <h2 className="text-4xl font-black leading-none mb-2">เริ่มการฝึก,<br/>Agent!</h2>
          <p className="opacity-60 font-bold uppercase text-xs tracking-tighter">Department: {sessionData?.target_department} • Level: {sessionData?.target_level}</p>
        </div>
        <Phone className="absolute bottom-[-50px] right-[-20px] opacity-10 rotate-12" size={260} />
      </div>

      <div className="max-w-xl mx-auto -mt-16 px-6 space-y-4">
        <div className="bg-white p-8 rounded-[45px] shadow-2xl shadow-slate-200/50 flex items-center justify-between border-4 border-white">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center font-black text-indigo-600 text-2xl italic">{Math.round((completedMissions.length / (missions.length || 1)) * 100)}%</div>
            <div>
              <p className="font-black text-slate-800 text-xl">Mission Progress</p>
              <p className="text-xs text-slate-400 font-bold tracking-tight">สำเร็จแล้ว {completedMissions.length} จาก {missions.length} บทเรียน</p>
            </div>
          </div>
        </div>

        <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-[0.4em] ml-4 mt-10 mb-4">Training Playlists</h3>
        <div className="space-y-4">
          {missions.map((m, idx) => {
            const isDone = completedMissions.includes(m.id)
            return (
              <motion.div 
                whileTap={{ scale: 0.97 }}
                key={m.id} 
                onClick={() => { resetMissionState(); setActiveMission(m); setStep('mission'); }} 
                className={`p-6 bg-white rounded-[40px] shadow-sm flex items-center justify-between border-2 transition-all cursor-pointer ${isDone ? 'border-green-500 bg-green-50/30' : 'border-white hover:border-indigo-200'}`}
              >
                <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-[22px] flex items-center justify-center font-black ${isDone ? 'bg-green-500 text-white shadow-lg shadow-green-200' : 'bg-slate-900 text-white'}`}>
                    {isDone ? <CheckCircle2 size={28} /> : idx + 1}
                  </div>
                  <div>
                    <p className={`font-black text-lg leading-tight ${isDone ? 'text-green-700' : 'text-slate-800'}`}>{m.category}</p>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{m.question_text}</p>
                  </div>
                </div>
                <ChevronRight size={24} className={isDone ? 'text-green-400' : 'text-slate-200'} />
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )

  // --- UI: MISSION WORKSPACE ---
  if (step === 'mission') return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col font-sans overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center p-10 relative">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative mb-12">
          <div className={`w-40 h-40 rounded-full flex items-center justify-center shadow-3xl relative z-10 transition-all duration-500 ${isRecording ? 'bg-red-500 shadow-red-500/50 scale-110' : 'bg-indigo-600 shadow-indigo-500/50'}`}>
            <User size={80} />
          </div>
          {isRecording && <motion.div animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute inset-0 bg-red-500 rounded-full" />}
        </motion.div>
        
        <h2 className="text-3xl font-black mb-1 tracking-tight">{activeMission?.category}</h2>
        <p className="text-indigo-400 font-black text-[10px] tracking-[0.5em] uppercase mb-12">Simulator Voice Active</p>
        
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white/5 backdrop-blur-xl p-10 rounded-[50px] w-full max-w-sm text-center border border-white/10 shadow-2xl">
           <p className="text-slate-200 font-medium italic text-xl leading-relaxed">"{activeMission?.question_text}"</p>
        </motion.div>
      </div>

      <div className="bg-white rounded-t-[80px] p-12 pb-16 shadow-[0_-20px_80px_rgba(0,0,0,0.4)]">
        <div className="flex flex-col items-center gap-12">
          
          {!agentVoiceUrl ? (
            <div className="flex flex-col items-center gap-6">
              <button 
                onPointerDown={startRecording} 
                onPointerUp={stopRecording}
                className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${isRecording ? 'bg-red-500 scale-125 shadow-2xl shadow-red-100 ring-[15px] ring-red-50' : 'bg-slate-900 text-white shadow-2xl shadow-slate-300'}`}
              >
                {isRecording ? <Square fill="currentColor" size={35} /> : <Mic size={50} />}
              </button>
              <p className="font-black text-slate-400 text-[11px] uppercase tracking-[0.4em] animate-pulse">
                {isRecording ? 'กำลังบันทึกเสียง...' : 'กดค้างเพื่อตอบโต้'}
              </p>
            </div>
          ) : (
            <div className="flex gap-5 w-full max-w-sm animate-in fade-in zoom-in-95">
              <button 
                onClick={() => { setAgentVoiceUrl(null); setShowCustomerResponse(false); }} 
                className="flex-1 bg-slate-100 h-20 rounded-[35px] font-black text-slate-700 flex items-center justify-center gap-3 hover:bg-slate-200 transition active:scale-95"
              >
                <RotateCcw size={24} /> อัดใหม่
              </button>
              <button 
                onClick={() => { setCompletedMissions([...completedMissions, activeMission.id]); setStep('dashboard'); }} 
                className="flex-[1.5] bg-green-500 h-20 rounded-[35px] font-black text-white flex items-center justify-center gap-3 shadow-2xl shadow-green-100 hover:bg-green-600 transition active:scale-95"
              >
                <ShieldCheck size={28} /> ส่งงาน
              </button>
            </div>
          )}

          <AnimatePresence>
            {/* ✅ NULL GUARD: ตรวจสอบ activeMission.audio_question_url ก่อนเรียก getPublicUrl */}
            {showCustomerResponse && activeMission?.audio_question_url && (
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-indigo-600 p-8 rounded-[45px] flex items-center justify-between shadow-2xl shadow-indigo-200 border-4 border-white relative overflow-hidden">
                <div className="flex items-center gap-5 relative z-10">
                  <div className="bg-white/20 p-4 rounded-3xl text-white shadow-inner"><Play size={28} fill="white" /></div>
                  <div>
                    <p className="font-black text-white text-xs uppercase tracking-widest leading-none mb-1">Customer Feedback</p>
                    <p className="text-indigo-200 text-[10px] font-bold">ระบบกำลังจำลองเสียงลูกค้าโต้ตอบ...</p>
                  </div>
                </div>

                {/* ✅ ระบบเล่นเสียงที่ปลอดภัย */}
                <audio 
                  src={supabase.storage.from('recordings').getPublicUrl(activeMission.audio_question_url).data.publicUrl} 
                  autoPlay 
                  className="hidden" 
                />

                <div className="flex gap-1.5 relative z-10">
                  <span className="w-2 h-8 bg-white/40 rounded-full animate-bounce"></span>
                  <span className="w-2 h-12 bg-white rounded-full animate-bounce [animation-delay:200ms]"></span>
                  <span className="w-2 h-8 bg-white/40 rounded-full animate-bounce [animation-delay:400ms]"></span>
                </div>
                <div className="absolute top-0 right-0 p-8 text-white/5"><Headphones size={80} /></div>
              </motion.div>
            )}
          </AnimatePresence>

          <button onClick={() => setStep('dashboard')} className="text-slate-400 font-black text-[11px] uppercase tracking-[0.5em] hover:text-slate-900 transition mt-4">
            EXIT MISSION / กลับหน้าหลัก
          </button>
        </div>
      </div>
    </div>
  )
}
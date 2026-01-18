'use client'
import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, Play, RotateCcw, ShieldCheck, User, Headphones, Loader2 } from 'lucide-react'

export default function MissionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const missionId = params?.id

  const [mounted, setMounted] = useState(false)
  const [activeMission, setActiveMission] = useState(null)
  
  // States สำหรับการควบคุมการอัดเสียง
  const [isRecording, setIsRecording] = useState(false)
  const [agentVoiceUrl, setAgentVoiceUrl] = useState(null)
  const [isPlayingCustomer, setIsPlayingCustomer] = useState(false)

  const mediaRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])

  // ✅ 1. ฟังก์ชัน "ล้างไพ่" (Hard Reset) ป้องกันปุ่มหาย
  const forceReset = () => {
    if (agentVoiceUrl) URL.revokeObjectURL(agentVoiceUrl)
    setAgentVoiceUrl(null)
    setIsRecording(false)
    setIsPlayingCustomer(true) // ให้เริ่มเล่นเสียงลูกค้าใหม่
    chunksRef.current = []
  }

  // ✅ 2. โหลดข้อมูลภารกิจ (ทำงานทุกครั้งที่ ID เปลี่ยน)
  useEffect(() => {
    setMounted(true)
    forceReset() // ล้างค่าเก่าทิ้งทันทีเมื่อเปลี่ยนข้อ

    const loadMission = async () => {
      const { data } = await supabase.from('questions').select('*').eq('id', missionId).single()
      if (data) setActiveMission(data)
    }
    if (missionId) loadMission()
  }, [missionId])

  // ✅ 3. ระบบอัดเสียง (ชื่อฟังก์ชันต้องตรงกับปุ่ม)
  async function startRecording() {
    try {
      chunksRef.current = []
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
        stream.getTracks().forEach(t => t.stop())
      }

      recorder.start()
      mediaRef.current = recorder
      setIsRecording(true)
    } catch (err) { alert("Mic Error: " + err.message) }
  }

  const stopRecording = () => {
    if (mediaRef.current && mediaRef.current.state === 'recording') {
      mediaRef.current.stop()
    }
  }

  if (!mounted || !activeMission) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>

  return (
    <div key={missionId} className="min-h-screen bg-[#0f172a] text-white flex flex-col font-sans">
      
      {/* ส่วนบน: แสดงสถานะลูกค้า */}
      <div className="p-8 text-center flex-1 flex flex-col items-center justify-center">
        <div className={`w-32 h-32 rounded-full flex items-center justify-center relative mb-8 transition-all duration-500 ${isRecording ? 'bg-red-500 shadow-red-500/50 scale-110' : 'bg-indigo-600'}`}>
          <User size={60} />
          {isRecording && <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute inset-0 bg-red-500 rounded-full" />}
        </div>
        
        <h2 className="text-2xl font-black mb-2">{activeMission.category}</h2>
        
        {/* แถบเล่นเสียงลูกค้า (Objection) - เล่นอัตโนมัติเมื่อเข้าหน้า */}
        <div className="bg-indigo-600/20 p-4 rounded-2xl border border-indigo-500/30 w-full max-w-xs flex items-center gap-3">
          <Play size={18} className="text-indigo-400 fill-indigo-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">ฟังโจทย์จากลูกค้า...</span>
          {activeMission.audio_question_url && (
            <audio 
              src={supabase.storage.from('recordings').getPublicUrl(activeMission.audio_question_url).data.publicUrl} 
              autoPlay 
              onPlay={() => setIsPlayingCustomer(true)}
              onEnded={() => setIsPlayingCustomer(false)}
              className="hidden"
            />
          )}
        </div>
        <p className="mt-6 text-slate-400 italic text-sm">"{activeMission.question_text}"</p>
      </div>

      {/* ส่วนล่าง: ปุ่มควบคุม (Mic จะเด้งมาเสมอถ้ายังไม่ได้อัดเสียงตอบ) */}
      <div className="bg-white rounded-t-[60px] p-12 shadow-[0_-20px_50px_rgba(0,0,0,0.3)] space-y-8">
        <div className="flex justify-center">
          {!agentVoiceUrl ? (
            <div className="flex flex-col items-center gap-4">
              <button 
                onPointerDown={startRecording} 
                onPointerUp={stopRecording} 
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-2xl ${isRecording ? 'bg-red-500 scale-125' : 'bg-slate-900 text-white'}`}
              >
                {isRecording ? <Square fill="currentColor" size={28} /> : <Mic size={35} />}
              </button>
              <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">
                {isRecording ? 'ปล่อยเพื่อหยุดอัด' : 'กดค้างเพื่อตอบโต้ลูกค้า'}
              </p>
            </div>
          ) : (
            <div className="flex gap-4 w-full max-w-md animate-in zoom-in-95">
              <button onClick={forceReset} className="flex-1 bg-slate-100 h-20 rounded-[30px] font-black text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-200">
                <RotateCcw size={20} /> อัดใหม่
              </button>
              <button onClick={() => router.back()} className="flex-1 bg-green-500 h-20 rounded-[30px] font-black text-white flex items-center justify-center gap-2 shadow-xl shadow-green-100">
                <ShieldCheck size={20} /> ส่งงาน
              </button>
            </div>
          )}
        </div>

        {/* ส่วนฟังเสียงตัวเองที่อัดไป */}
        {agentVoiceUrl && (
          <div className="max-w-xs mx-auto space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase text-center tracking-widest">เช็คเสียงของคุณก่อนส่ง</p>
            <audio src={agentVoiceUrl} controls className="w-full h-10" />
          </div>
        )}

        <button onClick={() => router.back()} className="w-full text-slate-400 font-bold text-[10px] uppercase tracking-widest text-center">ยกเลิก / กลับหน้าหลัก</button>
      </div>
    </div>
  )
}
// Icon จำลองในกรณีที่ไม่ได้ลง Lucide (กัน Build Error)
const ArrowRight = () => <span>→</span>
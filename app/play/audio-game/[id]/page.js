'use client'
import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, Play, RotateCcw, ShieldCheck, User, Headphones } from 'lucide-react'

export default function MissionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const missionId = params?.id

  const [mounted, setMounted] = useState(false)
  const [activeMission, setActiveMission] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [agentVoiceUrl, setAgentVoiceUrl] = useState(null) // ✅ ตัวควบคุมปุ่ม Mic
  const [showResponse, setShowResponse] = useState(false)

  const mediaRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])

  // ✅ 1. ฟังก์ชัน "ล้างไพ่" (Hard Reset) 
  // สั่งงานทุกครั้งที่เปลี่ยนข้อ เพื่อให้ปุ่ม Mic สีดำเด้งกลับมาเสมอ
  const forceResetForNewMission = () => {
    if (agentVoiceUrl) URL.revokeObjectURL(agentVoiceUrl)
    setAgentVoiceUrl(null)     // ล้างไฟล์เสียงเดิม -> ปุ่ม Mic จะกลับมา
    setShowResponse(false)     // ปิดแถบ Customer Response ของข้อเก่า
    setIsRecording(false)      // ปิดสถานะกำลังอัด
    chunksRef.current = []     // ล้างข้อมูลเสียงดิบใน Memory
  }

  // ✅ 2. ตรวจจับการเปลี่ยนข้อ (ID ใน URL เปลี่ยน)
  useEffect(() => {
    setMounted(true)
    forceResetForNewMission() // 👈 หัวใจสำคัญ: ล้างค่าทันทีที่เปลี่ยน ID ข้อ

    const loadMission = async () => {
      const { data } = await supabase
        .from('questions')
        .select('*')
        .eq('id', missionId)
        .maybeSingle() // ใช้ maybeSingle เพื่อป้องกัน Error 406
      if (data) setActiveMission(data)
    }
    
    if (missionId) loadMission()
  }, [missionId]) // ทำงานทุกครั้งที่ ID เปลี่ยน

  // ✅ 3. ฟังก์ชันเริ่มอัดเสียง
  async function startRecording() {
    try {
      chunksRef.current = []
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' })
        setAgentVoiceUrl(URL.createObjectURL(blob))
        setShowResponse(true)
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

  if (!mounted || !activeMission) return null

  return (
    <div key={missionId} className="min-h-screen bg-[#0f172a] text-white flex flex-col font-sans overflow-hidden">
      
      {/* ส่วนบน: แสดงโจทย์ลูกค้า */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-8 transition-all ${isRecording ? 'bg-red-500 scale-110 shadow-lg shadow-red-500/50' : 'bg-indigo-600 shadow-2xl'}`}>
          <User size={60} />
          {isRecording && <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute inset-0 bg-red-500 rounded-full" />}
        </div>
        <h2 className="text-2xl font-black mb-1">{activeMission.category}</h2>
        <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-10 text-center italic">Customer Objection Active</p>
        
        {/* เล่นเสียงลูกค้าอัตโนมัติ */}
        <audio src={supabase.storage.from('recordings').getPublicUrl(activeMission.audio_question_url).data.publicUrl} autoPlay className="hidden" />
        
        <div className="bg-slate-800/50 p-6 rounded-[35px] w-full max-w-sm text-center border border-white/5 shadow-inner">
          <p className="text-slate-300 italic text-lg leading-relaxed">"{activeMission.question_text}"</p>
        </div>
      </div>

      {/* ส่วนล่าง: ส่วนควบคุมปุ่ม Mic */}
      <div className="bg-white rounded-t-[60px] p-12 shadow-[0_-20px_50px_rgba(0,0,0,0.3)] space-y-10">
        <div className="flex justify-center">
          {/* ✅ ถ้า agentVoiceUrl เป็น NULL (คือเพิ่งเริ่มข้อใหม่) ปุ่ม Mic สีดำจะเด้งมาเสมอ */}
          {!agentVoiceUrl ? (
            <div className="flex flex-col items-center gap-4">
              <button 
                onPointerDown={startRecording} 
                onPointerUp={stopRecording}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 scale-125' : 'bg-slate-900 text-white shadow-2xl'}`}
              >
                {isRecording ? <Square fill="currentColor" size={28} /> : <Mic size={40} />}
              </button>
              <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">{isRecording ? 'ปล่อยเพื่อหยุดอัด' : 'กดค้างเพื่อตอบโต้'}</p>
            </div>
          ) : (
            <div className="flex gap-4 w-full max-w-md animate-in zoom-in-95">
              <button onClick={forceResetForNewMission} className="flex-1 bg-slate-100 h-20 rounded-[35px] font-black text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-200">
                <RotateCcw size={22} /> อัดใหม่
              </button>
              <button onClick={() => router.back()} className="flex-1 bg-green-500 h-20 rounded-[30px] font-black text-white flex items-center justify-center gap-2 shadow-xl shadow-green-100">
                <ShieldCheck size={24} /> ส่งงาน
              </button>
            </div>
          )}
        </div>

        <button onClick={() => router.back()} className="w-full text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] text-center">กลับหน้าหลัก</button>
      </div>
    </div>
  )
}
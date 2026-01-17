'use client'
import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Mic, Square, Play, RotateCcw, ShieldCheck, User, ChevronLeft, Loader2 } from 'lucide-react'

export default function MissionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const missionId = params?.id

  const [mounted, setMounted] = useState(false)
  const [activeMission, setActiveMission] = useState(null)
  
  // State เหล่านี้จะถูกล้างค่าโดยอัตโนมัติเมื่อ ID เปลี่ยน เพราะเราใช้ "key" ด้านล่าง
  const [isRecording, setIsRecording] = useState(false)
  const [agentVoiceUrl, setAgentVoiceUrl] = useState(null)
  const [showResponse, setShowResponse] = useState(false)

  const mediaRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])

  useEffect(() => {
    setMounted(true)
    const loadMission = async () => {
      const { data } = await supabase.from('questions').select('*').eq('id', missionId).single()
      if (data) setActiveMission(data)
    }
    if (missionId) loadMission()
  }, [missionId])

  async function startRec() {
    try {
      // ล้างข้อมูลเก่าทุกอย่างในระดับเบราว์เซอร์
      if (agentVoiceUrl) URL.revokeObjectURL(agentVoiceUrl)
      chunksRef.current = []
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' })
        setAgentVoiceUrl(URL.createObjectURL(blob))
        setShowResponse(true)
        stream.getTracks().forEach(t => t.stop())
      }

      recorder.start()
      mediaRef.current = recorder
      setIsRecording(true)
    } catch (err) { alert("ไมค์ขัดข้อง: " + err.message) }
  }

  if (!mounted || !activeMission) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <Loader2 className="animate-spin text-white" size={40} />
    </div>
  )

  return (
    // ✅ จุดตาย: key={missionId} จะบังคับให้ React ล้างหน้าจอและ Memory ทิ้งทั้งหมดเมื่อเปลี่ยนข้อ
    <div key={missionId} className="min-h-screen bg-[#0f172a] text-white flex flex-col font-sans">
      
      {/* HEADER: ปรับขนาดให้กระชับ */}
      <div className="p-8 text-center">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 transition-all ${isRecording ? 'bg-red-500 scale-110 shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'bg-indigo-600 shadow-xl'}`}>
          <User size={40} />
        </div>
        <h2 className="text-xl font-black">{activeMission.category}</h2>
        <p className="text-indigo-400 text-[9px] uppercase tracking-widest font-bold">Simulator Active</p>
      </div>

      {/* CONTENT */}
      <div className="flex-1 px-8">
        <div className="bg-white/5 backdrop-blur-md p-6 rounded-[35px] border border-white/10 text-center shadow-inner">
          <p className="text-slate-200 italic leading-relaxed font-medium">"{activeMission.question_text}"</p>
        </div>
      </div>

      {/* CONTROL PANEL */}
      <div className="bg-white rounded-t-[50px] p-10 pb-12 shadow-[0_-15px_40px_rgba(0,0,0,0.4)] space-y-8">
        <div className="flex justify-center">
          {!agentVoiceUrl ? (
            <button 
              onPointerDown={startRec} 
              onPointerUp={() => { if (mediaRef.current?.state === 'recording') mediaRef.current.stop() }}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 scale-125 shadow-2xl' : 'bg-slate-900 shadow-xl'}`}
            >
              {isRecording ? <Square fill="currentColor" size={24} /> : <Mic size={30} />}
            </button>
          ) : (
            <div className="flex gap-4 w-full max-w-xs">
              <button 
                onClick={() => {
                  URL.revokeObjectURL(agentVoiceUrl)
                  setAgentVoiceUrl(null)
                  setShowResponse(false)
                }} 
                className="flex-1 bg-slate-100 h-16 rounded-[25px] font-black text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-200 transition"
              >
                <RotateCcw size={18} /> อัดใหม่
              </button>
              <button 
                onClick={() => router.back()} 
                className="flex-1 bg-green-500 h-16 rounded-[25px] font-black text-white flex items-center justify-center gap-2 shadow-lg hover:bg-green-600 transition"
              >
                <ShieldCheck size={20} /> ส่งงาน
              </button>
            </div>
          )}
        </div>

        <AnimatePresence>
          {showResponse && activeMission.audio_question_url && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-xs mx-auto bg-indigo-600 p-4 rounded-[25px] flex items-center justify-between border-2 border-indigo-400 shadow-xl shadow-indigo-200/20">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg"><Play size={18} fill="white" /></div>
                <span className="font-black text-[9px] uppercase tracking-widest text-white">Customer Response</span>
              </div>
              <audio src={supabase.storage.from('recordings').getPublicUrl(activeMission.audio_question_url).data.publicUrl} autoPlay className="hidden" />
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
            </motion.div>
          )}
        </AnimatePresence>

        <button onClick={() => router.back()} className="w-full text-slate-400 font-black text-[9px] uppercase tracking-[0.3em] text-center opacity-50 hover:opacity-100 transition">
          กลับหน้าหลัก
        </button>
      </div>
    </div>
  )
}
'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Phone, Mic, Square, Play, RotateCcw, ShieldCheck, User, ChevronRight, Star } from 'lucide-react'

export default function EmployeeStableHub() {
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

  // ✅ ฟังก์ชันดึง URL แบบปลอดภัย ป้องกัน Error 'replace' of null
  const getSafeAudioUrl = (path) => {
    if (!path) return ""
    try {
      const { data } = supabase.storage.from('recordings').getPublicUrl(path)
      return data?.publicUrl || ""
    } catch (e) { return "" }
  }

  async function handleLogin() {
    const { data } = await supabase.from('game_sessions').select('*').eq('pin', pin).eq('is_active', true).single()
    if (data) {
      setSessionData(data)
      const { data: qData } = await supabase.from('questions').select('*')
        .eq('target_department', data.target_department)
        .eq('target_level', data.target_level)
      if (qData) setMissions(qData)
      setStep('dashboard')
    } else { alert("PIN ไม่ถูกต้อง") }
  }

  async function startRec() {
    try {
      setAgentVoiceUrl(null)
      setShowResponse(false)
      chunksRef.current = []
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      mediaRef.current = recorder
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' })
        setAgentVoiceUrl(URL.createObjectURL(blob))
        setIsRecording(false)
        setShowResponse(true)
        stream.getTracks().forEach(t => t.stop())
      }
      recorder.start()
      setIsRecording(true)
    } catch (err) { alert("ไมค์ขัดข้อง: " + err.message) }
  }

  if (!mounted) return null

  // --- UI: LOGIN ---
  if (step === 'pin') return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-sans">
      <div className="max-w-xs w-full text-center">
        <h1 className="text-3xl font-black mb-8 tracking-tighter">TRIVIO PLAY</h1>
        <input type="text" value={pin} onChange={e => setPin(e.target.value)} className="w-full p-4 bg-slate-900 rounded-2xl text-center text-2xl font-bold mb-4 border border-slate-800" placeholder="รหัส PIN 6 หลัก" />
        <button onClick={handleLogin} className="w-full bg-indigo-600 py-4 rounded-2xl font-bold">เข้าสู่ภารกิจ</button>
      </div>
    </div>
  )

  // --- UI: DASHBOARD (แก้ไขขนาด Header) ---
  if (step === 'dashboard') return (
    <div className="min-h-screen bg-slate-50 font-sans pb-10">
      {/* ปรับ Header ให้เล็กลง (h-48) และกระชับขึ้น */}
      <div className="bg-indigo-900 h-48 rounded-b-[40px] p-6 text-white flex flex-col justify-center">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Mission Hub</span>
          <span className="flex items-center gap-1 font-bold text-yellow-400 text-xs"><Star size={14} fill="currentColor"/> {completedMissions.length * 100} XP</span>
        </div>
        <h2 className="text-2xl font-black">สวัสดี, Agent!</h2>
        <p className="text-[10px] font-bold opacity-50 uppercase tracking-tighter">Dept: {sessionData?.target_department} | Level: {sessionData?.target_level}</p>
      </div>

      <div className="max-w-md mx-auto -mt-8 px-6 space-y-3">
        {/* การ์ดรายงานผลที่ขยับลงมาไม่ให้ทับข้อความ */}
        <div className="bg-white p-5 rounded-3xl shadow-lg border border-white flex items-center justify-between">
           <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center font-black text-indigo-600 italic">
               {Math.round((completedMissions.length / (missions.length || 1)) * 100)}%
             </div>
             <div><p className="font-black text-sm text-slate-800">ภารกิจรวม</p></div>
           </div>
        </div>

        <div className="pt-6 space-y-3">
          {missions.map((m, idx) => {
            const isDone = completedMissions.includes(m.id)
            return (
              <div key={m.id} onClick={() => { setActiveMission(m); setStep('mission'); setAgentVoiceUrl(null); setShowResponse(false); }} className={`p-4 bg-white rounded-2xl border flex justify-between items-center active:scale-95 transition-all ${isDone ? 'border-green-500 bg-green-50' : 'border-white'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${isDone ? 'bg-green-500 text-white' : 'bg-slate-900 text-white'}`}>{isDone ? '✓' : idx + 1}</div>
                  <div><p className="font-bold text-slate-800 text-sm">{m.category}</p></div>
                </div>
                <ChevronRight size={16} className="text-slate-300"/>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  // --- UI: MISSION ---
  if (step === 'mission') return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col p-8 font-sans">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-indigo-600'}`}><User size={40}/></div>
        <h3 className="text-xl font-bold mb-1">{activeMission?.category}</h3>
        <p className="text-slate-400 text-sm italic">"{activeMission?.question_text}"</p>
      </div>
      <div className="space-y-6">
        {!agentVoiceUrl ? (
          <button onPointerDown={startRec} onPointerUp={() => mediaRef.current?.stop()} className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${isRecording ? 'bg-red-500' : 'bg-white text-slate-900'}`}>{isRecording ? <Square size={24}/> : <Mic size={24}/>}</button>
        ) : (
          <div className="flex gap-4">
            <button onClick={() => { setAgentVoiceUrl(null); setShowResponse(false); }} className="flex-1 bg-slate-800 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 text-sm"><RotateCcw size={16}/> อัดใหม่</button>
            <button onClick={() => { setCompletedMissions([...completedMissions, activeMission.id]); setStep('dashboard'); }} className="flex-1 bg-green-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 text-sm"><ShieldCheck size={16}/> ส่งงาน</button>
          </div>
        )}
        {showResponse && activeMission?.audio_question_url && (
          <div className="bg-indigo-600/30 p-4 rounded-2xl flex justify-between items-center border border-indigo-500/30">
             <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Customer Audio playing</span>
             <audio src={getSafeAudioUrl(activeMission.audio_question_url)} autoPlay className="hidden" />
          </div>
        )}
        <button onClick={() => setStep('dashboard')} className="w-full text-slate-600 text-[10px] font-bold uppercase py-4">กลับหน้าหลัก</button>
      </div>
    </div>
  )
}
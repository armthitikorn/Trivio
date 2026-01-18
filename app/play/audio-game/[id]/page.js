'use client'
import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function MissionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const missionId = params?.id

  const [mounted, setMounted] = useState(false)
  const [activeMission, setActiveMission] = useState(null)
  
  // States สำหรับการอัดเสียง (จะถูกล้างค่าอัตโนมัติเมื่อเปลี่ยนข้อด้วย key)
  const [isRecording, setIsRecording] = useState(false)
  const [agentVoiceUrl, setAgentVoiceUrl] = useState(null)

  const mediaRef = useRef(null)
  const chunksRef = useRef([])

  useEffect(() => {
    setMounted(true)
    const loadMission = async () => {
      const { data } = await supabase.from('questions').select('*').eq('id', missionId).maybeSingle()
      if (data) setActiveMission(data)
    }
    if (missionId) loadMission()
  }, [missionId])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' })
        setAgentVoiceUrl(URL.createObjectURL(blob))
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
      setIsRecording(false)
    }
  }

  if (!mounted || !activeMission) return null

  return (
    // ✅ จุดสำคัญที่สุด: key={missionId} จะบังคับให้ React ทำลายหน้าจอเก่าทิ้งทั้งหมด 
    // และเริ่มใหม่ทุกอย่าง (State จะกลับเป็นค่าเริ่มต้น) เมื่อ ID เปลี่ยน
    <div key={missionId} style={s.page}>
      
      <div style={s.header}>
        <div style={s.avatar(isRecording)}>👤</div>
        <h2 style={s.category}>{activeMission.category}</h2>
        <div style={s.objectionBox}>
          <p style={s.objectionText}>"{activeMission.question_text}"</p>
          {/* เสียงลูกค้าเล่นอัตโนมัติ */}
          <audio src={supabase.storage.from('recordings').getPublicUrl(activeMission.audio_question_url).data.publicUrl} autoPlay className="hidden" />
        </div>
      </div>

      <div style={s.controlPanel}>
        {!agentVoiceUrl ? (
          <div style={s.micSection}>
            <button 
              onPointerDown={startRecording} 
              onPointerUp={stopRecording}
              style={s.btnMic(isRecording)}
            >
              {isRecording ? '⬛' : '🎤'}
            </button>
            <p style={s.hint}>{isRecording ? 'ปล่อยเพื่อหยุดอัด' : 'กดค้างเพื่อตอบโต้'}</p>
          </div>
        ) : (
          <div style={s.submitSection}>
            <div style={{width:'100%', marginBottom:'20px'}}>
               <p style={s.hint}>เช็คเสียงของคุณก่อนส่ง</p>
               <audio src={agentVoiceUrl} controls style={{width:'100%'}} />
            </div>
            <div style={s.btnGroup}>
              <button onClick={() => setAgentVoiceUrl(null)} style={s.btnRetry}>อัดใหม่</button>
              <button onClick={() => router.back()} style={s.btnSubmit}>ส่งงาน</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: '#0f172a', color: 'white', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' },
  header: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  avatar: (isRec) => ({ width: '100px', height: '100px', borderRadius: '50%', background: isRec ? '#ef4444' : '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', marginBottom: '20px', transition: '0.3s', boxShadow: isRec ? '0 0 30px rgba(239,68,68,0.5)' : 'none' }),
  category: { fontSize: '24px', fontWeight: '900', marginBottom: '10px' },
  objectionBox: { background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '25px', width: '100%', maxWidth: '350px', textAlign: 'center' },
  objectionText: { fontStyle: 'italic', color: '#cbd5e1' },
  controlPanel: { background: 'white', borderRadius: '50px 50px 0 0', padding: '40px 30px', display: 'flex', justifyContent: 'center' },
  micSection: { textAlign: 'center' },
  btnMic: (isRec) => ({ width: '80px', height: '80px', borderRadius: '50%', border: 'none', background: isRec ? '#ef4444' : '#1e293b', color: 'white', fontSize: '30px', cursor: 'pointer', transition: '0.2s' }),
  hint: { color: '#64748b', fontSize: '12px', fontWeight: 'bold', marginTop: '10px', textTransform: 'uppercase' },
  submitSection: { width: '100%', maxWidth: '400px', textAlign: 'center' },
  btnGroup: { display: 'flex', gap: '15px' },
  btnRetry: { flex: 1, background: '#f1f5f9', border: 'none', padding: '15px', borderRadius: '20px', fontWeight: 'bold', color: '#475569', cursor: 'pointer' },
  btnSubmit: { flex: 1, background: '#22c55e', border: 'none', padding: '15px', borderRadius: '20px', fontWeight: 'bold', color: 'white', cursor: 'pointer', boxShadow: '0 10px 20px rgba(34,197,94,0.2)' }
}
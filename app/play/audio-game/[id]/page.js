'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'

export default function AudioGameArena() {
  const { id } = useParams()
  const router = useRouter()

  // --- States หลัก ---
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionInfo, setSessionInfo] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  
  const mediaRecorder = useRef(null)

  // 1. โหลดข้อมูลห้องสอบและโจทย์
  useEffect(() => {
    if (id) fetchSessionAndQuestions()
  }, [id])

  async function fetchSessionAndQuestions() {
    try {
      const { data: session, error: sError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', id)
        .single()

      if (sError || !session) return;
      setSessionInfo(session)

      const { data: qs } = await supabase
        .from('questions')
        .select('*')
        .eq('target_department', session.target_department)
        .eq('target_level', session.target_level)
        .order('created_at', { ascending: true })

      if (qs) {
        setQuestions(qs.filter(q => q.audio_question_url || q.media_url || q.text))
      }
    } catch (err) {
      console.error("System Error:", err)
    }
  }

  // 2. ระบบอัดเสียง
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder.current = new MediaRecorder(stream)
      const chunks = []
      mediaRecorder.current.ondataavailable = (e) => chunks.push(e.data)
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' })
        setAudioUrl(blob)
        setPreviewUrl(URL.createObjectURL(blob))
      }
      mediaRecorder.current.start()
      setIsRecording(true)
    } catch (err) {
      alert("❌ ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาตรวจสอบการตั้งค่า")
    }
  }

  function stopRecording() {
    if (mediaRecorder.current) {
        mediaRecorder.current.stop()
        setIsRecording(false)
    }
  }

  // 3. บันทึกคำตอบ
  async function submitAnswer() {
    if (!audioUrl) return
    setUploading(true)

    const savedInfo = JSON.parse(localStorage.getItem('temp_player_info') || '{}');
    const fileName = `answers/${sessionInfo?.target_department}/${id}/${Date.now()}.wav`

    try {
        const { error: upError } = await supabase.storage.from('recordings').upload(fileName, audioUrl)
        if (upError) throw upError

        await supabase.from('answers').insert([{
            session_id: id,
            question_id: questions[currentIndex]?.id,
            nickname: savedInfo.nickname || 'Unknown',
            employee_id: savedInfo.employeeId,
            audio_answer_url: fileName
        }])

        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1)
            setAudioUrl(null)
            setPreviewUrl(null)
        } else {
            alert("✅ เก่งมาก! ส่งคำตอบครบทุกข้อแล้ว")
            router.push('/play')
        }
    } catch (err) {
        alert("เกิดข้อผิดพลาดในการส่ง: " + err.message)
    } finally {
        setUploading(false)
    }
  }

  if (questions.length === 0) return (
    <div style={s.pageContainer}><div style={s.mainCard}><h2 style={s.questionTitle}>⏳ กำลังโหลดโจทย์เสียง...</h2></div></div>
  )

  const currentQ = questions[currentIndex]
  const questionAudioUrl = supabase.storage.from('recordings').getPublicUrl(currentQ?.audio_question_url || currentQ?.media_url || "").data.publicUrl

  return (
    <div style={s.pageContainer}>
      <div style={s.mainCard}>
        {/* Progress Tracker */}
        <div style={s.headerGroup}>
            <span style={s.badge}>MISSION {currentIndex + 1} / {questions.length}</span>
            <p style={s.deptLabel}>แผนก: {sessionInfo?.target_department} ({sessionInfo?.target_level})</p>
        </div>

        <h2 style={s.questionTitle}>{currentQ.question_text || "ฟังโจทย์แล้วตอบกลับด้วยเสียง"}</h2>
        
        {/* โซนฟังเสียงลูกค้า */}
        <div style={s.audioSection}>
          <p style={s.stepLabel}>Step 1: ฟังเสียงลูกค้า</p>
          <audio key={questionAudioUrl} src={questionAudioUrl} controls style={{ width: '100%', height: '45px' }} />
        </div>

        <div style={s.divider} />

        {/* โซนตอบกลับ */}
        <div style={s.recordSection}>
          <p style={s.stepLabel}>Step 2: อัดเสียงตอบกลับของคุณ</p>
          
          <div style={{margin: '30px 0'}}>
            {!isRecording ? (
              <button onClick={startRecording} style={s.btnRecord}>🎤 เริ่มอัดเสียง</button>
            ) : (
              <button onClick={stopRecording} style={s.btnStop}>⬛ หยุดอัด (Stop)</button>
            )}
          </div>
          
          {previewUrl && (
            <div style={s.previewBox}>
              <p style={s.smallLabel}>ลองฟังเสียงที่เพิ่งอัด:</p>
              <audio src={previewUrl} controls style={{ width: '100%', marginBottom: '20px' }} />
              
              <button onClick={submitAnswer} disabled={uploading} style={s.btnSubmit(uploading)}>
                {uploading ? 'กำลังส่งงาน...' : 'บันทึกเสียงนี้ และไปข้อถัดไป ➡️'}
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(214, 48, 49, 0.4); } 70% { box-shadow: 0 0 0 15px rgba(214, 48, 49, 0); } 100% { box-shadow: 0 0 0 0 rgba(214, 48, 49, 0); } }
      `}</style>
    </div>
  )
}

const s = {
  pageContainer: { padding: '20px', background: '#f0f2f5', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  mainCard: { width: '100%', maxWidth: '500px', background: 'white', padding: '40px 25px', borderRadius: '40px', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', border: '1px solid #ddd', textAlign: 'center' },
  headerGroup: { marginBottom: '30px' },
  badge: { background: '#6c5ce7', color: 'white', padding: '6px 15px', borderRadius: '50px', fontWeight: '900', fontSize: '0.8rem', letterSpacing: '1px' },
  deptLabel: { fontSize: '0.85rem', color: '#666', marginTop: '10px', fontWeight: '700' },
  questionTitle: { color: '#1a1a1a', fontSize: '1.8rem', fontWeight: '800', marginBottom: '30px', lineHeight: '1.3' },
  audioSection: { background: '#f8f9fa', padding: '20px', borderRadius: '25px', marginBottom: '25px', border: '1px solid #eee' },
  stepLabel: { fontWeight: '800', color: '#1a1a1a', marginBottom: '15px', display: 'block', fontSize: '1rem' },
  divider: { height: '2px', background: '#f1f1f1', margin: '30px 0' },
  btnRecord: { padding: '18px 40px', borderRadius: '50px', background: '#d63031', color: 'white', border: 'none', cursor: 'pointer', fontSize: '1.2rem', fontWeight: '900', boxShadow: '0 8px 20px rgba(214, 48, 49, 0.3)' },
  btnStop: { padding: '18px 40px', borderRadius: '50px', background: '#2d3436', color: 'white', border: 'none', cursor: 'pointer', fontSize: '1.2rem', fontWeight: '900', animation: 'pulse 1.5s infinite' },
  previewBox: { marginTop: '20px', padding: '20px', background: '#f1f2f6', borderRadius: '25px', border: '1px solid #ddd' },
  smallLabel: { fontWeight: '700', color: '#555', marginBottom: '10px', display: 'block' },
  btnSubmit: (uploading) => ({ width: '100%', padding: '20px', background: uploading ? '#ccc' : '#00b894', color: 'white', border: 'none', borderRadius: '15px', fontWeight: '900', fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 5px 15px rgba(0,184,148,0.2)' })
}
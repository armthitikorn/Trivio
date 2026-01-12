'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'

export default function AudioGameArena() {
  const { id } = useParams()
  const router = useRouter()

  // --- States ---
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionInfo, setSessionInfo] = useState(null)
  
  const [isRecording, setIsRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  
  const mediaRecorder = useRef(null)

  useEffect(() => {
    if (id) fetchFullFlow();
  }, [id])

  // --- Logic ดึงข้อมูล 3 ขั้นตอน (Intro -> Objection -> Closing) ---
  async function fetchFullFlow() {
    try {
      // 1. ดึงข้อมูล Session ก่อน
      const { data: session, error: sError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', id)
        .single()

      if (sError || !session) return
      setSessionInfo(session)

      // 2. ดึงคำถาม 3 ส่วนมาประกอบกัน
      // ส่วนที่ 1: Introduction (ดึงมา 1 ข้อที่ตรงกับแผนก)
      const { data: introQ } = await supabase.from('questions')
        .select('*').eq('category', 'Introduction').eq('target_department', session.target_department).limit(1).single()

      // ส่วนที่ 2: Objection (ดึงข้อโต้แย้งที่เทรนเนอร์กำหนดไว้ใน Session นี้)
      // *หมายเหตุ: ใช้ชื่อหัวข้อจาก session มาค้นหาในตาราง questions*
      const { data: objectionQ } = await supabase.from('questions')
        .select('*').eq('text', session.objection_topic).limit(1).single()

      // ส่วนที่ 3: Closing (ดึงมา 1 ข้อ)
      const { data: closingQ } = await supabase.from('questions')
        .select('*').eq('category', 'Closing').eq('target_department', session.target_department).limit(1).single()

      // รวมร่างเป็น Array 3 ข้อ
      const fullSequence = [
        { ...introQ, phaseTitle: '1. บทนำ (Introduction)' },
        { ...objectionQ, phaseTitle: `2. ตอบข้อโต้แย้ง: ${session.objection_topic}` },
        { ...closingQ, phaseTitle: '3. ปิดการขาย (Closing Sale)' }
      ].filter(q => q.id); // กรองเฉพาะข้อที่มีข้อมูลจริง

      setQuestions(fullSequence)

    } catch (err) {
      console.error("Fetch Error:", err)
    }
  }

  // --- Recording Logic ---
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
    } catch (err) { alert("กรุณาอนุญาตไมโครโฟน") }
  }

  function stopRecording() {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop()
      setIsRecording(false)
    }
  }

  // --- Submission Logic ---
  async function submitAnswer() {
    if (!audioUrl) return
    setUploading(true)

    const nickname = localStorage.getItem('player_name') || 'พนักงาน'
    const phaseLabel = currentIndex === 0 ? 'intro' : currentIndex === 1 ? 'objection' : 'closing'
    const fileName = `answers/${id}/${nickname}_${phaseLabel}_${Date.now()}.wav`

    try {
      // 1. Upload ไป Storage
      const { error: upError } = await supabase.storage.from('recordings').upload(fileName, audioUrl)
      if (upError) throw upError

      // 2. Insert ลงตาราง Answers
      await supabase.from('answers').insert([{
        session_id: id,
        question_id: questions[currentIndex]?.id,
        nickname: nickname,
        audio_answer_url: fileName,
        metadata: { phase: phaseLabel, topic: questions[currentIndex]?.phaseTitle }
      }])

      // 3. ไปต่อหรือจบ
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1)
        setAudioUrl(null)
        setPreviewUrl(null)
      } else {
        alert("🎉 ยอดเยี่ยม! คุณทำครบทั้ง 3 ขั้นตอนแล้ว")
        router.push('/play/complete') // หรือหน้าที่คุณต้องการ
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาด: " + err.message)
    } finally { setUploading(false) }
  }

  if (questions.length === 0) return <div style={s.loading}>⏳ กำลังเตรียมสนามฝึก...</div>

  const currentQ = questions[currentIndex]

  return (
    <div style={s.pageContainer}>
      {/* 🧭 Phase Indicator (Roadmap) */}
      <div style={s.roadmap}>
        {questions.map((_, i) => (
          <div key={i} style={s.roadmapCircle(i <= currentIndex)}>
            {i + 1}
          </div>
        ))}
      </div>

      <div style={s.mainCard}>
        {/* หัวข้อ Phase */}
        <div style={s.phaseBadge}>{currentQ.phaseTitle}</div>
        
        <h2 style={s.questionText}>
          {currentQ.question_text || "กรุณาตอบกลับลูกค้าตามสถานการณ์"}
        </h2>

        {/* ส่วนเล่นเสียงลูกค้า */}
        <div style={s.audioBox}>
          <p style={{marginBottom: '10px', fontWeight: 'bold'}}>🎧 ลูกค้าพูดว่า:</p>
          <audio 
            key={currentQ.id} 
            src={supabase.storage.from('recordings').getPublicUrl(currentQ.audio_question_url || currentQ.media_url).data.publicUrl} 
            controls 
            style={{ width: '100%' }} 
          />
        </div>

        <hr style={s.hr} />

        {/* ส่วนอัดเสียงตอบกลับ */}
        <div style={{textAlign: 'center'}}>
          <p style={{fontWeight: '900', color: '#000', marginBottom: '15px'}}>🎙️ บันทึกเสียงของคุณ</p>
          
          {!isRecording ? (
            <button onClick={startRecording} style={s.btnRecord}>🎤</button>
          ) : (
            <button onClick={stopRecording} style={s.btnStop}>⬛</button>
          )}

          {previewUrl && (
            <div style={s.previewArea}>
              <audio src={previewUrl} controls style={{ width: '100%', marginBottom: '20px' }} />
              <button onClick={submitAnswer} disabled={uploading} style={s.btnSubmit(uploading)}>
                {uploading ? 'กำลังบันทึก...' : currentIndex === 2 ? '🏁 จบการทดสอบและส่งผล' : 'ไปขั้นตอนถัดไป ➡️'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// --- Styles (High Contrast & Professional) ---
const s = {
  pageContainer: {
    padding: '20px',
    background: '#f0f2f5',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    fontFamily: 'sans-serif'
  },
  roadmap: { display: 'flex', gap: '15px', marginBottom: '30px' },
  roadmapCircle: (active) => ({
    width: '40px', height: '40px', borderRadius: '50%', 
    background: active ? '#000' : '#ccc', color: '#fff',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    fontWeight: 'bold', transition: '0.3s'
  }),
  mainCard: {
    width: '100%', maxWidth: '500px', background: '#fff',
    padding: '40px', borderRadius: '30px', boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
    border: '2px solid #eee'
  },
  phaseBadge: {
    display: 'inline-block', padding: '8px 16px', background: '#000',
    color: '#fff', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 'bold',
    marginBottom: '20px'
  },
  questionText: { fontSize: '1.6rem', fontWeight: '900', color: '#000', marginBottom: '25px', lineHeight: '1.4' },
  audioBox: { background: '#f8f9ff', padding: '20px', borderRadius: '20px', marginBottom: '30px', border: '1px solid #e0e6ed' },
  hr: { border: 'none', height: '1px', background: '#eee', margin: '30px 0' },
  btnRecord: {
    width: '80px', height: '80px', borderRadius: '50%', background: '#ff4757',
    color: '#fff', border: 'none', cursor: 'pointer', fontSize: '2rem',
    boxShadow: '0 8px 15px rgba(255, 71, 87, 0.3)'
  },
  btnStop: {
    width: '80px', height: '80px', borderRadius: '50%', background: '#2f3542',
    color: '#fff', border: 'none', cursor: 'pointer', fontSize: '1.5rem',
    animation: 'pulse 1.5s infinite'
  },
  previewArea: { marginTop: '25px', padding: '20px', background: '#f1f2f6', borderRadius: '20px' },
  btnSubmit: (uploading) => ({
    width: '100%', padding: '18px', background: uploading ? '#ccc' : '#000',
    color: '#fff', border: 'none', borderRadius: '15px', fontWeight: 'bold',
    fontSize: '1.1rem', cursor: uploading ? 'default' : 'pointer'
  }),
  loading: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontWeight: 'bold', fontSize: '1.2rem' }
}
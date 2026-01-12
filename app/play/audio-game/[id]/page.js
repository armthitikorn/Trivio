'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'

export default function AudioGameArena() {
  const { id } = useParams()
  const router = useRouter()

  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionInfo, setSessionInfo] = useState(null)
  
  const [isRecording, setIsRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  
  const mediaRecorder = useRef(null)

  // --- ตรรกะเดิม: ดึงข้อมูลแบบเดิมที่เคยใช้งานได้ ---
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

      if (sError || !session) return
      setSessionInfo(session)

      const { data: qs } = await supabase
        .from('questions')
        .select('*')
        .eq('target_department', session.target_department)
        .order('created_at', { ascending: true })

      if (qs) {
        const validQs = qs.filter(q => {
            const hasText = q.text && q.text.trim() !== ""
            const hasMedia = q.media_url && q.media_url.trim() !== ""
            const hasAudioQ = q.audio_question_url && q.audio_question_url.trim() !== ""
            return hasText || hasMedia || hasAudioQ
        })
        setQuestions(validQs)
      }
    } catch (err) {
      console.error("Catch Error:", err)
    }
  }

  // --- ตรรกะการอัดเสียงเดิม ---
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

  // --- ตรรกะการส่งไฟล์เดิม (Real-time Upload) ---
  async function submitAnswer() {
    if (!audioUrl) return
    setUploading(true)

    const nickname = localStorage.getItem('player_name') || 'Warrior'
    const fileName = `answers/${sessionInfo?.target_department}/${id}/${Date.now()}.wav`

    try {
        const { error: upError } = await supabase.storage.from('recordings').upload(fileName, audioUrl)
        if (upError) throw upError

        await supabase.from('answers').insert([{
            session_id: id,
            question_id: questions[currentIndex]?.id,
            nickname: nickname,
            audio_answer_url: fileName
        }])

        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1)
            setAudioUrl(null)
            setPreviewUrl(null)
        } else {
            alert("🎉 จบการฝึกฝนแล้ว! สุดยอดมาก")
            router.push('/play/audio')
        }
    } catch (err) {
        alert("เกิดข้อผิดพลาด: " + err.message)
    } finally {
        setUploading(false)
    }
  }

  if (questions.length === 0) return <div style={s.pageContainer}>⏳ กำลังโหลดสนามฝึก...</div>

  const currentQ = questions[currentIndex]
  const rawPath = currentQ?.text || currentQ?.media_url || currentQ?.audio_question_url || ""
  let cleanPath = rawPath.startsWith('/') ? rawPath.substring(1) : rawPath
  if (cleanPath && !cleanPath.startsWith('questions/')) {
      cleanPath = `questions/${cleanPath}`
  }
  const questionAudioUrl = supabase.storage.from('recordings').getPublicUrl(cleanPath).data.publicUrl

  return (
    <div style={s.pageContainer}>
      <div style={s.mainCard}>
        
        {/* ✨ ส่วนที่เพิ่มเติม: แสดงหัวข้อให้พนักงานเห็นชัดเจน (ใช้ข้อมูลจาก sessionInfo) */}
        <div style={s.topicIndicator}>
             <p style={{fontSize: '0.8rem', opacity: 0.8, marginBottom: '5px'}}>หัวข้อแบบทดสอบปัจจุบัน:</p>
             <h3 style={{margin: 0, fontWeight: '900'}}>{sessionInfo?.objection_topic || 'กำลังเตรียมข้อมูล...'}</h3>
        </div>

        <p style={{ color: '#00b894', fontWeight: 'bold', letterSpacing: '1px', marginTop: '20px' }}>
          MISSION {currentIndex + 1} / {questions.length}
        </p>
        
        <h2 style={{ margin: '15px 0', color: '#2d3436' }}>
          {currentQ.question_text || `หมวด: ${currentQ.category}`}
        </h2>
        
        <div style={s.audioBox}>
          <p style={{marginBottom: '10px', color: '#555'}}>🎧 ฟังเสียงลูกค้า:</p>
          <audio key={questionAudioUrl} src={questionAudioUrl} controls style={{ width: '100%', borderRadius: '10px' }} />
        </div>

        <hr style={{ border: 'none', height: '1px', background: '#eee', margin: '30px 0' }} />

        <div>
          <h3 style={{color: '#2d3436'}}>🎙️ บันทึกเสียงตอบกลับ</h3>
          <div style={{marginTop: '20px'}}>
            {!isRecording ? (
              <button onClick={startRecording} style={s.btnRecord}>🎤</button>
            ) : (
              <button onClick={stopRecording} style={s.btnStop}>⬛</button>
            )}
          </div>
          
          {previewUrl && (
            <div style={{ marginTop: '25px' }}>
              <p style={{fontSize: '0.9rem', color: '#666', marginBottom: '10px'}}>เช็คเสียงของคุณ:</p>
              <audio src={previewUrl} controls style={{ width: '100%', borderRadius: '10px' }} />
              
              <button onClick={submitAnswer} disabled={uploading} style={s.btnSubmit(uploading)}>
                {uploading ? 'กำลังส่งข้อมูล...' : 'ส่งคำตอบแล้วไปต่อ ➡️'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// --- Styles (คงเดิม เพิ่มเฉพาะหัวข้อ) ---
const s = {
  pageContainer: {
    padding: '20px', background: 'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)',
    minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center'
  },
  mainCard: {
    width: '100%', maxWidth: '550px', background: 'white', padding: '40px', borderRadius: '30px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.1)', textAlign: 'center'
  },
  // ป้ายบอกหัวข้อที่เพิ่มเข้ามา
  topicIndicator: {
    background: '#000', color: '#fff', padding: '15px', borderRadius: '20px',
    marginBottom: '10px', boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
  },
  audioBox: { background: '#f8f9fa', padding: '25px', borderRadius: '20px', margin: '20px 0' },
  btnRecord: {
    width: '90px', height: '90px', borderRadius: '50%', background: 'linear-gradient(135deg, #FF6B6B 0%, #EE5253 100%)',
    color: 'white', border: 'none', cursor: 'pointer', fontSize: '2.5rem'
  },
  btnStop: {
    width: '90px', height: '90px', borderRadius: '50%', background: '#2d3436',
    color: 'white', border: 'none', cursor: 'pointer', fontSize: '2rem'
  },
  btnSubmit: (uploading) => ({
    width: '100%', marginTop: '20px', padding: '16px',
    background: uploading ? '#b2bec3' : 'linear-gradient(135deg, #00b894 0%, #00cec9 100%)',
    color: 'white', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: uploading ? 'default' : 'pointer'
  })
}
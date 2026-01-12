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

  useEffect(() => {
    if (id) fetchSessionAndQuestions()
  }, [id])

  async function fetchSessionAndQuestions() {
    try {
      // 1. ดึงข้อมูล Session ก่อนเพื่อดูว่า PIN นี้ผูกกับสินค้า (Product Type) อะไร
      const { data: session, error: sError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', id)
        .single()

      if (sError || !session) return
      setSessionInfo(session)

      // 2. ดึงคำถามเฉพาะที่ตรงกับ แผนก และ ประเภทสินค้า (Product Type)
      const { data: qs } = await supabase
        .from('questions')
        .select('*')
        .eq('target_department', session.target_department)
        .eq('product_type', session.product_type) // ✨ กรองตามประเภทสินค้าที่ Trainer เลือก
        .order('created_at', { ascending: true })

      if (qs) {
        // กรองเฉพาะข้อที่มีข้อมูลสำหรับเล่นเสียง
        const validQs = qs.filter(q => q.text || q.media_url || q.audio_question_url)
        setQuestions(validQs)
      }
    } catch (err) {
      console.error("Catch Error:", err)
    }
  }

  // --- ตรรกะการอัดเสียง (คงเดิมตามที่คุณใช้งานได้ดีอยู่แล้ว) ---
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

  // --- ตรรกะการส่งไฟล์ (ปรับ Folder ตามชื่อสินค้าเพื่อให้ Trainer ตรวจง่าย) ---
  async function submitAnswer() {
    if (!audioUrl) return
    setUploading(true)

    const nickname = localStorage.getItem('player_name') || 'Warrior'
    // ✨ แยกโฟลเดอร์ตามประเภทสินค้า
    const fileName = `answers/${sessionInfo?.product_type || 'general'}/${id}/${Date.now()}.wav`

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
            alert("🎉 จบภารกิจเรียบร้อย! คุณยอดเยี่ยมมาก")
            router.push('/play/audio')
        }
    } catch (err) {
        alert("เกิดข้อผิดพลาด: " + err.message)
    } finally {
        setUploading(false)
    }
  }

  if (questions.length === 0) return <div style={s.pageContainer}>⏳ กำลังโหลดภารกิจ {sessionInfo?.product_type || ''}...</div>

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
        
        {/* ✨ ปรับการแสดงผลหัวข้อตามประเภทสินค้าที่เลือก */}
        <div style={s.topicIndicator}>
             <p style={{fontSize: '0.8rem', opacity: 0.8, marginBottom: '5px'}}>ภารกิจปัจจุบัน:</p>
             <h3 style={{margin: 0, fontWeight: '900'}}>{sessionInfo?.product_type || 'กำลังเตรียมโจทย์...'}</h3>
        </div>

        <p style={{ color: '#00b894', fontWeight: 'bold', letterSpacing: '1px', marginTop: '20px' }}>
          MISSION {currentIndex + 1} / {questions.length}
        </p>
        
        <h2 style={{ margin: '15px 0', color: '#2d3436' }}>
          {/* แสดงประเภท (Intro/Objection/Closing) คู่กับสคริปต์ */}
          <span style={{fontSize: '0.9rem', color: '#6c5ce7', display: 'block'}}>[{currentQ.category}]</span>
          {currentQ.question_text}
        </h2>
        
        <div style={s.audioBox}>
          <p style={{marginBottom: '10px', color: '#555'}}>🎧 ฟังเสียงลูกค้า:</p>
          <audio key={currentQ.id} src={questionAudioUrl} controls style={{ width: '100%', borderRadius: '10px' }} />
        </div>

        <hr style={{ border: 'none', height: '1px', background: '#eee', margin: '30px 0' }} />

        <div>
          <h3 style={{color: '#2d3436'}}>🎙️ บันทึกเสียงตอบกลับของคุณ</h3>
          <div style={{marginTop: '20px'}}>
            {!isRecording ? (
              <button onClick={startRecording} style={s.btnRecord}>🎤 เริ่มอัดเสียง</button>
            ) : (
              <button onClick={stopRecording} style={s.btnStop}>⬛ หยุดอัด</button>
            )}
          </div>
          
          {previewUrl && (
            <div style={{ marginTop: '25px' }}>
              <p style={{fontSize: '0.9rem', color: '#666', marginBottom: '10px'}}>เช็คเสียงของคุณก่อนส่ง:</p>
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

// --- Styles (คงเดิมที่คุณชอบ เพิ่มความชัดเจนของ Indicator) ---
const s = {
  pageContainer: {
    padding: '20px', background: 'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)',
    minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center'
  },
  mainCard: {
    width: '100%', maxWidth: '550px', background: 'white', padding: '40px', borderRadius: '35px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.1)', textAlign: 'center'
  },
  topicIndicator: {
    background: '#000', color: '#fff', padding: '15px', borderRadius: '20px',
    marginBottom: '10px', boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
  },
  audioBox: { background: '#f8f9fa', padding: '25px', borderRadius: '20px', margin: '20px 0', border: '1px solid #eee' },
  btnRecord: {
    padding: '15px 40px', borderRadius: '40px', background: 'linear-gradient(135deg, #FF6B6B 0%, #EE5253 100%)',
    color: 'white', border: 'none', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold'
  },
  btnStop: {
    padding: '15px 40px', borderRadius: '40px', background: '#2d3436',
    color: 'white', border: 'none', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold'
  },
  btnSubmit: (uploading) => ({
    width: '100%', marginTop: '20px', padding: '16px',
    background: uploading ? '#b2bec3' : 'linear-gradient(135deg, #00b894 0%, #00cec9 100%)',
    color: 'white', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: uploading ? 'default' : 'pointer'
  })
}
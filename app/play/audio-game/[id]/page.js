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
      // 1. ดึงข้อมูล Session เพื่อดูว่า PIN นี้ตั้งค่า Dept และ Level ไว้อย่างไร
      const { data: session, error: sError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', id)
        .single()

      if (sError || !session) return
      setSessionInfo(session)

      // 2. 🎯 แก้ไขจุดนี้: เพิ่มการกรอง Level เข้าไปด้วยเพื่อให้ได้โจทย์ที่ถูกต้อง
      const { data: qs } = await supabase
        .from('questions')
        .select('*')
        .eq('target_department', session.target_department)
        .eq('target_level', session.target_level) // ✅ เพิ่มบรรทัดนี้
        .order('created_at', { ascending: true })

      if (qs) {
        // กรองเฉพาะข้อที่มีไฟล์เสียงโจทย์จริงๆ
        const validQs = qs.filter(q => q.audio_question_url && q.audio_question_url.trim() !== "")
        setQuestions(validQs)
      }
    } catch (err) {
      console.error("Catch Error:", err)
    }
  }

  // ... (startRecording, stopRecording, submitAnswer คงเดิม) ...
  // แต่แนะนำให้เพิ่ม cleanup ใน stopRecording เพื่อป้องกันเสียงค้าง
  function stopRecording() {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
        mediaRecorder.current.stop()
        setIsRecording(false)
        // ปิดไมค์ทันทีเมื่อหยุดอัด
        if (mediaRecorder.current.stream) {
            mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
        }
    }
  }

  async function submitAnswer() {
    if (!audioUrl) return
    setUploading(true)
    const nickname = localStorage.getItem('player_name') || 'Warrior'
    // แก้ไข Path การเก็บไฟล์ให้ชัดเจน
    const fileName = `answers/${sessionInfo?.target_department}/${sessionInfo?.target_level}/${id}/${Date.now()}.wav`

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

  if (questions.length === 0) {
    return (
      <div style={s.pageContainer}>
        <div style={s.loadingCard}>
          <h2 style={{color: '#333'}}>⏳ กำลังโหลดสนามฝึก...</h2>
          <p style={{opacity: 0.7, marginTop: '10px', color: '#555'}}>
             แผนก: {sessionInfo?.target_department || '...'} | ระดับ: {sessionInfo?.target_level || '...'}
          </p>
          <button onClick={() => router.back()} style={s.btnBack}>กลับหน้าหลัก</button>
        </div>
      </div>
    )
  }

  const currentQ = questions[currentIndex]

  // 🎯 แก้ไข Logic การดึง URL: ให้เจาะจงที่ audio_question_url เท่านั้น
  const cleanPath = currentQ?.audio_question_url || ""
  const { data: { publicUrl: questionAudioUrl } } = supabase.storage.from('recordings').getPublicUrl(cleanPath)

  return (
    <div style={s.pageContainer}>
      <div style={s.mainCard}>
        <p style={{ color: '#00b894', fontWeight: 'bold', letterSpacing: '1px' }}>
          MISSION {currentIndex + 1} / {questions.length}
        </p>
        
        <h2 style={{ margin: '15px 0', color: '#2d3436' }}>
          {currentQ.question_text || `หมวด: ${currentQ.category}`}
        </h2>
        
        <div style={s.audioBox}>
          <p style={{marginBottom: '10px', color: '#555'}}>🎧 ฟังเสียงลูกค้า:</p>
          {/* ใช้ key เพื่อบังคับให้ Audio Player รีโหลดเมื่อเปลี่ยนข้อ */}
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
            <div style={{ marginTop: '25px', animation: 'fadeIn 0.5s' }}>
              <p style={{fontSize: '0.9rem', color: '#666', marginBottom: '10px'}}>เช็คเสียงของคุณ:</p>
              <audio src={previewUrl} controls style={{ width: '100%', borderRadius: '10px' }} />
              
              <button onClick={submitAnswer} disabled={uploading} style={s.btnSubmit(uploading)}>
                {uploading ? 'กำลังส่งข้อมูล...' : 'ส่งคำตอบแล้วไปต่อ ➡️'}
              </button>
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        @keyframes pulse { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.2); } 70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(0, 0, 0, 0); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 0, 0, 0); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
// --- Styles Object (Soft Theme) ---
const s = {

  pageContainer: {

    padding: '20px',

    fontFamily: "'Inter', sans-serif",

    // ✨ Gradient พื้นหลัง: สีเขียวมิ้นต์ไล่ไปฟ้าอ่อน (สวย สบายตา)

    background: 'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)',

    minHeight: '100vh',

    display: 'flex',

    justifyContent: 'center',

    alignItems: 'center',

    flexDirection: 'column'

  },

  mainCard: {

    width: '100%',

    maxWidth: '550px',

    background: 'white',

    color: '#333',

    padding: '40px',

    borderRadius: '30px',

    boxShadow: '0 20px 60px rgba(0,0,0,0.1)', // เงานุ่มๆ

    textAlign: 'center'

  },

  loadingCard: {

    background: 'rgba(255, 255, 255, 0.9)',

    padding: '40px',

    borderRadius: '20px',

    textAlign: 'center',

    boxShadow: '0 10px 30px rgba(0,0,0,0.05)'

  },

  audioBox: {

    background: '#f8f9fa',

    padding: '25px',

    borderRadius: '20px',

    margin: '20px 0',

    border: '1px solid #eef2f7'

  },

  btnRecord: {

    width: '90px',

    height: '90px',

    borderRadius: '50%',

    background: 'linear-gradient(135deg, #FF6B6B 0%, #EE5253 100%)', // สีแดงพาสเทล

    color: 'white',

    border: 'none',

    cursor: 'pointer',

    fontSize: '2.5rem',

    boxShadow: '0 10px 20px rgba(238, 82, 83, 0.3)',

    transition: 'transform 0.2s'

  },

  btnStop: {

    width: '90px',

    height: '90px',

    borderRadius: '50%',

    background: '#2d3436',

    color: 'white',

    border: 'none',

    cursor: 'pointer',

    fontSize: '2rem',

    animation: 'pulse 2s infinite'

  },

  btnSubmit: (uploading) => ({

    width: '100%',

    marginTop: '20px',

    padding: '16px',

    background: uploading ? '#b2bec3' : 'linear-gradient(135deg, #00b894 0%, #00cec9 100%)', // สีเขียวมิ้นต์เข้ม

    color: 'white',

    border: 'none',

    borderRadius: '15px',

    fontWeight: 'bold',

    fontSize: '1.1rem',

    cursor: uploading ? 'default' : 'pointer',

    boxShadow: '0 5px 15px rgba(0, 184, 148, 0.3)'

  }),

  btnBack: {

    marginTop:'20px',

    padding:'10px 25px',

    cursor:'pointer',

    borderRadius:'10px',

    border:'1px solid #ddd',

    background:'white',

    color:'#555'

  }

}
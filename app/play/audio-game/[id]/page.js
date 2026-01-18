'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'

export default function AudioGameArena() {
  const { id } = useParams()
  const router = useRouter()

  const [mounted, setMounted] = useState(false)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionInfo, setSessionInfo] = useState(null)
  
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  
  const mediaRecorder = useRef(null)
  const chunksRef = useRef([])

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (mounted && id) fetchSessionAndQuestions()
  }, [mounted, id])

  async function fetchSessionAndQuestions() {
    try {
      const { data: session } = await supabase
        .from('game_sessions').select('*').eq('id', id).maybeSingle()

      if (!session) return
      setSessionInfo(session)

      const { data: qs } = await supabase
        .from('questions')
        .select('*')
        .eq('target_department', session.target_department)
        .eq('target_level', session.target_level)
        .order('created_at', { ascending: true })

      if (qs) {
        const validQs = qs.filter(q => q.audio_question_url)
        setQuestions(validQs)
      }
    } catch (err) { console.error(err) }
  }

  // ✅ แก้ข้อ 1: ฟังก์ชันเริ่ม/หยุด ด้วยการกดครั้งเดียว (Toggle)
  async function toggleRecording() {
    if (!isRecording) {
      // เริ่มการอัด
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        mediaRecorder.current = new MediaRecorder(stream)
        chunksRef.current = []
        mediaRecorder.current.ondataavailable = (e) => chunksRef.current.push(e.data)
        mediaRecorder.current.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/wav' })
          setAudioBlob(blob)
          setPreviewUrl(URL.createObjectURL(blob)) // ✅ แก้ข้อ 2: สร้าง URL สำหรับฟังตรวจสอบ
          stream.getTracks().forEach(t => t.stop())
        }
        mediaRecorder.current.start()
        setIsRecording(true)
      } catch (err) { alert("กรุณาอนุญาตไมค์") }
    } else {
      // หยุดการอัด
      if (mediaRecorder.current?.state !== 'inactive') {
        mediaRecorder.current.stop()
        setIsRecording(false)
      }
    }
  }

  // ✅ แก้ข้อ 3: ปรับปรุงการส่งไฟล์เพื่อให้แดชบอร์ดดึงข้อมูลได้แม่นยำ
  async function submitAnswer() {
    if (!audioBlob || !sessionInfo) return
    setUploading(true)

    const nickname = localStorage.getItem('player_name') || 'Agent'
    // กำหนด Path ให้ชัดเจน: answers / แผนก / ID-เซสชัน / เวลา.wav
    const filePath = `answers/${sessionInfo.target_department}/${id}/${Date.now()}.wav`

    try {
      // 1. อัปโหลดไฟล์ไปที่ Storage
      const { error: upError } = await supabase.storage.from('recordings').upload(filePath, audioBlob)
      if (upError) throw upError

      // 2. บันทึกข้อมูลลงตาราง answers (เช็คให้ชัวร์ว่าชื่อตารางและ Column ใน DB ตรงกัน)
      const { error: dbError } = await supabase.from('answers').insert([{
        session_id: id,
        question_id: questions[currentIndex]?.id,
        nickname: nickname,
        audio_answer_url: filePath // เก็บ Path นี้ไว้ให้แดชบอร์ดไปดึงต่อ
      }])

      if (dbError) throw dbError

      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1)
        setAudioBlob(null)
        setPreviewUrl(null)
      } else {
        alert("🎉 จบการฝึกฝนแล้ว! ไฟล์เสียงถูกส่งไปให้หัวหน้างานประเมินแล้ว")
        router.push('/play/audio')
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการส่ง: " + err.message)
    } finally {
      setUploading(false)
    }
  }

  if (!mounted || questions.length === 0) return null

  const currentQ = questions[currentIndex]
  const questionAudioUrl = supabase.storage.from('recordings').getPublicUrl(currentQ.audio_question_url).data.publicUrl

  return (
    <div key={currentIndex} style={s.pageContainer}>
      <div style={s.mainCard}>
        <p style={{ color: '#00b894', fontWeight: 'bold' }}>
          MISSION {currentIndex + 1} / {questions.length}
        </p>
        
        <h2 style={{ margin: '15px 0', color: '#2d3436' }}>
          {currentQ.question_text || `หมวด: ${currentQ.category}`}
        </h2>
        
        <div style={s.audioBox}>
          <p style={{marginBottom: '10px', color: '#555', fontSize: '0.8rem'}}>🎧 เสียงลูกค้า:</p>
          <audio autoPlay src={questionAudioUrl} controls style={{ width: '100%' }} />
        </div>

        <hr style={{ border: 'none', height: '1px', background: '#eee', margin: '25px 0' }} />

        <div>
          <h3 style={{color: '#2d3436', fontSize: '1rem'}}>🎙️ ตอบกลับลูกค้า</h3>
          
          <div style={{marginTop: '20px'}}>
            {/* ปุ่มอัดเสียงแบบ Toggle (กดแล้วปล่อยได้เลย) */}
            {!previewUrl ? (
              <div style={{textAlign:'center'}}>
                <button 
                  onClick={toggleRecording} 
                  style={isRecording ? s.btnStop : s.btnRecord}
                >
                  {isRecording ? '⬛' : '🎤'}
                </button>
                <p style={{marginTop:'10px', fontSize:'12px', color: isRecording ? '#ff4757' : '#999', fontWeight:'bold'}}>
                  {isRecording ? 'กำลังบันทึก... กดอีกครั้งเพื่อหยุด' : 'กดปุ่มไมค์เพื่อเริ่มตอบ'}
                </p>
              </div>
            ) : (
              /* ✅ แก้ข้อ 2: ส่วนพรีวิวเสียงก่อนส่ง */
              <div style={{ animation: 'fadeIn 0.5s', background: '#f0fff4', padding: '20px', borderRadius: '20px', border: '1px solid #c6f6d5' }}>
                <p style={{fontSize: '0.8rem', color: '#2f855a', marginBottom: '10px', fontWeight: 'bold'}}>ตรวจสอบเสียงของคุณ:</p>
                <audio src={previewUrl} controls style={{ width: '100%', marginBottom: '15px' }} />
                
                <div style={{display:'flex', gap:'10px'}}>
                  <button onClick={() => setPreviewUrl(null)} style={s.btnRetry}>❌ อัดใหม่</button>
                  <button onClick={submitAnswer} disabled={uploading} style={s.btnSubmit}>
                    {uploading ? 'กำลังส่ง...' : '✅ ส่งคำตอบ'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  pageContainer: { padding: '20px', background: 'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  mainCard: { width: '100%', maxWidth: '450px', background: 'white', padding: '30px', borderRadius: '30px', boxShadow: '0 20px 60px rgba(0,0,0,0.1)', textAlign: 'center' },
  audioBox: { background: '#f8f9fa', padding: '15px', borderRadius: '20px', margin: '15px 0' },
  btnRecord: { width: '80px', height: '80px', borderRadius: '50%', background: '#ff4757', color: 'white', border: 'none', fontSize: '2rem', cursor: 'pointer', boxShadow: '0 10px 20px rgba(255, 71, 87, 0.3)' },
  btnStop: { width: '80px', height: '80px', borderRadius: '50%', background: '#2d3436', color: 'white', border: 'none', fontSize: '1.5rem', cursor: 'pointer', animation: 'pulse 1.5s infinite' },
  btnRetry: { flex: 1, padding: '15px', background: '#fff', border: '1px solid #ddd', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer' },
  btnSubmit: { flex: 2, padding: '15px', background: '#00b894', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer' }
}
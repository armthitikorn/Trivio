'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'

export default function SmartAudioArena() {
  const { id } = useParams()
  const router = useRouter()
  
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionInfo, setSessionInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  
  const [isRecording, setIsRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])

  useEffect(() => {
    if (id) fetchTargetQuestions()
  }, [id])

  async function fetchTargetQuestions() {
    setLoading(true)
    try {
      const { data: session } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', id)
        .single()

      if (session) {
        setSessionInfo(session)
        const { data: qs } = await supabase
          .from('questions')
          .select('*')
          .eq('target_department', session.target_department) 
          .order('created_at', { ascending: true })
        
        if (qs) {
          // ✨ แก้ให้ขาด: กรองเฉพาะข้อที่มี Path เสียง (text) เท่านั้น ข้อว่างๆ จะไม่ถูกนำมาแสดง
          const validQs = qs.filter(q => q.text && q.text.trim() !== "")
          setQuestions(validQs)
        }
      }
    } catch (err) {
      console.error("Fetch Error:", err)
    } finally {
      setLoading(false)
    }
  }

  async function startRecording() {
    try {
      // เคลียร์เสียงเก่าก่อนอัดใหม่
      if (audioUrl?.preview) URL.revokeObjectURL(audioUrl.preview)
      setAudioUrl(null)

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder.current = new MediaRecorder(stream)
      audioChunks.current = []
      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data)
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/wav' })
        setAudioUrl({ blob, preview: URL.createObjectURL(blob) })
      }
      mediaRecorder.current.start()
      setIsRecording(true)
    } catch (err) {
      alert("กรุณาอนุญาตให้ใช้ไมโครโฟน")
    }
  }

  function stopRecording() {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop()
      setIsRecording(false)
    }
  }

  async function submitAnswer() {
    if (!audioUrl || uploading) return
    setUploading(true)
    
    const nickname = localStorage.getItem('player_name') || 'Warrior'
    // ตั้งชื่อไฟล์คำตอบของพนักงาน (เก็บไว้ในโฟลเดอร์ answers)
    const fileName = `answers/${sessionInfo?.target_department}/${id}/${Date.now()}.wav`

    try {
      // 1. อัปโหลดเสียงพนักงาน
      const { error: upError } = await supabase.storage.from('recordings').upload(fileName, audioUrl.blob)
      if (upError) throw upError

      // 2. บันทึกคำตอบลง DB
      await supabase.from('answers').insert([{
        session_id: id,
        question_id: questions[currentIndex]?.id,
        nickname: nickname,
        audio_answer_url: fileName
      }])

      // 3. ไปข้อถัดไป
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1)
        setAudioUrl(null)
      } else {
        alert('🎉 ภารกิจสำเร็จ! ส่งคำตอบครบทุกข้อแล้วครับ')
        router.push('/play/audio') // หรือไปหน้าสรุปผล
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาด: " + err.message)
    } finally {
      setUploading(false)
    }
  }

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#282c34', color:'white' }}>
      <h3>⏳ กำลังโหลดแบบทดสอบ...</h3>
    </div>
  )

  if (questions.length === 0) return (
    <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', height:'100vh', background:'#282c34', color:'white', textAlign:'center', padding:'20px' }}>
      <h2>❌ ไม่พบโจทย์ในแผนก {sessionInfo?.target_department}</h2>
      <p>เทรนเนอร์อาจยังไม่ได้อัปโหลดไฟล์เสียงในแผนกนี้</p>
      <button onClick={() => router.back()} style={{ marginTop:'20px', padding:'10px 20px', borderRadius:'10px', cursor:'pointer' }}>กลับไปเช็ค PIN</button>
    </div>
  )

  const currentQ = questions[currentIndex]
  
  // ✨ แก้ให้ขาด: ตรวจสอบและจัดการ Path ให้เป๊ะ 
  // ถ้าใน DB ไม่มีคำว่า questions/ นำหน้า เราจะเติมให้เพื่อให้ Storage หาเจอ
  const dbPath = currentQ?.text || ""
  let cleanPath = dbPath.startsWith('/') ? dbPath.substring(1) : dbPath
  if (!cleanPath.startsWith('questions/')) {
      cleanPath = `questions/${cleanPath}`
  }
  
  const qAudioUrl = supabase.storage.from('recordings').getPublicUrl(cleanPath).data.publicUrl

  return (
    <div style={{ padding: '20px', minHeight: '100vh', background: '#282c34', color: 'white', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', background: 'white', color: 'black', padding: '30px', borderRadius: '25px', boxShadow: '0 15px 35px rgba(0,0,0,0.3)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#666', borderBottom:'1px solid #eee', paddingBottom:'10px' }}>
          <span>🏢 แผนก: {sessionInfo?.target_department}</span>
          <span>📂 หมวด: {currentQ?.category}</span>
        </div>
        
        <h2 style={{ textAlign: 'center', color: '#6f42c1', marginTop: '20px' }}>ข้อที่ {currentIndex + 1} / {questions.length}</h2>

        <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '15px', border: '1px solid #eee', margin: '20px 0' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>👂 ฟังเสียงลูกค้า:</p>
          {/* ใช้ key={qAudioUrl} เพื่อให้ audio player รีเฟรชใหม่ทุกครั้งที่เปลี่ยนข้อ */}
          <audio key={qAudioUrl} src={qAudioUrl} controls style={{ width: '100%' }} />
          <p style={{ marginTop: '15px', fontSize: '1.2rem', fontWeight: 'bold', color: '#333' }}>
              เป้าหมาย: โต้ตอบในหมวด {currentQ?.category}
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop:'30px' }}>
          <p style={{ marginBottom:'15px', fontWeight:'600' }}>🎤 กดเพื่ออัดเสียงตอบโต้:</p>
          {!isRecording ? (
            <button onClick={startRecording} style={{ width: '85px', height: '85px', borderRadius: '50%', background: '#e21b3c', border: 'none', color: 'white', fontSize: '2.2rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(226, 27, 60, 0.4)' }}>🎤</button>
          ) : (
            <button onClick={stopRecording} style={{ width: '85px', height: '85px', borderRadius: '50%', background: '#333', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>⬛</button>
          )}

          {audioUrl && (
            <div style={{ marginTop: '30px', borderTop:'1px solid #eee', paddingTop:'20px' }}>
              <p style={{fontSize:'0.9rem', marginBottom:'10px'}}>เช็คเสียงของคุณก่อนส่ง:</p>
              <audio src={audioUrl.preview} controls style={{ width: '100%' }} />
              <button onClick={submitAnswer} disabled={uploading} style={{ width: '100%', marginTop: '20px', padding: '18px', background: uploading ? '#ccc' : '#28a745', color: 'white', border: 'none', borderRadius: '15px', fontSize: '1.2rem', fontWeight: 'bold', cursor: uploading ? 'default' : 'pointer' }}>
                {uploading ? 'กำลังส่งคำตอบ...' : 'ส่งคำตอบแล้วไปต่อ ✅'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
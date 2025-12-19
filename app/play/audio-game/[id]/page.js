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
      console.log("เริ่มดึงข้อมูล Session ID:", id)
      // 1. ดึง Session
      const { data: session, error: sError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', id)
        .single()

      if (sError || !session) {
        console.error("หา Session ไม่เจอ:", sError)
        return
      }

      setSessionInfo(session)
      console.log("Session Info:", session)

      // 2. ดึงโจทย์ (จากตาราง questions)
      const { data: qs, error: qError } = await supabase
        .from('questions')
        .select('*')
        .eq('target_department', session.target_department)
        .order('created_at', { ascending: true })

      if (qError) {
        console.error("Error ดึงโจทย์:", qError)
      }

      if (qs) {
        // กรองเฉพาะข้อที่มี Path ไฟล์เสียงในช่อง text
        const validQs = qs.filter(q => q.text && q.text.trim() !== "")
        console.log("โจทย์ที่ดึงได้ทั้งหมด:", qs.length)
        console.log("โจทย์ที่มีไฟล์เสียงพร้อมใช้:", validQs.length)
        setQuestions(validQs)
      }
    } catch (err) {
      console.error("Catch Error:", err)
    }
  }

  // --- ระบบอัดเสียง ---
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
      alert("กรุณาอนุญาตไมโครโฟน")
    }
  }

  function stopRecording() {
    if (mediaRecorder.current) {
        mediaRecorder.current.stop()
        setIsRecording(false)
    }
  }

  // --- ส่งคำตอบ ---
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

        // alert("บันทึกสำเร็จ!") 
        
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

  // ✨ แก้ไขจุดที่ทำให้หน้าขาว (เพิ่ม background สีเข้ม)
  if (questions.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        background: '#282c34', // ต้องมีสีพื้นหลัง ไม่งั้นตัวหนังสือขาวจะมองไม่เห็น
        color: 'white',
        fontFamily: 'sans-serif'
      }}>
        <h2>⏳ กำลังโหลดสนามฝึก...</h2>
        <p style={{opacity: 0.7, marginTop: '10px'}}>
           (แผนก: {sessionInfo?.target_department || 'กำลังค้นหา...'})
        </p>
        <p style={{fontSize: '0.8rem', color: '#aaa', marginTop: '20px'}}>
           *หากค้างหน้านี้นาน แสดงว่ายังไม่มีโจทย์ที่มีไฟล์เสียงในแผนกนี้
        </p>
        <button onClick={() => router.back()} style={{marginTop:'30px', padding:'10px 20px', cursor:'pointer', borderRadius:'5px'}}>
          กลับไปหน้าหลัก
        </button>
      </div>
    )
  }

  const currentQ = questions[currentIndex]

  // Logic จัดการ Path
  const dbPath = currentQ?.text || "" 
  let cleanPath = dbPath.startsWith('/') ? dbPath.substring(1) : dbPath
  if (!cleanPath.startsWith('questions/')) {
      cleanPath = `questions/${cleanPath}`
  }
  
  const questionAudioUrl = supabase.storage.from('recordings').getPublicUrl(cleanPath).data.publicUrl

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', background: '#282c34', minHeight: '100vh', color: 'white', textAlign: 'center' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', background: 'white', color: 'black', padding: '30px', borderRadius: '25px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
        <p style={{ color: '#6f42c1', fontWeight: 'bold' }}>บททดสอบข้อที่ {currentIndex + 1} / {questions.length}</p>
        
        <h2 style={{ margin: '10px 0' }}>{currentQ.question_text || `หมวด: ${currentQ.category}`}</h2>
        
        <div style={{ background: '#f0f2f5', padding: '20px', borderRadius: '15px', margin: '20px 0' }}>
          <p>🎧 คลิกฟังเสียงลูกค้า (โจทย์):</p>
          <audio key={questionAudioUrl} src={questionAudioUrl} controls style={{ width: '100%' }} />
          {/* Debug path เล็กๆ เผื่อเสียงไม่ดัง */}
          <p style={{fontSize:'0.6rem', color:'#ccc', marginTop:'5px'}}>{cleanPath}</p>
        </div>

        <hr style={{ opacity: 0.2 }} />

        <div style={{ marginTop: '30px' }}>
          <h3>🎙️ บันทึกการตอบโต้ของคุณ</h3>
          {!isRecording ? (
            <button onClick={startRecording} style={{ padding: '20px', width:'80px', height:'80px', borderRadius: '50%', background: '#e21b3c', color: 'white', border: 'none', cursor: 'pointer', fontSize: '2rem', boxShadow: '0 5px 15px rgba(226, 27, 60, 0.4)' }}>🎤</button>
          ) : (
            <button onClick={stopRecording} style={{ padding: '20px', width:'80px', height:'80px', borderRadius: '50%', background: '#333', color: 'white', border: 'none', cursor: 'pointer', fontSize: '2rem', animation: 'pulse 1.5s infinite' }}>⬛</button>
          )}
          
          {previewUrl && (
            <div style={{ marginTop: '20px' }}>
              <p>ฟังเสียงที่คุณตอบ:</p>
              <audio src={previewUrl} controls style={{ width: '100%' }} />
              <button 
                onClick={submitAnswer}
                disabled={uploading}
                style={{ width: '100%', marginTop: '20px', padding: '15px', background: uploading ? '#ccc' : '#28a745', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {uploading ? 'กำลังส่ง...' : 'ส่งคำตอบและไปข้อถัดไป ➡️'}
              </button>
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
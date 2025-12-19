'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation' // เพิ่ม useRouter

export default function AudioGameArena() {
  const { id } = useParams()
  const router = useRouter() // เพื่อใช้ในการเปลี่ยนหน้า

  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionInfo, setSessionInfo] = useState(null)
  
  const [isRecording, setIsRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null) // เปลี่ยนชื่อตัวแปรให้สื่อความหมาย
  const [previewUrl, setPreviewUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  
  const mediaRecorder = useRef(null)

  useEffect(() => {
    fetchSessionAndQuestions()
  }, [id])

  // 1. ดึงโจทย์ โดยแก้ให้ดึงตาม "แผนก" และ "คอลัมน์ที่มีข้อมูลจริง"
  async function fetchSessionAndQuestions() {
    // ดึง Session ก่อนเพื่อดูแผนก
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
        .eq('target_department', session.target_department) // กรองตามแผนก
        .order('created_at', { ascending: true })
      
      if (qs) {
        // กรองเฉพาะข้อที่มีไฟล์เสียงจริง (กัน Error หน้าขาว)
        const validQs = qs.filter(q => q.text && q.text.trim() !== "")
        setQuestions(validQs)
      }
    }
  }

  // ระบบบันทึกเสียง (คงเดิม เพราะดีอยู่แล้ว)
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

  // 2. ส่งคำตอบ (เพิ่มการ Insert ลงตาราง answers)
  async function submitAnswer() {
    if (!audioUrl) return
    setUploading(true)

    const nickname = localStorage.getItem('player_name') || 'Warrior'
    const fileName = `answers/${sessionInfo?.target_department}/${id}/${Date.now()}.wav`

    try {
        // อัปโหลดไฟล์
        await supabase.storage.from('recordings').upload(fileName, audioUrl)

        // ✨ บันทึกลงฐานข้อมูล (ส่วนที่ขาดไปในโค้ดเก่า)
        await supabase.from('answers').insert([{
            session_id: id,
            question_id: questions[currentIndex]?.id,
            nickname: nickname,
            audio_answer_url: fileName
        }])

        alert("บันทึกคำตอบสำเร็จ!")
        
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1)
            setAudioUrl(null)
            setPreviewUrl(null)
        } else {
            alert("จบการฝึกฝนทุกข้อแล้ว! เยี่ยมมาก")
            router.push('/play/audio') // กลับหน้าหลัก
        }
    } catch (err) {
        alert("เกิดข้อผิดพลาด: " + err.message)
    } finally {
        setUploading(false)
    }
  }

  if (questions.length === 0) return <div style={{textAlign:'center', padding:'50px', color:'white'}}>กำลังโหลดสนามฝึก... (หรืออาจไม่มีโจทย์ในแผนกนี้)</div>

  const currentQ = questions[currentIndex]

  // 3. Logic การแปลง Path (หัวใจสำคัญเพื่อให้เสียงดัง)
  const dbPath = currentQ?.text || "" 
  let cleanPath = dbPath.startsWith('/') ? dbPath.substring(1) : dbPath
  if (!cleanPath.startsWith('questions/')) {
      cleanPath = `questions/${cleanPath}`
  }
  
  const questionAudioUrl = supabase.storage.from('recordings').getPublicUrl(cleanPath).data.publicUrl

  // UI เดิมที่คุณชอบ 100%
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', background: '#282c34', minHeight: '100vh', color: 'white', textAlign: 'center' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', background: 'white', color: 'black', padding: '30px', borderRadius: '25px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
        <p style={{ color: '#6f42c1', fontWeight: 'bold' }}>บททดสอบข้อที่ {currentIndex + 1} / {questions.length}</p>
        
        {/* แสดงหมวดหมู่แทน question_text ถ้าไม่มีข้อความ */}
        <h2 style={{ margin: '10px 0' }}>{currentQ.question_text || `หมวด: ${currentQ.category}`}</h2>
        
        <div style={{ background: '#f0f2f5', padding: '20px', borderRadius: '15px', margin: '20px 0' }}>
          <p>🎧 คลิกฟังเสียงลูกค้า (โจทย์):</p>
          {/* ใส่ key เพื่อให้เสียงรีเฟรชเมื่อเปลี่ยนข้อ */}
          <audio key={questionAudioUrl} src={questionAudioUrl} controls style={{ width: '100%' }} />
        </div>

        <hr style={{ opacity: 0.2 }} />

        <div style={{ marginTop: '30px' }}>
          <h3>🎙️ บันทึกการตอบโต้ของคุณ</h3>
          {!isRecording ? (
            <button onClick={startRecording} style={{ padding: '20px', width:'80px', height:'80px', borderRadius: '50%', background: '#e21b3c', color: 'white', border: 'none', cursor: 'pointer', fontSize: '2rem' }}>🎤</button>
          ) : (
            <button onClick={stopRecording} style={{ padding: '20px', width:'80px', height:'80px', borderRadius: '50%', background: '#333', color: 'white', border: 'none', cursor: 'pointer', fontSize: '2rem' }}>⬛</button>
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
    </div>
  )
}
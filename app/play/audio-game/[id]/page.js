'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'

export default function SmartAudioArena() {
  const { id } = useParams() // Session ID
  const router = useRouter()
  
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionInfo, setSessionInfo] = useState(null)
  
  const [isRecording, setIsRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])

  useEffect(() => {
    fetchTargetQuestions()
  }, [id])

  // --- ฟังก์ชันดึงโจทย์ที่ "กรองตามแผนกและหมวดหมู่" ของ Session นี้ ---
  async function fetchTargetQuestions() {
    // 1. ดูว่า PIN นี้สร้างมาเพื่อแผนกไหน และหมวดไหน
    const { data: session, error: sError } = await supabase
      .from('game_sessions')
      .select('category, target_department, target_segment')
      .eq('id', id)
      .single()

    if (session) {
      setSessionInfo(session)
      // 2. ดึงโจทย์ที่ "Target Department" ตรงกับที่โฮสต์เลือกไว้
      const { data: qs, error: qError } = await supabase
        .from('questions')
        .select('*')
        .eq('category', session.category)
        .eq('target_department', session.target_department) // กรองแยกแผนกที่นี่!
        .order('created_at', { ascending: true })
      
      setQuestions(qs || [])
    }
  }

  // ... (ฟังก์ชัน startRecording, stopRecording เหมือนเดิม)
  async function startRecording() {
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
  }

  function stopRecording() {
    mediaRecorder.current.stop()
    setIsRecording(false)
  }

async function submitAnswer() {
    if (!audioUrl) return
    setUploading(true)
    const nickname = localStorage.getItem('player_name') || 'Warrior'
    
    // ✅ กลับมาใช้ Bucket 'recordings' ตามที่คุณแจ้ง
    const fileName = `answers/${sessionInfo.target_department}/${id}/${Date.now()}.wav`

    const { error: upError } = await supabase.storage
      .from('recordings') // ✨ แก้จุดนี้ให้ตรงกับ Bucket ของคุณ
      .upload(fileName, audioUrl.blob)

    if (upError) {
        alert("อัปโหลดไม่สำเร็จ: " + upError.message)
        setUploading(false)
        return
    }

    await supabase.from('answers').insert([{
      session_id: id,
      question_id: questions[currentIndex].id,
      nickname: nickname,
      audio_answer_url: fileName
    }])

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setAudioUrl(null)
    } else {
      alert('🎉 คุณทำภารกิจครบทุกข้อแล้ว!')
      router.push('/play/audio')
    }
    setUploading(false)
  }

  // ... 

  const currentQ = questions[currentIndex]
  // ✅ ดึง URL จาก Bucket 'recordings'
  // ✅ และใช้คอลัมน์ 'media_url' ตามโครงสร้างเดิมที่คุณส่งมา
  const qAudioUrl = supabase.storage.from('recordings').getPublicUrl(currentQ.media_url).data.publicUrl

  return (
    <div style={{ padding: '20px', minHeight: '100vh', background: '#282c34', color: 'white', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', background: 'white', color: 'black', padding: '30px', borderRadius: '25px', boxShadow: '0 15px 35px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#666' }}>
          <span>🏢 แผนก: {sessionInfo?.target_department}</span>
          <span>🏆 กลุ่ม: {sessionInfo?.target_segment}</span>
        </div>
        
        <h2 style={{ textAlign: 'center', color: '#6f42c1', marginTop: '10px' }}>ข้อที่ {currentIndex + 1} / {questions.length}</h2>
        <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '15px', border: '1px solid #eee', marginBottom: '20px' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>👂 ฟังเสียงลูกค้า:</p>
          <audio src={qAudioUrl} controls style={{ width: '100%' }} />
          <p style={{ marginTop: '10px', fontSize: '1.1rem', fontWeight: 'bold', color: '#333' }}>โจทย์: {currentQ.question_text}</p>
        </div>

        <div style={{ textAlign: 'center' }}>
          <p>🎤 กดอัดเสียงเพื่อตอบโต้:</p>
          {!isRecording ? (
            <button onClick={startRecording} style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#e21b3c', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer', boxShadow: '0 5px 15px rgba(226, 27, 60, 0.4)' }}>🎤</button>
          ) : (
            <button onClick={stopRecording} style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#333', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer' }}>⬛</button>
          )}

          {audioUrl && (
            <div style={{ marginTop: '25px', animation: 'fadeIn 0.5s' }}>
              <p>เช็คเสียงของคุณก่อนส่ง:</p>
              <audio src={audioUrl.preview} controls style={{ width: '100%' }} />
              <button onClick={submitAnswer} disabled={uploading} style={{ width: '100%', marginTop: '20px', padding: '18px', background: '#28a745', color: 'white', border: 'none', borderRadius: '15px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' }}>
                {uploading ? 'กำลังส่งคำตอบ...' : 'ส่งคำตอบแล้วไปต่อ ✅'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
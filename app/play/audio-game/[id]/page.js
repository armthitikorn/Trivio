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
  const [loading, setLoading] = useState(true) // ✨ เพิ่มสถานะโหลด
  
  const [isRecording, setIsRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])

  useEffect(() => {
    fetchTargetQuestions()
  }, [id])

  async function fetchTargetQuestions() {
    setLoading(true)
    try {
      // 1. ดึงข้อมูล Session (ดึงทั้ง target_segment และ target_level เพื่อกันพลาด)
      const { data: session, error: sError } = await supabase
        .from('game_sessions')
        .select('category, target_department, target_segment, target_level')
        .eq('id', id)
        .single()

      if (session) {
        setSessionInfo(session)
        
        // 2. ดึงโจทย์ โดยใช้คอลัมน์ที่ตรงกับหน้า Trainer
        const { data: qs, error: qError } = await supabase
          .from('questions')
          .select('*')
          .eq('category', session.category)
          .eq('target_department', session.target_department)
          .order('created_at', { ascending: true })
        
        setQuestions(qs || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false) // ✨ โหลดเสร็จแล้ว
    }
  }

  // --- ฟังก์ชันอัดเสียง (คงเดิม) ---
  async function startRecording() {
    try {
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
      alert("ไม่สามารถเข้าถึงไมโครโฟนได้")
    }
  }

  function stopRecording() {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop()
      setIsRecording(false)
    }
  }

  async function submitAnswer() {
    if (!audioUrl) return
    setUploading(true)
    const nickname = localStorage.getItem('player_name') || 'Warrior'
    
    const fileName = `answers/${sessionInfo?.target_department}/${id}/${Date.now()}.wav`

    const { error: upError } = await supabase.storage
      .from('recordings')
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

  // --- จุดที่มีการแก้ไขเพื่อความปลอดภัย ---
  if (loading) return <div style={{ color: 'white', textAlign: 'center', paddingTop: '100px' }}>กำลังโหลดโจทย์...</div>
  if (questions.length === 0) return <div style={{ color: 'white', textAlign: 'center', paddingTop: '100px' }}>ไม่พบโจทย์สำหรับแผนกนี้</div>

  const currentQ = questions[currentIndex]
  // ✨ ใช้ Optional Chaining (?.) เพื่อความปลอดภัย
  const qAudioUrl = currentQ?.media_url 
    ? supabase.storage.from('recordings').getPublicUrl(currentQ.media_url).data.publicUrl 
    : null

  return (
    <div style={{ padding: '20px', minHeight: '100vh', background: '#282c34', color: 'white', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', background: 'white', color: 'black', padding: '30px', borderRadius: '25px', boxShadow: '0 15px 35px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#666' }}>
          <span>🏢 แผนก: {sessionInfo?.target_department}</span>
          <span>🏆 กลุ่ม: {sessionInfo?.target_level || sessionInfo?.target_segment}</span>
        </div>
        
        <h2 style={{ textAlign: 'center', color: '#6f42c1', marginTop: '10px' }}>ข้อที่ {currentIndex + 1} / {questions.length}</h2>
        <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '15px', border: '1px solid #eee', marginBottom: '20px' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>👂 ฟังเสียงลูกค้า:</p>
          {qAudioUrl && <audio src={qAudioUrl} controls style={{ width: '100%' }} />}
          <p style={{ marginTop: '10px', fontSize: '1.1rem', fontWeight: 'bold', color: '#333' }}>โจทย์: {currentQ?.question_text}</p>
        </div>

        <div style={{ textAlign: 'center' }}>
          <p>🎤 กดอัดเสียงเพื่อตอบโต้:</p>
          {!isRecording ? (
            <button onClick={startRecording} style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#e21b3c', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer', boxShadow: '0 5px 15px rgba(226, 27, 60, 0.4)' }}>🎤</button>
          ) : (
            <button onClick={stopRecording} style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#333', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer' }}>⬛</button>
          )}

          {audioUrl && (
            <div style={{ marginTop: '25px' }}>
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
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
      // 1. ดึงข้อมูล Session
      const { data: session, error: sError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', id)
        .single()

      if (session) {
        setSessionInfo(session)
        
        // 2. ดึงโจทย์ (ใช้ select * เพื่อความชัวร์)
        // หมายเหตุ: ผมใส่เงื่อนไขแบบกว้างขึ้น เพื่อให้โจทย์มีโอกาสเด้งขึ้นมาสูงที่สุด
        const { data: qs, error: qError } = await supabase
          .from('questions')
          .select('*')
          .eq('category', session.category)
          // หากคุณทดสอบแล้วโจทย์ไม่ขึ้น ให้ลองเอาบรรทัด target_department ออกครับ
          .eq('target_department', session.target_department) 
          .order('created_at', { ascending: true })
        
        if (qs && qs.length > 0) {
          setQuestions(qs)
        } else {
          console.warn("⚠️ ไม่พบโจทย์ที่ตรงตามแผนกและหมวดหมู่")
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
      alert("กรุณาอนุญาตให้ใช้ไมโครโฟนก่อนนะครับ")
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
    
    // ตั้งชื่อไฟล์ตามแผนกและ Session ID
    const fileName = `answers/${sessionInfo?.target_department || 'General'}/${id}/${Date.now()}.wav`

    try {
      const { error: upError } = await supabase.storage
        .from('recordings')
        .upload(fileName, audioUrl.blob)

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
      } else {
        alert('🎉 ยินดีด้วย! คุณทำครบทุกข้อแล้วครับ')
        router.push('/play/audio')
      }
    } catch (err) {
      alert("อัปโหลดไม่สำเร็จ: " + err.message)
    } finally {
      setUploading(false)
    }
  }

  // --- ส่วนจัดการหน้าจอตอนข้อมูลยังมาไม่ถึง ---
  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#282c34', color:'white' }}>
      <h3>⏳ กำลังโหลดแบบทดสอบ...</h3>
    </div>
  )

  if (questions.length === 0) return (
    <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', height:'100vh', background:'#282c34', color:'white', textAlign:'center', padding:'20px' }}>
      <h2>❌ ไม่พบโจทย์ที่ระบุ</h2>
      <p>แผนก: {sessionInfo?.target_department} | หมวดหมู่: {sessionInfo?.category}</p>
      <p style={{opacity:0.7}}>กรุณาตรวจสอบในตาราง questions ว่ามีโจทย์ที่ตรงกับข้อมูลด้านบนหรือไม่</p>
      <button onClick={() => router.back()} style={{ marginTop:'20px', padding:'10px 20px', borderRadius:'10px', cursor:'pointer' }}>กลับไปตรวจสอบ PIN</button>
    </div>
  )

  const currentQ = questions[currentIndex]
  // ดึงไฟล์เสียงจาก Bucket 'recordings'
  const qAudioUrl = currentQ?.media_url 
    ? supabase.storage.from('recordings').getPublicUrl(currentQ.media_url).data.publicUrl 
    : null

  return (
    <div style={{ padding: '20px', minHeight: '100vh', background: '#282c34', color: 'white', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', background: 'white', color: 'black', padding: '30px', borderRadius: '25px', boxShadow: '0 15px 35px rgba(0,0,0,0.3)' }}>
        
        {/* Header ส่วนบอกข้อมูลกลุ่ม */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#666', borderBottom:'1px solid #eee', paddingBottom:'10px' }}>
          <span>🏢 แผนก: {sessionInfo?.target_department}</span>
          <span>🏆 ระดับ: {sessionInfo?.target_level || sessionInfo?.target_segment}</span>
        </div>
        
        <h2 style={{ textAlign: 'center', color: '#6f42c1', marginTop: '20px' }}>
          ข้อที่ {currentIndex + 1} / {questions.length}
        </h2>

        {/* ส่วนเล่นเสียงโจทย์ */}
        <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '15px', border: '1px solid #eee', margin: '20px 0' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '10px', color:'#555' }}>👂 ฟังเสียงลูกค้า:</p>
          {qAudioUrl ? (
            <audio src={qAudioUrl} controls style={{ width: '100%' }} />
          ) : (
            <p style={{color:'red', fontSize:'0.8rem'}}>* ไม่พบไฟล์เสียงในระบบ</p>
          )}
          <p style={{ marginTop: '15px', fontSize: '1.2rem', fontWeight: 'bold', color: '#333' }}>
            โจทย์: {currentQ?.question_text || "กรุณาตอบคำถามจากเสียงที่ได้ยิน"}
          </p>
        </div>

        {/* ส่วนอัดเสียงตอบ */}
        <div style={{ textAlign: 'center', marginTop:'30px' }}>
          <p style={{ marginBottom:'15px', fontWeight:'600' }}>🎤 กดปุ่มเพื่ออัดเสียงตอบโต้:</p>
          {!isRecording ? (
            <button 
              onClick={startRecording} 
              style={{ width: '85px', height: '85px', borderRadius: '50%', background: '#e21b3c', border: 'none', color: 'white', fontSize: '2.2rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(226, 27, 60, 0.4)', transition:'0.3s' }}
            >🎤</button>
          ) : (
            <button 
              onClick={stopRecording} 
              style={{ width: '85px', height: '85px', borderRadius: '50%', background: '#333', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer', animation:'pulse 1.5s infinite' }}
            >⬛</button>
          )}

          {/* ปุ่มส่งคำตอบ (จะปรากฏเมื่ออัดเสร็จ) */}
          {audioUrl && (
            <div style={{ marginTop: '30px', borderTop:'1px solid #eee', paddingTop:'20px' }}>
              <p style={{fontSize:'0.9rem', marginBottom:'10px'}}>ตรวจสอบเสียงของคุณ:</p>
              <audio src={audioUrl.preview} controls style={{ width: '100%' }} />
              <button 
                onClick={submitAnswer} 
                disabled={uploading} 
                style={{ width: '100%', marginTop: '20px', padding: '18px', background: uploading ? '#ccc' : '#28a745', color: 'white', border: 'none', borderRadius: '15px', fontSize: '1.2rem', fontWeight: 'bold', cursor: uploading ? 'default' : 'pointer', transition:'0.3s' }}
              >
                {uploading ? 'กำลังอัปโหลดไฟล์เสียง...' : 'ส่งคำตอบแล้วไปข้อถัดไป ✅'}
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(226, 27, 60, 0.7); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(226, 27, 60, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(226, 27, 60, 0); }
        }
      `}</style>
    </div>
  )
}
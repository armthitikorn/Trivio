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
  const [previewUrl, setPreviewUrl] = useState(null)
  const [audioBlob, setAudioBlob] = useState(null)
  const [uploading, setUploading] = useState(false)
  const mediaRecorder = useRef(null)

  useEffect(() => {
    if (id) fetchQuestions()
  }, [id])

  async function fetchQuestions() {
    const { data: session } = await supabase.from('game_sessions').select('*').eq('id', id).single()
    if (session) {
      setSessionInfo(session)
      const { data: qs } = await supabase.from('questions').select('*')
        .eq('target_department', session.target_department)
        .eq('target_level', session.target_level)
      setQuestions(qs || [])
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder.current = new MediaRecorder(stream)
      const chunks = []
      mediaRecorder.current.ondataavailable = (e) => chunks.push(e.data)
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' })
        setAudioBlob(blob)
        setPreviewUrl(URL.createObjectURL(blob))
      }
      mediaRecorder.current.start()
      setIsRecording(true)
    } catch (e) { alert("กรุณาเปิดไมโครโฟน") }
  }

  async function submitAnswer() {
    if (!audioBlob) return
    setUploading(true)

    // ✨ ดึงชื่อจากหน้าลงทะเบียนที่พนักงานกรอกไว้
    const savedInfo = JSON.parse(localStorage.getItem('temp_player_info') || '{}')
    const nickname = savedInfo.nickname || 'Warrior'
    
    const fileName = `answers/${Date.now()}.wav`
    
    try {
      const { error: upErr } = await supabase.storage.from('recordings').upload(fileName, audioBlob)
      if (upErr) throw upErr

      await supabase.from('answers').insert([{
        session_id: id,
        question_id: questions[currentIndex]?.id,
        nickname: nickname,
        audio_answer_url: fileName
      }])

      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1)
        setPreviewUrl(null)
        setAudioBlob(null)
      } else {
        alert("🎉 คุณทำภารกิจสำเร็จแล้ว!")
        router.push('/play')
      }
    } catch (e) { alert(e.message) }
    finally { setUploading(false) }
  }

  if (questions.length === 0) return <div style={s.pageContainer}>กำลังโหลดสนามฝึก...</div>

  const currentQ = questions[currentIndex]
  const audioUrl = supabase.storage.from('recordings').getPublicUrl(currentQ.audio_question_url).data.publicUrl

  return (
    <div style={s.pageContainer}>
      <div style={s.mainCard}>
        <p style={{color:'#00b894', fontWeight:'900', letterSpacing:'1px'}}>MISSION {currentIndex + 1} / {questions.length}</p>
        <h2 style={{margin:'20px 0', color:'#000', fontSize:'1.8rem', fontWeight:'800'}}>{currentQ.question_text}</h2>
        
        <div style={s.audioBox}>
          <p style={{fontWeight:'bold', marginBottom:'10px'}}>🎧 ฟังโจทย์ลูกค้า:</p>
          <audio src={audioUrl} controls style={{width:'100%'}} key={audioUrl}/>
        </div>

        <div style={{marginTop:'40px'}}>
          {!isRecording ? (
            <button onClick={startRecording} style={s.btnRecord}>🎤 เริ่มพูด</button>
          ) : (
            <button onClick={()=>mediaRecorder.current.stop()} style={s.btnStop}>⬛ หยุด</button>
          )}
        </div>

        {previewUrl && (
          <div style={{marginTop:'30px', padding:'20px', background:'#f8f9fa', borderRadius:'20px'}}>
             <p style={{fontWeight:'bold', marginBottom:'10px'}}>เช็คเสียงของคุณ:</p>
             <audio src={previewUrl} controls style={{width:'100%'}}/>
             <button onClick={submitAnswer} disabled={uploading} style={s.btnSubmit}>
               {uploading ? 'กำลังส่ง...' : 'ส่งคำตอบนี้ ➡️'}
             </button>
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  pageContainer: { minHeight: '100vh', background: 'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' },
  mainCard: { width: '100%', maxWidth: '500px', background: 'white', padding: '40px 30px', borderRadius: '40px', boxShadow: '0 20px 60px rgba(0,0,0,0.1)', textAlign: 'center', border: '1px solid #eee' },
  audioBox: { background: '#f1f2f6', padding: '25px', borderRadius: '25px', margin: '20px 0' },
  btnRecord: { width: '90px', height: '90px', borderRadius: '50%', background: '#FF6B6B', color: 'white', border: 'none', fontSize: '2.5rem', boxShadow: '0 10px 20px rgba(255, 107, 107, 0.3)', cursor: 'pointer' },
  btnStop: { width: '90px', height: '90px', borderRadius: '50%', background: '#2d3436', color: 'white', border: 'none', fontSize: '2rem', cursor: 'pointer' },
  btnSubmit: { width: '100%', padding: '18px', background: '#00b894', color: 'white', border: 'none', borderRadius: '15px', marginTop: '15px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer' }
}
'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function PerfectTrainerAudioCreator() {
  const [targetDept, setTargetDept] = useState('UOB') 
  const [category, setCategory] = useState('Introduction')
  const [targetLevel, setTargetLevel] = useState('Nursery')
  const [questionTitle, setQuestionTitle] = useState('')
  const [userId, setUserId] = useState(null) // สำหรับเก็บ ID ผู้ใช้ที่ Login
  
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])

  // ดึง User ID เมื่อโหลดหน้า
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
    }
    getUser()
  }, [])

  const departments = ['UOB', 'AYCAP', 'ttb', 'Krungsri', 'Bancassurance', 'Agent', 'Broker', 'DMTM']
  const levels = ['Nursery', 'Rising Star', 'Legend']
  const categories = [
    { id: 'Introduction', name: '1. ตอบเข้าต้นสาย (Intro)' },
    { id: 'Objection', name: '2. ข้อโต้แย้งกลางสาย (Objection)' },
    { id: 'Closing', name: '3. ปิดการขาย (Closing)' }
  ]

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder.current = new MediaRecorder(stream)
    audioChunks.current = []
    mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data)
    mediaRecorder.current.onstop = () => {
      const blob = new Blob(audioChunks.current, { type: 'audio/wav' })
      setAudioBlob(blob)
      setPreviewUrl(URL.createObjectURL(blob))
    }
    mediaRecorder.current.start()
    setIsRecording(true)
  }

  function stopRecording() {
    mediaRecorder.current.stop()
    setIsRecording(false)
  }

  async function saveQuestion() {
    if (!audioBlob || !questionTitle) return alert("กรุณาระบุชื่อข้อและอัดเสียงก่อนครับ")
    if (!userId) return alert("ไม่พบข้อมูลผู้ใช้งาน กรุณาล็อกอินใหม่")
    
    setUploading(true)
    
    // ตั้งชื่อ Path แยกตามโฟลเดอร์ใน Storage
    const fileName = `questions/${targetDept}/${targetLevel}/${category}/${Date.now()}.wav`

    const { error: uploadError } = await supabase.storage
      .from('recordings')
      .upload(fileName, audioBlob)

    if (uploadError) {
      alert("Upload Error: " + uploadError.message)
      setUploading(false)
      return
    }

    // บันทึกลงตาราง questions พร้อมแนบ user_id
    const { error: dbError } = await supabase
      .from('questions')
      .insert([{
        question_text: questionTitle,
        category: category,
        target_department: targetDept,
        target_level: targetLevel,
        media_url: fileName,
        audio_question_url: fileName, // เพิ่มเผื่อไว้สำหรับคอลัมน์ชื่อนี้
        type: 'audio_roleplay',
        user_id: userId // ✨ ใส่เพื่อให้เทรนเนอร์เห็นเฉพาะงานตัวเอง
      }])

    if (dbError) {
      alert("DB Error: " + dbError.message)
    } else {
      alert(`บันทึกโจทย์สำหรับ ${targetDept} เรียบร้อยแล้ว! ✅`)
      setAudioBlob(null)
      setPreviewUrl(null)
      setQuestionTitle('')
    }
    setUploading(false)
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '750px', margin: '0 auto', background: 'white', padding: '30px', borderRadius: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
        <h1 style={{ color: '#6f42c1', textAlign: 'center', marginBottom: '30px' }}>🎙️ Trainer Audio Mission Studio</h1>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          <div>
            <label style={labelStyle}>🏢 แผนก:</label>
            <select value={targetDept} onChange={(e) => setTargetDept(e.target.value)} style={selectStyle}>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>⭐ ระดับพนักงาน:</label>
            <select value={targetLevel} onChange={(e) => setTargetLevel(e.target.value)} style={selectStyle}>
              {levels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>📚 หมวดหมู่:</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={selectStyle}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <label style={labelStyle}>🖋️ ชื่อโจทย์ (สคริปต์ลูกค้า):</label>
        <input 
          type="text" value={questionTitle} onChange={(e) => setQuestionTitle(e.target.value)}
          placeholder="เช่น 'ลูกค้าถามเรื่องโปรโมชั่นบัตรเครดิต'"
          style={inputStyle}
        />

        <div style={{ textAlign: 'center', border: '2px dashed #ccc', padding: '30px', borderRadius: '20px', background: '#fafafa' }}>
          {!isRecording ? (
            <button onClick={startRecording} style={btnRecord}>🔴 เริ่มอัดเสียงลูกค้า (โจทย์)</button>
          ) : (
            <button onClick={stopRecording} style={btnStop}>⬛ หยุดอัด</button>
          )}

          {previewUrl && (
            <div style={{ marginTop: '20px' }}>
              <p style={{marginBottom: '10px', fontWeight: 'bold'}}>ลองฟังเสียงที่อัด:</p>
              <audio src={previewUrl} controls style={{ width: '100%' }} />
              <button onClick={saveQuestion} disabled={uploading} style={btnSave}>
                {uploading ? 'กำลังบันทึกข้อมูล...' : `บันทึกโจทย์เข้าคลังของฉัน ✅`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const labelStyle = { fontWeight: 'bold', fontSize: '0.9rem', color: '#555' }
const selectStyle = { width: '100%', padding: '10px', marginTop: '5px', borderRadius: '10px', border: '1px solid #ddd' }
const inputStyle = { width: '100%', padding: '15px', marginTop: '5px', marginBottom: '20px', borderRadius: '10px', border: '1px solid #ddd', boxSizing: 'border-box' }
const btnRecord = { padding: '15px 30px', borderRadius: '30px', background: '#e21b3c', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }
const btnStop = { padding: '15px 30px', borderRadius: '30px', background: '#333', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }
const btnSave = { width: '100%', marginTop: '20px', padding: '15px', background: '#28a745', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem' }
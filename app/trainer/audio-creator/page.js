'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function PerfectTrainerAudioCreator() {
  // --- States สำหรับการตั้งค่าโจทย์ ---
  const [targetDept, setTargetDept] = useState('UOB') 
  const [category, setCategory] = useState('Introduction')
  const [targetLevel, setTargetLevel] = useState('Nursery') // Easy=Nursery, Hard=Rising Star, Harder=Legend
  const [questionTitle, setQuestionTitle] = useState('')
  const [userId, setUserId] = useState(null)
  const [myQuestions, setMyQuestions] = useState([])

  // --- States สำหรับการอัดเสียง ---
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])

  // --- ข้อมูลตัวเลือก ---
  const departments = ['UOB', 'AYCAP', 'ttb', 'Krungsri', 'Agent', 'Broker']
  const levels = [
    { id: 'Nursery', name: 'Easy (5/5/5)', target: 5 },
    { id: 'Rising Star', name: 'Hard (7/7/7)', target: 7 },
    { id: 'Legend', name: 'Harder (10/10/10)', target: 10 }
  ]
  const categories = [
    { id: 'Introduction', name: '1. Intro (ต้นสาย)' },
    { id: 'Objection', name: '2. Objection (กลางสาย)' },
    { id: 'Closing', name: '3. Closing (ปิดการขาย)' }
  ]

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        fetchMyQuestions(user.id, targetDept, targetLevel)
      }
    }
    init()
  }, [targetDept, targetLevel])

  async function fetchMyQuestions(uid, dept, level) {
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('user_id', uid)
      .eq('target_department', dept)
      .eq('target_level', level)
      .order('created_at', { ascending: true })
    setMyQuestions(data || [])
  }

  // --- Logic การอัดเสียงที่คุณชอบ ---
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
    setUploading(true)
    
    const fileName = `questions/${targetDept}/${targetLevel}/${category}/${Date.now()}.wav`
    const { error: upErr } = await supabase.storage.from('recordings').upload(fileName, audioBlob)

    if (upErr) return alert(upErr.message)

    await supabase.from('questions').insert([{
      question_text: questionTitle,
      category: category,
      target_department: targetDept,
      target_level: targetLevel,
      media_url: fileName,
      audio_question_url: fileName,
      type: 'audio_roleplay',
      user_id: userId
    }])

    alert("บันทึกโจทย์สำเร็จ! ✅")
    setAudioBlob(null); setPreviewUrl(null); setQuestionTitle('')
    fetchMyQuestions(userId, targetDept, targetLevel)
    setUploading(false)
  }

  // --- ส่วนช่วยคำนวณ ---
  const countInCat = (catId) => myQuestions.filter(q => q.category === catId).length
  const currentTarget = levels.find(l => l.id === targetLevel)?.target || 5
  const totalCount = myQuestions.length

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>🎙️ Audio Creator Studio</h1>

        {/* ส่วนตั้งค่า */}
        <div style={s.grid3}>
          <div>
            <label style={s.label}>🏢 แผนก:</label>
            <select value={targetDept} onChange={e => setTargetDept(e.target.value)} style={s.select}>
              {departments.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>🎯 ระดับความยาก:</label>
            <select value={targetLevel} onChange={e => setTargetLevel(e.target.value)} style={s.select}>
              {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>📚 Section หมวด:</label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={s.select}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <input 
          type="text" value={questionTitle} onChange={e => setQuestionTitle(e.target.value)}
          placeholder="พิมพ์ชื่อโจทย์ลูกค้าที่นี่..." style={s.input}
        />

        {/* ส่วนอัดเสียง */}
        <div style={s.recordBox}>
          {!isRecording ? (
            <button onClick={startRecording} style={s.btnRec}>🔴 เริ่มอัดเสียงโจทย์</button>
          ) : (
            <button onClick={stopRecording} style={s.btnStop}>⬛ หยุดอัด</button>
          )}

          {previewUrl && (
            <div style={{ marginTop: '20px' }}>
              <audio src={previewUrl} controls style={{ width: '100%' }} />
              <button onClick={saveQuestion} disabled={uploading} style={s.btnSave}>
                {uploading ? 'กำลังบันทึก...' : `บันทึกเข้าคลัง ${targetDept} ✅`}
              </button>
            </div>
          )}
        </div>

        {/* ส่วนสรุปผลและ Progress */}
        <div style={s.statusSection}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
            <h3>📊 ความคืบหน้าโจทย์ ({totalCount} / 20)</h3>
            {totalCount > 20 && <span style={{color:'red', fontSize:'0.8rem'}}>⚠️ เกินลิมิตที่แนะนำ</span>}
          </div>
          <div style={s.flexGap}>
            {categories.map(c => (
              <div key={c.id} style={s.statBox(countInCat(c.id), currentTarget)}>
                {c.name.split(' ')[1]}: {countInCat(c.id)}/{currentTarget}
              </div>
            ))}
          </div>
        </div>

        {/* รายการข้อสอบที่สร้างแล้ว */}
        <div style={s.listArea}>
          {myQuestions.map((q, i) => (
            <div key={q.id} style={s.listItem}>
              <span>{i + 1}. {q.question_text} ({q.category})</span>
              <button onClick={async () => { if(confirm('ลบโจทย์ข้อนี้?')){ await supabase.from('questions').delete().eq('id', q.id); fetchMyQuestions(userId, targetDept, targetLevel); } }} style={s.delBtn}>ลบ</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// --- Styles (คงความสะอาดและสวยงาม) ---
const s = {
  page: { background: '#f0f2f5', minHeight: '100vh', padding: '40px 20px', fontFamily: 'sans-serif' },
  card: { maxWidth: '850px', margin: '0 auto', background: 'white', padding: '30px', borderRadius: '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' },
  title: { color: '#6f42c1', textAlign: 'center', marginBottom: '30px' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '20px' },
  label: { fontWeight: 'bold', fontSize: '0.85rem', color: '#555', display:'block', marginBottom:'5px' },
  select: { width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd', outline:'none' },
  input: { width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #ddd', boxSizing:'border-box', marginBottom:'25px', fontSize:'1rem' },
  recordBox: { textAlign: 'center', border: '2px dashed #eee', padding: '30px', borderRadius: '20px', background: '#fafafa' },
  btnRec: { padding: '15px 35px', borderRadius: '30px', background: '#e21b3c', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' },
  btnStop: { padding: '15px 35px', borderRadius: '30px', background: '#333', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' },
  btnSave: { width: '100%', marginTop: '20px', padding: '15px', background: '#28a745', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' },
  statusSection: { marginTop: '40px', padding: '20px', background: '#f8f9fa', borderRadius: '20px' },
  flexGap: { display: 'flex', gap: '10px', marginTop: '15px' },
  statBox: (count, target) => ({
    flex: 1, padding: '15px', borderRadius: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.85rem',
    background: count >= target ? '#d4edda' : '#fff',
    color: count >= target ? '#155724' : '#666',
    border: count >= target ? 'none' : '1px solid #ddd'
  }),
  listArea: { marginTop: '20px', maxHeight: '300px', overflowY: 'auto' },
  listItem: { display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #eee', fontSize: '0.9rem' },
  delBtn: { background: 'none', border: 'none', color: '#ff4757', cursor: 'pointer', fontWeight: 'bold' }
}
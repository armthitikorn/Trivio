'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
// 1. Import QR Code
import { QRCodeCanvas } from 'qrcode.react'

export default function PerfectTrainerAudioCreator() {
  // --- States ตั้งค่าโจทย์ ---
  const [targetDept, setTargetDept] = useState('UOB') 
  const [category, setCategory] = useState('Introduction')
  const [targetLevel, setTargetLevel] = useState('Nursery')
  const [targetCount, setTargetCount] = useState(5)
  const [questionTitle, setQuestionTitle] = useState('')
  const [userId, setUserId] = useState(null)
  const [myQuestions, setMyQuestions] = useState([])

  // --- States สำหรับ QR Code ---
  const [generatedPIN, setGeneratedPIN] = useState(null)
  const [showQR, setShowQR] = useState(false)

  // --- States อัดเสียง ---
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])

  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        fetchMyQuestions(user.id, targetDept, targetLevel)
      }
    }
    initData()
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

  // --- ฟังก์ชันสร้าง PIN และแสดง QR Code ---
  async function generateGamePIN() {
    if (myQuestions.length === 0) return alert("กรุณาสร้างโจทย์อย่างน้อย 1 ข้อก่อนสร้าง PIN ครับ")
    
    const newPIN = Math.floor(100000 + Math.random() * 900000).toString()
    
    const { error } = await supabase.from('game_sessions').insert([{
      pin: newPIN,
      user_id: userId, 
      category: 'AudioArena',
      target_department: targetDept,
      target_level: targetLevel,
      is_active: true
    }])

    if (error) {
        alert("Error: " + error.message)
    } else {
        setGeneratedPIN(newPIN)
        setShowQR(true) // เปิดหน้าต่าง QR Code
    }
  }

  // --- ระบบอัดเสียง ---
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
    if (!audioBlob || !questionTitle) return alert("กรุณาระบุชื่อข้อและอัดเสียงก่อน")
    setUploading(true)
    
    const fileName = `questions/${targetDept}/${targetLevel}/${category}/${Date.now()}.wav`
    const { error: upErr } = await supabase.storage.from('recordings').upload(fileName, audioBlob)

    if (upErr) return alert(upErr.message)

    await supabase.from('questions').insert([{
      text: fileName,
      question_text: questionTitle,
      category: category,
      target_department: targetDept,
      target_level: targetLevel,
      media_url: fileName,
      audio_question_url: fileName,
      type: 'audio_roleplay',
      user_id: userId
    }])

    alert("บันทึกโจทย์เข้าคลังสำเร็จ! ✅")
    setAudioBlob(null); setPreviewUrl(null); setQuestionTitle('')
    fetchMyQuestions(userId, targetDept, targetLevel)
    setUploading(false)
  }

  const countInCat = (catId) => myQuestions.filter(q => q.category === catId).length

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'25px'}}>
            <h1 style={s.title}>🎙️ Audio Mission Studio</h1>
            <button onClick={generateGamePIN} style={s.btnPIN}>🔑 สร้าง PIN & QR Code</button>
        </div>

        {/* ส่วนตั้งค่า (Dropdowns) */}
        <div style={s.grid}>
          <div><label style={s.label}>🏢 แผนก:</label><select value={targetDept} onChange={e=>setTargetDept(e.target.value)} style={s.select}>{['UOB','AYCAP','ttb','Krungsri','Agent','Broker'].map(d=><option key={d}>{d}</option>)}</select></div>
          <div><label style={s.label}>⭐ ระดับ:</label><select value={targetLevel} onChange={e=>setTargetLevel(e.target.value)} style={s.select}>{['Nursery','Rising Star','Legend'].map(l=><option key={l}>{l}</option>)}</select></div>
          <div><label style={s.label}>📚 Section:</label><select value={category} onChange={e=>setCategory(e.target.value)} style={s.select}><option value="Introduction">1. Intro</option><option value="Objection">2. Objection</option><option value="Closing">3. Closing</option></select></div>
          <div><label style={s.label}>🎯 เป้าหมาย:</label><input type="number" value={targetCount} onChange={e=>setTargetCount(e.target.value)} style={s.select} /></div>
        </div>

        <input type="text" value={questionTitle} onChange={e=>setQuestionTitle(e.target.value)} placeholder="ระบุสคริปต์โจทย์ลูกค้า (เช่น 'ขอยกเลิกบัตรค่ะ ต้องพูดยังไง?')" style={s.input} />

        {/* กล่องอัดเสียง */}
        <div style={s.recordBox}>
          {!isRecording ? (
            <button onClick={startRecording} style={s.btnRec}>🔴 เริ่มอัดเสียงโจทย์</button>
          ) : (
            <button onClick={stopRecording} style={s.btnStop}>⬛ หยุดอัด (Stop)</button>
          )}

          {previewUrl && (
            <div style={{marginTop:'25px'}}>
              <audio src={previewUrl} controls style={{width:'100%'}}/>
              <button onClick={saveQuestion} disabled={uploading} style={s.btnSave}>
                {uploading ? 'กำลังบันทึก...' : 'บันทึกลงคลังโจทย์ ✅'}
              </button>
            </div>
          )}
        </div>

        {/* สถานะคลังโจทย์ */}
        <div style={s.statusSection}>
          <h3 style={s.subTitle}>📊 สถานะโจทย์แผนก {targetDept} ({myQuestions.length} ข้อ)</h3>
          <div style={s.flexGap}>
             {['Introduction','Objection','Closing'].map(c => (
               <div key={c} style={s.statBox(countInCat(c), targetCount)}>
                 {c}: {countInCat(c)}/{targetCount}
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* --- Modal แสดง QR Code เมื่อสร้าง PIN สำเร็จ --- */}
      {showQR && (
        <div style={s.modalOverlay} onClick={() => setShowQR(false)}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <h2 style={{color: '#1a1a1a', marginBottom: '10px'}}>พร้อมสำหรับส่งพนักงาน!</h2>
            <p style={{color: '#666'}}>สแกนเพื่อเข้าทำแบบทดสอบเสียง (Audio Arena)</p>
            
            <div style={s.qrWrapper}>
              <QRCodeCanvas 
                value={`${window.location.origin}/play?pin=${generatedPIN}`} 
                size={240}
                level={"H"}
                margin={true}
              />
              <div style={s.pinDisplay}>PIN: {generatedPIN}</div>
            </div>

            <p style={{color: '#d63031', fontWeight: 'bold', marginBottom: '20px'}}>
              เป้าหมาย: แผนก {targetDept} | ระดับ {targetLevel}
            </p>

            <button onClick={() => setShowQR(false)} style={s.btnClose}>ปิดหน้าต่าง</button>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  page: { background: '#f0f2f5', minHeight: '100vh', padding: '40px 20px', fontFamily: "'Inter', sans-serif" },
  card: { maxWidth: '900px', margin: '0 auto', background: 'white', padding: '40px', borderRadius: '35px', boxShadow: '0 15px 40px rgba(0,0,0,0.1)', border: '1px solid #eee' },
  title: { color: '#1a1a1a', margin: 0, fontWeight: '800', fontSize: '1.8rem' },
  subTitle: { color: '#1a1a1a', fontWeight: '700', fontSize: '1.2rem' },
  btnPIN: { background: 'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)', color: 'white', border: 'none', padding: '15px 25px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 5px 15px rgba(108, 92, 231, 0.3)' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 0.6fr', gap: '20px', marginBottom: '25px' },
  label: { fontWeight: '800', fontSize: '0.85rem', color: '#1a1a1a', marginBottom: '5px', display: 'block' },
  select: { width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #ddd', marginTop: '5px', fontWeight: '600', color: '#1a1a1a' },
  input: { width: '100%', padding: '18px', borderRadius: '15px', border: '2px solid #ddd', marginBottom: '25px', boxSizing: 'border-box', fontSize:'1.1rem', fontWeight: '600', color: '#1a1a1a' },
  recordBox: { textAlign: 'center', border: '3px dashed #dfe6e9', padding: '40px', borderRadius: '25px', background: '#fafafa' },
  btnRec: { padding: '18px 35px', borderRadius: '50px', background: '#d63031', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '900', fontSize: '1.1rem', boxShadow: '0 5px 15px rgba(214, 48, 49, 0.3)' },
  btnStop: { padding: '18px 35px', borderRadius: '50px', background: '#2d3436', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '900', fontSize: '1.1rem' },
  btnSave: { width: '100%', marginTop: '20px', padding: '18px', background: '#00b894', color: 'white', border: 'none', borderRadius: '15px', fontWeight: '900', cursor: 'pointer', fontSize: '1.1rem' },
  statusSection: { marginTop: '40px', borderTop: '1px solid #eee', paddingTop: '30px' },
  flexGap: { display: 'flex', gap: '15px' },
  statBox: (count, target) => ({
    flex: 1, padding: '20px', borderRadius: '18px', textAlign: 'center', fontWeight: '900', fontSize: '1rem',
    background: count >= target ? '#e1fbef' : '#f1f2f6',
    color: count >= target ? '#00b894' : '#636e72',
    border: count >= target ? '2px solid #00b894' : '2px solid #dfe6e9'
  }),
  // Modal Styles
  modalOverlay: { position: 'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', display:'flex', justifyContent:'center', alignItems:'center', zIndex: 1000, backdropFilter: 'blur(5px)' },
  modalContent: { background:'white', padding:'40px', borderRadius:'40px', textAlign:'center', maxWidth:'450px', width:'90%', boxShadow:'0 25px 60px rgba(0,0,0,0.3)' },
  qrWrapper: { background:'#f8f9fa', padding:'30px', borderRadius:'30px', display:'inline-block', margin:'25px 0', border: '1px solid #eee' },
  pinDisplay: { fontSize: '2.5rem', fontWeight: '900', color: '#6c5ce7', marginTop: '20px', letterSpacing: '5px' },
  btnClose: { width:'100%', padding:'18px', border:'none', borderRadius:'15px', background:'#2d3436', color:'white', cursor:'pointer', fontWeight:'900', fontSize:'1.1rem' }
}
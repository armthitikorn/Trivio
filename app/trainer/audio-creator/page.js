'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { QRCodeCanvas } from 'qrcode.react'

export default function PerfectTrainerAudioCreator() {
  // --- States เดิม ---
  const [targetDept, setTargetDept] = useState('UOB')
  const [category, setCategory] = useState('Introduction')
  const [targetLevel, setTargetLevel] = useState('Nursery')
  
  // ✅ เก็บเป้าหมายแยกหมวดหมู่
  const [targets, setTargets] = useState({
    Introduction: 5,
    Objection: 5,
    Closing: 5
  })

  const [questionTitle, setQuestionTitle] = useState('')
  const [userId, setUserId] = useState(null)
  const [myQuestions, setMyQuestions] = useState([])
  const [generatedPIN, setGeneratedPIN] = useState(null)
  const [showQR, setShowQR] = useState(false)

  // --- States อัดเสียง ---
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])

  // ✅ 1. แก้ไข useEffect: ให้โหลดทั้งคำถามและเป้าหมายจาก Supabase
  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        fetchMyQuestions(user.id, targetDept, targetLevel)
        fetchTargets(user.id, targetDept, targetLevel) // ดึงเป้าหมายที่เคยบันทึกไว้
      }
    }
    initData()
  }, [targetDept, targetLevel])

  // ✅ 2. ฟังก์ชันดึงค่าเป้าหมายจาก Supabase
  async function fetchTargets(uid, dept, level) {
    const { data, error } = await supabase
      .from('target_settings')
      .select('targets')
      .eq('user_id', uid)
      .eq('department', dept)
      .eq('level', level)
      .single()

    if (data && data.targets) {
      setTargets(data.targets)
    } else {
      // ถ้าไม่เคยบันทึก ให้ใช้ค่าเริ่มต้น
      setTargets({ Introduction: 5, Objection: 5, Closing: 5 })
    }
  }

  // ✅ 3. ฟังก์ชันบันทึกเป้าหมายลง Supabase (Upsert)
  async function saveTargetsToSupabase(newTargets) {
    if (!userId) return;
    const { error } = await supabase
      .from('target_settings')
      .upsert({
        user_id: userId,
        department: targetDept,
        level: targetLevel,
        targets: newTargets
      }, { onConflict: 'user_id,department,level' }) // ป้องกันการสร้างแถวซ้ำ

    if (error) console.error("Error saving targets:", error.message)
  }

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

  // --- ฟังก์ชันสร้าง PIN (ตรรกะเดิม) ---
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
    if (error) alert("Error: " + error.message)
    else {
        setGeneratedPIN(newPIN)
        alert(`✅ สร้าง PIN สำเร็จ: ${newPIN}`)
    }
  }

  // --- ระบบอัดเสียง (ตรรกะเดิม) ---
  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder.current = new MediaRecorder(stream)
    audioChunks.current = []
    mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data)
    mediaRecorder.current.onstop = () => {
      const blob = new Blob(audioChunks.current, { type: 'audio/wav' })
      setAudioBlob(blob); setPreviewUrl(URL.createObjectURL(blob))
    }
    mediaRecorder.current.start(); setIsRecording(true)
  }

  async function saveQuestion() {
    if (!audioBlob || !questionTitle) return alert("กรุณาระบุชื่อข้อและอัดเสียงก่อน")
    setUploading(true)
    const fileName = `questions/${Date.now()}.wav`
    await supabase.storage.from('recordings').upload(fileName, audioBlob)
    await supabase.from('questions').insert([{
      question_text: questionTitle, category, target_department: targetDept,
      target_level: targetLevel, audio_question_url: fileName, type: 'audio_roleplay', user_id: userId
    }])
    alert("บันทึกสำเร็จ!"); setUploading(false); fetchMyQuestions(userId, targetDept, targetLevel)
  }

  const countInCat = (catId) => myQuestions.filter(q => q.category === catId).length

  // ✅ ปรับปรุง: เมื่อเปลี่ยนเป้าหมาย ให้บันทึกลงฐานข้อมูลทันที
  const handleTargetChange = (val) => {
    const newCount = parseInt(val) || 0
    const updatedTargets = { ...targets, [category]: newCount }
    setTargets(updatedTargets)
    saveTargetsToSupabase(updatedTargets) // บันทึกอัตโนมัติ
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'25px'}}>
            <h1 style={s.title}>🎙️ Audio Mission Studio</h1>
            <div style={{display:'flex', gap:'10px'}}>
                <button onClick={() => setShowQR(true)} style={s.btnQR}>📱 แสดง QR Code</button>
                <button onClick={generateGamePIN} style={s.btnPIN}>🔑 สร้าง PIN (กดตรงนี้)</button>
            </div>
        </div>

        <div style={s.grid}>
          <div><label style={s.label}>🏢 แผนก:</label><select value={targetDept} onChange={e=>setTargetDept(e.target.value)} style={s.select}>{['UOB','AYCAP','ttb','Krungsri','Agent','Broker'].map(d=><option key={d}>{d}</option>)}</select></div>
          <div><label style={s.label}>⭐ ระดับ:</label><select value={targetLevel} onChange={e=>setTargetLevel(e.target.value)} style={s.select}>{['Nursery','Rising Star','Legend'].map(l=><option key={l}>{l}</option>)}</select></div>
          <div><label style={s.label}>📚 Section:</label><select value={category} onChange={e=>setCategory(e.target.value)} style={s.select}><option value="Introduction">1. Intro</option><option value="Objection">2. Objection</option><option value="Closing">3. Closing</option></select></div>
          
          {/* ✅ Input เป้าหมายที่ดึงค่าจาก DB และบันทึกกลับอัตโนมัติ */}
          <div>
            <label style={s.label}>🎯 เป้าหมาย:</label>
            <input 
              type="number" 
              value={targets[category]} 
              onChange={e=>handleTargetChange(e.target.value)} 
              style={s.select} 
            />
          </div>
        </div>

        <input type="text" value={questionTitle} onChange={e=>setQuestionTitle(e.target.value)} placeholder="ระบุสคริปต์โจทย์ลูกค้า..." style={s.input} />

        <div style={s.recordBox}>
          {!isRecording ? <button onClick={startRecording} style={s.btnRec}>🔴 อัดเสียงโจทย์</button> : <button onClick={()=>mediaRecorder.current.stop()} style={s.btnStop}>⬛ หยุดอัด</button>}
          {previewUrl && <button onClick={saveQuestion} disabled={uploading} style={s.btnSave}>{uploading ? '...' : 'บันทึกลงคลัง ✅'}</button>}
        </div>

        {generatedPIN && (
            <div style={s.pinAlert}>
                เลข PIN ปัจจุบันสำหรับพนักงาน: <span style={{fontSize:'2rem'}}>{generatedPIN}</span>
            </div>
        )}

        <div style={s.statusSection}>
          <h3 style={{color:'#000', fontWeight:'900'}}>📊 คลังโจทย์แผนก {targetDept}</h3>
          <div style={s.flexGap}>
             {['Introduction','Objection','Closing'].map(c => (
               <div key={c} style={s.statBox(countInCat(c), targets[c])}>
                 {c}: {countInCat(c)}/{targets[c]}
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* --- QR Code Modal --- */}
      {showQR && (
        <div style={s.overlay} onClick={() => setShowQR(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={{color: '#000', fontWeight: '900'}}>สแกนเพื่อลงทะเบียน</h2>
            <div style={s.qrBox}>
              <QRCodeCanvas value={`${window.location.origin}/play/audio`} size={250} level={"H"} />
            </div>
            <button onClick={() => setShowQR(false)} style={s.btnClose}>ปิดหน้าต่าง</button>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Styles (คงเดิมทุกประการ) ---
const s = {
  page: { background: '#f0f2f5', minHeight: '100vh', padding: '40px 20px', fontFamily: 'sans-serif' },
  card: { maxWidth: '950px', margin: '0 auto', background: 'white', padding: '40px', borderRadius: '40px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' },
  title: { color: '#000', margin: 0, fontWeight: '900' },
  btnQR: { background: '#333', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' },
  btnPIN: { background: '#6c5ce7', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 0.6fr', gap: '15px', marginBottom: '25px' },
  label: { fontWeight: '900', color: '#000', fontSize: '0.9rem' },
  select: { width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #ddd', marginTop: '5px', fontWeight: '700' },
  input: { width: '100%', padding: '18px', borderRadius: '15px', border: '2px solid #ddd', marginBottom: '20px', boxSizing: 'border-box', fontSize:'1.1rem', fontWeight:'700' },
  recordBox: { textAlign: 'center', border: '3px dashed #eee', padding: '40px', borderRadius: '25px', background: '#fafafa' },
  btnRec: { padding: '15px 40px', borderRadius: '40px', background: '#e21b3c', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '900' },
  btnStop: { padding: '15px 40px', borderRadius: '40px', background: '#000', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '900' },
  btnSave: { width: '100%', marginTop: '15px', padding: '15px', background: '#28a745', color: 'white', border: 'none', borderRadius: '15px', fontWeight: '900' },
  pinAlert: { marginTop: '20px', padding: '20px', background: '#fff9db', borderRadius: '15px', border: '2px solid #fab005', textAlign: 'center', fontWeight: '900', color: '#000' },
  statusSection: { marginTop: '40px', borderTop: '2px solid #eee', paddingTop: '20px' },
  flexGap: { display: 'flex', gap: '15px' },
  statBox: (count, target) => ({
    flex: 1, padding: '20px', borderRadius: '18px', textAlign: 'center', fontWeight: '900',
    background: count >= target ? '#d4edda' : '#f8f9fa',
    color: count >= target ? '#155724' : '#000',
    border: count >= target ? '2px solid #28a745' : '2px solid #ddd'
  }),
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { background: 'white', padding: '40px', borderRadius: '40px', textAlign: 'center', maxWidth: '450px', width: '90%' },
  qrBox: { background: '#fff', padding: '20px', borderRadius: '20px', display: 'inline-block', border: '2px solid #eee', marginBottom: '20px' },
  btnClose: { width: '100%', padding: '15px', borderRadius: '15px', border: 'none', background: '#000', color: 'white', fontWeight: '900', cursor: 'pointer' }
}
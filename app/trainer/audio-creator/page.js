'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { QRCodeCanvas } from 'qrcode.react'

export default function PerfectTrainerAudioCreator() {
  // --- 1. States สำหรับการตั้งค่าภารกิจ ---
  const [userId, setUserId] = useState(null)
  const [productType, setProductType] = useState('ประกันสะสมทรัพย์ 1') 
  const [targetDept, setTargetDept] = useState('UOB')
  const [targetLevel, setTargetLevel] = useState('Nursery')
  const [category, setCategory] = useState('Introduction')
  
  // ✨ เป้าหมายแยก 3 ส่วน (ดึงไปโชว์ใน PIN/QR แถวด้านล่าง)
  const [targets, setTargets] = useState({
    Introduction: 5,
    Objection: 3,
    Closing: 4
  })

  // --- 2. States สำหรับการสร้างโจทย์ ---
  const [questionTitle, setQuestionTitle] = useState('')
  const [myQuestions, setMyQuestions] = useState([])
  const [sessionsList, setSessionsList] = useState([]) 

  // --- 3. States สำหรับระบบอัดเสียง ---
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])

  // --- 4. การดึงข้อมูล (Lifecycle) ---
  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        fetchData(user.id)
      }
    }
    initData()
  }, [targetDept, targetLevel])

  async function fetchData(uid) {
    // ดึงโจทย์ทั้งหมดของ Trainer คนนี้
    const { data: qs } = await supabase.from('questions')
      .select('*').eq('user_id', uid).eq('target_department', targetDept)
      .order('created_at', { ascending: true })
    setMyQuestions(qs || [])

    // ดึงรายการภารกิจ (PIN/QR) ทั้งหมดมาแสดงเป็นแถวด้านล่าง
    const { data: ss } = await supabase.from('game_sessions')
      .select('*').eq('user_id', uid).order('created_at', { ascending: false })
    setSessionsList(ss || [])
  }

  // --- 5. ระบบอัดเสียงโจทย์ ---
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
    if (!audioBlob || !questionTitle) return alert("กรุณาระบุสคริปต์และอัดเสียงก่อนบันทึก")
    setUploading(true)
    const fileName = `questions/${Date.now()}.wav`
    try {
      await supabase.storage.from('recordings').upload(fileName, audioBlob)
      await supabase.from('questions').insert([{
        question_text: questionTitle, category, product_type: productType,
        target_department: targetDept, target_level: targetLevel,
        audio_question_url: fileName, type: 'audio_roleplay', user_id: userId
      }])
      alert("✅ บันทึกโจทย์เข้าคลังสำเร็จ")
      setQuestionTitle(''); setAudioBlob(null); setPreviewUrl(null)
      fetchData(userId)
    } catch (err) { alert(err.message) }
    finally { setUploading(false) }
  }

  // --- 6. ฟังก์ชันสร้างภารกิจ (PIN + QR ในบรรทัดเดียวกัน) ---
  async function generateMission() {
    const newPIN = Math.floor(100000 + Math.random() * 900000).toString()
    const { error } = await supabase.from('game_sessions').insert([{
      pin: newPIN,
      user_id: userId,
      product_type: productType,
      target_department: targetDept,
      target_level: targetLevel,
      targets: targets, // บันทึกค่า 5-3-4 ลง Database
      is_active: true
    }])

    if (!error) {
        alert(`🚀 สร้างภารกิจสำหรับ ${productType} สำเร็จ! รายการจะปรากฏด้านล่าง`)
        fetchData(userId)
    } else {
        alert("เกิดข้อผิดพลาด: " + error.message)
    }
  }

  const countInCat = (catId) => myQuestions.filter(q => q.category === catId && q.product_type === productType).length

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>🎙️ Audio Mission Studio</h1>

        {/* ส่วนที่ 1: ตั้งค่าชื่อภารกิจและเป้าหมาย */}
        <div style={s.sectionTitle}>1. ตั้งค่าภารกิจและเป้าหมาย</div>
        <div style={s.setupBox}>
          <div style={{flex: 2}}>
            <label style={s.label}>📦 ชื่อภารกิจ (สินค้า):</label>
            <input type="text" value={productType} onChange={e=>setProductType(e.target.value)} style={s.inputMain} />
          </div>
          <div style={{flex: 1}}>
            <label style={s.label}>🎯 Intro:</label>
            <input type="number" value={targets.Introduction} onChange={e=>setTargets({...targets, Introduction: e.target.value})} style={s.inputMain} />
          </div>
          <div style={{flex: 1}}>
            <label style={s.label}>🎯 Objection:</label>
            <input type="number" value={targets.Objection} onChange={e=>setTargets({...targets, Objection: e.target.value})} style={s.inputMain} />
          </div>
          <div style={{flex: 1}}>
            <label style={s.label}>🎯 Closing:</label>
            <input type="number" value={targets.Closing} onChange={e=>setTargets({...targets, Closing: e.target.value})} style={s.inputMain} />
          </div>
        </div>

        {/* ส่วนที่ 2: อัดเสียงโจทย์แยกหมวด */}
        <div style={s.sectionTitle}>2. สร้างคลังโจทย์เสียง</div>
        <div style={s.grid}>
          <div><label style={s.label}>🏢 แผนก:</label><select value={targetDept} onChange={e=>setTargetDept(e.target.value)} style={s.select}>{['UOB','AYCAP','ttb','Krungsri','Agent','Broker'].map(d=><option key={d}>{d}</option>)}</select></div>
          <div><label style={s.label}>📚 หมวดโจทย์:</label><select value={category} onChange={e=>setCategory(e.target.value)} style={s.select}><option value="Introduction">1. Introduction</option><option value="Objection">2. Objection Handling</option><option value="Closing">3. Closing Sale</option></select></div>
        </div>

        <input type="text" value={questionTitle} onChange={e=>setQuestionTitle(e.target.value)} placeholder="พิมพ์บทพูดของลูกค้าที่นี่..." style={s.inputField} />

        <div style={s.recordBox}>
          {!isRecording ? <button onClick={startRecording} style={s.btnRec}>🔴 อัดเสียงโจทย์</button> : <button onClick={()=>mediaRecorder.current.stop()} style={s.btnStop}>⬛ หยุดอัด</button>}
          {previewUrl && <button onClick={saveQuestion} disabled={uploading} style={s.btnSave}>{uploading ? 'กำลังบันทึก...' : 'บันทึกลงคลังภารกิจ ✅'}</button>}
          <div style={{marginTop:'10px', fontSize:'0.9rem', color:'#666'}}>สะสมในหมวดนี้แล้ว: {countInCat(category)} ข้อ</div>
        </div>

        <button onClick={generateMission} style={s.btnGenerate}>🚀 ยืนยันและสร้าง PIN / QR สำหรับ {productType}</button>

        {/* ส่วนที่ 3: รายการภารกิจ (แสดงเป็นแถวตามต้องการ) */}
        <div style={s.missionContainer}>
          <div style={s.sectionTitle}>📋 รายการภารกิจที่เปิดใช้งาน (Mission List)</div>
          {sessionsList.map((session) => (
            <div key={session.id} style={s.missionRow}>
              <div style={{flex: 2}}>
                <div style={s.missionName}>{session.product_type}</div>
                <div style={s.missionSub}>เป้าหมาย: I:{session.targets?.Introduction} | O:{session.targets?.Objection} | C:{session.targets?.Closing}</div>
              </div>
              <div style={s.pinSection}>
                <span style={s.miniLabel}>รหัส PIN</span>
                <div style={s.pinDisplay}>{session.pin}</div>
              </div>
              <div style={s.qrSection}>
                <QRCodeCanvas value={`${window.location.origin}/play/audio/${session.id}`} size={80} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// --- Styles (จัดเต็มเพื่อความสวยงามและชัดเจน) ---
const s = {
  page: { background: '#f0f2f5', minHeight: '100vh', padding: '40px 20px', fontFamily: "sans-serif" },
  card: { maxWidth: '1000px', margin: '0 auto', background: 'white', padding: '40px', borderRadius: '40px', boxShadow: '0 20px 60px rgba(0,0,0,0.1)' },
  title: { color: '#000', textAlign: 'center', fontWeight: '900', fontSize: '2.5rem', marginBottom: '40px' },
  sectionTitle: { fontWeight: '900', fontSize: '1.1rem', color: '#6c5ce7', marginBottom: '15px', borderLeft: '5px solid #6c5ce7', paddingLeft: '10px' },
  setupBox: { display: 'flex', gap: '15px', background: '#f8f9ff', padding: '25px', borderRadius: '25px', marginBottom: '30px', border: '1px solid #e0e6ed' },
  label: { fontWeight: '900', color: '#333', fontSize: '0.85rem', marginBottom: '5px', display: 'block' },
  inputMain: { width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #000', fontWeight: 'bold', fontSize: '1.1rem' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' },
  select: { width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #ddd', fontWeight: 'bold' },
  inputField: { width: '100%', padding: '18px', borderRadius: '15px', border: '2px solid #ddd', marginBottom: '20px', boxSizing: 'border-box', fontWeight: 'bold' },
  recordBox: { textAlign: 'center', border: '3px dashed #eee', padding: '30px', borderRadius: '30px', background: '#fafafa', marginBottom: '30px' },
  btnRec: { background: '#ff4757', color: 'white', padding: '12px 30px', borderRadius: '30px', border: 'none', fontWeight: 'bold', cursor: 'pointer' },
  btnStop: { background: '#000', color: 'white', padding: '12px 30px', borderRadius: '30px', border: 'none', fontWeight: 'bold', cursor: 'pointer' },
  btnSave: { width: '100%', marginTop: '15px', background: '#28a745', color: 'white', padding: '12px', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer' },
  btnGenerate: { width: '100%', padding: '20px', background: '#6c5ce7', color: 'white', border: 'none', borderRadius: '20px', fontWeight: '900', fontSize: '1.2rem', cursor: 'pointer', marginBottom: '50px' },
  missionContainer: { marginTop: '20px' },
  missionRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '25px', borderRadius: '25px', marginBottom: '15px', border: '1px solid #eee', boxShadow: '0 5px 15px rgba(0,0,0,0.05)' },
  missionName: { fontSize: '1.4rem', fontWeight: '900', color: '#000' },
  missionSub: { fontSize: '0.85rem', color: '#666' },
  pinSection: { flex: 1, textAlign: 'center', borderLeft: '1px solid #eee', borderRight: '1px solid #eee' },
  miniLabel: { fontSize: '0.7rem', color: '#999', textTransform: 'uppercase' },
  pinDisplay: { fontSize: '2.2rem', fontWeight: '900', color: '#6c5ce7' },
  qrSection: { flex: 1, display: 'flex', justifyContent: 'flex-end' }
}
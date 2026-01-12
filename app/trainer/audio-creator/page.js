'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { QRCodeCanvas } from 'qrcode.react'

export default function PerfectTrainerAudioCreator() {
  const [userId, setUserId] = useState(null)
  const [productType, setProductType] = useState('ประกันสะสมทรัพย์ 1') 
  const [targetDept, setTargetDept] = useState('UOB')
  const [targetLevel, setTargetLevel] = useState('Nursery')
  
  // 1. เป้าหมายที่ปรับแต่งได้อิสระที่ด้านบน
  const [targets, setTargets] = useState({
    Introduction: 5,
    Objection: 3,
    Closing: 4
  })

  // 2. หมวดที่กำลังอัดเสียง (ใช้แทน Dropdown เดิม)
  const [activeCategory, setActiveCategory] = useState('Introduction')
  const [questionTitle, setQuestionTitle] = useState('')
  const [myQuestions, setMyQuestions] = useState([])
  const [sessionsList, setSessionsList] = useState([]) 

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
        fetchData(user.id)
      }
    }
    initData()
  }, [targetDept, targetLevel])

  async function fetchData(uid) {
    const { data: qs } = await supabase.from('questions')
      .select('*').eq('user_id', uid).eq('target_department', targetDept)
      .order('created_at', { ascending: true })
    setMyQuestions(qs || [])

    const { data: ss } = await supabase.from('game_sessions')
      .select('*').eq('user_id', uid).order('created_at', { ascending: false })
    setSessionsList(ss || [])
  }

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
    if (!audioBlob || !questionTitle) return alert("กรุณาระบุสคริปต์และอัดเสียงก่อน")
    setUploading(true)
    const fileName = `questions/${Date.now()}.wav`
    try {
      await supabase.storage.from('recordings').upload(fileName, audioBlob)
      await supabase.from('questions').insert([{
        question_text: questionTitle, 
        category: activeCategory, // ✨ ใช้หมวดที่เลือกจากปุ่ม
        product_type: productType,
        target_department: targetDept, 
        target_level: targetLevel,
        audio_question_url: fileName, 
        user_id: userId
      }])
      alert(`บันทึกโจทย์ในหมวด ${activeCategory} สำเร็จ!`)
      setQuestionTitle(''); setAudioBlob(null); setPreviewUrl(null)
      fetchData(userId)
    } catch (err) { alert(err.message) }
    finally { setUploading(false) }
  }

  async function generateMission() {
    const newPIN = Math.floor(100000 + Math.random() * 900000).toString()
    const { error } = await supabase.from('game_sessions').insert([{
      pin: newPIN, user_id: userId, product_type: productType,
      target_department: targetDept, target_level: targetLevel,
      targets: targets, is_active: true
    }])
    if (!error) {
        alert(`🚀 สร้างภารกิจสำหรับ ${productType} สำเร็จ!`)
        fetchData(userId)
    }
  }

  const countInCat = (catId) => myQuestions.filter(q => q.category === catId && q.product_type === productType).length

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>🎙️ Audio Mission Studio</h1>

        {/* --- โซนที่ 1: ตั้งค่าชื่อสินค้าและเป้าหมาย (3 ตัวเลขแยกกัน) --- */}
        <div style={s.setupBox}>
          <div style={{flex: 2}}>
            <label style={s.label}>📦 ชื่อสินค้า/หัวข้อ:</label>
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

        {/* --- โซนที่ 2: อัดเสียง (เลือกหมวดผ่านปุ่มแทน Dropdown) --- */}
        <div style={s.recordSection}>
          <div style={{display:'flex', gap:'10px', marginBottom:'20px', justifyContent:'center'}}>
            {['Introduction', 'Objection', 'Closing'].map((cat) => (
              <button 
                key={cat} 
                onClick={() => setActiveCategory(cat)}
                style={s.catBtn(activeCategory === cat)}
              >
                {cat === 'Introduction' ? '1. บทนำ' : cat === 'Objection' ? '2. ข้อโต้แย้ง' : '3. ปิดการขาย'}
                <div style={{fontSize:'0.7rem'}}>สะสมแล้ว: {countInCat(cat)}</div>
              </button>
            ))}
          </div>

          <input type="text" value={questionTitle} onChange={e=>setQuestionTitle(e.target.value)} placeholder={`ระบุบทพูดลูกค้าในหมวด ${activeCategory}...`} style={s.inputField} />

          <div style={s.recordControls}>
            {!isRecording ? 
              <button onClick={startRecording} style={s.btnRec}>🔴 อัดเสียงโจทย์</button> : 
              <button onClick={()=>mediaRecorder.current.stop()} style={s.btnStop}>⬛ หยุด</button>
            }
            {previewUrl && <button onClick={saveQuestion} disabled={uploading} style={s.btnSave}>บันทึกเข้า {activeCategory} ✅</button>}
          </div>
        </div>

        <button onClick={generateMission} style={s.btnGenerate}>🚀 ยืนยันและสร้างภารกิจใหม่</button>

        {/* --- โซนที่ 3: รายการภารกิจ (จะโชว์ก็ต่อเมื่อมีข้อมูลเท่านั้น) --- */}
        {sessionsList.length > 0 && (
          <div style={s.missionContainer}>
            <div style={s.sectionTitle}>📋 รายการภารกิจที่เปิดใช้งาน (Mission List)</div>
            {sessionsList.map((session) => (
              <div key={session.id} style={s.missionRow}>
                <div style={{flex: 2}}>
                  <div style={s.missionName}>{session.product_type}</div>
                  <div style={s.missionSub}>เป้าหมายการซ้อม: Intro:$session.targets?.Introduction$ | Obj:$session.targets?.Objection$ | Close:$session.targets?.Closing$</div>
                </div>
                <div style={s.pinSection}>
                  <span style={s.miniLabel}>เลข PIN</span>
                  <div style={s.pinDisplay}>{session.pin}</div>
                </div>
                <div style={s.qrSection}>
                  <QRCodeCanvas value={`${window.location.origin}/play/audio/${session.id}`} size={70} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  page: { background: '#f0f2f5', minHeight: '100vh', padding: '40px 20px', fontFamily: "sans-serif" },
  card: { maxWidth: '1000px', margin: '0 auto', background: 'white', padding: '40px', borderRadius: '40px', boxShadow: '0 20px 60px rgba(0,0,0,0.1)' },
  title: { color: '#000', textAlign: 'center', fontWeight: '900', fontSize: '2.5rem', marginBottom: '40px' },
  setupBox: { display: 'flex', gap: '15px', background: '#f8f9ff', padding: '25px', borderRadius: '25px', marginBottom: '30px', border: '1px solid #e0e6ed' },
  label: { fontWeight: '900', color: '#333', fontSize: '0.85rem', marginBottom: '5px', display: 'block' },
  inputMain: { width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #000', fontWeight: 'bold', fontSize: '1.1rem' },
  recordSection: { border: '3px dashed #eee', padding: '30px', borderRadius: '30px', background: '#fafafa', marginBottom: '30px' },
  catBtn: (active) => ({
    padding: '10px 20px', borderRadius: '15px', border: active ? 'none' : '2px solid #ddd',
    background: active ? '#6c5ce7' : '#fff', color: active ? '#fff' : '#666',
    fontWeight: 'bold', cursor: 'pointer', transition: '0.3s', textAlign: 'center'
  }),
  inputField: { width: '100%', padding: '18px', borderRadius: '15px', border: '2px solid #ddd', marginBottom: '20px', fontWeight: 'bold' },
  recordControls: { display: 'flex', justifyContent: 'center', gap: '20px' },
  btnRec: { background: '#ff4757', color: 'white', padding: '12px 30px', borderRadius: '30px', border: 'none', fontWeight: 'bold', cursor: 'pointer' },
  btnStop: { background: '#000', color: 'white', padding: '12px 30px', borderRadius: '30px', border: 'none', fontWeight: 'bold', cursor: 'pointer' },
  btnSave: { background: '#28a745', color: 'white', padding: '12px 30px', borderRadius: '30px', border: 'none', fontWeight: 'bold', cursor: 'pointer' },
  btnGenerate: { width: '100%', padding: '20px', background: '#000', color: 'white', border: 'none', borderRadius: '20px', fontWeight: '900', fontSize: '1.2rem', cursor: 'pointer', marginBottom: '30px' },
  sectionTitle: { fontWeight: '900', fontSize: '1.1rem', color: '#6c5ce7', marginBottom: '15px' },
  missionRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '20px', borderRadius: '25px', marginBottom: '15px', border: '1px solid #eee' },
  missionName: { fontSize: '1.4rem', fontWeight: '900', color: '#000' },
  missionSub: { fontSize: '0.8rem', color: '#888' },
  pinSection: { textAlign: 'center', flex: 1 },
  miniLabel: { fontSize: '0.65rem', color: '#999', display: 'block' },
  pinDisplay: { fontSize: '1.8rem', fontWeight: '900', color: '#6c5ce7' },
  qrSection: { flex: 1, display: 'flex', justifyContent: 'flex-end' }
}
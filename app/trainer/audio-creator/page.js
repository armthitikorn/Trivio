'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { QRCodeCanvas } from 'qrcode.react'

export default function AudioMissionStudio() {
  const [userId, setUserId] = useState(null)
  const [productName, setProductName] = useState('') // ชื่อแบบประกัน เช่น "ประกันสะสมทรัพย์"
  
  // 1. กำหนดเป้าหมายอิสระ (ต้นสาย, กลางสาย, ปลายสาย)
  const [targets, setTargets] = useState({ early: 0, mid: 0, late: 0 })

  const [activePhase, setActivePhase] = useState('early') // ระยะที่กำลังอัดเสียง
  const [questionText, setQuestionText] = useState('')
  const [recordedQuestions, setRecordedQuestions] = useState([]) // โจทย์ที่อัดในรอบนี้
  const [missions, setMissions] = useState([]) // รายการภารกิจที่สร้างสำเร็จแล้ว

  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        // ดึงรายการภารกิจเก่ามาโชว์ที่รายการด้านล่าง
        const { data } = await supabase.from('game_sessions').select('*').order('created_at', { ascending: false })
        setMissions(data || [])
      }
    }
    init()
  }, [])

  // --- ระบบอัดเสียงโจทย์ ---
  const startRecording = async () => {
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

  // บันทึกโจทย์ลงคลัง
  async function saveToLibrary() {
    if (!audioBlob || !questionText || !productName) return alert("กรุณาระบุชื่อประกัน สคริปต์ และอัดเสียง")
    setUploading(true)
    const fileName = `missions/${Date.now()}.wav`
    try {
      await supabase.storage.from('recordings').upload(fileName, audioBlob)
      const { data } = await supabase.from('questions').insert([{
        question_text: questionText,
        category: activePhase, // early, mid, late
        product_type: productName,
        audio_question_url: fileName,
        user_id: userId
      }]).select().single()
      
      setRecordedQuestions([...recordedQuestions, data])
      alert(`บันทึกโจทย์ ${activePhase} สำเร็จ!`)
      setQuestionText(''); setAudioBlob(null); setPreviewUrl(null)
    } catch (err) { alert(err.message) }
    finally { setUploading(false) }
  }

  // --- ปุ่มกดสร้างภารกิจ (Create Mission) ---
  async function handleCreateMission() {
    if (!productName) return alert("กรุณาระบุชื่อแบบประกัน")
    const pin = Math.floor(100000 + Math.random() * 900000).toString()
    
    const { data, error } = await supabase.from('game_sessions').insert([{
      pin: pin,
      product_type: productName,
      targets: targets, // เก็บค่า {early: 4, mid: 5, late: 7}
      user_id: userId,
      is_active: true
    }]).select().single()

    if (!error) {
      setMissions([data, ...missions])
      alert("🚀 สร้างภารกิจสำเร็จ! รายการปรากฏที่ด้านล่างแล้ว")
      // Reset หน้าจอเพื่อทำประกันตัวถัดไป
      setProductName(''); setTargets({ early: 0, mid: 0, late: 0 }); setRecordedQuestions([])
    }
  }

  const countInPhase = (p) => recordedQuestions.filter(q => q.category === p).length

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>🎙️ Audio Mission Studio</h1>

        {/* 1. ตั้งค่าหัวข้อและเป้าหมายอิสระ */}
        <div style={s.setupCard}>
          <label style={s.label}>📋 ชื่อแบบประกัน / ภารกิจ:</label>
          <input type="text" value={productName} onChange={e => setProductName(e.target.value)} placeholder="เช่น ประกันสะสมทรัพย์ 10/1" style={s.inputMain} />
          
          <div style={s.targetGrid}>
            <div style={s.targetItem}>
              <label>🎯 เป้าหมายต้นสาย</label>
              <input type="number" value={targets.early} onChange={e => setTargets({...targets, early: e.target.value})} style={s.inputTarget} />
            </div>
            <div style={s.targetItem}>
              <label>🎯 เป้าหมายกลางสาย</label>
              <input type="number" value={targets.mid} onChange={e => setTargets({...targets, mid: e.target.value})} style={s.inputTarget} />
            </div>
            <div style={s.targetItem}>
              <label>🎯 เป้าหมายปลายสาย</label>
              <input type="number" value={targets.late} onChange={e => setTargets({...targets, late: e.target.value})} style={s.inputTarget} />
            </div>
          </div>
        </div>

        {/* 2. ส่วนอัดเสียงโจทย์ */}
        {productName && (
          <div style={s.recordBox}>
            <div style={s.phaseTabs}>
              {['early', 'mid', 'late'].map(p => (
                <button key={p} onClick={() => setActivePhase(p)} style={s.tab(activePhase === p)}>
                  {p === 'early' ? 'ต้นสาย' : p === 'mid' ? 'กลางสาย' : 'ปลายสาย'}
                  <div style={{fontSize:'0.7rem'}}>อัดแล้ว: {countInCat(p, recordedQuestions)}</div>
                </button>
              ))}
            </div>

            <input type="text" value={questionText} onChange={e => setQuestionText(e.target.value)} placeholder={`พิมพ์บทพูดลูกค้าช่วง ${activePhase}...`} style={s.inputField} />
            
            <div style={s.controls}>
              {!isRecording ? <button onClick={startRecording} style={s.btnRec}>🔴 อัดเสียงโจทย์</button> : <button onClick={() => mediaRecorder.current.stop()} style={s.btnStop}>⬛ หยุด</button>}
              {previewUrl && <button onClick={saveToLibrary} disabled={uploading} style={s.btnSave}>บันทึกเข้าคลัง ✅</button>}
            </div>
          </div>
        )}

        <button onClick={handleCreateMission} style={s.btnCreate}>🚀 ยืนยันและสร้างภารกิจ (Create Mission)</button>

        {/* 3. รายการภารกิจที่สร้างแล้ว (โชว์เป็นแถวพร้อม QR) */}
        <div style={s.listSection}>
          <h2 style={{fontWeight:'900', borderBottom:'3px solid #000', paddingBottom:'10px'}}>📋 รายการแบบทดสอบที่พร้อมใช้งาน</h2>
          {missions.map((m, idx) => (
            <div key={m.id} style={s.missionRow}>
              <div style={s.rowInfo}>
                <div style={s.rowTitle}>โจทย์ที่ {missions.length - idx}: {m.product_type}</div>
                <div style={s.rowSub}>เป้าหมายการซ้อม: ต้น({m.targets?.early}) | กลาง({m.targets?.mid}) | ปลาย({m.targets?.late})</div>
              </div>
              <div style={s.rowPin}>
                PIN: <strong>{m.pin}</strong>
              </div>
              <div style={s.rowQR}>
                <QRCodeCanvas value={`${window.location.origin}/play/audio/${m.id}`} size={80} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function countInCat(phase, list) {
    return list.filter(q => q.category === phase).length;
}

const s = {
  page: { background: '#f0f2f5', minHeight: '100vh', padding: '40px 20px', fontFamily: "sans-serif" },
  card: { maxWidth: '1000px', margin: '0 auto', background: 'white', padding: '40px', borderRadius: '40px', boxShadow: '0 20px 60px rgba(0,0,0,0.1)' },
  title: { textAlign: 'center', fontWeight: '900', fontSize: '2.2rem', marginBottom: '30px' },
  setupCard: { background: '#f8f9ff', padding: '30px', borderRadius: '30px', border: '2px solid #e0e6ed', marginBottom: '30px' },
  label: { fontWeight: '900', display: 'block', marginBottom: '10px' },
  inputMain: { width: '100%', padding: '15px', borderRadius: '15px', border: '2px solid #000', fontSize: '1.2rem', fontWeight: 'bold' },
  targetGrid: { display: 'flex', gap: '20px', marginTop: '20px' },
  targetItem: { flex: 1 },
  inputTarget: { width: '100%', padding: '10px', borderRadius: '10px', border: '2px solid #ddd', textAlign: 'center', fontWeight: 'bold' },
  recordBox: { border: '3px dashed #eee', padding: '30px', borderRadius: '30px', marginBottom: '30px' },
  phaseTabs: { display: 'flex', gap: '10px', marginBottom: '20px' },
  tab: (active) => ({ flex: 1, padding: '15px', borderRadius: '15px', border: active ? 'none' : '1px solid #ddd', background: active ? '#6c5ce7' : '#fff', color: active ? '#fff' : '#000', fontWeight: 'bold', cursor: 'pointer' }),
  inputField: { width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #ddd', marginBottom: '20px' },
  controls: { display: 'flex', justifyContent: 'center', gap: '15px' },
  btnRec: { background: '#ff4757', color: '#fff', border: 'none', padding: '12px 25px', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer' },
  btnStop: { background: '#000', color: '#fff', border: 'none', padding: '12px 25px', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer' },
  btnSave: { background: '#28a745', color: '#fff', border: 'none', padding: '12px 25px', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer' },
  btnCreate: { width: '100%', padding: '20px', background: '#000', color: '#fff', borderRadius: '20px', border: 'none', fontWeight: '900', fontSize: '1.3rem', cursor: 'pointer', marginBottom: '50px' },
  listSection: { marginTop: '20px' },
  missionRow: { display: 'flex', alignItems: 'center', background: '#fff', padding: '20px', borderRadius: '25px', marginBottom: '15px', border: '1px solid #eee', boxShadow: '0 5px 15px rgba(0,0,0,0.05)' },
  rowInfo: { flex: 2 },
  rowTitle: { fontSize: '1.3rem', fontWeight: '900' },
  rowSub: { fontSize: '0.85rem', color: '#666' },
  rowPin: { flex: 1, textAlign: 'center', fontSize: '1.2rem', borderLeft: '1px solid #eee', borderRight: '1px solid #eee' },
  rowQR: { flex: 1, display: 'flex', justifyContent: 'flex-end' }
}
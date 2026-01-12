'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { QRCodeCanvas } from 'qrcode.react'

export default function AudioMissionStudio() {
  const [userId, setUserId] = useState(null)
  
  // --- 1. ข้อมูลหลัก (เริ่มจากค่าว่าง) ---
  const [productName, setProductName] = useState('') 
  const [targets, setTargets] = useState({ early: 0, mid: 0, late: 0 })
  const [activePhase, setActivePhase] = useState('early')
  const [questionText, setQuestionText] = useState('')
  
  // --- 2. รายการภารกิจ (โชว์เฉพาะที่กดสร้างในรอบนี้เท่านั้น) ---
  const [currentSessionMissions, setCurrentSessionMissions] = useState([]) 

  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])

  // ดึงแค่ User ID อย่างเดียว ไม่ดึงประวัติ PIN/QR เก่า
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
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

  async function saveToLibrary() {
    if (!audioBlob || !questionText || !productName) return alert("กรุณาระบุชื่อประกันและอัดเสียงก่อน")
    setUploading(true)
    const fileName = `missions/${Date.now()}.wav`
    try {
      await supabase.storage.from('recordings').upload(fileName, audioBlob)
      await supabase.from('questions').insert([{
        question_text: questionText, category: activePhase,
        product_type: productName, audio_question_url: fileName, user_id: userId
      }])
      alert(`✅ บันทึกโจทย์ช่วง ${activePhase} เรียบร้อย!`)
      setQuestionText(''); setAudioBlob(null); setPreviewUrl(null)
    } catch (err) { alert(err.message) }
    finally { setUploading(false) }
  }

  // --- 🚀 ปุ่มสร้างภารกิจ (จะทำให้แถว PIN/QR ปรากฏขึ้นมา) ---
  async function handleCreateMission() {
    if (!productName) return alert("กรุณาระบุชื่อแบบประกันก่อนสร้าง")
    const pin = Math.floor(100000 + Math.random() * 900000).toString()
    
    const { data, error } = await supabase.from('game_sessions').insert([{
      pin: pin,
      product_type: productName,
      targets: targets,
      user_id: userId,
      is_active: true
    }]).select().single()

    if (!error) {
      // ✨ เพิ่มเข้า State เพื่อโชว์ในรายการด้านล่าง (เฉพาะตัวที่เพิ่งสร้าง)
      setCurrentSessionMissions([data, ...currentSessionMissions])
      alert("🚀 สร้างภารกิจสำเร็จ! รายการปรากฏด้านล่างแล้ว")
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>🎙️ Audio Mission Studio</h1>

        {/* --- ส่วนที่ 1: ใส่ชื่อสินค้า --- */}
        <div style={{marginBottom: '25px'}}>
          <label style={s.label}>📦 ชื่อแบบประกัน / ภารกิจ:</label>
          <input 
            type="text" 
            value={productName} 
            onChange={e => setProductName(e.target.value)} 
            placeholder="เช่น ประกันสะสมทรัพย์ 10/1" 
            style={s.inputMain} 
          />
        </div>

        {/* --- ส่วนที่ 2: จะปรากฏเมื่อเริ่มพิมพ์ชื่อสินค้าเท่านั้น --- */}
        {productName.length > 0 && (
          <div style={{animation: 'fadeIn 0.5s'}}>
            <div style={s.setupCard}>
              <div style={s.targetGrid}>
                <div style={s.targetItem}>
                  <label style={s.miniLabel}>🎯 เป้าหมายต้นสาย</label>
                  <input type="number" value={targets.early} onChange={e => setTargets({...targets, early: e.target.value})} style={s.inputTarget} />
                </div>
                <div style={s.targetItem}>
                  <label style={s.miniLabel}>🎯 เป้าหมายกลางสาย</label>
                  <input type="number" value={targets.mid} onChange={e => setTargets({...targets, mid: e.target.value})} style={s.inputTarget} />
                </div>
                <div style={s.targetItem}>
                  <label style={s.miniLabel}>🎯 เป้าหมายปลายสาย</label>
                  <input type="number" value={targets.late} onChange={e => setTargets({...targets, late: e.target.value})} style={s.inputTarget} />
                </div>
              </div>
            </div>

            <div style={s.recordBox}>
              <div style={s.phaseTabs}>
                {['early', 'mid', 'late'].map(p => (
                  <button key={p} onClick={() => setActivePhase(p)} style={s.tab(activePhase === p)}>
                    {p === 'early' ? '1. ต้นสาย' : p === 'mid' ? '2. กลางสาย' : '3. ปลายสาย'}
                  </button>
                ))}
              </div>
              <input type="text" value={questionText} onChange={e => setQuestionText(e.target.value)} placeholder={`พิมพ์บทพูดลูกค้าช่วง ${activePhase}...`} style={s.inputField} />
              <div style={s.controls}>
                {!isRecording ? <button onClick={startRecording} style={s.btnRec}>🔴 อัดเสียงโจทย์</button> : <button onClick={() => mediaRecorder.current.stop()} style={s.btnStop}>⬛ หยุด</button>}
                {previewUrl && <button onClick={saveToLibrary} disabled={uploading} style={s.btnSave}>บันทึกลงคลัง ✅</button>}
              </div>
            </div>

            <button onClick={handleCreateMission} style={s.btnCreate}>🚀 ยืนยันและสร้างภารกิจ (Create Mission)</button>
          </div>
        )}

        {/* --- ส่วนที่ 3: รายการภารกิจ (จะโชว์เฉพาะที่เพิ่งกดสร้างในหน้านี้เท่านั้น) --- */}
        {currentSessionMissions.length > 0 && (
          <div style={s.listSection}>
            <h2 style={s.sectionTitle}>📋 รายการภารกิจที่เพิ่งสร้างสำเร็จ</h2>
            {currentSessionMissions.map((m) => (
              <div key={m.id} style={s.missionRow}>
                <div style={s.rowInfo}>
                  <div style={s.rowTitle}>{m.product_type}</div>
                  <div style={s.rowSub}>เป้าหมาย: ต้น({m.targets?.early}) | กลาง({m.targets?.mid}) | ปลาย({m.targets?.late})</div>
                </div>
                <div style={s.rowPin}>
                  <span style={{fontSize: '0.7rem', display: 'block', color: '#999'}}>PIN CODE</span>
                  <strong>{m.pin}</strong>
                </div>
                <div style={s.rowQR}>
                  <QRCodeCanvas value={`${window.location.origin}/play/audio/${m.id}`} size={80} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style jsx>{` @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } `}</style>
    </div>
  )
}

const s = {
  page: { background: '#f0f2f5', minHeight: '100vh', padding: '40px 20px', fontFamily: "sans-serif" },
  card: { maxWidth: '850px', margin: '0 auto', background: 'white', padding: '40px', borderRadius: '40px', boxShadow: '0 20px 60px rgba(0,0,0,0.1)' },
  title: { textAlign: 'center', fontWeight: '900', fontSize: '2.2rem', marginBottom: '35px', color: '#000' },
  label: { fontWeight: '900', display: 'block', marginBottom: '10px', color: '#333' },
  inputMain: { width: '100%', padding: '18px', borderRadius: '20px', border: '3px solid #000', fontSize: '1.2rem', fontWeight: 'bold' },
  setupCard: { background: '#f8f9ff', padding: '25px', borderRadius: '25px', border: '1px solid #e0e6ed', marginBottom: '25px' },
  targetGrid: { display: 'flex', gap: '15px' },
  targetItem: { flex: 1 },
  miniLabel: { fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '5px' },
  inputTarget: { width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem' },
  recordBox: { border: '3px dashed #eee', padding: '30px', borderRadius: '30px', background: '#fafafa', marginBottom: '30px' },
  phaseTabs: { display: 'flex', gap: '10px', marginBottom: '20px' },
  tab: (active) => ({ flex: 1, padding: '12px', borderRadius: '15px', border: active ? 'none' : '1px solid #ddd', background: active ? '#000' : '#fff', color: active ? '#fff' : '#000', fontWeight: 'bold', cursor: 'pointer' }),
  inputField: { width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #ddd', marginBottom: '20px', fontWeight: 'bold' },
  controls: { display: 'flex', justifyContent: 'center', gap: '20px' },
  btnRec: { background: '#ff4757', color: '#fff', border: 'none', padding: '12px 30px', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer' },
  btnStop: { background: '#000', color: '#fff', border: 'none', padding: '12px 30px', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer' },
  btnSave: { background: '#28a745', color: '#fff', border: 'none', padding: '12px 30px', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer' },
  btnCreate: { width: '100%', padding: '20px', background: '#6c5ce7', color: '#fff', borderRadius: '20px', border: 'none', fontWeight: '900', fontSize: '1.3rem', cursor: 'pointer', marginBottom: '40px' },
  listSection: { marginTop: '40px', borderTop: '4px solid #f0f0f0', paddingTop: '30px' },
  sectionTitle: { fontWeight: '900', fontSize: '1.2rem', marginBottom: '20px', color: '#000' },
  missionRow: { display: 'flex', alignItems: 'center', background: '#fff', padding: '25px', borderRadius: '25px', marginBottom: '15px', border: '2px solid #6c5ce7', boxShadow: '0 10px 20px rgba(108, 92, 231, 0.1)' },
  rowInfo: { flex: 2 },
  rowTitle: { fontSize: '1.4rem', fontWeight: '900', color: '#000' },
  rowSub: { fontSize: '0.9rem', color: '#666', marginTop: '5px' },
  rowPin: { flex: 1, textAlign: 'center', borderLeft: '1px solid #eee', borderRight: '1px solid #eee' },
  rowQR: { flex: 1, display: 'flex', justifyContent: 'flex-end' }
}
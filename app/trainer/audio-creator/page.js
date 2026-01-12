'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { QRCodeCanvas } from 'qrcode.react'

export default function AudioCreator() {
  const [userId, setUserId] = useState(null)
  const [productName, setProductName] = useState('') 
  const [targets, setTargets] = useState({ early: 0, mid: 0, late: 0 })
  const [activePhase, setActivePhase] = useState('early')
  const [questionText, setQuestionText] = useState('')
  
  // ✨ โชว์เฉพาะภารกิจที่สร้างในรอบนี้ (หน้าจอจะว่างเปล่าเมื่อเริ่ม)
  const [currentSessionMissions, setCurrentSessionMissions] = useState([]) 

  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [creating, setCreating] = useState(false)

  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
    }
    init()
  }, [])

  // --- 🎙️ ระบบอัดเสียง ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder.current = new MediaRecorder(stream)
      audioChunks.current = []
      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data)
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/wav' })
        setAudioBlob(blob)
        setPreviewUrl(URL.createObjectURL(blob))
        setIsRecording(false)
      }
      mediaRecorder.current.start()
      setIsRecording(true)
    } catch (err) { alert("กรุณาอนุญาตการเข้าถึงไมโครโฟน") }
  }

  // --- 💾 บันทึกโจทย์เข้าคลัง (เพื่อเก็บไว้ใน Product นั้นๆ) ---
  async function saveToLibrary() {
    if (!productName.trim()) return alert("❌ ระบุชื่อประกันก่อนครับ")
    if (!questionText.trim()) return alert("❌ พิมพ์บทพูดลูกค้าก่อน")
    if (!audioBlob) return alert("❌ ยังไม่ได้อัดเสียงเลยครับ")
    
    setUploading(true)
    const fileName = `missions/${Date.now()}.wav`
    try {
      await supabase.storage.from('recordings').upload(fileName, audioBlob)
      await supabase.from('questions').insert([{
        question_text: questionText, category: activePhase,
        product_type: productName, audio_question_url: fileName, user_id: userId
      }])
      alert(`✅ บันทึกโจทย์ช่วง ${activePhase} สำเร็จ!`)
      // ล้างค่าเพื่อให้พร้อมอัดข้อถัดไป
      setQuestionText(''); setAudioBlob(null); setPreviewUrl(null)
    } catch (err) { alert(err.message) }
    finally { setUploading(false) }
  }

  // --- 🚀 ปุ่ม Create Mission (สร้าง QR Code ที่ตรงกับ play/audio-game/[id]) ---
  async function handleCreateMission() {
    if (!productName.trim()) return alert("กรุณาระบุชื่อประกัน")
    setCreating(true)
    const pin = Math.floor(100000 + Math.random() * 900000).toString()
    
    try {
      const { data, error } = await supabase.from('game_sessions').insert([{
        pin: pin,
        product_type: productName,
        targets: targets,
        user_id: userId,
        is_active: true
      }]).select().single()

      if (error) throw error
      setCurrentSessionMissions([data, ...currentSessionMissions])
      alert("🚀 สร้างภารกิจสำเร็จ!")
    } catch (err) { alert(err.message) }
    finally { setCreating(false) }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>🎙️ Audio Mission Studio</h1>

        {/* 1. ใส่ชื่อสินค้า */}
        <div style={{marginBottom: '25px'}}>
          <label style={s.label}>📦 ชื่อแบบประกัน / หัวข้อภารกิจ:</label>
          <input 
            type="text" 
            value={productName} 
            onChange={e => setProductName(e.target.value)} 
            placeholder="เช่น ประกันสะสมทรัพย์ 10/1" 
            style={s.inputMain} 
          />
        </div>

        {/* 2. ปรากฏเมื่อระบุชื่อสินค้าแล้วเท่านั้น */}
        {productName.length > 0 && (
          <div style={{animation: 'fadeIn 0.5s'}}>
            <div style={s.setupCard}>
              <div style={s.targetGrid}>
                {['early', 'mid', 'late'].map(p => (
                  <div key={p} style={s.targetItem}>
                    <label style={s.miniLabel}>🎯 เป้าหมาย{p==='early'?'ต้นสาย':p==='mid'?'กลางสาย':'ปลายสาย'}</label>
                    <input type="number" value={targets[p]} onChange={e => setTargets({...targets, [p]: e.target.value})} style={s.inputTarget} />
                  </div>
                ))}
              </div>
            </div>

            <div style={s.recordBox}>
              <div style={s.phaseTabs}>
                {['early', 'mid', 'late'].map(p => (
                  <button key={p} onClick={() => setActivePhase(p)} style={s.tab(activePhase === p)}>
                    {p === 'early' ? 'ต้นสาย' : p === 'mid' ? 'กลางสาย' : 'ปลายสาย'}
                  </button>
                ))}
              </div>
              <input type="text" value={questionText} onChange={e => setQuestionText(e.target.value)} placeholder={`พิมพ์บทพูดลูกค้าช่วง ${activePhase}...`} style={s.inputField} />
              <div style={s.controls}>
                {!isRecording && !previewUrl ? (
                  <button onClick={startRecording} style={s.btnRec}>🔴 อัดเสียงโจทย์</button>
                ) : isRecording ? (
                  <button onClick={() => mediaRecorder.current.stop()} style={s.btnStop}>⬛ หยุดอัด</button>
                ) : (
                  <div style={{display:'flex', gap:'10px'}}>
                    <button onClick={() => {setAudioBlob(null); setPreviewUrl(null);}} style={s.btnRetry}>🔄 อัดใหม่</button>
                    <button onClick={saveToLibrary} disabled={uploading} style={s.btnSave}>{uploading ? '...' : 'บันทึกลงคลัง ✅'}</button>
                  </div>
                )}
              </div>
            </div>

            <button onClick={handleCreateMission} disabled={creating} style={s.btnCreate(creating)}>
              {creating ? '🕒 กำลังสร้าง...' : '🚀 ยืนยันและสร้างภารกิจ (Create Mission)'}
            </button>
          </div>
        )}

        {/* 3. ส่วนรายการ (โชว์เฉพาะที่เพิ่งสร้างในรอบนี้) */}
        {currentSessionMissions.length > 0 && (
          <div style={s.listSection}>
            <h2 style={s.sectionTitle}>📋 รายการภารกิจที่สร้างสำเร็จ</h2>
            {currentSessionMissions.map((m) => (
              <div key={m.id} style={s.missionRow}>
                <div style={{flex: 2}}>
                  <div style={s.missionName}>{m.product_type}</div>
                  <div style={s.missionSub}>เป้าหมาย: ต้น({m.targets?.early || 0}) | กลาง({m.targets?.mid || 0}) | ปลาย({m.targets?.late || 0})</div>
                </div>
                <div style={s.pinSection}>
                  <span style={s.miniLabel}>PIN CODE</span>
                  <div style={s.pinNum}>{m.pin}</div>
                </div>
                <div style={s.qrSection}>
                  {/* ✨ QR Code ลิงก์ตรงไปที่ play/audio-game/[id] */}
                  <QRCodeCanvas 
                    value={`${window.location.origin}/play/audio-game/${m.id}`} 
                    size={90} 
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style jsx>{` @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } `}</style>
    </div>
  )
}

const s = {
  page: { background: '#f0f2f5', minHeight: '100vh', padding: '40px 20px', fontFamily: "sans-serif" },
  card: { maxWidth: '900px', margin: '0 auto', background: 'white', padding: '40px', borderRadius: '40px', boxShadow: '0 20px 60px rgba(0,0,0,0.1)' },
  title: { textAlign: 'center', fontWeight: '900', fontSize: '2.2rem', marginBottom: '35px' },
  label: { fontWeight: '900', display: 'block', marginBottom: '10px' },
  inputMain: { width: '100%', padding: '18px', borderRadius: '20px', border: '3px solid #000', fontSize: '1.2rem', fontWeight: 'bold' },
  setupCard: { background: '#f8f9ff', padding: '20px', borderRadius: '20px', border: '1px solid #e0e6ed', marginBottom: '25px' },
  targetGrid: { display: 'flex', gap: '15px' },
  targetItem: { flex: 1 },
  miniLabel: { fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '5px' },
  inputTarget: { width: '100%', padding: '10px', borderRadius: '12px', border: '2px solid #ddd', textAlign: 'center', fontWeight: 'bold' },
  recordBox: { border: '3px dashed #ccc', padding: '30px', borderRadius: '30px', background: '#fafafa', marginBottom: '30px' },
  phaseTabs: { display: 'flex', gap: '10px', marginBottom: '20px' },
  tab: (active) => ({ flex: 1, padding: '10px', borderRadius: '15px', border: active ? 'none' : '1px solid #ddd', background: active ? '#000' : '#fff', color: active ? '#fff' : '#000', fontWeight: 'bold', cursor: 'pointer' }),
  inputField: { width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #ddd', marginBottom: '20px', fontWeight: 'bold' },
  controls: { display: 'flex', justifyContent: 'center', gap: '20px' },
  btnRec: { background: '#ff4757', color: 'white', padding: '12px 30px', borderRadius: '30px', border: 'none', fontWeight: 'bold', cursor: 'pointer' },
  btnStop: { background: '#000', color: 'white', padding: '12px 30px', borderRadius: '30px', border: 'none', fontWeight: 'bold', cursor: 'pointer' },
  btnRetry: { background: '#666', color: 'white', padding: '10px 20px', borderRadius: '30px', border: 'none', fontWeight: 'bold', cursor: 'pointer' },
  btnSave: { background: '#28a745', color: 'white', padding: '12px 30px', borderRadius: '30px', border: 'none', fontWeight: 'bold', cursor: 'pointer' },
  btnCreate: (creating) => ({ width: '100%', padding: '20px', background: creating ? '#ccc' : '#6c5ce7', color: '#fff', borderRadius: '20px', border: 'none', fontWeight: '900', fontSize: '1.2rem', cursor: creating ? 'default' : 'pointer', marginBottom: '40px' }),
  listSection: { marginTop: '40px', borderTop: '4px solid #f0f0f0', paddingTop: '30px' },
  sectionTitle: { fontWeight: '900', fontSize: '1.2rem', marginBottom: '20px' },
  missionRow: { display: 'flex', alignItems: 'center', background: '#fff', padding: '25px', borderRadius: '25px', marginBottom: '15px', border: '2px solid #6c5ce7', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' },
  missionName: { fontSize: '1.5rem', fontWeight: '900' },
  missionSub: { fontSize: '0.85rem', color: '#666' },
  pinSection: { textAlign: 'center', borderLeft: '1px solid #eee', borderRight: '1px solid #eee', flex: 1 },
  pinNum: { fontSize: '1.8rem', fontWeight: '900' },
  qrSection: { flex: 1, display: 'flex', justifyContent: 'flex-end' }
}
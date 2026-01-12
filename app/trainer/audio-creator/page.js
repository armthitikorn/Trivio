'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { QRCodeCanvas } from 'qrcode.react'

export default function PerfectTrainerAudioCreator() {
  const [targetDept, setTargetDept] = useState('UOB')
  const [targetLevel, setTargetLevel] = useState('Nursery')
  const [category, setCategory] = useState('Introduction')
  const [productType, setProductType] = useState('สะสมทรัพย์') // ✨ เพิ่มประเภทสินค้า
  
  const [targets, setTargets] = useState({ Introduction: 5, Objection: 5, Closing: 5 })
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

  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        fetchMyQuestions(user.id, targetDept, targetLevel)
        fetchTargets(user.id, targetDept, targetLevel) // ดึงเป้าหมายจาก DB
      }
    }
    initData()
  }, [targetDept, targetLevel])

  // --- 1. จัดการเป้าหมาย (Targets) เพื่อไม่ให้ Reset ---
  async function fetchTargets(uid, dept, level) {
    const { data } = await supabase
      .from('target_settings')
      .select('targets')
      .eq('user_id', uid)
      .eq('department', dept)
      .eq('level', level)
      .single()

    if (data) setTargets(data.targets)
    else setTargets({ Introduction: 5, Objection: 5, Closing: 5 })
  }

  async function handleTargetChange(val) {
    const newCount = parseInt(val) || 0
    const updatedTargets = { ...targets, [category]: newCount }
    setTargets(updatedTargets)
    
    // บันทึกลง Supabase ทันที
    await supabase.from('target_settings').upsert({
      user_id: userId, department: targetDept, level: targetLevel, targets: updatedTargets
    }, { onConflict: 'user_id,department,level' })
  }

  // --- 2. จัดการคำถาม (Questions) ---
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

  async function saveQuestion() {
    if (!audioBlob || !questionTitle || !productType) return alert("กรุณาระบุชื่อสินค้า, สคริปต์ และอัดเสียงก่อน")
    setUploading(true)
    const fileName = `questions/${Date.now()}.wav`
    
    try {
      await supabase.storage.from('recordings').upload(fileName, audioBlob)
      await supabase.from('questions').insert([{
        question_text: questionTitle, 
        category, 
        product_type: productType, // ✨ บันทึกแยกตามสินค้า
        target_department: targetDept,
        target_level: targetLevel, 
        audio_question_url: fileName, 
        user_id: userId
      }])
      alert("✅ บันทึกภารกิจสำเร็จ!")
      setQuestionTitle('')
      setAudioBlob(null)
      setPreviewUrl(null)
      fetchMyQuestions(userId, targetDept, targetLevel)
    } catch (err) { alert(err.message) }
    finally { setUploading(false) }
  }

  // --- 3. การสร้าง PIN แยกตามสินค้า ---
  async function generateGamePIN(pType) {
    const newPIN = Math.floor(100000 + Math.random() * 900000).toString()
    const { error } = await supabase.from('game_sessions').insert([{
      pin: newPIN,
      user_id: userId,
      target_department: targetDept,
      target_level: targetLevel,
      product_type: pType, // ✨ PIN นี้จะดึงเฉพาะโจทย์ของสินค้านี้
      is_active: true
    }])
    if (!error) {
      setGeneratedPIN(newPIN)
      alert(`🔑 สร้าง PIN สำหรับ ${pType} สำเร็จ: ${newPIN}`)
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
      setAudioBlob(blob); setPreviewUrl(URL.createObjectURL(blob))
    }
    mediaRecorder.current.start(); setIsRecording(true)
  }

  // --- จัดกลุ่มข้อมูลเพื่อโชว์ List ด้านล่าง ---
  const groupedQuestions = myQuestions.reduce((acc, q) => {
    const p = q.product_type || 'ทั่วไป'
    if (!acc[p]) acc[p] = []
    acc[p].push(q)
    return acc
  }, {})

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>🎙️ Audio Mission Studio</h1>
        
        {/* ส่วนตั้งค่าพื้นฐาน */}
        <div style={s.grid}>
          <div><label style={s.label}>🏢 แผนก:</label>
            <select value={targetDept} onChange={e=>setTargetDept(e.target.value)} style={s.select}>
              {['UOB','AYCAP','ttb','Krungsri','Agent','Broker'].map(d=><option key={d}>{d}</option>)}
            </select>
          </div>
          <div><label style={s.label}>⭐ ระดับ:</label>
            <select value={targetLevel} onChange={e=>setTargetLevel(e.target.value)} style={s.select}>
              {['Nursery','Rising Star','Legend'].map(l=><option key={l}>{l}</option>)}
            </select>
          </div>
          <div><label style={s.label}>📦 ชื่อสินค้า/หัวข้อ:</label>
            <input type="text" value={productType} onChange={e=>setProductType(e.target.value)} placeholder="เช่น สะสมทรัพย์" style={s.select} />
          </div>
          <div><label style={s.label}>🎯 เป้าหมาย ({category}):</label>
            <input type="number" value={targets[category]} onChange={e=>handleTargetChange(e.target.value)} style={s.select} />
          </div>
        </div>

        {/* ส่วนเลือก Section และเขียนโจทย์ */}
        <div style={{display:'flex', gap:'15px', marginBottom:'20px'}}>
          <select value={category} onChange={e=>setCategory(e.target.value)} style={{...s.select, width:'200px'}}>
            <option value="Introduction">1. Intro</option>
            <option value="Objection">2. Objection</option>
            <option value="Closing">3. Closing</option>
          </select>
          <input type="text" value={questionTitle} onChange={e=>setQuestionTitle(e.target.value)} placeholder="ระบุสคริปต์โจทย์ลูกค้า..." style={s.input} />
        </div>

        {/* อัดเสียง */}
        <div style={s.recordBox}>
          {!isRecording ? <button onClick={startRecording} style={s.btnRec}>🔴 อัดเสียงโจทย์</button> : <button onClick={()=>mediaRecorder.current.stop()} style={s.btnStop}>⬛ หยุดอัด</button>}
          {previewUrl && <button onClick={saveQuestion} disabled={uploading} style={s.btnSave}>{uploading ? 'กำลังบันทึก...' : 'บันทึกลงคลัง ✅'}</button>}
        </div>

        {/* รายการโจทย์แยกตามสินค้า */}
        <div style={s.listContainer}>
          <h2 style={{fontWeight:'900', marginBottom:'20px'}}>📦 รายการชุดภารกิจ (Grouped by Product)</h2>
          {Object.keys(groupedQuestions).map(pName => (
            <div key={pName} style={s.productCard}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <h3 style={{color:'#6c5ce7', margin:0}}>🔹 {pName}</h3>
                <button onClick={() => generateGamePIN(pName)} style={s.btnPINMini}>🔑 สร้าง PIN สำหรับ {pName}</button>
              </div>
              <div style={s.qList}>
                {groupedQuestions[pName].map((q, i) => (
                  <div key={q.id} style={s.qRow}>
                    <span>{i+1}. <b>[{q.category}]</b> {q.question_text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {generatedPIN && (
        <div style={s.overlay} onClick={() => setGeneratedPIN(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={{color: '#000'}}>รหัส PIN พร้อมใช้งาน</h2>
            <div style={{fontSize: '4rem', fontWeight: '900', margin: '20px 0'}}>{generatedPIN}</div>
            <QRCodeCanvas value={`${window.location.origin}/play/audio?pin=${generatedPIN}`} size={200} />
            <button onClick={() => setGeneratedPIN(null)} style={s.btnClose}>ปิด</button>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  page: { background: '#f0f2f5', minHeight: '100vh', padding: '40px 20px', fontFamily: 'sans-serif' },
  card: { maxWidth: '1000px', margin: '0 auto', background: 'white', padding: '40px', borderRadius: '40px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' },
  title: { color: '#000', marginBottom: '30px', fontWeight: '900', textAlign: 'center' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr 0.8fr', gap: '15px', marginBottom: '25px' },
  label: { fontWeight: '900', fontSize: '0.85rem', marginBottom: '5px', display: 'block' },
  select: { width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #ddd', fontWeight: '700' },
  input: { flex: 1, padding: '15px', borderRadius: '15px', border: '2px solid #ddd', fontWeight: '700' },
  recordBox: { textAlign: 'center', border: '3px dashed #eee', padding: '30px', borderRadius: '25px', marginBottom: '40px' },
  btnRec: { padding: '12px 30px', borderRadius: '30px', background: '#e21b3c', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '900' },
  btnStop: { padding: '12px 30px', borderRadius: '30px', background: '#000', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '900' },
  btnSave: { width: '100%', marginTop: '15px', padding: '12px', background: '#28a745', color: 'white', borderRadius: '12px', border: 'none', fontWeight: '900' },
  listContainer: { borderTop: '2px solid #eee', paddingTop: '30px' },
  productCard: { background: '#f8f9ff', padding: '20px', borderRadius: '20px', marginBottom: '20px', border: '1px solid #e0e6ed' },
  btnPINMini: { background: '#6c5ce7', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
  qRow: { padding: '10px 0', borderBottom: '1px solid #eee', fontSize: '0.9rem' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { background: 'white', padding: '40px', borderRadius: '30px', textAlign: 'center' },
  btnClose: { width: '100%', marginTop: '20px', padding: '12px', background: '#000', color: '#fff', borderRadius: '10px', border: 'none', fontWeight: 'bold' }
}
'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { QRCodeCanvas } from 'qrcode.react'

export default function PerfectTrainerAudioCreator() {
  // --- States เดิม ---
  const [targetDept, setTargetDept] = useState('UOB')
  const [category, setCategory] = useState('Scenario 1') // เริ่มที่ Scenario 1
  const [targetLevel, setTargetLevel] = useState('Nursery')
  
  // ✅ เก็บเป้าหมายแยกทั้ง 10 Scenarios
  const [targets, setTargets] = useState({
    'Scenario 1': 5, 'Scenario 2': 5, 'Scenario 3': 5, 'Scenario 4': 5,
    'Scenario 5': 5, 'Scenario 6': 5, 'Scenario 7': 5, 'Scenario 8': 5,
    'Scenario 10': 5
  })

  // ✅ คู่มือบทพูดสำหรับเทรนเนอร์ (อ้างอิงจากที่คุณให้มา)
  const scenarioGuides = {
    'Scenario 1': "การติดต่อลูกค้า: อัดเสียงลูกค้าตอบโต้ เช่น 'โทรมาจากไหนครับ ถ้าเป็นประกันยังไม่สนใจนะครับ'",
    'Scenario 2': "การแนะนำตัว: อัดเสียงหลังจากลูกค้าตกลงฟังข้อเสนอ",
    'Scenario 3': "การเช็คบัตร: อัดเสียงลูกค้าตอบรับ เช่น 'ใช่ครับ ใช้อยู่ครับ'",
    'Scenario 4': "สุขภาพเบื้องต้น: อัดเสียงลูกค้าตอบเรื่องการตรวจสุขภาพ/ยา",
    'Scenario 5': "เริ่มนำเสนอผลิตภัณฑ์: อัดเสียงพนักงานนำเสนอโครงการ",
    'Scenario 6': "ลูกค้าสอบถาม: อัดเสียงเทรนเนอร์จำลองเป็นลูกค้าถามคำถาม (ไม่จำกัด)",
    'Scenario 7': "ถามคำถามสุขภาพ 5 ข้อ: อัดเสียงลูกค้าตอบ 'ไม่เคย' หรือ 'เคย' (กรณีเคย ต้องอัดเสียงตอบรายละเอียด 5 ข้อ)",
    'Scenario 8': "แจ้งค่าเบี้ยและภาษี: อัดเสียงลูกค้าตอบยืนยันอายุ/วันเกิด/ภาษี",
    'Scenario 10': "ลงทะเบียน: อัดเสียงลูกค้าบอกชื่อ/ที่อยู่/เลขบัตร/ผู้รับประโยชน์/ตกลง"
  }

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
        fetchTargets(user.id, targetDept, targetLevel)
      }
    }
    initData()
  }, [targetDept, targetLevel])

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
      setTargets({ 
        'Scenario 1': 5, 'Scenario 2': 5, 'Scenario 3': 5, 'Scenario 4': 5,
        'Scenario 5': 5, 'Scenario 6': 5, 'Scenario 7': 5, 'Scenario 8': 5,
        'Scenario 10': 5 
      })
    }
  }

  async function saveTargetsToSupabase(newTargets) {
    if (!userId) return;
    const { error } = await supabase
      .from('target_settings')
      .upsert({
        user_id: userId,
        department: targetDept,
        level: targetLevel,
        targets: newTargets
      }, { onConflict: 'user_id,department,level' })
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
        alert(`✅ สร้าง PIN สำหรับเทรนนิ่งสำเร็จ: ${newPIN}`)
    }
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
    if (!audioBlob || !questionTitle) return alert("กรุณาระบุชื่อข้อและอัดเสียงโจทย์ลูกค้าก่อน")
    setUploading(true)
    const fileName = `questions/${Date.now()}.wav`
    await supabase.storage.from('recordings').upload(fileName, audioBlob)
    await supabase.from('questions').insert([{
      question_text: questionTitle, 
      category, 
      target_department: targetDept,
      target_level: targetLevel, 
      audio_question_url: fileName, 
      type: 'audio_roleplay', 
      user_id: userId
    }])
    alert("บันทึกโจทย์เข้า Scenario สำเร็จ!"); 
    setUploading(false); 
    setQuestionTitle('');
    setPreviewUrl(null);
    fetchMyQuestions(userId, targetDept, targetLevel)
  }

  const countInCat = (catId) => myQuestions.filter(q => q.category === catId).length

  const handleTargetChange = (val) => {
    const newCount = parseInt(val) || 0
    const updatedTargets = { ...targets, [category]: newCount }
    setTargets(updatedTargets)
    saveTargetsToSupabase(updatedTargets)
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'25px'}}>
            <h1 style={s.title}>🎙️ Insurance Simulator Trainer</h1>
            <div style={{display:'flex', gap:'10px'}}>
                <button onClick={() => setShowQR(true)} style={s.btnQR}>📱 QR พนักงาน</button>
                <button onClick={generateGamePIN} style={s.btnPIN}>🔑 สร้าง PIN ใหม่</button>
            </div>
        </div>

        <div style={s.grid}>
          <div><label style={s.label}>🏢 แผนก:</label><select value={targetDept} onChange={e=>setTargetDept(e.target.value)} style={s.select}>{['UOB','AYCAP','ttb','Krungsri','Agent','Broker'].map(d=><option key={d}>{d}</option>)}</select></div>
          <div><label style={s.label}>⭐ ระดับ:</label><select value={targetLevel} onChange={e=>setTargetLevel(e.target.value)} style={s.select}>{['Nursery','Rising Star','Legend'].map(l=><option key={l}>{l}</option>)}</select></div>
          
          <div>
            <label style={s.label}>📚 เลือก Scenario:</label>
            <select value={category} onChange={e=>setCategory(e.target.value)} style={s.select}>
              <option value="Scenario 1">Scenario 1: การติดต่อ</option>
              <option value="Scenario 2">Scenario 2: การแนะนำตัว</option>
              <option value="Scenario 3">Scenario 3: การเช็คบัตร</option>
              <option value="Scenario 4">Scenario 4: สุขภาพเบื้องต้น</option>
              <option value="Scenario 5">Scenario 5: นำเสนอผลิตภัณฑ์</option>
              <option value="Scenario 6">Scenario 6: ลูกค้าสอบถาม</option>
              <option value="Scenario 7">Scenario 7: สุขภาพ 5 ข้อ</option>
              <option value="Scenario 8">Scenario 8: ค่าเบี้ยและภาษี</option>
              <option value="Scenario 10">Scenario 10: ลงทะเบียน</option>
            </select>
          </div>
          
          <div>
            <label style={s.label}>🎯 เป้าหมายโจทย์:</label>
            <input type="number" value={targets[category] || 0} onChange={e=>handleTargetChange(e.target.value)} style={s.select} />
          </div>
        </div>

        {/* ✅ กล่องคำแนะนำสำหรับเทรนเนอร์ */}
        <div style={s.guideBox}>
            <small style={{color: '#666'}}>💡 คำแนะนำสำหรับ Scenario นี้:</small>
            <p style={{margin: '5px 0 0 0', fontWeight: 'bold', color: '#6c5ce7'}}>{scenarioGuides[category]}</p>
        </div>

        <input 
          type="text" 
          value={questionTitle} 
          onChange={e=>setQuestionTitle(e.target.value)} 
          placeholder="ตั้งชื่อโจทย์ (เช่น ลูกค้าปฏิเสธสายแรก, ลูกค้ามีโรคประจำตัว...)" 
          style={s.input} 
        />

        <div style={s.recordBox}>
          {!isRecording ? (
            <button onClick={startRecording} style={s.btnRec}>🔴 กดเพื่ออัดเสียงลูกค้า (เทรนเนอร์)</button>
          ) : (
            <button onClick={()=>mediaRecorder.current.stop()} style={s.btnStop}>⬛ หยุดอัดเสียง</button>
          )}
          
          {previewUrl && (
            <div style={{marginTop: '20px'}}>
              <audio src={previewUrl} controls style={{marginBottom: '10px'}} />
              <button onClick={saveQuestion} disabled={uploading} style={s.btnSave}>
                {uploading ? 'กำลังอัปโหลด...' : `บันทึกลงใน ${category} ✅`}
              </button>
            </div>
          )}
        </div>

        {generatedPIN && (
            <div style={s.pinAlert}>
                เลข PIN สำหรับเข้าฝึกอบรม: <span style={{fontSize:'2.5rem', color: '#e21b3c'}}>{generatedPIN}</span>
            </div>
        )}

        <div style={s.statusSection}>
          <h3 style={{color:'#000', fontWeight:'900'}}>📊 สถานะคลังโจทย์ ({targetDept})</h3>
          <div style={s.flexGrid}>
             {Object.keys(targets).map(c => (
               <div key={c} style={s.statBox(countInCat(c), targets[c])}>
                 <div style={{fontSize: '0.8rem'}}>{c}</div>
                 <div style={{fontSize: '1.2rem'}}>{countInCat(c)}/{targets[c]}</div>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* --- QR Code Modal --- */}
      {showQR && (
        <div style={s.overlay} onClick={() => setShowQR(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={{color: '#000', fontWeight: '900'}}>พนักงานสแกนเพื่อเริ่มฝึก</h2>
            <div style={s.qrBox}>
              <QRCodeCanvas value={`${window.location.origin}/play/audio`} size={250} level={"H"} />
            </div>
            <p>หรือเข้าหน้าเว็บพนักงานแล้วใส่ PIN</p>
            <button onClick={() => setShowQR(false)} style={s.btnClose}>ปิด</button>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Styles ปรับปรุงเล็กน้อย ---
const s = {
  page: { background: '#f0f2f5', minHeight: '100vh', padding: '40px 20px', fontFamily: 'sans-serif' },
  card: { maxWidth: '1000px', margin: '0 auto', background: 'white', padding: '40px', borderRadius: '40px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' },
  title: { color: '#000', margin: 0, fontWeight: '900' },
  btnQR: { background: '#333', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' },
  btnPIN: { background: '#6c5ce7', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr 0.6fr', gap: '15px', marginBottom: '20px' },
  guideBox: { padding: '15px', background: '#f8f7ff', borderRadius: '15px', borderLeft: '5px solid #6c5ce7', marginBottom: '20px' },
  label: { fontWeight: '900', color: '#000', fontSize: '0.9rem' },
  select: { width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #ddd', marginTop: '5px', fontWeight: '700' },
  input: { width: '100%', padding: '18px', borderRadius: '15px', border: '2px solid #ddd', marginBottom: '20px', boxSizing: 'border-box', fontSize:'1.1rem', fontWeight:'700' },
  recordBox: { textAlign: 'center', border: '3px dashed #eee', padding: '40px', borderRadius: '25px', background: '#fafafa' },
  btnRec: { padding: '15px 40px', borderRadius: '40px', background: '#e21b3c', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '900' },
  btnStop: { padding: '15px 40px', borderRadius: '40px', background: '#000', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '900' },
  btnSave: { width: '100%', padding: '15px', background: '#28a745', color: 'white', border: 'none', borderRadius: '15px', fontWeight: '900' },
  pinAlert: { marginTop: '20px', padding: '20px', background: '#fff9db', borderRadius: '15px', border: '2px solid #fab005', textAlign: 'center', fontWeight: '900', color: '#000' },
  statusSection: { marginTop: '40px', borderTop: '2px solid #eee', paddingTop: '20px' },
  flexGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' },
  statBox: (count, target) => ({
    padding: '15px 10px', borderRadius: '18px', textAlign: 'center', fontWeight: '900',
    background: count >= target ? '#d4edda' : '#f8f9fa',
    color: count >= target ? '#155724' : '#000',
    border: count >= target ? '2px solid #28a745' : '2px solid #ddd'
  }),
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { background: 'white', padding: '40px', borderRadius: '40px', textAlign: 'center', maxWidth: '450px', width: '90%' },
  qrBox: { background: '#fff', padding: '20px', borderRadius: '20px', display: 'inline-block', border: '2px solid #eee', marginBottom: '20px' },
  btnClose: { width: '100%', padding: '15px', borderRadius: '15px', border: 'none', background: '#000', color: 'white', fontWeight: '900', cursor: 'pointer', marginTop: '15px' }
}
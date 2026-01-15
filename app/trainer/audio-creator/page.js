'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { QRCodeCanvas } from 'qrcode.react'

export default function PerfectTrainerAudioCreator() {
  // --- States หลัก ---
  const [targetDept, setTargetDept] = useState('UOB')
  const [category, setCategory] = useState('Scenario 1')
  const [targetLevel, setTargetLevel] = useState('Nursery')
  
  // ✅ เก็บเฉพาะ Scenario 1-10 (ตัด Intro/Objection/Closing ออกแล้ว)
  const [targets, setTargets] = useState({
    'Scenario 1': 5, 'Scenario 2': 5, 'Scenario 3': 5, 'Scenario 4': 5,
    'Scenario 5': 5, 'Scenario 6': 5, 'Scenario 7': 5, 'Scenario 8': 5,
    'Scenario 10': 5
  })

  const scenarioGuides = {
    'Scenario 1': "การติดต่อลูกค้า: อัดเสียงลูกค้าตอบโต้ เช่น 'โทรมาจากไหนครับ ถ้าเป็นประกันยังไม่สนใจนะครับ'",
    'Scenario 2': "การแนะนำตัว: อัดเสียงหลังจากลูกค้าตกลงฟังข้อเสนอ",
    'Scenario 3': "การเช็คบัตร: อัดเสียงลูกค้าตอบรับ เช่น 'ใช่ครับ ใช้อยู่ครับ'",
    'Scenario 4': "สุขภาพเบื้องต้น: อัดเสียงลูกค้าตอบเรื่องการตรวจสุขภาพ/ยา",
    'Scenario 5': "เริ่มนำเสนอผลิตภัณฑ์: อัดเสียงพนักงานนำเสนอโครงการ",
    'Scenario 6': "ลูกค้าสอบถาม: อัดเสียงเทรนเนอร์จำลองเป็นลูกค้าถามคำถาม",
    'Scenario 7': "ถามคำถามสุขภาพ 5 ข้อ: อัดเสียงลูกค้าตอบ 'ไม่เคย' หรือ 'เคย'",
    'Scenario 8': "แจ้งค่าเบี้ยและภาษี: อัดเสียงลูกค้าตอบยืนยันอายุ/วันเกิด/ภาษี",
    'Scenario 10': "ลงทะเบียน: อัดเสียงลูกค้าบอกชื่อ/ที่อยู่/เลขบัตร/ผู้รับประโยชน์"
  }

  const [questionTitle, setQuestionTitle] = useState('')
  const [userId, setUserId] = useState(null)
  const [myQuestions, setMyQuestions] = useState([])
  const [generatedPIN, setGeneratedPIN] = useState(null)
  const [showQR, setShowQR] = useState(false)
  const [basePath, setBasePath] = useState('')

  // --- States ระบบบันทึกเสียง ---
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])
  const streamRef = useRef(null) // เก็บ stream ไว้เพื่อสั่งหยุด tracks

  useEffect(() => {
    const initData = async () => {
      if (typeof window !== 'undefined') setBasePath(window.location.origin)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        fetchMyQuestions(user.id, targetDept, targetLevel)
        fetchTargets(user.id, targetDept, targetLevel)
      }
    }
    initData()
  }, [targetDept, targetLevel])

  // --- Functions ดึงข้อมูล ---
  const countInCat = (catId) => myQuestions.filter(q => q.category === catId).length

  async function fetchTargets(uid, dept, level) {
    const { data } = await supabase.from('target_settings')
      .select('targets').eq('user_id', uid).eq('department', dept).eq('level', level).single()
    if (data?.targets) setTargets(data.targets)
  }

  async function fetchMyQuestions(uid, dept, level) {
    const { data } = await supabase.from('questions')
      .select('*').eq('user_id', uid).eq('target_department', dept).eq('target_level', level)
      .order('created_at', { ascending: true })
    setMyQuestions(data || [])
  }

  // --- ระบบบันทึกเสียง (ปรับปรุงให้รีเซ็ตปุ่มแน่นอน) ---
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream 
      mediaRecorder.current = new MediaRecorder(stream)
      audioChunks.current = []

      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data)
      
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/wav' })
        setAudioBlob(blob)
        setPreviewUrl(URL.createObjectURL(blob))
        setIsRecording(false) // รีเซ็ตสถานะปุ่มกลับมาเป็นเริ่มอัด
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop()) // ปิดไมค์จริงๆ
        }
      }

      mediaRecorder.current.start()
      setIsRecording(true)
      setPreviewUrl(null)
    } catch (err) {
      alert("ไม่สามารถเข้าถึงไมโครโฟนได้: " + err.message)
    }
  }

  function stopRecording() {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop()
    }
  }

  // --- บันทึกลง Supabase ---
  async function saveQuestion() {
    if (!audioBlob || !questionTitle) return alert("กรุณาระบุชื่อโจทย์และอัดเสียงก่อน")
    setUploading(true)
    const fileName = `questions/${Date.now()}.wav`
    
    // 1. Upload file
    await supabase.storage.from('recordings').upload(fileName, audioBlob)
    
    // 2. Insert DB
    await supabase.from('questions').insert([{
      question_text: questionTitle, category, target_department: targetDept,
      target_level: targetLevel, audio_question_url: fileName, type: 'audio_roleplay', user_id: userId
    }])

    setUploading(false)
    setQuestionTitle('')
    setPreviewUrl(null)
    setAudioBlob(null)
    fetchMyQuestions(userId, targetDept, targetLevel)
    alert("บันทึกโจทย์สำเร็จ!")
  }

  async function generateGamePIN() {
    if (myQuestions.length === 0) return alert("สร้างโจทย์อย่างน้อย 1 ข้อก่อนสร้าง PIN")
    const newPIN = Math.floor(100000 + Math.random() * 900000).toString()
    const { error } = await supabase.from('game_sessions').insert([{
      pin: newPIN, user_id: userId, category: 'AudioArena',
      target_department: targetDept, target_level: targetLevel, is_active: true
    }])
    if (!error) setGeneratedPIN(newPIN)
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'25px'}}>
            <h1 style={s.title}>🎙️ Simulator Mission Studio</h1>
            <div style={{display:'flex', gap:'10px'}}>
                <button onClick={() => setShowQR(true)} style={s.btnQR}>📱 QR พนักงาน</button>
                <button onClick={generateGamePIN} style={s.btnPIN}>🔑 สร้าง PIN</button>
            </div>
        </div>

        <div style={s.grid}>
          <div><label style={s.label}>🏢 แผนก:</label><select value={targetDept} onChange={e=>setTargetDept(e.target.value)} style={s.select}>{['UOB','AYCAP','ttb','Krungsri','Agent','Broker'].map(d=><option key={d}>{d}</option>)}</select></div>
          <div><label style={s.label}>⭐ ระดับ:</label><select value={targetLevel} onChange={e=>setTargetLevel(e.target.value)} style={s.select}>{['Nursery','Rising Star','Legend'].map(l=><option key={l}>{l}</option>)}</select></div>
          <div>
            <label style={s.label}>📚 เลือกบท (Scenario):</label>
            <select value={category} onChange={e=>setCategory(e.target.value)} style={s.select}>
              {Object.keys(targets).map(scen => <option key={scen} value={scen}>{scen}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>🎯 เป้าหมาย:</label>
            <input type="number" value={targets[category] || 0} onChange={e=>{
               const newTargets = {...targets, [category]: parseInt(e.target.value) || 0};
               setTargets(newTargets);
               if(userId) supabase.from('target_settings').upsert({user_id:userId, department:targetDept, level:targetLevel, targets:newTargets}, {onConflict:'user_id,department,level'}).then();
            }} style={s.select} />
          </div>
        </div>

        <div style={s.guideBox}>
            <small style={{color:'#666'}}>💡 คำแนะนำเทรนเนอร์:</small>
            <p style={{margin:'5px 0 0 0', fontWeight:'bold', color:'#6c5ce7'}}>{scenarioGuides[category]}</p>
        </div>

        <input type="text" value={questionTitle} onChange={e=>setQuestionTitle(e.target.value)} placeholder="ระบุหัวข้อโจทย์ (เช่น 'ลูกค้าอ้างว่าไม่ว่าง', 'ลูกค้าถามเรื่องเบี้ย')..." style={s.input} />

        <div style={s.recordBox}>
          {!isRecording ? (
            <button onClick={startRecording} style={s.btnRec}>🔴 กดเพื่ออัดเสียงโจทย์</button>
          ) : (
            <button onClick={stopRecording} style={s.btnStop}>⬛ หยุดอัด (Stop)</button> 
          )}
          
          {previewUrl && !isRecording && (
            <div style={{marginTop: '20px'}}>
              <audio src={previewUrl} controls style={{marginBottom: '10px'}} />
              <button onClick={saveQuestion} disabled={uploading} style={s.btnSave}>
                {uploading ? 'กำลังบันทึก...' : `บันทึกลงคลัง ${category} ✅`}
              </button>
            </div>
          )}
        </div>

        {generatedPIN && (
          <div style={s.pinAlert}>
            เลข PIN ปัจจุบัน: <span style={{fontSize:'2.5rem', color:'#e21b3c'}}>{generatedPIN}</span>
          </div>
        )}

        <div style={s.statusSection}>
          <h3 style={{color:'#000', fontWeight:'900'}}>📊 คลังโจทย์ทั้งหมด ({targetDept})</h3>
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

      {showQR && (
        <div style={s.overlay} onClick={() => setShowQR(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={{color: '#000', fontWeight: '900'}}>พนักงานสแกนเพื่อเริ่มฝึก</h2>
            <div style={s.qrBox}>
              {basePath && <QRCodeCanvas value={`${basePath}/play/audio`} size={250} level={"H"} />}
            </div>
            <button onClick={() => setShowQR(false)} style={s.btnClose}>ปิดหน้าต่าง</button>
          </div>
        </div>
      )}
    </div>
  )
}

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
  flexGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' },
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
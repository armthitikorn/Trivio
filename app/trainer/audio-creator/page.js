'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { QRCodeCanvas } from 'qrcode.react'

export default function PerfectTrainerAudioCreator() {
  // --- 1. รายชื่อ Scenario ทั้งหมดที่คุณกำหนดมา ---
  const allScenarios = [
    'Scenario 1', 'Scenario 2', 'Scenario 3', 'Scenario 4', 
    'Scenario 5', 'Scenario 6', 'Scenario 7', 'Scenario 8', 'Scenario 10'
  ];

  const [targetDept, setTargetDept] = useState('UOB')
  const [category, setCategory] = useState('Scenario 1')
  const [targetLevel, setTargetLevel] = useState('Nursery')
  
  // ✅ ตั้งค่าเป้าหมายเริ่มต้นให้ครบทุก Scenario ทันที
  const [targets, setTargets] = useState(
    allScenarios.reduce((acc, curr) => ({ ...acc, [curr]: 5 }), {})
  )

  // ✅ คู่มือบทพูด (Guide) ครบถ้วนตามที่คุณร่างมา
  const scenarioGuides = {
    'Scenario 1': "การติดต่อ: อัดเสียงลูกค้าปฏิเสธ เช่น 'โทรมาจากไหนครับ ถ้าเป็นประกันยังไม่สนใจนะครับ'",
    'Scenario 2': "การแนะนำตัว: อัดเสียงลูกค้าตอบตกลงฟังข้อเสนอ หลังจากพนักงานแนะนำตัวตามสคริปต์",
    'Scenario 3': "การเช็คบัตร: อัดเสียงลูกค้าตอบ 'ใช่ครับ ใช้อยู่ครับ' เมื่อถามเรื่องการใช้จ่ายผ่านบัตร",
    'Scenario 4': "สุขภาพเบื้องต้น: อัดเสียงลูกค้าตอบเรื่องการตรวจสุขภาพประจำปี หรือ 'อ๋อไม่ครับ' เรื่องทานยา",
    'Scenario 5': "นำเสนอผลิตภัณฑ์: อัดเสียงจำลองสถานการณ์ขณะพนักงานอธิบายความคุ้มครอง",
    'Scenario 6': "ลูกค้าสอบถาม: อัดเสียงเทรนเนอร์ (ลูกค้า) ถามคำถามข้อสงสัยต่างๆ (ไม่จำกัดคำถาม)",
    'Scenario 7': "สุขภาพ 5 ข้อ: อัดเสียงลูกค้าตอบ 'ไม่เคย' หรือ 'เคย' (ถ้าเคย ต้องอัดเสียงตอบรายละเอียด 5 ข้อ)",
    'Scenario 8': "ค่าเบี้ยและภาษี: อัดเสียงลูกค้าตอบยืนยันอายุ หรือตอบเรื่องการลดหย่อนภาษีแสนแรก",
    'Scenario 10': "ลงทะเบียน: อัดเสียงลูกค้าแจ้งชื่อ-นามสกุล / ที่อยู่ / เลขบัตร / ผู้รับประโยชน์ / และตอบตกลง"
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
  const streamRef = useRef(null)

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

  // --- Helper Functions ---
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

  // --- ระบบบันทึกเสียง (แก้ไขการ Reset ปุ่ม) ---
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
        setIsRecording(false) 
        if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop())
      }
      mediaRecorder.current.start()
      setIsRecording(true)
      setPreviewUrl(null)
    } catch (err) { alert("Error mic: " + err.message) }
  }

  function stopRecording() {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop()
    } else { setIsRecording(false) }
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
    setUploading(false); setQuestionTitle(''); setPreviewUrl(null);
    fetchMyQuestions(userId, targetDept, targetLevel)
    alert("บันทึกสำเร็จ!")
  }

  async function generateGamePIN() {
    if (myQuestions.length === 0) return alert("สร้างโจทย์อย่างน้อย 1 ข้อก่อน")
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
        <div style={s.header}>
            <h1 style={s.title}>🎙️ Insurance Simulator Trainer v2</h1>
            <div style={{display:'flex', gap:'10px'}}>
                <button onClick={() => setShowQR(true)} style={s.btnQR}>📱 QR พนักงาน</button>
                <button onClick={generateGamePIN} style={s.btnPIN}>🔑 สร้าง PIN</button>
            </div>
        </div>

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
          <div>
            <label style={s.label}>📚 เลือกบท (Scenario):</label>
            <select value={category} onChange={e=>setCategory(e.target.value)} style={s.select}>
              {allScenarios.map(scen => <option key={scen} value={scen}>{scen}</option>)}
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
            <small style={{color:'#666'}}>💡 บทบาทของเทรนเนอร์ใน {category}:</small>
            <p style={{margin:'5px 0 0 0', fontWeight:'bold', color:'#6c5ce7', lineHeight:'1.5'}}>{scenarioGuides[category]}</p>
        </div>

        <input type="text" value={questionTitle} onChange={e=>setQuestionTitle(e.target.value)} placeholder="ชื่อโจทย์ (เช่น: ลูกค้าไม่มีเวลา, ลูกค้าขอปรึกษาแฟน...)" style={s.input} />

        <div style={s.recordBox}>
          {!isRecording ? (
            <button onClick={startRecording} style={s.btnRec}>🔴 เริ่มบันทึกเสียงลูกค้า</button>
          ) : (
            <button onClick={stopRecording} style={s.btnStop}>⬛ หยุดบันทึก (Stop)</button> 
          )}
          
          {previewUrl && !isRecording && (
            <div style={{marginTop: '20px', padding:'20px', background:'#eee', borderRadius:'20px'}}>
              <audio src={previewUrl} controls style={{marginBottom: '10px'}} />
              <button onClick={saveQuestion} disabled={uploading} style={s.btnSave}>
                {uploading ? 'กำลังประมวลผล...' : `บันทึกลงคลัง ${category} ✅`}
              </button>
            </div>
          )}
        </div>

        {generatedPIN && (
          <div style={s.pinAlert}>
            เลข PIN สำหรับพนักงาน: <span style={{fontSize:'2.5rem', color:'#e21b3c'}}>{generatedPIN}</span>
          </div>
        )}

        <div style={s.statusSection}>
          <h3 style={{color:'#000', fontWeight:'900'}}>📊 สรุปคลังโจทย์ Scenario 1 - 10</h3>
          <div style={s.flexGrid}>
             {allScenarios.map(c => (
               <div key={c} style={s.statBox(countInCat(c), targets[c])}>
                 <div style={{fontSize: '0.75rem', marginBottom:'5px'}}>{c}</div>
                 <div style={{fontSize: '1.1rem'}}>{countInCat(c)} / {targets[c]}</div>
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
  page: { background: '#f4f7f6', minHeight: '100vh', padding: '40px 20px', fontFamily: 'sans-serif' },
  card: { maxWidth: '1000px', margin: '0 auto', background: 'white', padding: '40px', borderRadius: '40px', boxShadow: '0 15px 35px rgba(0,0,0,0.08)' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px', borderBottom:'2px solid #eee', paddingBottom:'20px' },
  title: { color: '#1a1a1a', margin: 0, fontWeight: '900', fontSize:'1.5rem' },
  btnQR: { background: '#333', color: 'white', border: 'none', padding: '12px 22px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer', transition:'0.3s' },
  btnPIN: { background: '#6c5ce7', color: 'white', border: 'none', padding: '12px 22px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr 0.6fr', gap: '15px', marginBottom: '25px' },
  guideBox: { padding: '20px', background: '#f0eeff', borderRadius: '20px', borderLeft: '6px solid #6c5ce7', marginBottom: '25px' },
  label: { fontWeight: '900', color: '#444', fontSize: '0.85rem', marginBottom:'5px', display:'block' },
  select: { width: '100%', padding: '14px', borderRadius: '15px', border: '2px solid #eee', fontWeight: '700', fontSize:'1rem', outline:'none' },
  input: { width: '100%', padding: '18px', borderRadius: '18px', border: '2px solid #eee', marginBottom: '25px', boxSizing: 'border-box', fontSize:'1.1rem', fontWeight:'700', background:'#fdfdfd' },
  recordBox: { textAlign: 'center', border: '3px dashed #ddd', padding: '50px', borderRadius: '30px', background: '#fafafa' },
  btnRec: { padding: '18px 45px', borderRadius: '50px', background: '#e21b3c', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '900', fontSize:'1.1rem', boxShadow:'0 5px 15px rgba(226,27,60,0.3)' },
  btnStop: { padding: '18px 45px', borderRadius: '50px', background: '#000', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '900', fontSize:'1.1rem' },
  btnSave: { width: '100%', padding: '18px', background: '#20bf6b', color: 'white', border: 'none', borderRadius: '18px', fontWeight: '900', fontSize:'1.1rem', cursor:'pointer' },
  pinAlert: { marginTop: '30px', padding: '25px', background: '#fff9db', borderRadius: '20px', border: '2px solid #fab005', textAlign: 'center', fontWeight: '900', color: '#000' },
  statusSection: { marginTop: '40px', borderTop: '2px solid #eee', paddingTop: '30px' },
  flexGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' },
  statBox: (count, target) => ({
    padding: '18px 12px', borderRadius: '22px', textAlign: 'center', fontWeight: '900',
    background: count >= target ? '#ebfbee' : '#f8f9fa',
    color: count >= target ? '#2f9e44' : '#495057',
    border: count >= target ? '2px solid #2f9e44' : '2px solid #e9ecef',
    transition: '0.3s'
  }),
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { background: 'white', padding: '45px', borderRadius: '40px', textAlign: 'center', maxWidth: '450px', width: '90%' },
  qrBox: { background: '#fff', padding: '20px', borderRadius: '20px', display: 'inline-block', border: '1px solid #eee', marginBottom: '25px' },
  btnClose: { width: '100%', padding: '16px', borderRadius: '18px', border: 'none', background: '#000', color: 'white', fontWeight: '900', cursor: 'pointer' }
}
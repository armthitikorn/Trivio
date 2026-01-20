'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { QRCodeCanvas } from 'qrcode.react'
// หากไม่ได้ลง Lucide-react สามารถใช้ Emoji แทนได้ตามโค้ดด้านล่างครับ

export default function PerfectTrainerAudioCreator() {
  const allScenarios = [
    'Scenario 1', 'Scenario 2', 'Scenario 3', 'Scenario 4', 
    'Scenario 5', 'Scenario 6', 'Scenario 7', 'Scenario 8', 'Scenario 10'
  ];

  const [targetDept, setTargetDept] = useState('UOB')
  const [category, setCategory] = useState('Scenario 1')
  const [targetLevel, setTargetLevel] = useState('Nursery')
  
  const [targets, setTargets] = useState(() => {
    return allScenarios.reduce((acc, curr) => ({ ...acc, [curr]: 5 }), {});
  });

  const scenarioGuides = {
    'Scenario 1': "การติดต่อ: อัดเสียงลูกค้าปฏิเสธ เช่น 'โทรมาจากไหนครับ ถ้าเป็นประกันยังไม่สนใจนะครับ'",
    'Scenario 2': "การแนะนำตัว: อัดเสียงลูกค้าตอบตกลงฟังข้อเสนอ หลังจากพนักงานแนะนำตัวตามสคริปต์",
    'Scenario 3': "การเช็คบัตร: อัดเสียงลูกค้าตอบ 'ใช่ครับ ใช้อยู่ครับ' เมื่อถามเรื่องการใช้จ่ายผ่านบัตร",
    'Scenario 4': "สุขภาพเบื้องต้น: อัดเสียงลูกค้าตอบเรื่องการตรวจสุขภาพประจำปี หรือ 'อ๋อไม่ครับ' เรื่องทานยา",
    'Scenario 5': "นำเสนอผลิตภัณฑ์: อัดเสียงจำลองสถานการณ์ขณะพนักงานอธิบายความคุ้มครอง",
    'Scenario 6': "ลูกค้าสอบถาม: อัดเสียงเทรนเนอร์ (ลูกค้า) ถามคำถามข้อสงสัยต่างๆ",
    'Scenario 7': "สุขภาพ 5 ข้อ: อัดเสียงลูกค้าตอบ 'ไม่เคย' หรือ 'เคย'",
    'Scenario 8': "ค่าเบี้ยและภาษี: อัดเสียงลูกค้าตอบยืนยันอายุ หรือตอบเรื่องการลดหย่อนภาษีแสนแรก",
    'Scenario 10': "ลงทะเบียน: อัดเสียงลูกค้าแจ้งชื่อ-นามสกุล / ที่อยู่ / เลขบัตร / ผู้รับประโยชน์ / และตอบตกลง"
  }

  const [questionTitle, setQuestionTitle] = useState('')
  const [userId, setUserId] = useState(null)
  const [myQuestions, setMyQuestions] = useState([]) 
  const [generatedPIN, setGeneratedPIN] = useState(null)
  const [showQR, setShowQR] = useState(false)
  const [basePath, setBasePath] = useState('')

  // --- Recording States ---
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])
  const streamRef = useRef(null)

  // ✅ ฟังก์ชันล้างหน่วยความจำเสียง (Hard Reset) ป้องกัน Error และไฟล์ค้าง
  const clearAudioSession = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setAudioBlob(null);
    setPreviewUrl(null);
    audioChunks.current = [];
  }

  const fetchMyQuestions = useCallback(async (uid, dept, level) => {
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('user_id', uid)
      .eq('target_department', dept)
      .eq('target_level', level);
    if (data) setMyQuestions(data);
  }, []);

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
  }, [targetDept, targetLevel, fetchMyQuestions])

  async function fetchTargets(uid, dept, level) {
  const { data, error } = await supabase
    .from('target_settings')
    .select('targets')
    .eq('user_id', uid)
    .eq('department', dept)
    .eq('level', level)
    .maybeSingle(); // 👈 เปลี่ยนจุดนี้

  if (error) {
    console.error("Fetch Targets Error:", error);
    return;
  }

  // ถ้ามีข้อมูลให้ใช้ข้อมูลที่มี ถ้าไม่มีให้กลับไปใช้ค่าเริ่มต้น (allScenarios)
  if (data?.targets) {
    setTargets(prev => ({ ...prev, ...data.targets }));
  } else {
    // รีเซ็ตเป็นค่าเริ่มต้นในกรณีที่เป็นแผนก/ระดับใหม่
    setTargets(allScenarios.reduce((acc, curr) => ({ ...acc, [curr]: 5 }), {}));
  }
}

  // --- Recorder Logic ---
  async function startRecording() {
    try {
      clearAudioSession(); // ล้างค่าก่อนเริ่มอัดใหม่เสมอ
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
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      }
      mediaRecorder.current.start(); setIsRecording(true);
    } catch (err) { alert("ไม่สามารถเข้าถึงไมค์ได้") }
  }

  function stopRecording() {
    if (mediaRecorder.current?.state !== 'inactive') mediaRecorder.current.stop()
    else setIsRecording(false)
  }

  // ✅ ฟังเสียงก่อนลบ หรือฟังเสียงโจทย์ในคลัง
  function playAudio(path) {
    const { data } = supabase.storage.from('recordings').getPublicUrl(path);
    const audio = new Audio(data.publicUrl);
    audio.play().catch(() => alert("เกิดข้อผิดพลาดในการเล่นเสียง"));
  }

  // ✅ ฟังก์ชันลบข้อมูล (Delete File & Record)
  async function deleteQuestion(id, audioPath) {
    if (!confirm("คุณต้องการลบโจทย์นี้ออกจากคลังใช่หรือไม่?")) return;
    setDeletingId(id);
    try {
      // 1. ลบไฟล์จริงใน Storage
      await supabase.storage.from('recordings').remove([audioPath]);
      // 2. ลบแถวใน Database
      await supabase.from('questions').delete().eq('id', id);
      // 3. อัปเดตหน้าจอทันที
      setMyQuestions(prev => prev.filter(q => q.id !== id));
      alert("ลบข้อมูลสำเร็จ");
    } catch (error) {
      alert("ลบไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setDeletingId(null);
    }
  }
  async function editQuestionTitle(id, currentTitle) {
  const newTitle = prompt("แก้ไขข้อความโจทย์:", currentTitle);
  if (!newTitle || newTitle === currentTitle) return;

  try {
    const { error } = await supabase
      .from('questions')
      .update({ question_text: newTitle })
      .eq('id', id);

    if (error) throw error;

    // อัปเดต State ในหน้าจอทันที
    setMyQuestions(prev => prev.map(q => q.id === id ? { ...q, question_text: newTitle } : q));
    alert("แก้ไขข้อความสำเร็จ");
  } catch (error) {
    alert("ไม่สามารถแก้ไขได้: " + error.message);
  }
}
  async function saveQuestion() {
    if (!audioBlob || !questionTitle) return alert("กรุณาระบุชื่อและอัดเสียง")
    setUploading(true)
    const fileName = `questions/${Date.now()}.wav`
    
    const { error: upErr } = await supabase.storage.from('recordings').upload(fileName, audioBlob)
    if (upErr) return alert("Upload Error")

    const newQuestion = {
      question_text: questionTitle, 
      category: category, 
      target_department: targetDept,
      target_level: targetLevel, 
      audio_question_url: fileName, 
      type: 'audio_roleplay', 
      user_id: userId
    };

    const { data, error: dbErr } = await supabase.from('questions').insert([newQuestion]).select()

    if (!dbErr && data) {
      setMyQuestions(prev => [...prev, data[0]]);
      alert("บันทึกโจทย์สำเร็จ!");
      setQuestionTitle(''); 
      clearAudioSession();
    } else {
      alert("DB Error");
    }
    setUploading(false);
  }

  async function generateGamePIN() {
    if (myQuestions.length === 0) return alert("สร้างโจทย์ก่อน")
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
            <h1 style={s.title}>🎙️ Simulator Mission Studio v2.5</h1>
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
          <div><label style={s.label}>📚 Scenario:</label>
            <select value={category} onChange={e=>setCategory(e.target.value)} style={s.select}>
              {allScenarios.map(scen => <option key={scen} value={scen}>{scen}</option>)}
            </select>
          </div>
          <div><label style={s.label}>🎯 เป้าหมาย:</label>
            <input type="number" value={targets[category] || 0} onChange={e=>{
               const newTargets = {...targets, [category]: parseInt(e.target.value) || 0};
               setTargets(newTargets);
               if(userId) supabase.from('target_settings').upsert({user_id:userId, department:targetDept, level:targetLevel, targets:newTargets}, {onConflict:'user_id,department,level'}).then();
            }} style={s.select} />
          </div>
        </div>

        <div style={s.guideBox}>
            <small style={{color:'#666'}}>💡 บทบาทเทรนเนอร์:</small>
            <p style={{margin:'5px 0 0 0', fontWeight:'bold', color:'#6c5ce7'}}>{scenarioGuides[category]}</p>
        </div>

        <input type="text" value={questionTitle} onChange={e=>setQuestionTitle(e.target.value)} placeholder="ชื่อโจทย์โต้ตอบลูกค้า..." style={s.input} />

        <div style={s.recordBox}>
          {!isRecording ? (
            <button onClick={startRecording} style={s.btnRec}>🔴 อัดเสียงลูกค้า</button>
          ) : (
            <button onClick={stopRecording} style={s.btnStop}>⬛ หยุด (Stop)</button> 
          )}
          
          {previewUrl && !isRecording && (
            <div style={{marginTop: '20px', padding:'20px', background:'#f8f9fa', borderRadius:'20px', border:'1px solid #ddd'}}>
              <audio src={previewUrl} controls style={{marginBottom: '10px'}} />
              <button onClick={saveQuestion} disabled={uploading} style={s.btnSave}>
                {uploading ? 'กำลังบันทึก...' : `บันทึกลง Scenario ✅`}
              </button>
            </div>
          )}
        </div>

        {generatedPIN && (
          <div style={s.pinAlert}>PIN: <span style={{fontSize:'2.5rem', color:'#e21b3c'}}>{generatedPIN}</span></div>
        )}

        <div style={s.statusSection}>
          <h3 style={{color:'#000', fontWeight:'900', marginBottom:'20px'}}>📊 สรุปจำนวนโจทย์โต้ตอบลูกค้า</h3>
          <div style={s.flexGrid}>
{allScenarios
  .filter(scenName => {
    const count = myQuestions.filter(q => q.category === scenName).length;
    const target = targets[scenName] || 0;
    return count > 0 || target > 0; // แสดงเฉพาะที่มีโจทย์อยู่ หรือมีการตั้งเป้าหมายไว้
  })
  .map(scenName => {
    const count = myQuestions.filter(q => q.category === scenName).length;
    const target = targets[scenName] || 0;
    return (
      <div key={scenName} style={s.statBox(count, target)}>
        <div style={{fontSize: '0.75rem', opacity: 0.8}}>{scenName}</div>
        <div style={{fontSize: '1.2rem', marginTop: '5px'}}>{count} / {target}</div>
      </div>
    );
})}
          </div>
        </div>

        {/* ✅ คลังโจทย์ด้านล่าง (ฟังก่อนลบ) */}
        <div style={s.librarySection}>
          <h3 style={{color:'#000', fontWeight:'900', marginBottom:'15px'}}>📁 โจทย์ใน Scenario ปัจจุบัน</h3>
          {myQuestions.filter(q => q.category === category).length === 0 ? (
            <p style={{textAlign:'center', color:'#999', padding:'20px'}}>ยังไม่มีโจทย์ในหมวดนี้</p>
          ) : (
            myQuestions.filter(q => q.category === category).map((q) => (
              <div key={q.id} style={s.qItem}>
                <div style={{fontWeight:'bold'}}>{q.question_text}</div>
<div style={{display:'flex', gap:'10px'}}>
  <button onClick={() => playAudio(q.audio_question_url)} style={s.btnPlay}>▶️ ฟัง</button>
  
  {/* เพิ่มปุ่มนี้เข้าไปครับ */}
  <button 
    onClick={() => editQuestionTitle(q.id, q.question_text)} 
    style={{...s.btnPlay, background: '#fff9db', color: '#f59f00'}}
  >
    ✏️ แก้ไขข้อความ
  </button>

  <button 
    onClick={() => deleteQuestion(q.id, q.audio_question_url)} 
    disabled={deletingId === q.id}
    style={s.btnDelete}
  >
    {deletingId === q.id ? '...' : '🗑️ ลบ'}
  </button>
</div>
              </div>
            ))
          )}
        </div>
      </div>

      {showQR && (
        <div style={s.overlay} onClick={() => setShowQR(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={{color: '#000', fontWeight: '900'}}>พนักงานสแกนเพื่อเริ่มฝึก</h2>
            <div style={s.qrBox}>
              {basePath && <QRCodeCanvas value={`${basePath}/play/audio`} size={250} level={"H"} />}
            </div>
            <button onClick={() => setShowQR(false)} style={s.btnClose}>ปิด</button>
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
  btnQR: { background: '#333', color: 'white', border: 'none', padding: '12px 22px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' },
  btnPIN: { background: '#6c5ce7', color: 'white', border: 'none', padding: '12px 22px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr 0.6fr', gap: '15px', marginBottom: '25px' },
  guideBox: { padding: '20px', background: '#f0eeff', borderRadius: '20px', borderLeft: '6px solid #6c5ce7', marginBottom: '25px' },
  label: { fontWeight: '900', color: '#444', fontSize: '0.85rem', marginBottom:'5px', display:'block' },
  select: { width: '100%', padding: '14px', borderRadius: '15px', border: '2px solid #eee', fontWeight: '700', fontSize:'1rem' },
  input: { width: '100%', padding: '18px', borderRadius: '18px', border: '2px solid #eee', marginBottom: '25px', fontSize:'1.1rem', fontWeight:'700', background:'#fdfdfd' },
  recordBox: { textAlign: 'center', border: '3px dashed #ddd', padding: '50px', borderRadius: '30px', background: '#fafafa' },
  btnRec: { padding: '18px 45px', borderRadius: '50px', background: '#e21b3c', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '900' },
  btnStop: { padding: '18px 45px', borderRadius: '50px', background: '#000', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '900' },
  btnSave: { width: '100%', padding: '18px', background: '#20bf6b', color: 'white', border: 'none', borderRadius: '18px', fontWeight: '900', fontSize:'1.1rem' },
  pinAlert: { marginTop: '30px', padding: '25px', background: '#fff9db', borderRadius: '20px', border: '2px solid #fab005', textAlign: 'center', fontWeight: '900' },
  statusSection: { marginTop: '40px', borderTop: '2px solid #eee', paddingTop: '30px' },
  flexGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' },
  statBox: (count, target) => ({
    padding: '20px 10px', borderRadius: '25px', textAlign: 'center', fontWeight: '900',
    background: count >= target && target > 0 ? '#ebfbee' : '#f8f9fa',
    color: count >= target && target > 0 ? '#2f9e44' : '#495057',
    border: count >= target && target > 0 ? '2px solid #2f9e44' : '2px solid #e9ecef',
  }),
  librarySection: { marginTop: '40px', background: '#fff', padding: '25px', borderRadius: '30px', border: '1px solid #eee' },
  qItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: '1px solid #f0f0f0' },
  btnPlay: { background: '#eef2ff', color: '#6c5ce7', border: 'none', padding: '8px 15px', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' },
  btnDelete: { background: '#fff0f0', color: '#e21b3c', border: 'none', padding: '8px 15px', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { background: 'white', padding: '45px', borderRadius: '40px', textAlign: 'center', maxWidth: '450px', width: '90%' },
  qrBox: { background: '#fff', padding: '20px', borderRadius: '20px', display: 'inline-block', border: '1px solid #eee', marginBottom: '25px' },
  btnClose: { width: '100%', padding: '16px', borderRadius: '18px', border: 'none', background: '#000', color: 'white', fontWeight: '900' }
}
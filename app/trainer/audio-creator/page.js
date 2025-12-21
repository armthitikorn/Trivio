'use client'

import { useState, useRef, useEffect } from 'react'

import { supabase } from '@/lib/supabaseClient'



export default function PerfectTrainerAudioCreator() {

  // --- States ตั้งค่าโจทย์ ---

  const [targetDept, setTargetDept] = useState('UOB')

  const [category, setCategory] = useState('Introduction')

  const [targetLevel, setTargetLevel] = useState('Nursery')

  const [targetCount, setTargetCount] = useState(5) // เป้าหมายที่เทรนเนอร์กำหนดเอง

  const [questionTitle, setQuestionTitle] = useState('')

  const [userId, setUserId] = useState(null)

  const [myQuestions, setMyQuestions] = useState([])



  // --- States อัดเสียง ---

  const [isRecording, setIsRecording] = useState(false)

  const [audioBlob, setAudioBlob] = useState(null)

  const [previewUrl, setPreviewUrl] = useState(null)

  const [uploading, setUploading] = useState(false)

 

  const mediaRecorder = useRef(null)

  const audioChunks = useRef([])



  // ดึงข้อมูล User และ รายการโจทย์ที่เป็นเจ้าของ

  useEffect(() => {

    const initData = async () => {

      const { data: { user } } = await supabase.auth.getUser()

      if (user) {

        setUserId(user.id)

        fetchMyQuestions(user.id, targetDept, targetLevel)

      }

    }

    initData()

  }, [targetDept, targetLevel])



  async function fetchMyQuestions(uid, dept, level) {

    const { data } = await supabase

      .from('questions')

      .select('*')

      .eq('user_id', uid) // ✨ กรองเฉพาะงานของตัวเอง

      .eq('target_department', dept)

      .eq('target_level', level)

      .order('created_at', { ascending: true })

    setMyQuestions(data || [])

  }



  // --- ฟังก์ชันสร้าง PIN เพื่อส่งให้พนักงาน ---

  async function generateGamePIN() {

    if (myQuestions.length === 0) return alert("กรุณาสร้างโจทย์อย่างน้อย 1 ข้อก่อนสร้าง PIN ครับ")

   

    const newPIN = Math.floor(100000 + Math.random() * 900000).toString()

   

    // ✨ ใช้ user_id ตามที่คุณต้องการ เพื่อระบุเจ้าของห้องสอบ

    const { error } = await supabase.from('game_sessions').insert([{

      pin: newPIN,

      user_id: userId,

      category: 'AudioArena',

      target_department: targetDept,

      target_level: targetLevel,

      is_active: true

    }])



    if (error) alert("Error: " + error.message)

    else alert(`🎉 สร้างห้องสอบสำเร็จ! PIN คือ: ${newPIN}\nส่งให้พนักงานแผนก ${targetDept} ระดับ ${targetLevel} ได้เลยครับ`)

  }



  // --- ระบบอัดเสียง (ตรรกะเดิมที่คุณชอบ) ---

  async function startRecording() {

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    mediaRecorder.current = new MediaRecorder(stream)

    audioChunks.current = []

    mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data)

    mediaRecorder.current.onstop = () => {

      const blob = new Blob(audioChunks.current, { type: 'audio/wav' })

      setAudioBlob(blob)

      setPreviewUrl(URL.createObjectURL(blob))

    }

    mediaRecorder.current.start()

    setIsRecording(true)

  }



  function stopRecording() {

    mediaRecorder.current.stop()

    setIsRecording(false)

  }



  async function saveQuestion() {

    if (!audioBlob || !questionTitle) return alert("กรุณาระบุชื่อข้อและอัดเสียงก่อน")

    setUploading(true)

   

    const fileName = `questions/${targetDept}/${targetLevel}/${category}/${Date.now()}.wav`

    const { error: upErr } = await supabase.storage.from('recordings').upload(fileName, audioBlob)



    if (upErr) return alert(upErr.message)



    await supabase.from('questions').insert([{

      text: fileName,

      question_text: questionTitle,

      category: category,

      target_department: targetDept,

      target_level: targetLevel,

      media_url: fileName,

      audio_question_url: fileName,

      type: 'audio_roleplay',

      user_id: userId // ✨ ระบุเจ้าของโจทย์

    }])



    alert("บันทึกโจทย์เข้าคลังสำเร็จ! ✅")

    setAudioBlob(null); setPreviewUrl(null); setQuestionTitle('')

    fetchMyQuestions(userId, targetDept, targetLevel)

    setUploading(false)

  }



  const countInCat = (catId) => myQuestions.filter(q => q.category === catId).length



  return (

    <div style={s.page}>

      <div style={s.card}>

        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'25px'}}>

            <h1 style={s.title}>🎙️ Audio Mission Studio</h1>

            <button onClick={generateGamePIN} style={s.btnPIN}>🔑 สร้าง PIN ส่งพนักงาน</button>

        </div>



        <div style={s.grid}>

          <div><label style={s.label}>🏢 แผนก:</label><select value={targetDept} onChange={e=>setTargetDept(e.target.value)} style={s.select}>{['UOB','AYCAP','ttb','Krungsri','Agent','Broker'].map(d=><option key={d}>{d}</option>)}</select></div>

          <div><label style={s.label}>⭐ ระดับ:</label><select value={targetLevel} onChange={e=>setTargetLevel(e.target.value)} style={s.select}>{['Nursery','Rising Star','Legend'].map(l=><option key={l}>{l}</option>)}</select></div>

          <div><label style={s.label}>📚 Section:</label><select value={category} onChange={e=>setCategory(e.target.value)} style={s.select}><option value="Introduction">1. Intro</option><option value="Objection">2. Objection</option><option value="Closing">3. Closing</option></select></div>

          <div><label style={s.label}>🎯 เป้าหมาย:</label><input type="number" value={targetCount} onChange={e=>setTargetCount(e.target.value)} style={s.select} /></div>

        </div>



        <input type="text" value={questionTitle} onChange={e=>setQuestionTitle(e.target.value)} placeholder="ระบุสคริปต์โจทย์ลูกค้า..." style={s.input} />



        <div style={s.recordBox}>

          {!isRecording ? (

            <button onClick={startRecording} style={s.btnRec}>🔴 อัดเสียงโจทย์</button>

          ) : (

            <button onClick={stopRecording} style={s.btnStop}>⬛ หยุดอัด</button>

          )}



          {previewUrl && (

            <div style={{marginTop:'20px'}}>

              <audio src={previewUrl} controls style={{width:'100%'}}/>

              <button onClick={saveQuestion} disabled={uploading} style={s.btnSave}>

                {uploading ? 'กำลังบันทึก...' : 'บันทึกลงคลังของฉัน ✅'}

              </button>

            </div>

          )}

        </div>



        <div style={s.statusSection}>

          <h3 style={{marginBottom:'15px'}}>📊 สถานะคลังโจทย์ของคุณ ({myQuestions.length} ข้อ)</h3>

          <div style={s.flexGap}>

             {['Introduction','Objection','Closing'].map(c => (

               <div key={c} style={s.statBox(countInCat(c), targetCount)}>

                 {c}: {countInCat(c)}/{targetCount}

               </div>

             ))}

          </div>

        </div>

      </div>

    </div>

  )

}



const s = {

  page: { background: '#f8f9fa', minHeight: '100vh', padding: '40px 20px', fontFamily: 'sans-serif' },

  card: { maxWidth: '900px', margin: '0 auto', background: 'white', padding: '40px', borderRadius: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' },

  title: { color: '#6f42c1', margin: 0 },

  btnPIN: { background: 'linear-gradient(45deg, #f093fb 0%, #f5576c 100%)', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer' },

  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 0.6fr', gap: '15px', marginBottom: '20px' },

  label: { fontWeight: 'bold', fontSize: '0.8rem', color: '#666' },

  select: { width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #ddd', marginTop: '5px' },

  input: { width: '100%', padding: '15px', borderRadius: '10px', border: '1px solid #ddd', marginBottom: '20px', boxSizing: 'border-box', fontSize:'1rem' },

  recordBox: { textAlign: 'center', border: '2px dashed #eee', padding: '30px', borderRadius: '20px', background: '#fafafa' },

  btnRec: { padding: '15px 30px', borderRadius: '30px', background: '#e21b3c', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' },

  btnStop: { padding: '15px 30px', borderRadius: '30px', background: '#333', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' },

  btnSave: { width: '100%', marginTop: '15px', padding: '12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },

  statusSection: { marginTop: '30px' },

  flexGap: { display: 'flex', gap: '10px' },

  statBox: (count, target) => ({

    flex: 1, padding: '15px', borderRadius: '12px', textAlign: 'center', fontWeight: 'bold',

    background: count >= target ? '#d4edda' : '#fff',

    color: count >= target ? '#155724' : '#888',

    border: count >= target ? '1px solid #c3e6cb' : '1px solid #ddd'

  })

}
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation' // เครื่องมือดึง ID จาก URL

export default function QuizEditor() {
  const { id } = useParams() // ดึง ID ของ Quiz จาก URL (เช่น .../quiz/123)
  const router = useRouter()
  
  const [quizTitle, setQuizTitle] = useState('')
  const [questions, setQuestions] = useState([])
  const [form, setForm] = useState({
    question: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correct: 'A'
  })

  // โหลดข้อมูลเมื่อเข้าหน้านี้
  useEffect(() => {
    if (id) {
      fetchQuizDetails()
      fetchQuestions()
    }
  }, [id])

async function fetchQuizDetails() {
  // 1. ดึง User ที่กำลังใช้งานอยู่
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return router.push('/login');

  // 2. ดึงข้อมูล Quiz โดยต้องเช็ค id และ user_id ให้ตรงกัน
  const { data, error } = await supabase
    .from('quizzes')
    .select('title, user_id')
    .eq('id', id)
    .eq('user_id', user.id) // ✨ เช็คว่า Quiz นี้เป็นของเราไหม
    .single();

  if (error || !data) {
    alert("ขออภัย คุณไม่มีสิทธิ์แก้ไขข้อสอบชุดนี้");
    return router.push('/host'); // ถ้าไม่ใช่เจ้าของ ให้เด้งกลับหน้าหลัก
  }

  setQuizTitle(data.title);
}

  async function fetchQuestions() {
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', id)
      .order('created_at', { ascending: true }) // เรียงตามลำดับที่สร้าง
    if (data) setQuestions(data)
  }

  // ฟังก์ชันบันทึกคำถาม
  async function addQuestion() {
    if (!form.question || !form.optionA || !form.optionB) return alert('กรุณากรอกข้อมูลให้ครบ (อย่างน้อย 2 ตัวเลือก)')

    // เตรียมข้อมูลตัวเลือกในรูปแบบ JSON (ตามที่เราออกแบบ Database ไว้)
    const optionsArray = [
      { label: 'A', text: form.formOptionA || form.optionA },
      { label: 'B', text: form.formOptionB || form.optionB },
      { label: 'C', text: form.formOptionC || form.optionC },
      { label: 'D', text: form.formOptionD || form.optionD },
    ]

    const { error } = await supabase.from('questions').insert([
      {
        quiz_id: id,
        question_text: form.question,
        options: optionsArray,
        correct_option: form.correct
      }
    ])

    if (!error) {
      alert('บันทึกคำถามแล้ว!')
      setForm({ ...form, question: '', optionA: '', optionB: '', optionC: '', optionD: '' }) // ล้างฟอร์ม
      fetchQuestions() // ดึงรายการใหม่มาโชว์
    } else {
      console.error(error)
      alert('เกิดข้อผิดพลาด')
    }
  }

  // ฟังก์ชันลบคำถาม
  async function deleteQuestion(questionId) {
    if(!confirm('ลบข้อนี้ไหม?')) return;
    await supabase.from('questions').delete().eq('id', questionId)
    fetchQuestions()
  }

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <button onClick={() => router.push('/host')} style={{ marginBottom: '20px', cursor: 'pointer' }}>⬅️ กลับไปหน้าหลัก</button>
      
      <h1>📝 แก้ไขข้อสอบ: {quizTitle}</h1>

      {/* --- ส่วนฟอร์มเพิ่มคำถาม --- */}
      <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '10px', border: '1px solid #ddd', marginBottom: '30px' }}>
        <h3>เพิ่มคำถามใหม่</h3>
        
        <div style={{ marginBottom: '10px' }}>
          <label>โจทย์คำถาม:</label>
          <input 
            type="text" 
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            value={form.question}
            onChange={e => setForm({...form, question: e.target.value})}
            placeholder="เช่น ท้องฟ้าสีอะไร?"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <input type="text" placeholder="ตัวเลือก A" value={form.optionA} onChange={e => setForm({...form, optionA: e.target.value})} style={{ padding: '8px' }} />
          <input type="text" placeholder="ตัวเลือก B" value={form.optionB} onChange={e => setForm({...form, optionB: e.target.value})} style={{ padding: '8px' }} />
          <input type="text" placeholder="ตัวเลือก C" value={form.optionC} onChange={e => setForm({...form, optionC: e.target.value})} style={{ padding: '8px' }} />
          <input type="text" placeholder="ตัวเลือก D" value={form.optionD} onChange={e => setForm({...form, optionD: e.target.value})} style={{ padding: '8px' }} />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>เฉลยข้อที่ถูก: </label>
          <select value={form.correct} onChange={e => setForm({...form, correct: e.target.value})} style={{ padding: '5px' }}>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </div>

        <button onClick={addQuestion} style={{ background: '#28a745', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}>
          บันทึกคำถาม
        </button>
      </div>

      {/* --- ส่วนแสดงรายการคำถาม --- */}
      <h3>รายการคำถาม ({questions.length} ข้อ)</h3>
      {questions.map((q, index) => (
        <div key={q.id} style={{ borderBottom: '1px solid #eee', padding: '15px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>{index + 1}. {q.question_text}</h4>
            <button onClick={() => deleteQuestion(q.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>ลบ</button>
          </div>
          <div style={{ fontSize: '14px', color: '#555' }}>
            {/* ดึงตัวเลือกออกมาโชว์ */}
            {q.options.map((opt) => (
              <span key={opt.label} style={{ marginRight: '15px', fontWeight: opt.label === q.correct_option ? 'bold' : 'normal', color: opt.label === q.correct_option ? 'green' : 'black' }}>
                {opt.label}. {opt.text}
              </span>
            ))}
          </div>
        </div>
      ))}

    </div>
  )
}
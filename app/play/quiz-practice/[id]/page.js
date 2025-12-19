'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function SoloQuizGame() {
  const { id } = useParams() 
  const router = useRouter()

  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)  
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [nickname, setNickname] = useState('')
  const [gameStarted, setGameStarted] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if(id) fetchQuestions()
  }, [id])

  async function fetchQuestions() {
    // 1. ดึง quiz_id จาก session
    const { data: session } = await supabase
      .from('game_sessions')
      .select('quiz_id')
      .eq('id', id)
      .single()

    if (session) {
      // 2. ดึงคำถามที่เทรนเนอร์สร้างไว้ (ดึงมาทั้ง Object รวมถึงฟิลด์ options ที่เป็น JSON)
      const { data: qs } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', session.quiz_id)
        .order('created_at', { ascending: true })
      
      if(qs) setQuestions(qs)
    }
  }

// แก้ไขฟังก์ชันเริ่มเกม
async function startGame() {
  setLoading(true)
  
  // ดึงข้อมูลที่พนักงานกรอกไว้จากหน้า Login
  const savedInfo = JSON.parse(localStorage.getItem('temp_player_info') || '{}');
  
  // บันทึกข้อมูลเริ่มต้นลงตาราง players
  const { error } = await supabase.from('players').insert([{ 
    session_id: id, 
    nickname: savedInfo.nickname || 'Unknown', 
    employee_id: savedInfo.employeeId,
    department: savedInfo.department,
    level: savedInfo.level,
    score: 0 
  }])
  
  if (error) {
    console.error("Error saving player:", error)
    alert("เกิดข้อผิดพลาดในการลงทะเบียน")
  } else {
    setNickname(savedInfo.nickname)
    setGameStarted(true)
  }
  setLoading(false)
}

// แก้ไขฟังก์ชันบันทึกคะแนนตอนจบเกม
async function saveFinalScore(finalScore) {
  const savedInfo = JSON.parse(localStorage.getItem('temp_player_info') || '{}');
  
  await supabase
    .from('players')
    .update({ score: finalScore })
    .eq('session_id', id)
    .eq('nickname', savedInfo.nickname)
    .eq('employee_id', savedInfo.employeeId) // ระบุให้ชัดป้องกันชื่อซ้ำ

  setIsFinished(true)
}

  if (!gameStarted) {
    return (
      <div style={s.container}>
        <div style={s.card}>
            <h1>📝 แบบทดสอบพนักงาน</h1>
            <input style={s.input} placeholder="ระบุชื่อเล่นของคุณ" value={nickname} onChange={e => setNickname(e.target.value)} />
            <button onClick={startGame} disabled={loading} style={s.btnPrimary}>{loading ? 'กำลังเข้าสู่ระบบ...' : 'เริ่มทำข้อสอบ'}</button>
        </div>
      </div>
    )
  }

  if (isFinished) {
    return (
      <div style={s.container}>
        <div style={s.card}>
          <h1 style={{fontSize:'3rem'}}>🎉</h1>
          <h2>เก่งมาก! ทำเสร็จแล้ว</h2>
          <div style={s.scoreBox}>
            <p>คะแนนที่ได้</p>
            <h1 style={{fontSize:'4rem', color:'#6f42c1'}}>{score} / {questions.length}</h1>
          </div>
          <button onClick={() => router.push('/play')} style={s.btnBack}>กลับหน้าแรก</button>
        </div>
      </div>
    )
  }

  if (questions.length === 0) return <div style={s.container}>กำลังโหลดข้อสอบ...</div>
  
  const currentQ = questions[currentIndex]
  
  // ✨ จุดที่ปรับปรุง: ดึงตัวเลือกจาก JSON Array (options) ที่เทรนเนอร์สร้างไว้
  const choices = currentQ.options || [] 
  
  // ฟังก์ชันช่วยกำหนดสีปุ่มตาม Label
  const getBtnColor = (label) => {
    const colors = { A: '#ff7675', B: '#74b9ff', C: '#ffeaa7', D: '#55efc4' }
    return colors[label] || '#eee'
  }

  return (
    <div style={s.container}>
      <div style={s.questionCard}>
        <div style={s.progressBarBg}>
          <div style={{ ...s.progressBarFill, width: `${((currentIndex + 1) / questions.length) * 100}%` }}></div>
        </div>
        <h2 style={{ color: '#333', marginBottom: '30px' }}>{currentQ.question_text}</h2>
        
        <div style={s.gridChoices}>
          {choices.map((c) => (
            <button 
              key={c.label} 
              disabled={answered} 
              onClick={() => handleAnswer(c.label)} 
              style={{...s.choiceBtn(getBtnColor(c.label)), opacity: answered ? 0.5 : 1}}
            >
              <b style={{marginRight: '8px'}}>{c.label}.</b> {c.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

const s = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', fontFamily: 'sans-serif' },
  card: { background: 'white', padding: '40px', borderRadius: '25px', textAlign: 'center', width: '100%', maxWidth: '400px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' },
  questionCard: { background: 'white', padding: '30px', borderRadius: '25px', width: '100%', maxWidth: '600px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' },
  input: { width: '100%', padding: '15px', borderRadius: '10px', border: '1px solid #ddd', marginBottom: '20px', boxSizing: 'border-box' },
  btnPrimary: { width: '100%', padding: '15px', background: '#2d3436', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' },
  btnBack: { width: '100%', padding: '15px', background: '#f1f2f6', border: 'none', borderRadius: '10px', cursor: 'pointer' },
  scoreBox: { background: '#f8f9fa', padding: '20px', borderRadius: '15px', margin: '20px 0' },
  progressBarBg: { width: '100%', height: '10px', background: '#eee', borderRadius: '5px', marginBottom: '20px', overflow: 'hidden' },
  progressBarFill: { height: '100%', background: '#6f42c1', transition: 'width 0.3s ease' },
  gridChoices: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' },
  choiceBtn: (color) => ({ 
    padding: '20px', 
    border: 'none', 
    borderRadius: '15px', 
    background: color, 
    color: '#333', 
    fontWeight: 'bold', 
    cursor: 'pointer',
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  })
}
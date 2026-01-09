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

  // --- 1. แก้ไข useEffect เพื่อดักจับค่า ID ที่ยังไม่พร้อม ---
  useEffect(() => {
    if (id && id !== '[id]') {
      fetchQuestions()
    }
  }, [id])

  async function fetchQuestions() {
    try {
      const { data: session } = await supabase
        .from('game_sessions')
        .select('quiz_id')
        .eq('id', id)
        .single()

      if (session) {
        const { data: qs } = await supabase
          .from('questions')
          .select('*')
          .eq('quiz_id', session.quiz_id)
          .order('created_at', { ascending: true })
        
        if (qs) setQuestions(qs)
      }
    } catch (err) {
      console.error("Fetch Error:", err.message)
    }
  }

  async function startGame() {
    if (!nickname) return alert("กรุณาระบุชื่อเล่นก่อนเริ่มนะครับ");
    setLoading(true)
    const savedInfo = JSON.parse(localStorage.getItem('temp_player_info') || '{}');
    
    const { error } = await supabase.from('players').insert([{ 
      session_id: id, 
      nickname: nickname || savedInfo.nickname || 'Unknown', 
      employee_id: savedInfo.employeeId,
      department: savedInfo.department,
      level: savedInfo.level,
      score: 0 
    }])
    
    if (error) {
      console.error("Error saving player:", error)
      alert("เกิดข้อผิดพลาดในการลงทะเบียน")
    } else {
      setGameStarted(true)
    }
    setLoading(false)
  }

  // --- 2. แก้ไขตรรกะการตรวจคำตอบ (correct_option) ---
  async function handleAnswer(selectedLabel) {
    if (answered) return;
    setAnswered(true);

    const currentQ = questions[currentIndex];
    let newScore = score;

    // ✨ เปลี่ยนจาก correct_answer เป็น correct_option ให้ตรงกับหลังบ้าน
    if (selectedLabel === currentQ.correct_option) {
      newScore = score + 1;
      setScore(newScore);
    }

    setTimeout(async () => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(currentIndex + 1);
        setAnswered(false);
      } else {
        await saveFinalScore(newScore);
      }
    }, 500);
  }

  async function saveFinalScore(finalScore) {
    const savedInfo = JSON.parse(localStorage.getItem('temp_player_info') || '{}');
    await supabase
      .from('players')
      .update({ score: finalScore })
      .eq('session_id', id)
      .eq('nickname', nickname) // ใช้ nickname จาก state ล่าสุด

    setIsFinished(true)
  }

  // --- ส่วนการแสดงผล (UI เดิมที่คุณชอบ) ---
  if (!gameStarted) {
    return (
      <div style={s.container}>
        <div style={s.card}>
            <h1 style={{color: '#1a1a1a', marginBottom: '20px'}}>📝 แบบทดสอบพนักงาน</h1>
            <input style={s.input} placeholder="ระบุชื่อเล่นของคุณ" value={nickname} onChange={e => setNickname(e.target.value)} />
            <button onClick={startGame} disabled={loading} style={s.btnPrimary}>
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'เริ่มทำข้อสอบ'}
            </button>
        </div>
      </div>
    )
  }

  if (isFinished) {
    return (
      <div style={s.container}>
        <div style={s.card}>
          <h1 style={{fontSize:'3rem'}}>🎉</h1>
          <h2 style={{color: '#1a1a1a'}}>เก่งมาก! ทำเสร็จแล้ว</h2>
          <div style={s.scoreBox}>
            <p style={{fontWeight: 'bold', color: '#666'}}>คะแนนที่คุณทำได้</p>
            <h1 style={{fontSize:'4rem', color:'#6f42c1', margin: '10px 0'}}>{score} / {questions.length}</h1>
          </div>
          <button onClick={() => router.push('/play')} style={s.btnBack}>กลับหน้าแรก</button>
        </div>
      </div>
    )
  }

  if (questions.length === 0) return <div style={s.container}>กำลังโหลดข้อสอบ...</div>
  
  const currentQ = questions[currentIndex]
  const choices = currentQ.options || [] 
  
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

        <h2 style={s.questionText}>{currentQ.question_text}</h2>
        
        <div style={s.gridChoices}>
          {choices.map((c) => (
            <button 
              key={c.label} 
              disabled={answered} 
              onClick={() => handleAnswer(c.label)} 
              style={{...s.choiceBtn(getBtnColor(c.label)), opacity: answered ? 0.6 : 1}}
            >
              <span style={s.label}>{c.label}</span>
              <span style={{flex: 1}}>{c.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// --- Styles เดิม (คงความคมชัดที่คุณชอบ) ---
const s = {
  container: { minHeight: '100vh', background: '#f0f2f5', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', fontFamily: "'Inter', sans-serif" },
  card: { background: 'white', padding: '40px', borderRadius: '25px', textAlign: 'center', width: '100%', maxWidth: '400px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' },
  questionCard: { background: 'white', padding: '40px 30px', borderRadius: '30px', width: '100%', maxWidth: '600px', textAlign: 'center', boxShadow: '0 15px 35px rgba(0,0,0,0.1)', border: '1px solid #eee' },
  questionText: { color: '#1a1a1a', fontSize: '1.8rem', fontWeight: '800', marginBottom: '35px', lineHeight: '1.4' },
  input: { width: '100%', padding: '15px', borderRadius: '10px', border: '1px solid #ddd', marginBottom: '20px', boxSizing: 'border-box', fontSize: '1rem' },
  btnPrimary: { width: '100%', padding: '15px', background: '#2d3436', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' },
  btnBack: { width: '100%', padding: '15px', background: '#f1f2f6', border: 'none', borderRadius: '10px', cursor: 'pointer', color: '#1a1a1a', fontWeight: 'bold' },
  scoreBox: { background: '#f8f9fa', padding: '20px', borderRadius: '15px', margin: '20px 0', border: '1px solid #eee' },
  progressBarBg: { width: '100%', height: '12px', background: '#e0e0e0', borderRadius: '10px', marginBottom: '30px', overflow: 'hidden' },
  progressBarFill: { height: '100%', background: '#6f42c1', transition: 'width 0.3s ease' },
  gridChoices: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' },
  choiceBtn: (color) => ({ 
    padding: '22px', border: '2px solid rgba(0,0,0,0.05)', borderRadius: '20px', background: color, color: '#000', fontWeight: '800', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', textAlign: 'left', boxShadow: '0 4px 0 rgba(0,0,0,0.1)', transition: 'transform 0.1s' 
  }),
  label: { background: 'rgba(0,0,0,0.15)', padding: '5px 12px', borderRadius: '10px', marginRight: '15px', fontSize: '1.3rem', color: '#000', fontWeight: '800' }
}
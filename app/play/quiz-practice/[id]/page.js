'use client'
import { useEffect, useState, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

function SoloQuizContent() {
  const { id } = useParams() // รับ ID ของ Game Session
  const router = useRouter()

  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)  
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [nickname, setNickname] = useState('')
  const [gameStarted, setGameStarted] = useState(false)

  useEffect(() => {
    // 1. ดึงชื่อจาก LocalStorage ที่บันทึกมาจากหน้า Join Portal
    const savedInfo = JSON.parse(localStorage.getItem('temp_player_info') || '{}');
    if (savedInfo.nickname) setNickname(savedInfo.nickname);

    // 2. ดึงโจทย์ข้อสอบ
    if (id && id !== '[id]') fetchQuestions();
  }, [id])

  async function fetchQuestions() {
    try {
      // ค้นหา quiz_id จาก session ก่อน
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
      console.error("Error fetching questions:", err)
    }
  }

  // ✨ ฟังก์ชันตรวจคำตอบ (แก้ไขให้คะแนนขึ้น 15/15)
  async function handleAnswer(selectedLabel) {
    if (answered) return;
    setAnswered(true);

    const currentQ = questions[currentIndex];
    let newScore = score;

    // ✅ ตรวจสอบค่า correct_option (ต้องตรงกับชื่อคอลัมน์ใน Supabase)
    if (selectedLabel === currentQ.correct_option) {
      newScore = score + 1;
      setScore(newScore);
    }

    setTimeout(async () => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(currentIndex + 1);
        setAnswered(false);
      } else {
        // บันทึกคะแนนลงตาราง players ก่อนจบ
        await saveScoreToDatabase(newScore);
        setIsFinished(true);
      }
    }, 600);
  }

  async function saveScoreToDatabase(finalScore) {
    const savedInfo = JSON.parse(localStorage.getItem('temp_player_info') || '{}');
    await supabase
      .from('players')
      .update({ score: finalScore })
      .eq('session_id', id)
      .eq('employee_id', savedInfo.employeeId)
  }

  // --- จอเข้าเกม (ถ้ายังไม่ได้เริ่ม) ---
  if (!gameStarted) {
    return (
      <div style={s.container}>
        <div style={s.card}>
            <div style={{fontSize: '3rem'}}>🏁</div>
            <h1 style={s.title}>พร้อมลุยหรือยัง?</h1>
            <p style={{color: '#666', marginBottom: '25px'}}>คุณลงทะเบียนในชื่อ: <b>{nickname}</b></p>
            <button onClick={() => setGameStarted(true)} style={s.btnPrimary}>เริ่มทำข้อสอบ</button>
        </div>
      </div>
    )
  }

  // --- จอจบเกม (สรุปคะแนน) ---
  if (isFinished) {
    return (
      <div style={s.container}>
        <div style={s.card}>
          <h1 style={{fontSize:'4rem'}}>🎉</h1>
          <h2 style={{fontWeight: '900'}}>ยอดเยี่ยมมาก!</h2>
          <div style={s.scoreBox}>
            <p style={{fontWeight: 'bold', color: '#666'}}>คะแนนรวมของคุณ</p>
            <h1 style={{fontSize:'5rem', color:'#6f42c1', margin: '10px 0'}}>{score} / {questions.length}</h1>
          </div>
          <button onClick={() => router.push('/play')} style={s.btnBack}>กลับหน้าหลัก</button>
        </div>
      </div>
    )
  }

  if (questions.length === 0) return <div style={s.container}>กำลังเตรียมข้อสอบ...</div>
  
  const currentQ = questions[currentIndex]
  const choices = currentQ.options || [] 

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

function getBtnColor(label) {
  const colors = { A: '#ff7675', B: '#74b9ff', C: '#ffeaa7', D: '#55efc4' }
  return colors[label] || '#eee'
}

export default function SoloQuizGame() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SoloQuizContent />
    </Suspense>
  )
}

const s = {
  container: { minHeight: '100vh', background: '#f0f2f5', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', fontFamily: "'Inter', sans-serif" },
  card: { background: 'white', padding: '40px', borderRadius: '35px', textAlign: 'center', width: '100%', maxWidth: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', border: '2px solid #ddd' },
  title: { color: '#000', fontWeight: '900', marginBottom: '10px' },
  questionCard: { background: 'white', padding: '40px 30px', borderRadius: '35px', width: '100%', maxWidth: '650px', textAlign: 'center', boxShadow: '0 15px 35px rgba(0,0,0,0.1)', border: '2px solid #eee' },
  questionText: { color: '#1a1a1a', fontSize: '1.8rem', fontWeight: '900', marginBottom: '35px', lineHeight: '1.4' },
  btnPrimary: { width: '100%', padding: '20px', background: '#000', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: '900', fontSize: '1.2rem' },
  btnBack: { width: '100%', padding: '15px', background: '#eee', border: 'none', borderRadius: '15px', cursor: 'pointer', fontWeight: 'bold' },
  scoreBox: { background: '#f8f9fa', padding: '25px', borderRadius: '20px', margin: '20px 0', border: '1px solid #ddd' },
  progressBarBg: { width: '100%', height: '12px', background: '#eee', borderRadius: '10px', marginBottom: '30px', overflow: 'hidden' },
  progressBarFill: { height: '100%', background: '#6f42c1', transition: 'width 0.4s ease' },
  gridChoices: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  choiceBtn: (color) => ({ padding: '22px', border: 'none', borderRadius: '20px', background: color, color: '#000', fontWeight: '900', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', textAlign: 'left', boxShadow: '0 4px 0 rgba(0,0,0,0.1)' }),
  label: { background: 'rgba(0,0,0,0.1)', padding: '5px 12px', borderRadius: '10px', marginRight: '15px', fontSize: '1.3rem', fontWeight: '900' }
}
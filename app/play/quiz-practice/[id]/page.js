'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

function SoloQuizContent() {
  const { id } = useParams() 
  const router = useRouter()

  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)  
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [nickname, setNickname] = useState('')
  const [gameStarted, setGameStarted] = useState(false)

  // 1. ดักจับค่า ID และดึงข้อมูล (ป้องกัน Error 400: invalid input syntax for type uuid)
  useEffect(() => {
    if (id && id !== '[id]') {
      fetchQuestions(id)
    }
  }, [id])

  async function fetchQuestions(targetId) {
    try {
      // ดึงคำถามโดยตรงจาก quiz_id ที่ส่งมาทาง URL
      const { data: qs, error } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', targetId)
        .order('created_at', { ascending: true })
      
      if (qs && qs.length > 0) {
        setQuestions(qs)
      }
    } catch (err) {
      console.error("Fetch Error:", err)
    }
  }

  // 2. ตรวจคำตอบ (แก้ไข Logic คะแนนให้ถูกต้อง)
  const handleAnswer = (selectedLabel) => {
    if (answered) return;
    setAnswered(true);

    const currentQ = questions[currentIndex];
    
    // ตรวจสอบค่าเฉลยจาก correct_option ในฐานข้อมูล
    if (selectedLabel === currentQ.correct_option) {
      setScore(prev => prev + 1);
    }

    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(prev => prev + 1);
        setAnswered(false);
      } else {
        setIsFinished(true);
      }
    }, 600);
  };

  // --- UI หน้าแรก ---
  if (!gameStarted) {
    return (
      <div style={s.container}>
        <div style={s.card}>
            <h1 style={s.mainTitle}>🎯 QUIZ ARENA</h1>
            <p style={{color: '#64748b', marginBottom: '25px'}}>ระบุชื่อของคุณเพื่อเริ่มทำแบบทดสอบเข็มทิศ</p>
            <input 
              style={s.input} 
              placeholder="กรอกชื่อเล่นของคุณ..." 
              value={nickname} 
              onChange={e => setNickname(e.target.value)} 
            />
            <button 
              onClick={() => nickname ? setGameStarted(true) : alert('กรุณาระบุชื่อก่อนเริ่มนะครับ')} 
              disabled={questions.length === 0} 
              style={s.btnPrimary}
            >
                {questions.length === 0 ? 'กำลังโหลดข้อสอบ...' : 'เริ่มทำข้อสอบ'}
            </button>
        </div>
      </div>
    )
  }

  // --- UI หน้าสรุปคะแนน ---
  if (isFinished) {
    return (
      <div style={s.container}>
        <div style={s.card}>
          <h1 style={{fontSize:'4rem'}}>🎊</h1>
          <h2 style={{color: '#1e293b', fontWeight: '900'}}>บันทึกคะแนนสำเร็จ!</h2>
          <div style={s.scoreBox}>
            <p style={{fontWeight: 'bold', color: '#64748b'}}>คะแนนที่คุณทำได้</p>
            <h1 style={{fontSize:'4.5rem', color:'#4f46e5', margin: '10px 0'}}>{score} / {questions.length}</h1>
          </div>
          <button onClick={() => window.location.reload()} style={s.btnBack}>ทำใหม่อีกครั้ง</button>
        </div>
      </div>
    )
  }

  if (questions.length === 0) return null;
  const currentQ = questions[currentIndex];

  return (
    <div style={s.container}>
      <div style={s.questionCard}>
        <div style={s.progressBarBg}>
          <div style={{ ...s.progressBarFill, width: `${((currentIndex + 1) / questions.length) * 100}%` }}></div>
        </div>
        <h2 style={s.questionText}>{currentQ.question_text}</h2>
        <div style={s.gridChoices}>
          {currentQ.options?.map((c) => (
            <button 
              key={c.label} 
              disabled={answered} 
              onClick={() => handleAnswer(c.label)} 
              style={s.choiceBtn(getBtnColor(c.label), answered)}
            >
              <span style={s.labelBadge}>{c.label}</span>
              <span style={{flex: 1}}>{c.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function getBtnColor(label) {
  const colors = { A: '#ff7675', B: '#74b9ff', C: '#ffeaa7', D: '#55efc4' };
  return colors[label] || '#eee';
}

export default function SoloQuizGame() {
  return (
    <Suspense fallback={<div style={{padding:'100px', textAlign:'center'}}>กำลังเตรียมข้อมูล...</div>}>
      <SoloQuizContent />
    </Suspense>
  )
}

// --- Styles (เน้นความคมชัดและความเป็นมืออาชีพ) ---
const s = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', fontFamily: 'system-ui' },
  card: { background: 'white', padding: '40px 30px', borderRadius: '32px', textAlign: 'center', width: '100%', maxWidth: '420px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
  mainTitle: { fontSize: '2rem', fontWeight: '900', color: '#0f172a', marginBottom: '10px' },
  input: { width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #f1f5f9', marginBottom: '20px', boxSizing: 'border-box', fontSize: '1.1rem', outline: 'none' },
  btnPrimary: { width: '100%', padding: '18px', background: '#1e293b', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '800', fontSize: '1.1rem', cursor: 'pointer' },
  questionCard: { background: 'white', padding: '40px', borderRadius: '40px', width: '100%', maxWidth: '600px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)' },
  questionText: { color: '#0f172a', fontSize: '1.8rem', fontWeight: '800', marginBottom: '35px', lineHeight: '1.3' },
  progressBarBg: { width: '100%', height: '10px', background: '#f1f5f9', borderRadius: '10px', marginBottom: '35px', overflow: 'hidden' },
  progressBarFill: { height: '100%', background: '#4f46e5', transition: 'width 0.4s ease' },
  gridChoices: { display: 'grid', gridTemplateColumns: '1fr', gap: '15px' },
  choiceBtn: (color, answered) => ({ 
    padding: '22px', border: 'none', borderRadius: '20px', background: color, color: '#1e293b', fontWeight: '800', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', textAlign: 'left', opacity: answered ? 0.6 : 1, boxShadow: '0 4px 0 rgba(0,0,0,0.05)'
  }),
  labelBadge: { background: 'rgba(255,255,255,0.5)', padding: '6px 14px', borderRadius: '10px', marginRight: '15px', fontSize: '1.3rem' },
  scoreBox: { background: '#f8fafc', padding: '30px', borderRadius: '24px', margin: '25px 0', border: '1px solid #e2e8f0' },
  btnBack: { width: '100%', padding: '15px', background: '#f1f5f9', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', color: '#475569' }
}
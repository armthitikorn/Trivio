'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

function SoloQuizContent() {
  const { id } = useParams() 
  const searchParams = useSearchParams()
  const quizIdFromQuery = searchParams.get('quizId') 
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
    const effectiveId = id !== '[id]' ? id : quizIdFromQuery;
    if (effectiveId) {
      fetchQuestions(effectiveId)
    }
  }, [id, quizIdFromQuery])

  async function fetchQuestions(targetId) {
    try {
      let finalQuizId = targetId;
      const { data: session } = await supabase
        .from('game_sessions')
        .select('quiz_id')
        .eq('id', targetId)
        .single()
      
      if (session) finalQuizId = session.quiz_id;

      const { data: qs, error } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', finalQuizId)
        .order('created_at', { ascending: true })
      
      if (qs && qs.length > 0) {
        setQuestions(qs)
      }
    } catch (err) {
      console.log("Loading...");
    }
  }

  const handleAnswer = (selectedLabel) => {
    if (answered) return;
    setAnswered(true);

    const currentQ = questions[currentIndex];
    let newScore = score;
    const correctAnswer = currentQ.correct_option || currentQ.correct_answer;
    
    if (selectedLabel === correctAnswer) {
      newScore = score + 1;
      setScore(newScore);
    }

    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(currentIndex + 1);
        setAnswered(false);
      } else {
        setIsFinished(true);
      }
    }, 600);
  };

  if (!gameStarted) {
    return (
      <div style={s.container}>
        <div style={s.card}>
          <div style={{fontSize: '4rem', marginBottom: '10px'}}>🎯</div>
          <h1 style={s.mainTitle}>TRIVIO <span style={{color:'#6f42c1'}}>QUIZ</span></h1>
          <p style={{color:'#666', marginBottom:'25px'}}>เตรียมตัวให้พร้อมสำหรับบททดสอบ</p>
          <input style={s.input} placeholder="ระบุชื่อเล่นของคุณ" value={nickname} onChange={e => setNickname(e.target.value)} />
          <button onClick={() => nickname ? setGameStarted(true) : alert('กรุณาระบุชื่อก่อนเริ่มครับ')} disabled={questions.length === 0} style={s.btnPrimary}>
            {questions.length === 0 ? 'กำลังโหลดโจทย์...' : 'เริ่มทำข้อสอบเลย!'}
          </button>
        </div>
      </div>
    )
  }

  if (isFinished) {
    return (
      <div style={s.container}>
        <div style={s.card}>
          <h1 style={{fontSize:'4rem'}}>🏆</h1>
          <h2 style={{color: '#1a1a1a', fontWeight:'900'}}>เก่งมาก! ทำสำเร็จแล้ว</h2>
          <div style={s.scoreBox}>
            <p style={{fontWeight: 'bold', color:'#666', marginBottom:'5px'}}>คะแนนรวมของคุณคือ</p>
            <h1 style={{fontSize:'4.5rem', color:'#6f42c1', margin: '0'}}>{score} / {questions.length}</h1>
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
        <div style={s.headerRow}>
          <span style={s.badge}>ข้อที่ {currentIndex + 1} / {questions.length}</span>
          <div style={s.progressBarBg}>
            <div style={{ ...s.progressBarFill, width: `${((currentIndex + 1) / questions.length) * 100}%` }}></div>
          </div>
        </div>
        <h2 style={s.questionText}>{currentQ.question_text}</h2>
        <div style={s.gridChoices}>
          {currentQ.options?.map((c) => (
            <button 
              key={c.label} 
              disabled={answered} 
              onClick={() => handleAnswer(c.label)} 
              style={{...s.choiceBtn(getBtnColor(c.label)), opacity: answered ? 0.7 : 1}}
            >
              <span style={s.choiceLabel}>{c.label}</span>
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
    <Suspense fallback={<div style={{padding:'100px', textAlign:'center', color:'#fff'}}>กำลังเข้าสู่สนามสอบ...</div>}>
      <SoloQuizContent />
    </Suspense>
  )
}

const s = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', fontFamily: "'Inter', sans-serif" },
  card: { background: 'white', padding: '40px 30px', borderRadius: '35px', textAlign: 'center', width: '100%', maxWidth: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  mainTitle: { fontSize: '2.2rem', fontWeight: '900', color: '#1a1a1a', marginBottom: '5px' },
  input: { width: '100%', padding: '16px', borderRadius: '15px', border: '2px solid #f1f2f6', marginBottom: '20px', boxSizing: 'border-box', fontSize: '1.1rem', outline:'none' },
  btnPrimary: { width: '100%', padding: '18px', background: '#2d3436', color: 'white', border: 'none', borderRadius: '15px', fontWeight: '900', fontSize: '1.2rem', cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' },
  questionCard: { background: 'white', padding: '35px', borderRadius: '40px', width: '100%', maxWidth: '600px', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' },
  headerRow: { marginBottom: '30px' },
  badge: { display:'inline-block', padding: '6px 15px', background: '#f1f2f6', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '800', color: '#6f42c1', marginBottom: '10px' },
  progressBarBg: { width: '100%', height: '10px', background: '#f1f2f6', borderRadius: '10px', overflow: 'hidden' },
  progressBarFill: { height: '100%', background: '#6f42c1', transition: 'width 0.5s ease' },
  questionText: { color: '#1a1a1a', fontSize: '1.8rem', fontWeight: '900', marginBottom: '35px', lineHeight: '1.4' },
  gridChoices: { display: 'grid', gridTemplateColumns: '1fr', gap: '15px' },
  choiceBtn: (color) => ({ 
    padding: '20px', border: 'none', borderRadius: '25px', background: color, color: '#000', fontWeight: '800', fontSize: '1.15rem', cursor: 'pointer', display: 'flex', alignItems: 'center', textAlign: 'left', boxShadow: '0 5px 0 rgba(0,0,0,0.1)' 
  }),
  choiceLabel: { background: 'rgba(255,255,255,0.5)', width:'40px', height:'40px', display:'flex', alignItems:'center', justifyContent:'center', borderRadius: '12px', marginRight: '15px', fontSize: '1.2rem', fontWeight: '900' },
  scoreBox: { background: '#f8f9fa', padding: '25px', borderRadius: '25px', margin: '20px 0', border: '1px solid #eee' },
  btnBack: { width: '100%', padding: '15px', background: '#f1f2f6', border: 'none', borderRadius: '15px', cursor: 'pointer', color: '#1a1a1a', fontWeight: 'bold' }
}
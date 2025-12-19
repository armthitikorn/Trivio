'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function SoloQuizGame() {
  const { id } = useParams() // รับ ID จาก URL
  const router = useRouter()

  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)  
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [nickname, setNickname] = useState('')
  const [gameStarted, setGameStarted] = useState(false)
  const [loading, setLoading] = useState(false)

  // 1. ดึงข้อมูลโจทย์ทันทีที่เข้าหน้าที่มี ID
  useEffect(() => {
    if(id) fetchQuestions()
  }, [id])

  async function fetchQuestions() {
    // หา quiz_id จาก session นี้ก่อน
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
      
      if(qs) setQuestions(qs)
    }
  }

  // 2. เริ่มเกม (บันทึกตัวตนพนักงานลง DB)
  async function startGame() {
    if (!nickname) return alert("กรุณาใส่ชื่อก่อนเริ่ม")
    setLoading(true)
    
    await supabase.from('players').insert([{
      session_id: id,
      nickname: nickname,
      score: 0
    }])
    
    setGameStarted(true)
    setLoading(false)
  }

  // 3. จัดการการตอบคำถาม
  async function handleAnswer(selectedChoice) {
    if (answered) return
    setAnswered(true)

    const currentQ = questions[currentIndex]
    const isCorrect = selectedChoice === currentQ.correct_option
    
    let newScore = score
    if (isCorrect) {
      newScore = score + 1
      setScore(newScore)
    }

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1)
        setAnswered(false)
      } else {
        saveFinalScore(newScore)
      }
    }, 1000)
  }

  // 4. บันทึกคะแนนจบเกมลง Database เพื่อให้ Host เห็น
  async function saveFinalScore(finalScore) {
    await supabase
        .from('players')
        .update({ score: finalScore })
        .eq('session_id', id)
        .eq('nickname', nickname)

    setIsFinished(true)
  }

  // --- UI หน้าจอต่างๆ ---
  if (!gameStarted) {
    return (
      <div style={s.container}>
        <div style={s.card}>
            <h1 style={{color:'#2d3436'}}>✍️ แบบทดสอบ</h1>
            <p style={{color:'#666'}}>ใส่ชื่อเล่นเพื่อเริ่มทำข้อสอบ</p>
            <input 
              style={s.input} 
              placeholder="ชื่อเล่นของคุณ" 
              value={nickname} 
              onChange={e => setNickname(e.target.value)} 
            />
            <button onClick={startGame} disabled={loading} style={s.btnPrimary}>
                {loading ? 'เตรียมโจทย์...' : 'เริ่มเลย 🚀'}
            </button>
        </div>
      </div>
    )
  }

  if (isFinished) {
    return (
      <div style={s.container}>
        <div style={s.card}>
          <h1 style={{fontSize:'3rem'}}>🎊</h1>
          <h2>ทำข้อสอบเสร็จแล้ว!</h2>
          <p>คุณ <b>{nickname}</b></p>
          <div style={s.scoreBox}>
            <p style={{margin:0, color:'#888'}}>คะแนนของคุณ</p>
            <h1 style={{fontSize:'4rem', margin:'10px 0', color:'#00b894'}}>{score} / {questions.length}</h1>
          </div>
          <button onClick={() => router.push('/play')} style={s.btnBack}>กลับหน้าแรก</button>
        </div>
      </div>
    )
  }

  if (questions.length === 0) return <div style={s.container}>กำลังโหลดข้อมูล...</div>

  const currentQ = questions[currentIndex]
  const choices = [
      { key: 'A', text: currentQ.option_a, color: '#ff7675' },
      { key: 'B', text: currentQ.option_b, color: '#74b9ff' },
      { key: 'C', text: currentQ.option_c, color: '#ffeaa7' },
      { key: 'D', text: currentQ.option_d, color: '#55efc4' }
  ]

  return (
    <div style={s.container}>
      <div style={s.questionCard}>
        <div style={s.progressBarBg}>
          <div style={{ ...s.progressBarFill, width: `${((currentIndex + 1) / questions.length) * 100}%` }}></div>
        </div>
        <p style={{ color: '#aaa', fontWeight: 'bold' }}>ข้อที่ {currentIndex + 1} / {questions.length}</p>
        <h2 style={{ fontSize: '1.4rem', margin: '20px 0', color: '#2d3436' }}>{currentQ.question_text}</h2>
        <div style={s.gridChoices}>
          {choices.map((c) => (
            <button 
              key={c.key} 
              disabled={answered} 
              onClick={() => handleAnswer(c.key)} 
              style={{...s.choiceBtn(c.color), opacity: answered ? 0.5 : 1}}
            >
              <b style={{marginRight:'10px'}}>{c.key}.</b> {c.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// --- Styles ---
const s = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: "'Inter', sans-serif" },
  card: { background: 'white', padding: '40px', borderRadius: '30px', boxShadow: '0 20px 60px rgba(0,0,0,0.1)', textAlign: 'center', width: '100%', maxWidth: '400px' },
  questionCard: { background: 'white', padding: '30px', borderRadius: '30px', boxShadow: '0 20px 60px rgba(0,0,0,0.1)', width: '100%', maxWidth: '600px', textAlign: 'center' },
  input: { width: '100%', padding: '15px', borderRadius: '12px', border: '2px solid #eee', marginBottom: '20px', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' },
  btnPrimary: { width: '100%', padding: '15px', background: '#2d3436', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.1rem', cursor: 'pointer', fontWeight:'bold' },
  btnBack: { width: '100%', padding: '15px', background: '#f1f2f6', color: '#333', border: 'none', borderRadius: '12px', fontSize: '1rem', cursor: 'pointer' },
  scoreBox: { background: '#f8f9fa', padding: '20px', borderRadius: '20px', margin: '20px 0', border: '1px solid #eee' },
  progressBarBg: { width: '100%', height: '8px', background: '#eee', borderRadius: '10px', marginBottom: '20px', overflow: 'hidden' },
  progressBarFill: { height: '100%', background: '#6f42c1', transition: 'width 0.3s ease' },
  gridChoices: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  choiceBtn: (color) => ({ padding: '20px', border: 'none', borderRadius: '15px', background: color, color: '#333', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center' })
}
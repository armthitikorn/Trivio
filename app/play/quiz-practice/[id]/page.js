'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'

function SoloQuizContent() {
  const { id } = useParams()
  const router = useRouter()

  // --- States Management ---
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [nickname, setNickname] = useState('')
  const [isStarted, setIsStarted] = useState(false)
  const [loading, setLoading] = useState(false)

  // --- Data Fetching ---
  useEffect(() => {
    if (id) fetchQuestions()
    const saved = localStorage.getItem('temp_player_info')
    if (saved) {
      const info = JSON.parse(saved)
      if (info.nickname) setNickname(info.nickname)
    }
  }, [id])

  async function fetchQuestions() {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', id)
        .order('created_at', { ascending: true })
      
      if (data) setQuestions(data)
      if (error) throw error
    } catch (err) {
      console.error("Fetch Error:", err.message)
    }
  }

  // --- Game Logic ---
  const handleStart = () => {
    if (!nickname) return alert("กรุณาระบุชื่อของคุณก่อนเข้าสู่สนามสอบครับ")
    setIsStarted(true)
  }

  const handleAnswer = (selectedLabel) => {
    if (answered) return
    setAnswered(true)

    const currentQ = questions[currentIndex]
    let newScore = score

    // ✅ FIXED: เทียบค่า label (A,B,C,D) กับ correct_option จาก Database
    if (selectedLabel === currentQ.correct_option) {
      newScore = score + 1
      setScore(newScore)
    }

    // Effect ก่อนเปลี่ยนข้อ
    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(currentIndex + 1)
        setAnswered(false)
      } else {
        setIsFinished(true)
      }
    }, 600)
  }

  // --- UI: Welcome Screen ---
  if (!isStarted) {
    return (
      <div style={styles.pageBg}>
        <div style={styles.container}>
          <div style={styles.glassCard}>
            <div style={styles.heroEmoji}>🎖️</div>
            <h1 style={styles.mainTitle}>TRIVIO <span style={{color:'#6366f1'}}>QUIZ</span></h1>
            <p style={styles.subTitle}>สนามทดสอบทักษะและความรู้พนักงาน</p>
            
            <div style={styles.inputBox}>
              <label style={styles.label}>ระบุชื่อผู้เข้าทดสอบ</label>
              <input 
                style={styles.input} 
                placeholder="ชื่อ-นามสกุล ของคุณ..." 
                value={nickname} 
                onChange={(e) => setNickname(e.target.value)} 
              />
            </div>

            <button onClick={handleStart} style={styles.startBtn}>
              {questions.length === 0 ? 'กำลังเตรียมโจทย์...' : 'เริ่มทำข้อสอบ'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- UI: Finished Screen ---
  if (isFinished) {
    return (
      <div style={styles.pageBg}>
        <div style={styles.container}>
          <div style={styles.glassCard}>
            <div style={styles.heroEmoji}>🎉</div>
            <h1 style={styles.mainTitle}>ภารกิจเสร็จสิ้น!</h1>
            <div style={styles.resultBox}>
              <p style={{margin:0, color:'#64748b', fontWeight:'bold'}}>คะแนนที่คุณทำได้</p>
              <h1 style={styles.finalScore}>{score} <span style={{fontSize:'1.5rem', color:'#94a3b8'}}>/ {questions.length}</span></h1>
            </div>
            <button onClick={() => window.location.reload()} style={styles.startBtn}>ทำแบบทดสอบอีกครั้ง</button>
          </div>
        </div>
      </div>
    )
  }

  if (questions.length === 0) return null

  const q = questions[currentIndex]

  return (
    <div style={styles.pageBg}>
      <div style={styles.container}>
        <div style={styles.quizCard}>
          {/* Header Info */}
          <div style={styles.quizHeader}>
            <span style={styles.badge}>Progress: {currentIndex + 1} / {questions.length}</span>
            <div style={styles.progressBar}>
              <div style={{...styles.progressFill, width: `${((currentIndex + 1)/questions.length)*100}%`}}></div>
            </div>
          </div>

          {/* Question */}
          <h2 style={styles.questionText}>{q.question_text}</h2>

          {/* Choices Grid */}
          <div style={styles.choiceGrid}>
            {q.options?.map((opt) => (
              <button 
                key={opt.label}
                disabled={answered}
                onClick={() => handleAnswer(opt.label)}
                style={{
                  ...styles.choiceBtn,
                  opacity: answered ? 0.6 : 1,
                  transform: answered ? 'scale(0.98)' : 'scale(1)'
                }}
              >
                <div style={styles.choiceLabel}>{opt.label}</div>
                <div style={styles.choiceContent}>{opt.text}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// --- 271+ Lines Style Definition (Professional & Premium) ---
const styles = {
  pageBg: {
    background: 'radial-gradient(circle at top right, #4f46e5, #7c3aed, #2e1065)',
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  },
  container: { width: '100%', maxWidth: '480px' },
  glassCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    padding: '40px 30px',
    borderRadius: '40px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    textAlign: 'center',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  },
  heroEmoji: { fontSize: '4.5rem', marginBottom: '15px' },
  mainTitle: { fontSize: '2.2rem', fontWeight: '900', color: '#1e293b', marginBottom: '5px', letterSpacing: '-0.05em' },
  subTitle: { fontSize: '1rem', color: '#64748b', marginBottom: '35px' },
  inputBox: { marginBottom: '25px', textAlign: 'left' },
  label: { display: 'block', fontSize: '0.85rem', fontWeight: '800', color: '#475569', marginBottom: '8px', marginLeft: '5px' },
  input: { 
    width: '100%', padding: '18px', borderRadius: '20px', border: '2px solid #f1f5f9', 
    fontSize: '1.1rem', outline: 'none', boxSizing: 'border-box', background: '#f8fafc' 
  },
  startBtn: { 
    width: '100%', padding: '20px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', 
    color: 'white', border: 'none', borderRadius: '22px', fontWeight: '800', 
    fontSize: '1.2rem', cursor: 'pointer', boxShadow: '0 10px 25px rgba(79, 70, 229, 0.4)' 
  },
  resultBox: { background: '#f8fafc', padding: '30px', borderRadius: '25px', margin: '25px 0', border: '1.5px solid #e2e8f0' },
  finalScore: { fontSize: '5rem', margin: '10px 0', color: '#4f46e5', fontWeight: '900' },

  quizCard: {
    background: '#ffffff',
    padding: '30px',
    borderRadius: '40px',
    boxShadow: '0 30px 60px rgba(0,0,0,0.3)',
    width: '100%'
  },
  quizHeader: { marginBottom: '30px' },
  badge: { display: 'inline-block', padding: '6px 14px', background: '#f1f5f9', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b', marginBottom: '12px' },
  progressBar: { width: '100%', height: '10px', background: '#f1f5f9', borderRadius: '20px', overflow: 'hidden' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7)', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)' },
  questionText: { fontSize: '1.7rem', fontWeight: '800', color: '#0f172a', lineHeight: '1.3', marginBottom: '35px', textAlign: 'center' },
  choiceGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: '15px' },
  choiceBtn: {
    display: 'flex', alignItems: 'center', padding: '20px', borderRadius: '22px', 
    border: '2px solid #f1f5f9', background: '#fff', cursor: 'pointer', textAlign: 'left',
    transition: 'all 0.2s ease', boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
  },
  choiceLabel: { 
    width: '45px', height: '45px', background: '#e0e7ff', borderRadius: '14px', 
    display: 'flex', alignItems: 'center', justifyContent: 'center', 
    fontSize: '1.2rem', fontWeight: '900', color: '#4f46e5', marginRight: '15px' 
  },
  choiceContent: { fontSize: '1.15rem', fontWeight: '700', color: '#334155' }
}

// --- Export Page ---
export default function SoloQuizGame() {
  return (
    <Suspense fallback={<div style={{color:'white', textAlign:'center', padding:'50px'}}>Loading Arena...</div>}>
      <SoloQuizContent />
    </Suspense>
  )
}
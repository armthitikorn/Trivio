'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function GameWithLeaderboard() {
  const { id } = useParams() 
  const [allQuestions, setAllQuestions] = useState([]) 
  const [currentIndex, setCurrentIndex] = useState(0)  
  const [answered, setAnswered] = useState(false)
  const [message, setMessage] = useState('')
  const [score, setScore] = useState(0)
  const [isFinished, setIsFinished] = useState(false) // เช็คว่าจบเกมหรือยัง

  useEffect(() => {
    fetchAllQuestions()
  }, [])

  async function fetchAllQuestions() {
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
      setAllQuestions(qs)
    }
  }

  async function handleAnswer(choiceText) {
    if (answered) return
    setAnswered(true)

    const isCorrect = choiceText === allQuestions[currentIndex].correct_option
    let finalScore = score
    
    if (isCorrect) {
      finalScore = score + 1
      setScore(finalScore)
      setMessage('✅ ถูกต้องครับ!')
    } else {
      setMessage(`❌ ผิดครับ (เฉลยคือ: ${allQuestions[currentIndex].correct_option})`)
    }

    // รอสักพักก่อนไปข้อถัดไปหรือจบเกม
    setTimeout(() => {
      if (currentIndex < allQuestions.length - 1) {
        setCurrentIndex(currentIndex + 1)
        setAnswered(false)
        setMessage('')
      } else {
        setIsFinished(true) // เข้าสู่หน้าสรุปคะแนน
      }
    }, 1500)
  }

  // --- หน้าจอแสดงผลเมื่อจบเกม ---
  if (isFinished) {
    const percentage = (score / allQuestions.length) * 100
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', fontFamily: 'sans-serif', background: '#6f42c1', minHeight: '100vh', color: 'white' }}>
        <div style={{ background: 'white', color: 'black', padding: '40px', borderRadius: '25px', maxWidth: '500px', margin: '0 auto', boxShadow: '0 15px 35px rgba(0,0,0,0.3)' }}>
          <h1 style={{ fontSize: '3rem', margin: '0' }}>🎊</h1>
          <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>จบการแข่งขัน!</h2>
          <p style={{ color: '#666', fontSize: '1.2rem' }}>ขอบคุณที่ร่วมสนุกกับเรา</p>
          
          <div style={{ margin: '30px 0', padding: '20px', background: '#f8f9fa', borderRadius: '15px', border: '2px solid #6f42c1' }}>
            <p style={{ fontSize: '1rem', color: '#666', margin: 0 }}>คะแนนของคุณคือ</p>
            <h1 style={{ fontSize: '4rem', margin: '10px 0', color: '#6f42c1' }}>{score} / {allQuestions.length}</h1>
            <p style={{ fontWeight: 'bold' }}>{percentage >= 50 ? '🎉 ยอดเยี่ยมไปเลย!' : '💪 พยายามอีกนิดนะ!'}</p>
          </div>

<button 
  onClick={() => window.location.href = '/play'} // เปลี่ยนเป็นหน้ากรอก PIN เพื่อเริ่มใหม่
  style={{ 
    width: '100%', 
    padding: '15px', 
    background: '#6f42c1', 
    color: 'white', 
    border: 'none', 
    borderRadius: '12px', 
    fontSize: '1.2rem', 
    fontWeight: 'bold', 
    cursor: 'pointer',
    transition: '0.3s'
  }}
  onMouseOver={(e) => e.target.style.background = '#563d7c'}
  onMouseOut={(e) => e.target.style.background = '#6f42c1'}
>
  เล่นใหม่อีกครั้ง 🎮
</button>
        </div>
      </div>
    )
  }

  if (allQuestions.length === 0) return <div style={{ textAlign: 'center', padding: '100px', fontSize: '1.5rem' }}>กำลังเตรียมสนามแข่ง...</div>

  const currentQ = allQuestions[currentIndex]

  return (
    <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif', background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ background: 'white', padding: '30px', borderRadius: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', maxWidth: '650px', margin: '0 auto' }}>
        
        {/* Progress Bar ด้านบน */}
        <div style={{ width: '100%', background: '#eee', height: '10px', borderRadius: '5px', marginBottom: '20px', overflow: 'hidden' }}>
          <div style={{ width: `${((currentIndex + 1) / allQuestions.length) * 100}%`, background: '#6f42c1', height: '100%', transition: '0.3s' }}></div>
        </div>

        <p style={{ color: '#888', fontWeight: 'bold' }}>คำถามที่ {currentIndex + 1} จาก {allQuestions.length}</p>
        <h2 style={{ color: '#222', fontSize: '1.8rem', margin: '20px 0' }}>{currentQ.question_text}</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '30px' }}>
          {currentQ.options.map((opt, index) => (
            <button
              key={index}
              disabled={answered}
              onClick={() => handleAnswer(opt.text)}
              style={{
                padding: '25px 15px', fontSize: '1.2rem', borderRadius: '15px', border: 'none',
                background: index === 0 ? '#e21b3c' : index === 1 ? '#1368ce' : index === 2 ? '#d89e00' : '#26890c',
                color: 'white', cursor: answered ? 'default' : 'pointer', fontWeight: 'bold',
                boxShadow: '0 4px 0 rgba(0,0,0,0.2)', transition: '0.2s',
                opacity: answered ? 0.5 : 1
              }}
            >
              {opt.text}
            </button>
          ))}
        </div>

        {message && (
          <div style={{ marginTop: '30px', padding: '15px', borderRadius: '10px', background: message.includes('ถูก') ? '#d4edda' : '#f8d7da', color: message.includes('ถูก') ? '#155724' : '#721c24' }}>
            <h3 style={{ margin: 0 }}>{message}</h3>
          </div>
        )}
      </div>
    </div>
  )
}
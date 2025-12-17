'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function ReviewAnswers() {
  const [answers, setAnswers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnswers()
  }, [])

  async function fetchAnswers() {
    // ดึงข้อมูลคำตอบพนักงาน พร้อมชื่อโจทย์
    const { data, error } = await supabase
      .from('answers')
      .select(`
        id, nickname, audio_answer_url, created_at, score,
        questions ( question_text, category )
      `)
      .order('created_at', { ascending: false })

    if (!error) setAnswers(data)
    setLoading(false)
  }

  // ฟังก์ชันให้คะแนน (Update Score)
  async function updateScore(id, newScore) {
    const { error } = await supabase
      .from('answers')
      .update({ score: newScore })
      .eq('id', id)
    
    if (!error) {
      alert("ให้คะแนนสำเร็จ!")
      fetchAnswers() // รีเฟรชข้อมูล
    }
  }

  if (loading) return <div style={{textAlign:'center', padding:'50px'}}>กำลังโหลดคำตอบพนักงาน...</div>

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', background: '#f8f9fa', minHeight: '100vh' }}>
      <h1 style={{ color: '#6f42c1', textAlign: 'center' }}>📝 ตรวจสอบการโต้ตอบเสียง</h1>
      
      <div style={{ maxWidth: '900px', margin: '30px auto' }}>
        {answers.length === 0 && <p style={{textAlign:'center'}}>ยังไม่มีพนักงานส่งคำตอบเข้ามา</p>}
        
        {answers.map((ans) => (
          <div key={ans.id} style={{ background: 'white', padding: '20px', borderRadius: '15px', marginBottom: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <span style={{ background: '#6f42c1', color: 'white', padding: '3px 10px', borderRadius: '10px', fontSize: '0.8rem' }}>
                {ans.questions?.category}
              </span>
              <h3 style={{ margin: '10px 0 5px 0' }}>{ans.nickname}</h3>
              <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>โจทย์: {ans.questions?.question_text}</p>
              
              {/* เครื่องเล่นเสียงพนักงาน */}
              <audio 
                src={supabase.storage.from('recordings').getPublicUrl(ans.audio_answer_url).data.publicUrl} 
                controls 
                style={{ marginTop: '15px', height: '35px', width: '250px' }} 
              />
            </div>

            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>คะแนนปัจจุบัน: {ans.score}</p>
              <div style={{ display: 'flex', gap: '5px' }}>
                {[1, 2, 3, 4, 5].map((num) => (
                  <button 
                    key={num}
                    onClick={() => updateScore(ans.id, num)}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', background: ans.score === num ? '#28a745' : 'white', color: ans.score === num ? 'white' : 'black', cursor: 'pointer' }}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
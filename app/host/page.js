'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function HostDashboard() {
  const [quizzes, setQuizzes] = useState([])
  const [newQuizTitle, setNewQuizTitle] = useState('')
  const [loading, setLoading] = useState(false)

  // 1. โหลดข้อมูล Quiz ทั้งหมดเมื่อเปิดหน้านี้
  useEffect(() => {
    fetchQuizzes()
  }, [])

  async function fetchQuizzes() {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setQuizzes(data)
  }

  // 2. ฟังก์ชันสร้าง Quiz ใหม่
  async function createQuiz() {
    if (!newQuizTitle) return alert('ใส่ชื่อก่อนนะครับ')
    setLoading(true)
    
    const { error } = await supabase
      .from('quizzes')
      .insert([{ title: newQuizTitle, description: 'สร้างใหม่' }])
    
    setLoading(false)
    if (!error) {
      setNewQuizTitle('') 
      fetchQuizzes() 
    }
  }

  // 3. ฟังก์ชันลบ Quiz
  async function deleteQuiz(id) {
    if(!confirm('ยืนยันจะลบไหม?')) return;
    await supabase.from('quizzes').delete().eq('id', id)
    fetchQuizzes() 
  }

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>👩‍🏫 แดชบอร์ดคนคุมเกม (Host)</h1>

      {/* โซนสร้าง Quiz ใหม่ */}
      <div style={{ background: '#f0f0f0', padding: '20px', borderRadius: '10px', marginBottom: '30px' }}>
        <h3>สร้างแบบทดสอบใหม่</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="เช่น วิชาภาษาอังกฤษ ป.4" 
            value={newQuizTitle}
            onChange={(e) => setNewQuizTitle(e.target.value)}
            style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
          />
          <button 
            onClick={createQuiz} 
            disabled={loading}
            style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            {loading ? 'กำลังสร้าง...' : 'สร้างเลย +'}
          </button>
        </div>
      </div>

      {/* โซนรายชื่อ Quiz */}
      <h3>📚 รายการแบบทดสอบของคุณ</h3>
      {quizzes.length === 0 ? <p>ยังไม่มีแบบทดสอบเลย ลองสร้างดูสิ!</p> : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {quizzes.map((quiz) => (
            <div key={quiz.id} style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0 }}>{quiz.title}</h4>
                <small style={{ color: '#666' }}>ID: {quiz.id.slice(0, 8)}...</small>
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                {/* --- เพิ่มปุ่ม Play ตรงนี้ครับ --- */}
                <Link href={`/host/lobby/${quiz.id}`} style={{ textDecoration: 'none' }}>
                  <button style={{ padding: '8px 15px', background: '#6f42c1', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                    ▶️ Play
                  </button>
                </Link>

                {/* ปุ่มเพิ่มคำถาม (ของเดิม) */}
                <Link href={`/host/quiz/${quiz.id}`} style={{ textDecoration: 'none' }}>
                  <button style={{ padding: '8px 15px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                    ✏️ เพิ่มคำถาม
                  </button>
                </Link>
                
                {/* ปุ่มลบ (ของเดิม) */}
                <button 
                  onClick={() => deleteQuiz(quiz.id)}
                  style={{ padding: '8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                >
                  ลบ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
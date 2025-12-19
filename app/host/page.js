'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function HostDashboard() {
  const [quizzes, setQuizzes] = useState([])
  const [newQuizTitle, setNewQuizTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // 1. ตรวจสอบ User และโหลดข้อมูลเฉพาะของตัวเอง
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login') // ถ้าไม่ได้ล็อกอิน ให้เด้งไปหน้า Login
      } else {
        fetchQuizzes(user.id) // ส่ง ID ไปเพื่อดึงเฉพาะงานของตัวเอง
      }
    }
    checkUser()
  }, [])

  async function fetchQuizzes(userId) {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('user_id', userId) // ✨ ดึงเฉพาะข้อสอบที่เราเป็นเจ้าของ
      .order('created_at', { ascending: false })
    
    if (data) setQuizzes(data)
  }

  // 2. ฟังก์ชันสร้าง Quiz ใหม่ (พร้อมแนบ user_id)
  async function createQuiz() {
    if (!newQuizTitle) return alert('ใส่ชื่อก่อนนะครับ')
    setLoading(true)
    
    // ดึง User ปัจจุบันมาเพื่อเอา ID
    const { data: { user } } = await supabase.auth.getUser()
    
    const { error } = await supabase
      .from('quizzes')
      .insert([
        { 
          title: newQuizTitle, 
          description: 'สร้างใหม่',
          user_id: user.id // ✨ บันทึก ID เจ้าของลงไปด้วย
        }
      ])
    
    setLoading(false)
    if (!error) {
      setNewQuizTitle('') 
      fetchQuizzes(user.id) // โหลดรายการใหม่
      alert('สร้างแบบทดสอบสำเร็จ!')
    } else {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    }
  }

  // 3. ฟังก์ชันลบ Quiz (จะลบได้เฉพาะของเรา เพราะเราดึงมาเฉพาะของเรา)
  async function deleteQuiz(id) {
    if(!confirm('ยืนยันจะลบไหม?')) return;
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('quizzes').delete().eq('id', id)
    fetchQuizzes(user.id) 
  }

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>👩‍🏫 แดชบอร์ด (Host)</h1>
        <button onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }} style={{ padding: '5px 10px', background: '#eee', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer' }}>ออกจากระบบ</button>
      </div>

      {/* โซนสร้าง Quiz ใหม่ */}
      <div style={{ background: '#f0f0f0', padding: '20px', borderRadius: '15px', marginBottom: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <h3 style={{ marginTop: 0 }}>สร้างแบบทดสอบใหม่</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="เช่น แบบทดสอบผลิตภัณฑ์ใหม่" 
            value={newQuizTitle}
            onChange={(e) => setNewQuizTitle(e.target.value)}
            style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #ddd', outline: 'none' }}
          />
          <button 
            onClick={createQuiz} 
            disabled={loading}
            style={{ padding: '10px 25px', background: '#28a745', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {loading ? 'กำลังสร้าง...' : 'สร้างเลย +'}
          </button>
        </div>
      </div>

      {/* โซนรายชื่อ Quiz */}
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>📚 แบบทดสอบของคุณ ({quizzes.length})</h3>
      {quizzes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', background: '#fff', border: '2px dashed #ccc', borderRadius: '15px' }}>
          <p style={{ color: '#888' }}>ยังไม่มีแบบทดสอบเลย ลองสร้างอันแรกดูสิ!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {quizzes.map((quiz) => (
            <div key={quiz.id} style={{ background: 'white', border: '1px solid #eee', padding: '20px', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div>
                <h4 style={{ margin: 0, color: '#333', fontSize: '1.1rem' }}>{quiz.title}</h4>
                <small style={{ color: '#aaa' }}>สร้างเมื่อ: {new Date(quiz.created_at).toLocaleDateString('th-TH')}</small>
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <Link href={`/host/lobby/${quiz.id}`}>
                  <button style={{ padding: '10px 18px', background: '#6f42c1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>▶️ Play</button>
                </Link>

                <Link href={`/host/quiz/${quiz.id}`}>
                  <button style={{ padding: '10px 18px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>✏️ แก้ไข</button>
                </Link>
                
                <button 
                  onClick={() => deleteQuiz(quiz.id)}
                  style={{ padding: '10px', background: '#fff', color: '#dc3545', border: '1px solid #dc3545', borderRadius: '8px', cursor: 'pointer' }}
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
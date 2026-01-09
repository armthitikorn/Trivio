'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { QRCodeCanvas } from 'qrcode.react'

export default function HostDashboard() {
  const [quizzes, setQuizzes] = useState([])
  const [newQuizTitle, setNewQuizTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedQR, setSelectedQR] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        fetchQuizzes(user.id)
      }
    }
    checkUser()
  }, [])

  async function fetchQuizzes(userId) {
    const { data } = await supabase
      .from('quizzes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (data) setQuizzes(data)
  }

  async function createQuiz() {
    if (!newQuizTitle) return alert('กรุณาระบุชื่อแบบทดสอบ')
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('quizzes')
      .insert([{ title: newQuizTitle, description: 'แบบทดสอบปรนัย', user_id: user.id }])
      .select()
    
    setLoading(false)
    if (!error) {
      setNewQuizTitle(''); fetchQuizzes(user.id);
      if (data && data[0]) setSelectedQR(data[0]);
    }
  }

  async function deleteQuiz(id) {
    if(!confirm('ยืนยันที่จะลบแบบทดสอบนี้?')) return;
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('quizzes').delete().eq('id', id)
    fetchQuizzes(user.id) 
  }

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h1 style={{ margin:0, color:'#2d3436' }}>📊 Quiz Master Dashboard</h1>
        <button onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }} style={s.btnLogout}>ออกจากระบบ</button>
      </div>

      <div style={s.createCard}>
        <h3 style={{ color:'white', marginTop:0 }}>🆕 สร้างแบบทดสอบใหม่</h3>
        <div style={s.inputGroup}>
          <input 
            style={s.input} 
            placeholder="ชื่อหัวข้อข้อสอบ..." 
            value={newQuizTitle}
            onChange={(e) => setNewQuizTitle(e.target.value)}
          />
          <button onClick={createQuiz} disabled={loading} style={s.btnCreate}>{loading ? '...' : 'สร้าง'}</button>
        </div>
      </div>

      <div style={s.grid}>
        {quizzes.map((quiz) => (
          <div key={quiz.id} style={s.quizCard}>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: '1.2rem' }}>{quiz.title}</h4>
              <small style={{ color: '#888' }}>ID: {quiz.id}</small>
            </div>
            <div style={s.actionGroup}>
              <button onClick={() => setSelectedQR(quiz)} style={s.btnQR}>📱 QR Code</button>
              <Link href={`/host/quiz/${quiz.id}`}><button style={s.btnEdit}>✏️ จัดการโจทย์</button></Link>
              <button onClick={() => deleteQuiz(quiz.id)} style={s.btnDelete}>🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {/* --- Modal QR Code: จุดที่แก้ไขลิงก์ให้ถูกต้อง --- */}
      {selectedQR && (
        <div style={s.modalOverlay} onClick={() => setSelectedQR(null)}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: '#2d3436' }}>QR Code สำหรับพนักงาน</h2>
            <p style={{ color: '#666' }}>{selectedQR.title}</p>
            
            <div style={s.qrWrapper}>
              <QRCodeCanvas 
                // ✨ แก้ไขลิงก์: ชี้ไปที่หน้าข้อสอบปรนัยโดยตรง (Dynamic Route)
                value={`${window.location.origin}/play/quiz/${selectedQR.id}`} 
                size={220}
                level={"H"}
              />
            </div>
            
            <p style={{ fontSize:'0.85rem', color:'#888', marginBottom:'20px' }}>พนักงานสแกนเพื่อเริ่มทำข้อสอบปรนัย</p>
            <button onClick={() => setSelectedQR(null)} style={s.btnClose}>ปิดหน้าต่าง</button>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  container: { padding: '40px', maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui', minHeight:'100vh', background:'#f8f9fa' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  btnLogout: { padding: '8px 16px', background: 'white', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer' },
  createCard: { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '25px', borderRadius: '20px', marginBottom: '30px', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' },
  inputGroup: { display: 'flex', gap: '10px' },
  input: { flex: 1, padding: '12px', borderRadius: '10px', border: 'none', outline: 'none' },
  btnCreate: { padding: '12px 25px', background: '#2d3436', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight:'bold' },
  grid: { display: 'grid', gap: '15px' },
  quizCard: { background: 'white', padding: '20px', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border:'1px solid #eee' },
  actionGroup: { display: 'flex', gap: '8px' },
  btnQR: { padding: '10px 15px', background: '#6c5ce7', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  btnEdit: { padding: '10px 15px', background: '#f1f2f6', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  btnDelete: { padding: '10px 15px', background: '#ff7675', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', display:'flex', justifyContent:'center', alignItems:'center', zIndex: 1000 },
  modalContent: { background:'white', padding:'35px', borderRadius:'25px', textAlign:'center', maxWidth:'380px', width:'90%' },
  qrWrapper: { background:'#f9f9f9', padding:'20px', borderRadius:'15px', display:'inline-block', margin:'20px 0' },
  btnClose: { width:'100%', padding:'12px', borderRadius:'10px', border:'none', background:'#2d3436', color:'white', fontWeight:'bold', cursor:'pointer' }
}
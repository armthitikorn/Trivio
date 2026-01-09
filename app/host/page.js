'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
// 1. นำเข้า QRCodeCanvas
import { QRCodeCanvas } from 'qrcode.react'

export default function HostDashboard() {
  const [quizzes, setQuizzes] = useState([])
  const [newQuizTitle, setNewQuizTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedQR, setSelectedQR] = useState(null) // สำหรับเก็บข้อมูล Quiz ที่ต้องการโชว์ QR
  const router = useRouter()

  // 1. ตรวจสอบ User และโหลดข้อมูล
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

  // 2. ฟังก์ชันสร้าง Quiz ใหม่
  async function createQuiz() {
    if (!newQuizTitle) return alert('ใส่ชื่อแบบทดสอบก่อนนะครับ')
    setLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data, error } = await supabase
      .from('quizzes')
      .insert([
        { 
          title: newQuizTitle, 
          description: 'แบบทดสอบพนักงาน',
          user_id: user.id 
        }
      ])
      .select() 
    
    setLoading(false)
    if (!error) {
      setNewQuizTitle('') 
      fetchQuizzes(user.id) 
      if (data && data[0]) {
        setSelectedQR(data[0])
      }
    } else {
      alert('Error: ' + error.message)
    }
  }

  // 3. ฟังก์ชันลบ Quiz
  async function deleteQuiz(id) {
    if(!confirm('ยืนยันที่จะลบแบบทดสอบนี้? ข้อมูลคะแนนเก่าอาจหายไปด้วยนะ')) return;
    await supabase.from('quizzes').delete().eq('id', id)
    const { data: { user } } = await supabase.auth.getUser()
    fetchQuizzes(user.id) 
  }

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div>
          {/* ปรับสีเป็นน้ำเงินเข้ม #1e1b4b */}
          <h1 style={{ margin:0, color:'#1e1b4b', fontWeight: '900' }}>👩‍🏫 Quiz Dashboard</h1>
          <p style={{ margin:'5px 0 0 0', color:'#1e1b4b', fontWeight: '600' }}>ระบบจัดการแบบทดสอบออนไลน์</p>
        </div>
        <button 
          onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }} 
          style={s.btnLogout}
        >
          ออกจากระบบ
        </button>
      </div>

      {/* โซนสร้าง Quiz ใหม่ */}
      <div style={s.createCard}>
        <h3 style={{ marginTop: 0, color:'white', textShadow:'0 1px 2px rgba(0,0,0,0.1)' }}>✨ สร้างแบบทดสอบใหม่</h3>
        <div style={s.inputGroup}>
          <input 
            type="text" 
            placeholder="ตั้งชื่อหัวข้อ เช่น Product Knowledge 2024" 
            value={newQuizTitle}
            onChange={(e) => setNewQuizTitle(e.target.value)}
            style={s.input}
          />
          <button 
            onClick={createQuiz} 
            disabled={loading}
            style={s.btnCreate}
          >
            {loading ? '...' : 'สร้าง +'}
          </button>
        </div>
      </div>

      {/* โซนรายชื่อ Quiz - ปรับสีเป็นน้ำเงินเข้ม */}
      <h3 style={{ color: '#1e1b4b', marginBottom:'20px', fontWeight: '900' }}>📚 แบบทดสอบของคุณ ({quizzes.length})</h3>
      
      {quizzes.length === 0 ? (
        <div style={s.emptyState}>
          <p style={{ color: '#1e1b4b' }}>ยังไม่มีแบบทดสอบเลย ลองสร้างอันแรกดูสิ!</p>
        </div>
      ) : (
        <div style={s.grid}>
          {quizzes.map((quiz) => (
            <div key={quiz.id} style={s.quizCard}>
              <div style={{ flex: 1 }}>
                {/* ชื่อ Quiz สีน้ำเงินเข้ม */}
                <h4 style={{ margin: '0 0 5px 0', color: '#1e1b4b', fontSize: '1.2rem', fontWeight: '800' }}>{quiz.title}</h4>
                <small style={{ color: '#4338ca', fontWeight: '600' }}>สร้างเมื่อ: {new Date(quiz.created_at).toLocaleDateString('th-TH')}</small>
              </div>
              
              <div style={s.actionGroup}>
                {/* ปุ่มเปิด QR Code */}
                <button 
                  onClick={() => setSelectedQR(quiz)}
                  style={s.btnQR}
                >
                  📱 QR Code
                </button>

                {/* ปุ่มเปิดห้องสอบ */}
                <Link href={`/host/lobby/${quiz.id}`}>
                  <button style={s.btnMonitor}>📡 เปิดห้องสอบ</button>
                </Link>

                <div style={{display:'flex', gap:'5px'}}>
                  <Link href={`/host/quiz/${quiz.id}`}>
                    <button style={s.btnEdit}>✏️</button>
                  </Link>
                  <button onClick={() => deleteQuiz(quiz.id)} style={s.btnDelete}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- หน้าต่าง Modal แสดง QR Code (Original URL) --- */}
      {selectedQR && (
        <div style={s.modalOverlay} onClick={() => setSelectedQR(null)}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, color: '#1e1b4b', fontWeight: '900' }}>QR Code สำหรับเข้าสอบ</h2>
            <p style={{ color: '#4338ca', marginBottom: '20px', fontWeight: '700' }}>{selectedQR.title}</p>
            
            <div style={s.qrWrapper}>
              <QRCodeCanvas 
                // ✅ กลับมาใช้ URL เดิมของคุณกุญแจ
                value={`${window.location.origin}/play?quizId=${selectedQR.id}`} 
                size={220}
                level={"H"}
                margin={true} 
              />
            </div>
            
            <p style={s.qrNote}>ให้พนักงานสแกนเพื่อเข้าหน้าลงทะเบียน</p>
            <button onClick={() => setSelectedQR(null)} style={s.btnClose}>ปิดหน้าต่าง</button>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Styles ปรับสีตัวหนังสือเป็นน้ำเงินเข้ม ---
const s = {
  container: { padding: '40px', maxWidth: '1000px', margin: '0 auto', fontFamily: "'Inter', sans-serif", minHeight:'100vh', background:'#f8f9fa' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' },
  btnLogout: { padding: '10px 20px', background: 'white', border: '2px solid #1e1b4b', borderRadius: '50px', cursor: 'pointer', color:'#1e1b4b', fontWeight:'bold' },
  createCard: { background: 'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)', padding: '30px', borderRadius: '20px', marginBottom: '40px', boxShadow: '0 10px 20px rgba(132, 250, 176, 0.2)' },
  inputGroup: { display: 'flex', gap: '10px', background:'rgba(255,255,255,0.3)', padding:'8px', borderRadius:'15px', backdropFilter:'blur(5px)' },
  input: { flex: 1, padding: '15px', borderRadius: '10px', border: 'none', outline: 'none', fontSize:'1rem', background:'white', color: '#1e1b4b', fontWeight: 'bold' },
  btnCreate: { padding: '10px 30px', background: '#1e1b4b', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' },
  emptyState: { textAlign: 'center', padding: '50px', background: 'white', border: '2px dashed #ddd', borderRadius: '20px', color:'#1e1b4b' },
  grid: { display: 'grid', gap: '15px' },
  quizCard: { background: 'white', padding: '20px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' },
  actionGroup: { display: 'flex', gap: '10px', alignItems:'center' },
  btnQR: { padding: '12px 15px', background: '#6c5ce7', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' },
  btnMonitor: { padding: '12px 15px', background: 'linear-gradient(45deg, #1e1b4b, #4338ca)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' },
  btnEdit: { padding: '12px 15px', background: '#dfe6e9', color: '#1e1b4b', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' },
  btnDelete: { padding: '12px 15px', background: '#ff7675', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(30, 27, 75, 0.7)', display:'flex', justifyContent:'center', alignItems:'center', zIndex: 1000, backdropFilter:'blur(4px)' },
  modalContent: { background:'white', padding:'40px', borderRadius:'30px', textAlign:'center', maxWidth:'400px', width:'90%', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' },
  qrWrapper: { background:'#f4f4f4', padding:'25px', borderRadius:'20px', display:'inline-block', marginBottom:'20px', border: '1px solid #e2e8f0' },
  qrNote: { fontSize:'0.95rem', color:'#1e1b4b', marginBottom:'20px', fontWeight: 'bold' },
  btnClose: { width:'100%', padding:'15px', border:'none', borderRadius:'12px', background:'#1e1b4b', color:'white', cursor:'pointer', fontWeight:'bold', fontSize:'1rem' }
}
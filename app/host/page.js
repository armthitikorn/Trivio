'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react' // ✨ ตัวสร้าง QR Code

export default function HostMonitor() {
  const { id } = useParams()
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [quizTitle, setQuizTitle] = useState('')
  const [players, setPlayers] = useState([])
  const [joinUrl, setJoinUrl] = useState('')

  useEffect(() => {
    createOrGetSession()
  }, [])

  async function createOrGetSession() {
    const { data: quiz } = await supabase.from('quizzes').select('title').eq('id', id).single()
    if (quiz) setQuizTitle(quiz.title)

    const newPin = Math.floor(100000 + Math.random() * 900000).toString()
    
    const { data: session } = await supabase
      .from('game_sessions')
      .insert([{ quiz_id: id, pin_code: newPin, current_state: 'OPEN', is_active: true }])
      .select().single()

    if (session) {
      setPin(newPin)
      // ✨ สร้างลิงก์ที่จะให้ QR Code พาไป (แนบ PIN ไปใน Query String)
      const baseUrl = window.location.origin
      setJoinUrl(`${baseUrl}/play?pin=${newPin}`) 
      subscribeToPlayers(session.id)
    }
  }

  async function fetchPlayers(sessionId) {
    const { data } = await supabase.from('players').select('*').eq('session_id', sessionId).order('score', { ascending: false })
    if (data) setPlayers(data)
  }

  function subscribeToPlayers(sessionId) {
    fetchPlayers(sessionId)
    supabase.channel(`monitor-${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `session_id=eq.${sessionId}` }, () => fetchPlayers(sessionId))
      .subscribe()
  }

  return (
    <div style={s.container}>
      <div style={s.header}>
        <button onClick={() => router.back()} style={s.btnBack}>← Dashboard</button>
        <h2 style={{margin:0}}>{quizTitle}</h2>
      </div>

      <div style={s.mainLayout}>
        {/* 📢 โซนโชว์ PIN และ QR Code สำหรับสไลด์ */}
        <div style={s.qrSection}>
          <h3 style={{color: '#666', marginBottom: '10px'}}>สแกนเพื่อเข้าสอบ</h3>
          <div style={s.qrWrapper}>
            {joinUrl && <QRCodeSVG value={joinUrl} size={250} level="H" includeMargin={true} />}
          </div>
          <p style={{fontSize: '1.2rem', color: '#444'}}>หรือเข้าที่เว็บแล้วกรอก PIN</p>
          <div style={s.pinDisplay}>{pin}</div>
        </div>

        {/* 🏆 โซนตารางคะแนนสด */}
        <div style={s.leaderboardSection}>
          <h2 style={{textAlign:'left', borderBottom:'2px solid #eee', paddingBottom:'10px'}}>🏆 คะแนนเรียลไทม์</h2>
          <div style={s.tableWrapper}>
            {players.length === 0 ? (
              <p style={{color:'#aaa', marginTop:'50px'}}>รอพนักงานสแกนเข้าสอบ...</p>
            ) : (
              <table style={s.table}>
                <thead>
                  <tr style={s.th}>
                    <th>อันดับ</th>
                    <th>ชื่อพนักงาน</th>
                    <th>แผนก</th>
                    <th style={{textAlign:'right'}}>คะแนน</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p, i) => (
                    <tr key={p.id} style={s.tr}>
                      <td>{i + 1}</td>
                      <td><b>{p.nickname}</b></td>
                      <td>{p.department}</td>
                      <td style={{textAlign:'right', color:'#6f42c1', fontWeight:'bold'}}>{p.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  container: { padding: '20px', fontFamily: 'Inter, sans-serif', background: '#f8f9fa', minHeight: '100vh' },
  header: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' },
  btnBack: { padding: '8px 15px', borderRadius: '10px', border: '1px solid #ddd', cursor: 'pointer', background: 'white' },
  mainLayout: { display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '30px' },
  qrSection: { background: 'white', padding: '40px', borderRadius: '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)', textAlign: 'center' },
  qrWrapper: { background: '#f0f0f0', padding: '20px', borderRadius: '20px', display: 'inline-block', marginBottom: '20px' },
  pinDisplay: { fontSize: '5rem', fontWeight: '900', letterSpacing: '10px', color: '#6f42c1', background: '#f3ebff', borderRadius: '20px', padding: '10px' },
  leaderboardSection: { background: 'white', padding: '30px', borderRadius: '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)', textAlign: 'center' },
  tableWrapper: { marginTop: '20px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { borderBottom: '2px solid #eee', color: '#888', textAlign: 'left' },
  tr: { borderBottom: '1px solid #f9f9f9', height: '50px', textAlign: 'left' }
}
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function MyResults() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const nickname = typeof window !== 'undefined' ? localStorage.getItem('nickname') || 'Staff' : 'Staff'

  useEffect(() => {
    fetchMyResults()
  }, [])

  async function fetchMyResults() {
    const { data, error } = await supabase
      .from('video_answers')
      .select('*, video_questions(title)')
      .eq('nickname', nickname)
      .order('created_at', { ascending: false })

    if (!error) setResults(data)
    setLoading(false)
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>🏆 ผลการประเมินของ: {nickname}</h1>
        <p style={{ color: '#666' }}>ติดตามคะแนนและคำแนะนำจากเทรนเนอร์ของคุณ</p>
      </header>

      {loading ? <p>กำลังโหลดผลคะแนน...</p> : (
        <div style={styles.grid}>
          {results.length > 0 ? results.map(item => (
            <div key={item.id} style={styles.resultCard}>
              <div style={styles.cardHeader}>
                <span style={styles.tag}>{item.status === 'reviewed' ? 'ตรวจแล้ว' : 'รอการตรวจสอบ'}</span>
                <span style={styles.date}>{new Date(item.created_at).toLocaleDateString('th-TH')}</span>
              </div>
              
              <h3 style={styles.qTitle}>🎬 {item.video_questions?.title}</h3>
              
              <div style={styles.scoreSection}>
                <div style={styles.scoreCircle}>
                  <span style={styles.scoreNum}>{item.score || 0}</span>
                  <span style={styles.scoreLabel}>/10 คะแนน</span>
                </div>
                
                <div style={styles.feedbackBox}>
                  <strong>💬 คำแนะนำจากเทรนเนอร์:</strong>
                  <p style={styles.feedbackText}>
                    {item.feedback || (item.status === 'reviewed' ? 'ไม่มีข้อความตอบกลับ' : 'รอเทรนเนอร์เข้ามาตรวจงานสักครู่นะคะ')}
                  </p>
                </div>
              </div>
            </div>
          )) : (
            <div style={styles.empty}>คุณยังไม่มีประวัติการส่งงานวิดีโอ</div>
          )}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { maxWidth: '900px', margin: '0 auto', padding: '20px' },
  header: { marginBottom: '40px', textAlign: 'center' },
  title: { fontSize: '2rem', fontWeight: '800', color: '#8e44ad' },
  grid: { display: 'flex', flexDirection: 'column', gap: '20px' },
  resultCard: { background: 'white', padding: '30px', borderRadius: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px' },
  tag: { background: '#f5f3ff', color: '#8e44ad', padding: '5px 15px', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 'bold' },
  date: { color: '#aaa', fontSize: '0.85rem' },
  qTitle: { margin: '0 0 20px 0', color: '#2d3436' },
  scoreSection: { display: 'flex', gap: '30px', alignItems: 'center', flexWrap: 'wrap' },
  scoreCircle: { width: '100px', height: '100px', borderRadius: '50%', border: '5px solid #8e44ad', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  scoreNum: { fontSize: '1.8rem', fontWeight: 'bold', color: '#8e44ad' },
  scoreLabel: { fontSize: '0.6rem', color: '#666' },
  feedbackBox: { flex: 1, background: '#f9f9f9', padding: '20px', borderRadius: '15px' },
  feedbackText: { marginTop: '10px', color: '#444', lineHeight: '1.6' },
  empty: { textAlign: 'center', padding: '50px', color: '#999', background: '#fff', borderRadius: '20px' }
}
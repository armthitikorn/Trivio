'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function Leaderboard() {
  const [topStaff, setTopStaff] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboardData()
  }, [])

  async function fetchLeaderboardData() {
    setLoading(true)
    
    // 1. ดึงข้อมูลคะแนนวิดีโอ
    const { data: videoData } = await supabase.from('video_answers').select('nickname, score')
    
    // 2. ดึงข้อมูลคะแนนเสียง
    const { data: audioData } = await supabase.from('answers').select('nickname, score')

    // 3. รวมคะแนนและจัดกลุ่มตามชื่อพนักงาน (Aggregation)
    const scoresMap = {}

    const processData = (data) => {
      data?.forEach(item => {
        if (item.score > 0) {
          if (!scoresMap[item.nickname]) {
            scoresMap[item.nickname] = { name: item.nickname, totalScore: 0, count: 0 }
          }
          scoresMap[item.nickname].totalScore += item.score
          scoresMap[item.nickname].count += 1
        }
      })
    }

    processData(videoData)
    processData(audioData)

    // คำนวณค่าเฉลี่ยและเรียงลำดับจากมากไปน้อย
    const sortedList = Object.values(scoresMap)
      .map(user => ({
        ...user,
        avgScore: (user.totalScore / user.count).toFixed(1)
      }))
      .sort((a, b) => b.avgScore - a.avgScore)

    setTopStaff(sortedList)
    setLoading(false)
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>🏆 Hall of Fame</h1>
        <p style={{ color: '#666' }}>สุดยอดพนักงานที่มีทักษะการสื่อสารยอดเยี่ยมที่สุด</p>
      </header>

      {loading ? <div style={styles.loader}>กำลังประมวลผลอันดับ...</div> : (
        <div style={styles.board}>
          {/* อันดับ 1-3 (Podium) */}
          <div style={styles.podium}>
            {topStaff[1] && (
              <div style={styles.podiumItem('silver', '100px')}>
                <div style={styles.medal}>🥈</div>
                <strong>{topStaff[1].name}</strong>
                <div style={styles.podiumScore}>{topStaff[1].avgScore}</div>
              </div>
            )}
            {topStaff[0] && (
              <div style={styles.podiumItem('gold', '140px')}>
                <div style={styles.medal}>🥇</div>
                <strong style={{fontSize:'1.2rem'}}>{topStaff[0].name}</strong>
                <div style={styles.podiumScore}>{topStaff[0].avgScore}</div>
              </div>
            )}
            {topStaff[2] && (
              <div style={styles.podiumItem('bronze', '80px')}>
                <div style={styles.medal}>🥉</div>
                <strong>{topStaff[2].name}</strong>
                <div style={styles.podiumScore}>{topStaff[2].avgScore}</div>
              </div>
            )}
          </div>

          {/* รายชื่ออันดับทั้งหมด */}
          <div style={styles.list}>
            {topStaff.map((user, index) => (
              <div key={user.name} style={styles.rankRow(index === 0)}>
                <div style={styles.rankNum}>{index + 1}</div>
                <div style={{ flex: 1, fontWeight: 'bold' }}>{user.name}</div>
                <div style={styles.rankScore}>
                  <span style={{fontSize:'0.8rem', color:'#999', marginRight:'5px'}}>คะแนนเฉลี่ย</span>
                  {user.avgScore}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { maxWidth: '800px', margin: '0 auto', paddingBottom: '50px' },
  header: { textAlign: 'center', marginBottom: '40px' },
  title: { fontSize: '2.5rem', fontWeight: '900', color: '#8e44ad', margin: 0 },
  loader: { textAlign: 'center', padding: '50px', color: '#8e44ad', fontWeight: 'bold' },
  board: { background: 'white', borderRadius: '30px', padding: '40px', boxShadow: '0 20px 50px rgba(0,0,0,0.05)' },
  podium: { display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '20px', marginBottom: '50px', paddingBottom: '20px', borderBottom: '1px solid #f0f0f0' },
  podiumItem: (type, height) => ({
    width: '120px', height: height, background: type === 'gold' ? '#fff9db' : '#f8f9fa',
    borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    border: type === 'gold' ? '2px solid #fab005' : '1px solid #dee2e6', position: 'relative'
  }),
  medal: { fontSize: '2rem', marginBottom: '5px' },
  podiumScore: { fontSize: '0.9rem', color: '#8e44ad', fontWeight: '900' },
  list: { display: 'flex', flexDirection: 'column', gap: '10px' },
  rankRow: (isFirst) => ({
    display: 'flex', alignItems: 'center', padding: '15px 25px', borderRadius: '15px',
    background: isFirst ? '#f5f3ff' : 'white', border: '1px solid #f0f0f0'
  }),
  rankNum: { width: '40px', fontSize: '1.2rem', fontWeight: '900', color: '#8e44ad' },
  rankScore: { fontWeight: '900', color: '#2d3436', fontSize: '1.1rem' }
}
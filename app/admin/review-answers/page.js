'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function FinalReviewCenter() {
  const [tab, setTab] = useState('video')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  
  // Filters & Grading
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [search, setSearch] = useState('')
  const [grading, setGrading] = useState({ score: '', feedback: '' })

  useEffect(() => {
    fetchData()
  }, [tab])

  async function fetchData() {
    setLoading(true)
    const table = tab === 'video' ? 'video_answers' : 'answers'
    
    // ✨ แก้ไขจุด Error PGRST201 ตามที่ Log ระบุมาทั้ง 2 ฝั่ง
    const relation = tab === 'video' 
      ? 'video_questions!video_answers_question_id_fkey(title)' // เจาะจง fkey วิดีโอ
      : 'questions!answers_question_id_fkey(question_text)'   // เจาะจง fkey เสียง (แก้ตาม Log ล่าสุด)
    
    let query = supabase
      .from(table)
      .select(`*, ${relation}`)
      .order('created_at', { ascending: false })

    if (startDate) query = query.gte('created_at', `${startDate}T00:00:00`)
    if (endDate) query = query.lte('created_at', `${endDate}T23:59:59`)

    const { data: res, error } = await query
    
    if (error) {
      console.error("Fetch Error Details:", error)
      setData([])
    } else {
      setData(res || [])
    }
    setLoading(false)
    setSelected(null)
  }

  async function saveGrade() {
    if (!selected || !grading.score) return alert('กรุณาระบุคะแนน')

    const table = tab === 'video' ? 'video_answers' : 'answers'
    const { error } = await supabase
      .from(table)
      .update({ 
        score: parseInt(grading.score), 
        feedback: grading.feedback, 
        status: 'reviewed' 
      })
      .eq('id', selected.id)

    if (!error) {
      alert('✅ บันทึกผลตรวจสำเร็จ!')
      fetchData() 
    }
  }

  const filtered = data.filter(i => i.nickname?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={{ margin: 0, color: '#1a1a1a', fontWeight: '800' }}>📊 Review Center Pro</h1>
          <p style={{ color: '#666', marginTop: '5px' }}>ตรวจสอบและประเมินผลงานพนักงาน (วิดีโอ & เสียง)</p>
        </div>
        <div style={styles.tabBar}>
          <button onClick={() => setTab('video')} style={styles.tab(tab === 'video')}>🎬 ตรวจวิดีโอ</button>
          <button onClick={() => setTab('audio')} style={styles.tab(tab === 'audio')}>🎙️ ตรวจเสียง</button>
        </div>
      </header>

      <div style={styles.filterBar}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input type="date" style={styles.dateInput} onChange={(e) => setStartDate(e.target.value)} />
          <span style={{color:'#ccc'}}>ถึง</span>
          <input type="date" style={styles.dateInput} onChange={(e) => setEndDate(e.target.value)} />
          <button onClick={fetchData} style={styles.refreshBtn}>🔄 ดึงข้อมูลใหม่</button>
        </div>
        <input 
          placeholder="🔍 ค้นชื่อพนักงาน..." 
          style={styles.search} 
          onChange={e => setSearch(e.target.value)} 
        />
      </div>

      <div style={styles.mainLayout}>
        {/* รายชื่อด้านซ้าย */}
        <div style={styles.sideList}>
          {loading ? (
            <div style={styles.infoBox}>กำลังโหลดข้อมูล...</div>
          ) : filtered.length > 0 ? (
            filtered.map(item => (
              <div key={item.id} onClick={() => setSelected(item)} style={styles.card(selected?.id === item.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{item.nickname}</strong>
                  <div style={styles.statusBadge(item.status)}>{item.status === 'reviewed' ? 'ตรวจแล้ว' : 'รอตรวจ'}</div>
                </div>
                <div style={styles.cardSub}>
                  {tab === 'video' ? item.video_questions?.title : item.questions?.question_text}
                </div>
              </div>
            ))
          ) : (
            <div style={styles.infoBox}>ไม่พบรายการที่ส่งเข้ามา</div>
          )}
        </div>

        {/* พื้นที่ตรวจงานด้านขวา */}
        <div style={styles.reviewArea}>
          {selected ? (
            <div style={styles.gradingCard}>
              <h3 style={{ marginTop: 0 }}>ประเมินผล: {selected.nickname}</h3>
              
              <div style={styles.mediaFrame}>
                {tab === 'video' ? (
                  <video key={selected.id} controls style={{ width: '100%' }} 
                    src={supabase.storage.from('video_training').getPublicUrl(selected.video_answer_url).data.publicUrl} />
                ) : (
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    <p style={{marginBottom: '15px', color: '#666'}}>🔈 เสียงตอบกลับจากพนักงาน</p>
                    <audio key={selected.id} controls style={{ width: '100%' }}
                      src={supabase.storage.from('recordings').getPublicUrl(selected.audio_answer_url).data.publicUrl} />
                  </div>
                )}
              </div>

              <div style={styles.form}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input type="number" placeholder="คะแนน" style={{...styles.input, flex: 1}} 
                    onChange={e => setGrading({...grading, score: e.target.value})} />
                  <input type="text" placeholder="คำแนะนำ..." style={{...styles.input, flex: 3}} 
                    onChange={e => setGrading({...grading, feedback: e.target.value})} />
                </div>
                <button onClick={saveGrade} style={styles.saveBtn}>✅ บันทึกและส่งผลประเมิน</button>
              </div>
            </div>
          ) : (
            <div style={styles.emptyState}>กรุณาเลือกรายชื่อทางซ้ายมือเพื่อเริ่มตรวจงาน</div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
  tabBar: { background: '#eee', padding: '5px', borderRadius: '15px', display: 'flex' },
  tab: (active) => ({ border: 'none', padding: '12px 25px', borderRadius: '10px', background: active ? '#8e44ad' : 'none', color: active ? 'white' : '#666', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s' }),
  filterBar: { background: 'white', padding: '15px', borderRadius: '20px', border: '1px solid #eee', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' },
  dateInput: { padding: '10px', borderRadius: '10px', border: '1px solid #ddd' },
  refreshBtn: { padding: '10px 20px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' },
  search: { padding: '10px 20px', borderRadius: '12px', border: '1px solid #eee', width: '250px', background: '#f9f9f9' },
  mainLayout: { display: 'flex', gap: '20px' },
  sideList: { flex: 1, maxHeight: '68vh', overflowY: 'auto' },
  reviewArea: { flex: 2 },
  card: (active) => ({ padding: '20px', background: 'white', borderRadius: '15px', marginBottom: '12px', border: active ? '2px solid #8e44ad' : '1px solid #eee', cursor: 'pointer', transition: '0.2s' }),
  cardSub: { fontSize: '0.8rem', color: '#666', marginTop: '8px' },
  statusBadge: (s) => ({ fontSize: '0.65rem', padding: '4px 10px', borderRadius: '20px', background: s === 'reviewed' ? '#ecfdf5' : '#fff7ed', color: s === 'reviewed' ? '#10b981' : '#f97316', fontWeight: 'bold' }),
  gradingCard: { background: 'white', padding: '30px', borderRadius: '25px', border: '1px solid #eee' },
  mediaFrame: { background: '#000', borderRadius: '20px', overflow: 'hidden', marginBottom: '20px' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '14px', borderRadius: '12px', border: '1px solid #ddd' },
  saveBtn: { padding: '16px', background: '#8e44ad', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' },
  infoBox: { textAlign: 'center', padding: '40px', color: '#999', background: '#fff', borderRadius: '20px' },
  emptyState: { height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', borderRadius: '25px', color: '#ccc', border: '2px dashed #ddd' }
}
'use client'
import { useState, useEffect, useCallback } from 'react'
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

  // --- ฟังก์ชันดึงข้อมูล (ปรับปรุงการกรองวันที่ให้หายขาด) ---
  const fetchData = useCallback(async () => {
    setLoading(true)
    const table = tab === 'video' ? 'video_answers' : 'answers'
    
    // กำหนด Relation (ปรับให้รองรับโครงสร้างมาตรฐาน)
    const relation = tab === 'video' 
      ? 'video_questions(title)'
      : 'questions(question_text)' 
    
    try {
      let query = supabase
        .from(table)
        .select(`*, ${relation}`)
        .order('created_at', { ascending: false })

      // การกรองช่วงวันที่ (ถ้ามีการเลือก)
      if (startDate) query = query.gte('created_at', `${startDate}T00:00:00.000Z`)
      if (endDate) query = query.lte('created_at', `${endDate}T23:59:59.999Z`)

      const { data: res, error } = await query
      
      if (error) throw error
      setData(res || [])
    } catch (error) {
      console.error("Fetch Error:", error)
      setData([])
    } finally {
      setLoading(false)
      setSelected(null)
    }
  }, [tab, startDate, endDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // --- ฟังก์ชันบันทึกคะแนน ---
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

  // --- ฟังก์ชันลบแบบถาวร ---
  async function deleteEntry() {
    if (!selected) return
    if (!confirm(`⚠️ ยืนยันการลบงานของ "${selected.nickname}"?`)) return

    setLoading(true)
    try {
      const table = tab === 'video' ? 'video_answers' : 'answers'
      const bucket = tab === 'video' ? 'video_training' : 'recordings'
      const filePath = tab === 'video' ? selected.video_answer_url : selected.audio_answer_url

      if (filePath) await supabase.storage.from(bucket).remove([filePath])
      const { error: dbError } = await supabase.from(table).delete().eq('id', selected.id)

      if (dbError) throw dbError
      alert('🗑️ ลบข้อมูลเรียบร้อยแล้ว')
      setData(prev => prev.filter(item => item.id !== selected.id))
      setSelected(null)
    } catch (err) {
      alert('❌ เกิดข้อผิดพลาด: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const filtered = data.filter(i => i.nickname?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={styles.container}>
      <style jsx>{`
        @media (max-width: 768px) {
          .header-box { flex-direction: column; align-items: flex-start !important; gap: 15px; }
          .filter-bar { flex-direction: column; gap: 15px; }
          .main-layout { flex-direction: column; }
          .side-list { max-height: 350px !important; }
          .search-input { width: 100% !important; }
        }
      `}</style>

      <header style={styles.header} className="header-box">
        <div>
          <h1 style={{ margin: 0, color: '#1a1a1a', fontWeight: '800' }}>📊 Review Center Pro</h1>
          <p style={{ color: '#666', marginTop: '5px' }}>ตรวจสอบและประเมินผลงาน (วิดีโอ & เสียง)</p>
        </div>
        <div style={styles.tabBar}>
          <button onClick={() => setTab('video')} style={styles.tab(tab === 'video')}>🎬 วิดีโอ</button>
          <button onClick={() => setTab('audio')} style={styles.tab(tab === 'audio')}>🎙️ เสียง</button>
        </div>
      </header>

      <div style={styles.filterBar} className="filter-bar">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input type="date" value={startDate} style={styles.dateInput} onChange={(e) => setStartDate(e.target.value)} />
          <span style={{color:'#ccc'}}>ถึง</span>
          <input type="date" value={endDate} style={styles.dateInput} onChange={(e) => setEndDate(e.target.value)} />
          <button onClick={fetchData} style={styles.refreshBtn}>🔄 Refresh</button>
        </div>
        <input 
          placeholder="🔍 ค้นชื่อพนักงาน..." 
          style={styles.search} 
          className="search-input"
          onChange={e => setSearch(e.target.value)} 
        />
      </div>

      <div style={styles.mainLayout} className="main-layout">
        <div style={styles.sideList}>
          {loading ? (
            <div style={styles.infoBox}>กำลังโหลดข้อมูล...</div>
          ) : filtered.length > 0 ? (
            filtered.map(item => (
              <div key={item.id} onClick={() => setSelected(item)} style={styles.card(selected?.id === item.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
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

        <div style={styles.reviewArea}>
          {selected ? (
            <div style={styles.gradingCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ margin: 0 }}>ประเมิน: {selected.nickname}</h3>
                <button onClick={deleteEntry} style={styles.deleteBtnTop}>🗑️ ลบงาน</button>
              </div>
              
              <div style={styles.mediaFrame}>
                {tab === 'video' ? (
                  <video key={selected.id} controls style={{ width: '100%' }} 
                    src={supabase.storage.from('video_training').getPublicUrl(selected.video_answer_url).data.publicUrl} />
                ) : (
                  <div style={{ padding: '40px', textAlign: 'center' }}>
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
                <button onClick={saveGrade} style={styles.saveBtn}>✅ บันทึกผลประเมิน</button>
              </div>
            </div>
          ) : (
            <div style={styles.emptyState}>เลือกรายชื่อทางซ้ายมือเพื่อเริ่มตรวจงาน</div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
  tabBar: { background: '#eee', padding: '5px', borderRadius: '15px', display: 'flex' },
  tab: (active) => ({ border: 'none', padding: '12px 25px', borderRadius: '10px', background: active ? '#8e44ad' : 'none', color: active ? 'white' : '#666', cursor: 'pointer', fontWeight: 'bold' }),
  filterBar: { background: 'white', padding: '15px', borderRadius: '20px', border: '1px solid #eee', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  dateInput: { padding: '10px', borderRadius: '10px', border: '1px solid #ddd' },
  refreshBtn: { padding: '10px 20px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' },
  search: { padding: '10px 20px', borderRadius: '12px', border: '1px solid #eee', width: '250px', background: '#f9f9f9' },
  mainLayout: { display: 'flex', gap: '20px' },
  sideList: { flex: 1, maxHeight: '68vh', overflowY: 'auto' },
  reviewArea: { flex: 2 },
  card: (active) => ({ padding: '20px', background: 'white', borderRadius: '15px', marginBottom: '12px', border: active ? '2px solid #8e44ad' : '1px solid #eee', cursor: 'pointer' }),
  cardSub: { fontSize: '0.8rem', color: '#666', marginTop: '8px' },
  statusBadge: (s) => ({ fontSize: '0.65rem', padding: '4px 10px', borderRadius: '20px', background: s === 'reviewed' ? '#ecfdf5' : '#fff7ed', color: s === 'reviewed' ? '#10b981' : '#f97316', fontWeight: 'bold' }),
  gradingCard: { background: 'white', padding: '30px', borderRadius: '25px', border: '1px solid #eee' },
  mediaFrame: { background: '#000', borderRadius: '20px', overflow: 'hidden', marginBottom: '20px' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '14px', borderRadius: '12px', border: '1px solid #ddd' },
  saveBtn: { padding: '16px', background: '#8e44ad', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' },
  deleteBtnTop: { padding: '8px 15px', background: '#fff0f0', color: '#ff4d4f', border: '1px solid #ffccc7', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' },
  infoBox: { textAlign: 'center', padding: '40px', color: '#999', background: '#fff', borderRadius: '20px' },
  emptyState: { height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', borderRadius: '25px', color: '#ccc', border: '2px dashed #ddd', textAlign: 'center' }
}
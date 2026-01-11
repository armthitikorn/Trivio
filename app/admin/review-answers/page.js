'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function FinalReviewCenter() {
  const [tab, setTab] = useState('video')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  
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
    const relation = tab === 'video' 
      ? 'video_questions!video_answers_question_id_fkey(title)' 
      : 'questions!answers_question_id_fkey(question_text)' 
    
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
    <div style={styles.container} className="admin-container">
      {/* CSS สำหรับจัดการ Responsive */}
      <style jsx>{`
        @media (max-width: 768px) {
          .header-flex { flex-direction: column; align-items: flex-start !important; gap: 15px; }
          .filter-bar-flex { flex-direction: column; gap: 15px; }
          .filter-inputs { width: 100%; flex-wrap: wrap; }
          .search-input { width: 100% !important; }
          .main-layout-flex { flex-direction: column; }
          .side-list { max-height: 300px !important; order: 2; }
          .review-area { order: 1; }
          .grading-form-inner { flex-direction: column; }
        }
      `}</style>

      <header style={styles.header} className="header-flex">
        <div>
          <h1 style={{ margin: 0, color: '#1a1a1a', fontWeight: '800', fontSize: '1.5rem' }}>📊 Review Center Pro</h1>
          <p style={{ color: '#666', marginTop: '5px', fontSize: '0.9rem' }}>ตรวจสอบและประเมินผลงาน (วิดีโอ & เสียง)</p>
        </div>
        <div style={styles.tabBar}>
          <button onClick={() => setTab('video')} style={styles.tab(tab === 'video')}>🎬 วิดีโอ</button>
          <button onClick={() => setTab('audio')} style={styles.tab(tab === 'audio')}>🎙️ เสียง</button>
        </div>
      </header>

      <div style={styles.filterBar} className="filter-bar-flex">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }} className="filter-inputs">
          <input type="date" style={styles.dateInput} onChange={(e) => setStartDate(e.target.value)} />
          <span style={{color:'#ccc'}}>ถึง</span>
          <input type="date" style={styles.dateInput} onChange={(e) => setEndDate(e.target.value)} />
          <button onClick={fetchData} style={styles.refreshBtn}>🔄 ดึงข้อมูล</button>
        </div>
        <input 
          placeholder="🔍 ค้นชื่อพนักงาน..." 
          style={styles.search} 
          className="search-input"
          onChange={e => setSearch(e.target.value)} 
        />
      </div>

      <div style={styles.mainLayout} className="main-layout-flex">
        {/* รายชื่อด้านซ้าย */}
        <div style={styles.sideList} className="side-list">
          {loading ? (
            <div style={styles.infoBox}>กำลังโหลดข้อมูล...</div>
          ) : filtered.length > 0 ? (
            filtered.map(item => (
              <div key={item.id} onClick={() => setSelected(item)} style={styles.card(selected?.id === item.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.95rem' }}>{item.nickname}</strong>
                  <div style={styles.statusBadge(item.status)}>{item.status === 'reviewed' ? 'ตรวจแล้ว' : 'รอตรวจ'}</div>
                </div>
                <div style={styles.cardSub}>
                  {tab === 'video' ? item.video_questions?.title : item.questions?.question_text}
                </div>
              </div>
            ))
          ) : (
            <div style={styles.infoBox}>ไม่พบรายการ</div>
          )}
        </div>

        {/* พื้นที่ตรวจงานด้านขวา */}
        <div style={styles.reviewArea} className="review-area">
          {selected ? (
            <div style={styles.gradingCard}>
              <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>ประเมินผล: {selected.nickname}</h3>
              
              <div style={styles.mediaFrame}>
                {tab === 'video' ? (
                  <video key={selected.id} controls style={{ width: '100%', display: 'block' }} 
                    src={supabase.storage.from('video_training').getPublicUrl(selected.video_answer_url).data.publicUrl} />
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center' }}>
                    <p style={{marginBottom: '15px', color: '#666', fontSize: '0.9rem'}}>🔈 เสียงตอบกลับจากพนักงาน</p>
                    <audio key={selected.id} controls style={{ width: '100%' }}
                      src={supabase.storage.from('recordings').getPublicUrl(selected.audio_answer_url).data.publicUrl} />
                  </div>
                )}
              </div>

              <div style={styles.form}>
                <div style={{ display: 'flex', gap: '10px' }} className="grading-form-inner">
                  <input type="number" placeholder="คะแนน" style={{...styles.input, flex: 1}} 
                    onChange={e => setGrading({...grading, score: e.target.value})} />
                  <input type="text" placeholder="คำแนะนำ..." style={{...styles.input, flex: 3}} 
                    onChange={e => setGrading({...grading, feedback: e.target.value})} />
                </div>
                <button onClick={saveGrade} style={styles.saveBtn}>✅ บันทึกและส่งผลประเมิน</button>
              </div>
            </div>
          ) : (
            <div style={styles.emptyState}>
               เลือกรายชื่อด้านข้างเพื่อเริ่มตรวจงาน
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '15px', fontFamily: 'sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  tabBar: { background: '#f0f0f0', padding: '5px', borderRadius: '12px', display: 'inline-flex' },
  tab: (active) => ({ border: 'none', padding: '10px 18px', borderRadius: '8px', background: active ? '#8e44ad' : 'none', color: active ? 'white' : '#666', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }),
  filterBar: { background: 'white', padding: '15px', borderRadius: '16px', border: '1px solid #eee', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  dateInput: { padding: '8px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.85rem' },
  refreshBtn: { padding: '8px 15px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' },
  search: { padding: '10px 15px', borderRadius: '10px', border: '1px solid #eee', width: '220px', background: '#f9f9f9', fontSize: '0.85rem' },
  mainLayout: { display: 'flex', gap: '20px' },
  sideList: { flex: 1, maxHeight: '70vh', overflowY: 'auto', paddingRight: '5px' },
  reviewArea: { flex: 2, minWidth: 0 },
  card: (active) => ({ padding: '15px', background: 'white', borderRadius: '12px', marginBottom: '10px', border: active ? '2px solid #8e44ad' : '1px solid #eee', cursor: 'pointer', transition: '0.2s', boxShadow: active ? '0 4px 12px rgba(142,68,173,0.1)' : 'none' }),
  cardSub: { fontSize: '0.75rem', color: '#666', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  statusBadge: (s) => ({ fontSize: '0.65rem', padding: '4px 8px', borderRadius: '20px', background: s === 'reviewed' ? '#ecfdf5' : '#fff7ed', color: s === 'reviewed' ? '#10b981' : '#f97316', fontWeight: 'bold' }),
  gradingCard: { background: 'white', padding: '20px', borderRadius: '20px', border: '1px solid #eee', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' },
  mediaFrame: { background: '#000', borderRadius: '15px', overflow: 'hidden', marginBottom: '20px' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px' },
  input: { padding: '12px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '0.9rem' },
  saveBtn: { padding: '14px', background: '#8e44ad', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem' },
  infoBox: { textAlign: 'center', padding: '30px', color: '#999', background: '#fff', borderRadius: '15px' },
  emptyState: { height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', borderRadius: '20px', color: '#999', border: '2px dashed #ddd', textAlign: 'center', padding: '20px' }
}
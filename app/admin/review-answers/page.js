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

  // --- ฟังก์ชันดึงข้อมูล ---
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
      console.error("Fetch Error:", error)
      setData([])
    } else {
      setData(res || [])
    }
    setLoading(false)
    setSelected(null)
  }

  // --- ฟังก์ชันบันทึกการประเมิน ---
  async function saveGrade() {
    if (!selected || !grading.score) return alert('⚠️ กรุณาระบุคะแนนก่อนบันทึก')

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
    } else {
      alert('❌ เกิดข้อผิดพลาดในการบันทึก')
    }
  }

  // --- ฟังก์ชันลบข้อมูลแบบ Full (Storage + Database) ---
  async function deleteEntry() {
    if (!selected) return
    
    const confirmDelete = confirm(`‼️ คุณต้องการลบข้อมูลของ "${selected.nickname}" ใช่หรือไม่?\nการลบนี้จะลบทั้งไฟล์วิดีโอและข้อมูลในฐานข้อมูลอย่างถาวร!`)
    if (!confirmDelete) return

    setLoading(true)
    try {
      const table = tab === 'video' ? 'video_answers' : 'answers'
      const bucket = tab === 'video' ? 'video_training' : 'recordings'
      const filePath = tab === 'video' ? selected.video_answer_url : selected.audio_answer_url

      // 1. ลบไฟล์ออกจาก Storage
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from(bucket)
          .remove([filePath])
        
        if (storageError) console.warn("Storage Delete Warning:", storageError.message)
      }

      // 2. ลบแถวข้อมูลออกจาก Database
      const { error: dbError } = await supabase
        .from(table)
        .delete()
        .eq('id', selected.id)

      if (dbError) throw dbError

      alert('🗑️ ลบข้อมูลและไฟล์เรียบร้อยแล้ว')
      fetchData() // รีเฟรชรายการ
    } catch (err) {
      console.error("Delete Error:", err)
      alert('❌ ไม่สามารถลบข้อมูลได้')
    } finally {
      setLoading(false)
    }
  }

  const filtered = data.filter(i => i.nickname?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={styles.container}>
      {/* CSS สำหรับ Responsive */}
      <style jsx>{`
        @media (max-width: 768px) {
          .header-flex { flex-direction: column; align-items: flex-start !important; gap: 15px; }
          .filter-bar { flex-direction: column; gap: 15px; }
          .search-input { width: 100% !important; }
          .layout-flex { flex-direction: column; }
          .side-list { max-height: 300px !important; order: 2; }
          .review-area { order: 1; }
          .btn-group { flex-direction: column; }
        }
      `}</style>

      <header style={styles.header} className="header-flex">
        <div>
          <h1 style={{ margin: 0, color: '#1a1a1a', fontWeight: '800', fontSize: '1.6rem' }}>📊 Review Center Pro</h1>
          <p style={{ color: '#666', marginTop: '5px' }}>จัดการผลประเมินพนักงาน (วิดีโอ/เสียง)</p>
        </div>
        <div style={styles.tabBar}>
          <button onClick={() => setTab('video')} style={styles.tab(tab === 'video')}>🎬 ตรวจวิดีโอ</button>
          <button onClick={() => setTab('audio')} style={styles.tab(tab === 'audio')}>🎙️ ตรวจเสียง</button>
        </div>
      </header>

      <div style={styles.filterBar} className="filter-bar">
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
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

      <div style={styles.mainLayout} className="layout-flex">
        {/* ส่วนรายชื่อ (ซ้าย) */}
        <div style={styles.sideList} className="side-list">
          {loading ? (
            <div style={styles.infoBox}>กำลังประมวลผล...</div>
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
            <div style={styles.infoBox}>ไม่มีข้อมูล</div>
          )}
        </div>

        {/* ส่วนพื้นที่ตรวจสอบ (ขวา) */}
        <div style={styles.reviewArea} className="review-area">
          {selected ? (
            <div style={styles.gradingCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0 }}>ประเมินงาน: {selected.nickname}</h3>
                <button onClick={deleteEntry} style={styles.deleteMiniBtn}>🗑️ ลบงานนี้</button>
              </div>
              
              <div style={styles.mediaFrame}>
                {tab === 'video' ? (
                  <video key={selected.id} controls style={{ width: '100%', display: 'block' }} 
                    src={supabase.storage.from('video_training').getPublicUrl(selected.video_answer_url).data.publicUrl} />
                ) : (
                  <div style={{ padding: '30px', textAlign: 'center' }}>
                    <p style={{marginBottom: '15px', color: '#ccc'}}>🔈 เสียงตอบกลับพนักงาน</p>
                    <audio key={selected.id} controls style={{ width: '100%' }}
                      src={supabase.storage.from('recordings').getPublicUrl(selected.audio_answer_url).data.publicUrl} />
                  </div>
                )}
              </div>

              <div style={styles.form}>
                <div style={{ display: 'flex', gap: '10px' }} className="btn-group">
                  <input type="number" placeholder="คะแนน" style={{...styles.input, flex: 1}} 
                    onChange={e => setGrading({...grading, score: e.target.value})} />
                  <input type="text" placeholder="ข้อเสนอแนะ..." style={{...styles.input, flex: 3}} 
                    onChange={e => setGrading({...grading, feedback: e.target.value})} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }} className="btn-group">
                  <button onClick={saveGrade} style={styles.saveBtn}>✅ บันทึกคะแนนและส่งผล</button>
                </div>
              </div>
            </div>
          ) : (
            <div style={styles.emptyState}>กรุณาเลือกรายชื่อเพื่อเริ่มการประเมิน</div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '15px', fontFamily: 'system-ui, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
  tabBar: { background: '#eee', padding: '5px', borderRadius: '14px', display: 'flex' },
  tab: (active) => ({ border: 'none', padding: '10px 20px', borderRadius: '10px', background: active ? '#8e44ad' : 'none', color: active ? 'white' : '#666', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }),
  filterBar: { background: 'white', padding: '15px', borderRadius: '18px', border: '1px solid #eee', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  dateInput: { padding: '9px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '0.85rem' },
  refreshBtn: { padding: '9px 18px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' },
  search: { padding: '10px 20px', borderRadius: '12px', border: '1px solid #eee', width: '250px', background: '#f9f9f9' },
  mainLayout: { display: 'flex', gap: '20px' },
  sideList: { flex: 1, maxHeight: '70vh', overflowY: 'auto' },
  reviewArea: { flex: 2 },
  card: (active) => ({ padding: '18px', background: 'white', borderRadius: '15px', marginBottom: '10px', border: active ? '2px solid #8e44ad' : '1px solid #eee', cursor: 'pointer', transition: '0.2s', boxShadow: active ? '0 5px 15px rgba(0,0,0,0.05)' : 'none' }),
  cardSub: { fontSize: '0.75rem', color: '#777', marginTop: '6px' },
  statusBadge: (s) => ({ fontSize: '0.65rem', padding: '4px 10px', borderRadius: '20px', background: s === 'reviewed' ? '#ecfdf5' : '#fff7ed', color: s === 'reviewed' ? '#10b981' : '#f97316', fontWeight: 'bold' }),
  gradingCard: { background: 'white', padding: '25px', borderRadius: '22px', border: '1px solid #eee', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' },
  mediaFrame: { background: '#000', borderRadius: '18px', overflow: 'hidden', marginBottom: '20px' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '14px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '1rem' },
  saveBtn: { padding: '16px', background: '#8e44ad', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', flex: 1 },
  deleteMiniBtn: { padding: '6px 12px', background: '#fff1f0', color: '#cf1322', border: '1px solid #ffa39e', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' },
  infoBox: { textAlign: 'center', padding: '40px', color: '#bbb' },
  emptyState: { height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f9', borderRadius: '22px', color: '#ccc', border: '2px dashed #eee' }
}
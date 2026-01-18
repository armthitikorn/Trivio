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

// ✅ 1. ปรับให้ดึงข้อมูลอัตโนมัติเมื่อมีการเปลี่ยน Tab หรือ วันที่
  useEffect(() => {
    fetchData()
  }, [tab, startDate, endDate]) // เพิ่ม startDate, endDate เป็นตัวเฝ้าดู

  async function fetchData() {
    setLoading(false) // เริ่มต้นด้วยสถานะไม่โหลดก่อนเผื่อกรณี Error
    const table = tab === 'video' ? 'video_answers' : 'answers'
    
    // ตั้งค่า Relation ให้ตรงตาม Schema ของแต่ละตาราง
    const relation = tab === 'video' 
      ? 'video_questions(title)' 
      : 'questions(question_text)' 
    
    setLoading(true)
    try {
      let query = supabase
        .from(table)
        .select(`*, ${relation}`)
        .order('created_at', { ascending: false })

      // ✅ 2. ปรับการกรองวันที่ให้แม่นยำ (รองรับ ISO Format)
      if (startDate) {
        query = query.gte('created_at', `${startDate}T00:00:00.000Z`)
      }
      if (endDate) {
        query = query.lte('created_at', `${endDate}T23:59:59.999Z`)
      }

      const { data: res, error } = await query
      
      if (error) throw error
      setData(res || [])
    } catch (error) {
      console.error("Fetch Error:", error.message)
      setData([])
    } finally {
      setLoading(false)
      setSelected(null)
    }
  }
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

  // --- ฟังก์ชันลบแบบถาวร (เพิ่มใหม่แบบ Full Version) ---
  async function deleteEntry() {
    if (!selected) return
    const confirmDelete = confirm(`⚠️ ยืนยันการลบงานของ "${selected.nickname}"?\nไฟล์จะถูกลบออกจาก Storage และข้อมูลจะหายไปจากระบบทันที!`)
    if (!confirmDelete) return

    setLoading(true)
    try {
      const table = tab === 'video' ? 'video_answers' : 'answers'
      const bucket = tab === 'video' ? 'video_training' : 'recordings'
      const filePath = tab === 'video' ? selected.video_answer_url : selected.audio_answer_url

      // 1. ลบไฟล์ใน Storage
      if (filePath) {
        await supabase.storage.from(bucket).remove([filePath])
      }

      // 2. ลบ Row ใน Database
      const { error: dbError } = await supabase
        .from(table)
        .delete()
        .eq('id', selected.id)

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
      {/* ส่วนจัดการการแสดงผลบนมือถือ */}
      <style jsx>{`
        @media (max-width: 768px) {
          .header-box { flex-direction: column; align-items: flex-start !important; gap: 15px; }
          .filter-bar { flex-direction: column; gap: 15px; }
          .filter-group { width: 100%; flex-wrap: wrap; }
          .main-layout { flex-direction: column; }
          .side-list { max-height: 350px !important; order: 2; }
          .review-area { order: 1; }
          .search-input { width: 100% !important; }
          .form-group { flex-direction: column; }
        }
      `}</style>

      <header style={styles.header} className="header-box">
        <div>
          <h1 style={{ margin: 0, color: '#1a1a1a', fontWeight: '800' }}>📊 Review Center Pro</h1>
          <p style={{ color: '#666', marginTop: '5px' }}>ตรวจสอบและประเมินผลงานพนักงาน (วิดีโอ & เสียง)</p>
        </div>
        <div style={styles.tabBar}>
          <button onClick={() => setTab('video')} style={styles.tab(tab === 'video')}>🎬 ตรวจวิดีโอ</button>
          <button onClick={() => setTab('audio')} style={styles.tab(tab === 'audio')}>🎙️ ตรวจเสียง</button>
        </div>
      </header>

      <div style={styles.filterBar} className="filter-bar">
<div style={{ display: 'flex', gap: '10px', alignItems: 'center' }} className="filter-group">
  <input 
    type="date" 
    value={startDate}
    style={styles.dateInput} 
    onChange={(e) => setStartDate(e.target.value)} 
  />
  <span style={{color:'#ccc'}}>ถึง</span>
  <input 
    type="date" 
    value={endDate}
    style={styles.dateInput} 
    onChange={(e) => setEndDate(e.target.value)} 
  />
  <button onClick={fetchData} style={styles.refreshBtn}>🔄 Refresh</button>
</div>        <input 
          placeholder="🔍 ค้นชื่อพนักงาน..." 
          style={styles.search} 
          className="search-input"
          onChange={e => setSearch(e.target.value)} 
        />
      </div>

      <div style={styles.mainLayout} className="main-layout">
        {/* รายชื่อด้านซ้าย */}
        <div style={styles.sideList} className="side-list">
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
        <div style={styles.reviewArea} className="review-area">
          {selected ? (
            <div style={styles.gradingCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <h3 style={{ margin: 0 }}>ประเมินผล: {selected.nickname}</h3>
                <button onClick={deleteEntry} style={styles.deleteBtnTop}>🗑️ ลบงานชิ้นนี้</button>
              </div>
              
              <div style={styles.mediaFrame}>
                {tab === 'video' ? (
                  <video key={selected.id} controls style={{ width: '100%', display: 'block' }} 
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
                <div style={{ display: 'flex', gap: '10px' }} className="form-group">
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

// --- Styles (คงความสวยงามเดิม + เพิ่มเติมส่วน Responsive) ---
const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
  tabBar: { background: '#eee', padding: '5px', borderRadius: '15px', display: 'flex' },
  tab: (active) => ({ border: 'none', padding: '12px 25px', borderRadius: '10px', background: active ? '#8e44ad' : 'none', color: active ? 'white' : '#666', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s' }),
  filterBar: { background: 'white', padding: '15px', borderRadius: '20px', border: '1px solid #eee', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  dateInput: { padding: '10px', borderRadius: '10px', border: '1px solid #ddd' },
  refreshBtn: { padding: '10px 20px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' },
  search: { padding: '10px 20px', borderRadius: '12px', border: '1px solid #eee', width: '250px', background: '#f9f9f9' },
  mainLayout: { display: 'flex', gap: '20px' },
  sideList: { flex: 1, maxHeight: '68vh', overflowY: 'auto' },
  reviewArea: { flex: 2 },
  card: (active) => ({ padding: '20px', background: 'white', borderRadius: '15px', marginBottom: '12px', border: active ? '2px solid #8e44ad' : '1px solid #eee', cursor: 'pointer', transition: '0.2s', boxShadow: active ? '0 5px 15px rgba(0,0,0,0.05)' : 'none' }),
  cardSub: { fontSize: '0.8rem', color: '#666', marginTop: '8px' },
  statusBadge: (s) => ({ fontSize: '0.65rem', padding: '4px 10px', borderRadius: '20px', background: s === 'reviewed' ? '#ecfdf5' : '#fff7ed', color: s === 'reviewed' ? '#10b981' : '#f97316', fontWeight: 'bold' }),
  gradingCard: { background: 'white', padding: '30px', borderRadius: '25px', border: '1px solid #eee', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' },
  mediaFrame: { background: '#000', borderRadius: '20px', overflow: 'hidden', marginBottom: '20px' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '14px', borderRadius: '12px', border: '1px solid #ddd' },
  saveBtn: { padding: '16px', background: '#8e44ad', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' },
  deleteBtnTop: { padding: '8px 15px', background: '#fff0f0', color: '#ff4d4f', border: '1px solid #ffccc7', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' },
  infoBox: { textAlign: 'center', padding: '40px', color: '#999', background: '#fff', borderRadius: '20px' },
  emptyState: { height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', borderRadius: '25px', color: '#ccc', border: '2px dashed #ddd', textAlign: 'center', padding: '20px' }
}
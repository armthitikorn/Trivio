'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function TrainerResults() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  
  // States สำหรับตัวกรอง
  const [filterName, setFilterName] = useState('')
  const [filterDept, setFilterDept] = useState('All')
  const [filterLevel, setFilterLevel] = useState('All')
  const [filterDate, setFilterDate] = useState('')

  const departments = ['All', 'UOB', 'AYCAP', 'ttb', 'Krungsri', 'Bancassurance', 'Agent', 'Broker', 'DMTM']
  const levels = ['Nursery', 'Rising Star', 'Legend']

  useEffect(() => {
    fetchResults()
  }, [])

  async function fetchResults() {
    setLoading(true)
    const { data, error } = await supabase
      .from('answers')
      .select(`
        id, nickname, player_level, audio_answer_url, created_at, score, comment,
        questions!fk_answers_questions ( question_text ),
        game_sessions!fk_answers_sessions ( target_department, target_segment, category )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error("Query Error:", error)
    } else {
      setResults(data)
    }
    setLoading(false)
  }

  // ฟังก์ชันสำหรับอัปเดตคะแนน (Pass/Fail)
  async function updateGrade(id, status) {
    const { error } = await supabase
      .from('answers')
      .update({ score: status })
      .eq('id', id)
    
    if (error) {
      alert("ไม่สามารถบันทึกผลได้: " + error.message)
    } else {
      // อัปเดตข้อมูลในหน้าจอทันทีโดยไม่ต้องรีโหลดหน้าใหม่
      setResults(results.map(item => item.id === id ? { ...item, score: status } : item))
    }
  }

  // Logic การกรองข้อมูล
  const filteredData = results.filter(item => {
    const matchName = item.nickname?.toLowerCase().includes(filterName.toLowerCase())
    const matchDept = filterDept === 'All' || item.game_sessions?.target_department === filterDept
    const matchLevel = filterLevel === 'All' || item.game_sessions?.target_segment === filterLevel
    
    // กรองวันที่
    const itemDate = new Date(item.created_at).toLocaleDateString('en-CA') // ได้ฟอร์แมต YYYY-MM-DD
    const matchDate = !filterDate || itemDate === filterDate

    return matchName && matchDept && matchLevel && matchDate
  })

  return (
    <div style={{ padding: '30px', background: '#f8f9fa', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
        <h1 style={{ color: '#333', marginBottom: '20px' }}>📊 ผลการทดสอบพนักงาน (Trainer Dashboard)</h1>

        {/* 🔍 แถบตัวกรอง (Filter Bar) */}
        <div style={filterBarShadow}>
          <div style={filterGroup}>
            <label style={labelS}>🔍 ค้นหาชื่อ:</label>
            <input 
              type="text" 
              placeholder="ชื่อพนักงาน..." 
              value={filterName} 
              onChange={(e) => setFilterName(e.target.value)} 
              style={inputS}
            />
          </div>

          <div style={filterGroup}>
            <label style={labelS}>🏢 แผนก:</label>
            <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} style={inputS}>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div style={filterGroup}>
            <label style={labelS}>🎯 ระดับ (Level):</label>
            <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} style={inputS}>
              {levels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div style={filterGroup}>
            <label style={labelS}>📅 วันที่ทำ:</label>
            <input 
              type="date" 
              value={filterDate} 
              onChange={(e) => setFilterDate(e.target.value)} 
              style={inputS}
            />
          </div>
          
          <button onClick={() => { setFilterName(''); setFilterDept('All'); setFilterLevel('All'); setFilterDate(''); }} style={resetBtn}>ล้างตัวกรอง</button>
        </div>

        {/* รายการผลลัพธ์ */}
        {loading ? <p>กำลังโหลดข้อมูล...</p> : (
          <div style={{ marginTop: '20px' }}>
            <p style={{marginBottom: '10px', color: '#666'}}>พบทั้งหมด {filteredData.length} รายการ</p>
            <div style={{ display: 'grid', gap: '15px' }}>
              {filteredData.map((item) => (
                <div key={item.id} style={cardStyle}>
                  {/* ส่วนข้อมูลพนักงาน */}
                  <div style={{ flex: 1.2 }}>
                    <div style={{display:'flex', gap:'5px', marginBottom:'5px'}}>
                        <span style={badgeDept}>{item.game_sessions?.target_department}</span>
                        <span style={badgeLevel(item.game_sessions?.target_segment)}>{item.game_sessions?.target_segment}</span>
                    </div>
                    <h3 style={{margin:'5px 0'}}>{item.nickname}</h3>
                    <p style={{fontSize:'0.9rem'}}><b>โจทย์:</b> {item.questions?.question_text}</p>
                    <p style={{fontSize:'0.8rem', color:'#888'}}>🕒 {new Date(item.created_at).toLocaleString('th-TH')}</p>
                  </div>
                  
                  {/* ส่วนเครื่องเล่นเสียง */}
                  <div style={{ flex: 1 }}>
                    <audio src={supabase.storage.from('recordings').getPublicUrl(item.audio_answer_url).data.publicUrl} controls style={{width:'100%'}} />
                  </div>

                  {/* ส่วนการประเมินผล */}
                  <div style={{ flex: 1, textAlign: 'right', borderLeft: '1px solid #eee', paddingLeft: '20px' }}>
                    <div style={{fontWeight:'bold', marginBottom: '10px', color: item.score === 'PASS' ? '#28a745' : item.score === 'FAIL' ? '#dc3545' : '#666'}}>
                        สถานะ: {item.score || '➖ รอการตรวจ'}
                    </div>
                    <div style={{display: 'flex', gap: '5px', justifyContent: 'flex-end'}}>
                        <button onClick={() => updateGrade(item.id, 'PASS')} style={passBtn}>ผ่าน (PASS)</button>
                        <button onClick={() => updateGrade(item.id, 'FAIL')} style={failBtn}>ไม่ผ่าน (FAIL)</button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredData.length === 0 && <div style={{textAlign: 'center', padding: '50px', color: '#999'}}>ไม่พบข้อมูลที่ตรงตามเงื่อนไข</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Styles
const filterBarShadow = { 
    display: 'flex', flexWrap: 'wrap', gap: '15px', background: 'white', padding: '20px', 
    borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', alignItems: 'flex-end', marginBottom: '30px' 
}
const filterGroup = { display: 'flex', flexDirection: 'column', gap: '5px', flex: '1', minWidth: '150px' }
const labelS = { fontSize: '0.85rem', fontWeight: 'bold', color: '#555' }
const inputS = { padding: '10px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '0.9rem' }
const resetBtn = { padding: '10px 20px', background: '#eee', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }
const cardStyle = { background: 'white', padding: '25px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', gap: '20px' }
const badgeDept = { background: '#e9ecef', color: '#495057', padding: '3px 10px', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 'bold' }
const badgeLevel = (lvl) => ({ background: lvl === 'The Legend' ? '#fff3cd' : '#e7f5ff', color: lvl === 'The Legend' ? '#856404' : '#007bff', padding: '3px 10px', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid' })
const passBtn = { background: '#28a745', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }
const failBtn = { background: '#dc3545', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }
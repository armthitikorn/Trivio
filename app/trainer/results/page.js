'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function TrainerResults() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [tempComments, setTempComments] = useState({})

  const [filterName, setFilterName] = useState('')
  const [filterDept, setFilterDept] = useState('All')
  const [filterLevel, setFilterLevel] = useState('All')
  const [filterDate, setFilterDate] = useState('')

  useEffect(() => { fetchResults() }, [])

  async function fetchResults() {
    setLoading(true)
    const { data, error } = await supabase
      .from('answers')
      .select(`
        id, nickname, player_level, audio_answer_url, created_at, score, comment,
        questions!fk_answers_questions ( question_text ),
        game_sessions!fk_answers_sessions ( target_department, target_segment )
      `)
      .order('created_at', { ascending: false })

    if (error) console.error(error)
    else setResults(data)
    setLoading(false)
  }

  // --- ฟังก์ชัน Export เป็น Excel (CSV) ---
  const exportToCSV = () => {
    const headers = ["วันที่", "ชื่อพนักงาน", "แผนก", "ระดับ", "โจทย์", "สถานะ", "ความคิดเห็นเทรนเนอร์"]
    const rows = filteredData.map(item => [
      new Date(item.created_at).toLocaleDateString('th-TH'),
      item.nickname,
      item.game_sessions?.target_department,
      item.player_level,
      item.questions?.question_text,
      item.score === 1 ? "ผ่าน" : item.score === 2 ? "ไม่ผ่าน" : "รอตรวจ",
      item.comment || "-"
    ])

    let csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `รายงานผลการประเมิน_${new Date().toLocaleDateString()}.csv`
    link.click()
  }

  // --- ฟังก์ชันสั่งพิมพ์ (Print to PDF) ---
  const handlePrint = () => {
    window.print()
  }

  async function updateGrade(id, scoreValue) {
    const feedback = tempComments[id] || ""
    const { error } = await supabase.from('answers').update({ score: scoreValue, comment: feedback }).eq('id', id)
    if (!error) { alert("บันทึกสำเร็จ!"); fetchResults(); }
  }

  const filteredData = results.filter(item => {
    const matchName = item.nickname?.toLowerCase().includes(filterName.toLowerCase())
    const matchDept = filterDept === 'All' || item.game_sessions?.target_department === filterDept
    const matchLevel = filterLevel === 'All' || item.player_level === filterLevel
    const matchDate = !filterDate || new Date(item.created_at).toISOString().split('T')[0] === filterDate
    return matchName && matchDept && matchLevel && matchDate
  })

  return (
    <div style={{ padding: '30px', background: '#f8f9fa', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      
      {/* ส่วนหัวที่ซ่อนเวลาพิมพ์ */}
      <div className="no-print" style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1>📊 ระบบสรุปผลประเมินพนักงาน</h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={exportToCSV} style={exportBtn}>📥 Download Excel</button>
            <button onClick={handlePrint} style={printBtn}>🖨️ Print PDF Report</button>
          </div>
        </div>

        {/* แถบตัวกรอง */}
        <div style={filterBarContainer}>
          <input placeholder="ค้นชื่อ..." value={filterName} onChange={(e)=>setFilterName(e.target.value)} style={inputStyle}/>
          <select value={filterDept} onChange={(e)=>setFilterDept(e.target.value)} style={inputStyle}>
            <option value="All">ทุกแผนก</option>
            {['UOB', 'AYCAP', 'ttb', 'Krungsri'].map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filterLevel} onChange={(e)=>setFilterLevel(e.target.value)} style={inputStyle}>
            <option value="All">ทุกระดับ</option>
            {['Nursery', 'Rising Star', 'Legend'].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <input type="date" value={filterDate} onChange={(e)=>setFilterDate(e.target.value)} style={inputStyle}/>
        </div>
      </div>

      {/* เนื้อหาหลัก */}
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        
        {/* ตารางแสดงผลเฉพาะตอนพิมพ์ */}
        <div className="only-print">
            <h2 style={{textAlign:'center'}}>รายงานผลการประเมินทักษะการพูด (Audio Roleplay)</h2>
            <p style={{textAlign:'center'}}>ข้อมูล ณ วันที่ {new Date().toLocaleDateString('th-TH')}</p>
            <table style={tableStyle}>
                <thead>
                    <tr>
                        <th>พนักงาน</th>
                        <th>ระดับ</th>
                        <th>โจทย์</th>
                        <th>สถานะ</th>
                        <th>คอมเมนต์จากเทรนเนอร์</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredData.map(item => (
                        <tr key={item.id}>
                            <td>{item.nickname} ({item.game_sessions?.target_department})</td>
                            <td>{item.player_level}</td>
                            <td>{item.questions?.question_text}</td>
                            <td>{item.score === 1 ? "ผ่าน" : "ไม่ผ่าน"}</td>
                            <td>{item.comment || "-"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* Card แสดงผลในหน้าจอปกติ (ซ่อนตอนพิมพ์) */}
        <div className="no-print" style={{ display: 'grid', gap: '15px' }}>
          {filteredData.map((item) => (
            <div key={item.id} style={cardStyle}>
              <div style={{ flex: 1 }}>
                <span style={badgeStyle}>{item.player_level}</span>
                <h3 style={{margin:'5px 0'}}>{item.nickname}</h3>
                <p style={{fontSize:'0.85rem', color:'#666'}}><b>โจทย์:</b> {item.questions?.question_text}</p>
                <audio src={supabase.storage.from('recordings').getPublicUrl(item.audio_answer_url).data.publicUrl} controls style={{width:'100%', marginTop:'10px'}} />
              </div>
              <div style={{ flex: 1, borderLeft: '1px solid #eee', paddingLeft: '20px' }}>
                <textarea 
                  placeholder="ใส่คอมเมนต์ให้น้องที่นี่..."
                  value={tempComments[item.id] !== undefined ? tempComments[item.id] : (item.comment || "")}
                  onChange={(e) => setTempComments({...tempComments, [item.id]: e.target.value})}
                  style={textareaStyle}
                />
                <div style={{display:'flex', gap:'5px'}}>
                  <button onClick={()=>updateGrade(item.id, 1)} style={passBtn}>ให้ผ่าน</button>
                  <button onClick={()=>updateGrade(item.id, 2)} style={failBtn}>ไม่ผ่าน</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CSS สำหรับจัดการการพิมพ์ */}
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .only-print { display: block !important; }
          body { background: white !important; padding: 0 !important; }
          @page { size: landscape; margin: 1cm; }
        }
        .only-print { display: none; }
      `}</style>
    </div>
  )
}

// Styles
const filterBarContainer = { display:'flex', gap:'10px', marginBottom:'20px', background:'white', padding:'15px', borderRadius:'15px', boxShadow:'0 2px 10px rgba(0,0,0,0.05)' }
const inputStyle = { padding: '10px', borderRadius: '8px', border: '1px solid #ddd', flex: 1 }
const exportBtn = { padding: '10px 15px', background: '#217346', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }
const printBtn = { padding: '10px 15px', background: '#007bff', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }
const cardStyle = { background: 'white', padding: '20px', borderRadius: '20px', display: 'flex', gap: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }
const badgeStyle = { background: '#6f42c1', color: 'white', padding: '3px 8px', borderRadius: '5px', fontSize: '0.7rem' }
const textareaStyle = { width: '100%', height: '70px', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '10px' }
const passBtn = { flex:1, padding:'10px', background:'#28a745', color:'white', border:'none', borderRadius:'5px', cursor:'pointer' }
const failBtn = { flex:1, padding:'10px', background:'#dc3545', color:'white', border:'none', borderRadius:'5px', cursor:'pointer' }
const tableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '20px', fontSize: '12px' }
// เพิ่มเติมสไตล์ table ในส่วน global style หรือ style object: 
// tableStyle.border = "1px solid #ddd", tableStyle.th = "background:#f4f4f4; padding:10px", tableStyle.td = "padding:10px; border:1px solid #ddd"
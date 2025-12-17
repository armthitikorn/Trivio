'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function TrainerResults() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterDept, setFilterDept] = useState('All')

  const departments = ['All', 'UOB', 'AYCAP', 'ttb', 'Krungsri', 'Bancassurance', 'Agent', 'Broker', 'DMTM']

  useEffect(() => {
    fetchResults()
  }, [])

  async function fetchResults() {
    setLoading(true)
    // ดึงข้อมูลคำตอบ พร้อมข้อมูลโจทย์และข้อมูล Session (เพื่อให้รู้ว่าเป็นแผนกไหน)
    const { data, error } = await supabase
      .from('answers')
      .select(`
        id,
        nickname,
        player_level,
        audio_answer_url,
        created_at,
        score,
        comment,
        questions ( question_text ),
        game_sessions ( target_department, target_segment, category )
      `)
      .order('created_at', { ascending: false })

    if (error) console.error(error)
    else setResults(data)
    setLoading(false)
  }

  async function updateGrade(id, status, comment) {
    const { error } = await supabase
      .from('answers')
      .update({ score: status, comment: comment })
      .eq('id', id)
    
    if (!error) {
      alert('บันทึกผลการประเมินเรียบร้อย!')
      fetchResults() // รีโหลดข้อมูล
    }
  }

  const filteredData = filterDept === 'All' 
    ? results 
    : results.filter(r => r.game_sessions?.target_department === filterDept)

  return (
    <div style={{ padding: '40px', background: '#f4f7f6', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1>📊 ผลการทดสอบพนักงาน (Results)</h1>
          <select 
            value={filterDept} 
            onChange={(e) => setFilterDept(e.target.value)}
            style={{ padding: '10px', borderRadius: '10px', border: '1px solid #ddd' }}
          >
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {loading ? <p>กำลังโหลดข้อมูล...</p> : (
          <div style={{ display: 'grid', gap: '20px' }}>
            {filteredData.map((item) => (
              <div key={item.id} style={cardStyle}>
                <div style={{ flex: 1 }}>
                  <span style={badgeStyle(item.game_sessions?.target_segment)}>
                    {item.game_sessions?.target_segment}
                  </span>
                  <h3 style={{ margin: '10px 0' }}>{item.nickname} <small style={{color:'#888'}}>({item.game_sessions?.target_department})</small></h3>
                  <p><b>โจทย์:</b> {item.questions?.question_text}</p>
                  <p style={{ fontSize: '0.8rem', color: '#999' }}>เมื่อ: {new Date(item.created_at).toLocaleString('th-TH')}</p>
                </div>

                <div style={{ flex: 1, textAlign: 'center' }}>
                  <p style={{marginBottom:'5px', fontWeight:'bold'}}>🎧 ฟังเสียงคำตอบ:</p>
                  <audio 
                    src={supabase.storage.from('recordings').getPublicUrl(item.audio_answer_url).data.publicUrl} 
                    controls 
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ flex: 1, textAlign: 'right', borderLeft: '1px solid #eee', paddingLeft: '20px' }}>
                  <p style={{marginBottom:'10px'}}><b>สถานะ:</b> {item.score || 'รอการประเมิน'}</p>
                  <button onClick={() => updateGrade(item.id, 'PASS', 'ดีเยี่ยม')} style={passBtn}>ผ่าน (PASS)</button>
                  <button onClick={() => updateGrade(item.id, 'FAIL', 'ควรปรับปรุง')} style={failBtn}>ไม่ผ่าน (FAIL)</button>
                </div>
              </div>
            ))}
            {filteredData.length === 0 && <p style={{textAlign:'center', color:'#999'}}>ยังไม่มีข้อมูลการส่งคำตอบในขณะนี้</p>}
          </div>
        )}
      </div>
    </div>
  )
}

// สไตล์ตกแต่ง
const cardStyle = {
  background: 'white', padding: '25px', borderRadius: '20px', display: 'flex', alignItems: 'center',
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)', gap: '20px'
}
const badgeStyle = (segment) => ({
  background: segment === 'The Legend' ? '#ffd700' : '#6f42c1',
  color: segment === 'The Legend' ? '#000' : '#white',
  padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 'bold'
})
const passBtn = { background: '#28a745', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', marginRight: '10px' }
const failBtn = { background: '#dc3545', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer' }
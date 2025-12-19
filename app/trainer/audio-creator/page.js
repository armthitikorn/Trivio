'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function AudioCreator() {
  const [title, setTitle] = useState('')
  const [dept, setDept] = useState('UOB')
  const [cat, setCat] = useState('Introduction')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)

  async function uploadTask() {
    if (!file || !title) return alert('กรุณาใส่ชื่อโจทย์และเลือกไฟล์เสียง')
    setLoading(true)

    try {
      // 1. อัปโหลดไปที่ Bucket 'recordings' ตามที่ท่านใช้
      const path = `questions/${Date.now()}_${file.name}`
      const { error: upError } = await supabase.storage.from('recordings').upload(path, file)
      if (upError) throw upError

      // 2. บันทึกลงตาราง 'questions'
      const { error: dbError } = await supabase.from('questions').insert([{
        question_text: title,
        media_url: path, // เชื่อมกับ Bucket recordings
        target_department: dept,
        category: cat
      }])

      if (dbError) throw dbError
      alert('สร้างโจทย์เสียงสำเร็จ!')
      setTitle(''); setFile(null);
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '40px', maxWidth: '500px', margin: '0 auto' }}>
      <h2>🎙️ สร้างโจทย์เสียงใหม่ (Trainer)</h2>
      <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '15px' }}>
        <label>ชื่อโจทย์:</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', marginBottom: '15px', padding: '10px' }} />
        
        <label>แผนก:</label>
        <select value={dept} onChange={e => setDept(e.target.value)} style={{ width: '100%', marginBottom: '15px', padding: '10px' }}>
          <option value="UOB">UOB</option>
          <option value="Broker">Broker</option>
        </select>

        <label>เลือกไฟล์เสียงลูกค้า:</label>
        <input type="file" accept="audio/*" onChange={e => setFile(e.target.files[0])} style={{ marginBottom: '20px' }} />

        <button onClick={uploadTask} disabled={loading} style={{ width: '100%', padding: '15px', background: '#6f42c1', color: 'white', border: 'none', borderRadius: '10px' }}>
          {loading ? 'กำลังบันทึก...' : 'บันทึกโจทย์เสียง'}
        </button>
      </div>
    </div>
  )
}
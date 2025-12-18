'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert('❌ เข้าสู่ระบบไม่สำเร็จ: ' + error.message)
    } else {
      router.push('/') // Login สำเร็จให้ไปหน้าแรก
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <div style={styles.header}>
          <h1 style={{ color: '#8e44ad', margin: 0, fontWeight: '900' }}>TRIVIO</h1>
          <p style={{ color: '#666' }}>Supervisor & Planner Access</p>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input 
              type="email" 
              placeholder="admin@trivio.com" 
              style={styles.input} 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              style={styles.input} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
        
        <p style={styles.footer}>ระบบความปลอดภัยสำหรับหัวหน้างานเท่านั้น</p>
      </div>
    </div>
  )
}

const styles = {
  container: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' },
  loginBox: { width: '400px', background: 'white', padding: '40px', borderRadius: '30px', boxShadow: '0 20px 60px rgba(0,0,0,0.05)' },
  header: { textAlign: 'center', marginBottom: '30px' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '0.85rem', fontWeight: 'bold', color: '#444' },
  input: { padding: '14px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '1rem', outline: 'none' },
  button: { padding: '16px', borderRadius: '12px', border: 'none', background: '#8e44ad', color: 'white', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' },
  footer: { textAlign: 'center', marginTop: '25px', fontSize: '0.75rem', color: '#aaa' }
}
'use client'
import Link from 'next/link'

export default function Home() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh', 
      fontFamily: 'sans-serif',
      background: '#f0f2f5'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '10px' }}>🎲 SupaQuiz</h1>
      <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '40px' }}>เกมตอบคำถามออนไลน์ Real-time</p>
      
      <div style={{ display: 'flex', gap: '20px' }}>
        {/* ปุ่มไปหน้าคนสร้างโจทย์ */}
        <Link href="/host">
          <button style={{ 
            padding: '15px 30px', 
            fontSize: '1.2rem', 
            background: '#0070f3', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            cursor: 'pointer' 
          }}>
            👩‍🏫 สำหรับคนสร้างโจทย์ (Host)
          </button>
        </Link>

        {/* ปุ่มสำหรับคนเล่น (เดี๋ยวเราจะทำหน้านี้กันต่อ) */}
        <Link href="/play">
          <button style={{ 
            padding: '15px 30px', 
            fontSize: '1.2rem', 
            background: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            cursor: 'pointer' 
          }}>
            🎮 สำหรับคนเล่น (Join Game)
          </button>
        </Link>
      </div>
    </div>
  )
}
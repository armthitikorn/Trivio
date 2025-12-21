'use client'

export default function PlayerLayout({ children }) {
  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "#f0f2f5", // สีพื้นหลังเทาอ่อน ดูสบายตา
      fontFamily: "'Inter', sans-serif",
      width: "100%", // มั่นใจว่ากว้างเต็มจอ
      display: "flex",
      flexDirection: "column"
    }}>
      {/* Layout นี้ถูกออกแบบมาให้ "ไม่มี Sidebar" 
          เพื่อให้พนักงานเห็นแบบทดสอบเต็มหน้าจอโทรศัพท์ 
      */}
      
      <main style={{ flex: 1, width: "100%" }}>
        {children}
      </main>

      {/* คุณสามารถเพิ่ม Footer เล็กๆ ตรงนี้ได้ถ้าต้องการ */}
    </div>
  )
}
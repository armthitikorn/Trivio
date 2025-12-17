import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// สำคัญมาก: ต้องมีคำว่า export ข้างหน้า
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
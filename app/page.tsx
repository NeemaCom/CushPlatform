import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default function HomePage() {
  // Check if user is authenticated by looking for session cookie
  const cookieStore = cookies()
  const sessionCookie = cookieStore.get('connect.sid')
  
  if (sessionCookie) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
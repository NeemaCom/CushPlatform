import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default async function HomePage() {
  // Check if user is authenticated by looking for session cookie
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('connect.sid')
  
  if (sessionCookie) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
import { notFound } from 'next/navigation'

export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_DEV_TOOLS) {
    notFound()
  }
  return <>{children}</>
}

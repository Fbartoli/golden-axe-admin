'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Loader2 } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        router.push('/')
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error || 'Invalid password')
      }
    } catch {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center">
            <Lock className="h-6 w-6 text-gold" />
          </div>
          <CardTitle className="text-2xl">
            <span className="text-gold">Horusblock</span> Admin
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="sr-only">Admin Password</label>
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password…"
                autoComplete="current-password"
                autoFocus
                className="h-12"
                aria-describedby={error ? "password-error" : undefined}
              />
            </div>

            {error && (
              <p id="password-error" role="alert" aria-live="polite" className="text-red-500 text-sm">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading || !password}
              className="w-full h-12"
              variant="gold"
            >
              {loading ? (
                <>
                  <span className="animate-spin" aria-hidden="true">
                    <Loader2 className="h-4 w-4 mr-2" />
                  </span>
                  <span>Signing in…</span>
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

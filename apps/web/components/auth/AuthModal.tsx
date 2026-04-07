'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from '@/lib/auth'
import { useBoundStore } from '@/src/stores/store'

// ─── AuthModal ────────────────────────────────────────────────────────────────
// Glass-morphism modal with Sign In / Sign Up tabs + Google OAuth.
// Open by calling useBoundStore(s => s.openAuthModal)() from anywhere.

type Tab = 'signin' | 'signup'

export function AuthModal() {
  const isOpen = useBoundStore((s) => s.authModalOpen)
  const closeModal = useBoundStore((s) => s.closeAuthModal)
  const [tab, setTab] = useState<Tab>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function resetForm() {
    setEmail('')
    setPassword('')
    setError(null)
    setSuccess(null)
    setShowPassword(false)
  }

  function handleTabChange(next: Tab) {
    setTab(next)
    resetForm()
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (tab === 'signin') {
        const err = await signInWithEmail(email, password)
        if (err) {
          setError(err)
        } else {
          closeModal()
          resetForm()
        }
      } else {
        const err = await signUpWithEmail(email, password)
        if (err) {
          setError(err)
        } else {
          setSuccess('Check your email for a confirmation link.')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
      // After OAuth redirect this component unmounts — no need to do anything
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md rounded-2xl border border-outline-variant/30 bg-surface-container-low/90 backdrop-blur-2xl p-6 relative"
              style={{ boxShadow: '0 0 40px rgba(183,159,255,0.12), 0 0 0 1px rgba(183,159,255,0.08)' }}
              initial={{ scale: 0.95, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                type="button"
                onClick={closeModal}
                className="absolute top-4 right-4 h-8 w-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Header */}
              <div className="mb-6">
                <h2 className="text-xl font-headline font-bold text-on-surface">
                  {tab === 'signin' ? 'Welcome back' : 'Create account'}
                </h2>
                <p className="text-sm text-on-surface-variant mt-1">
                  {tab === 'signin'
                    ? 'Sign in to save simulations and view history.'
                    : 'Sign up for unlimited free-tier AI simulations.'}
                </p>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 p-1 rounded-xl bg-surface-container mb-6">
                {(['signin', 'signup'] as Tab[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTabChange(t)}
                    className={[
                      'flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-150',
                      tab === t
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface',
                    ].join(' ')}
                  >
                    {t === 'signin' ? 'Sign In' : 'Sign Up'}
                  </button>
                ))}
              </div>

              {/* Google OAuth button */}
              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface-container hover:bg-surface-container-high text-sm font-medium text-on-surface transition-colors disabled:opacity-60 mb-4"
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-outline-variant/30" />
                <span className="text-xs text-on-surface-variant">or</span>
                <div className="flex-1 h-px bg-outline-variant/30" />
              </div>

              {/* Email form */}
              <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
                {/* Email field */}
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant pointer-events-none" />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-outline-variant/30 bg-surface-container text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
                  />
                </div>

                {/* Password field */}
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
                    minLength={tab === 'signup' ? 8 : undefined}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-outline-variant/30 bg-surface-container text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      className="text-sm text-error bg-error/10 rounded-lg px-3 py-2"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Success (sign-up confirmation) */}
                <AnimatePresence>
                  {success && (
                    <motion.p
                      className="text-sm text-secondary bg-secondary/10 rounded-lg px-3 py-2"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      {success}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="w-full py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {tab === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Google icon ──────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

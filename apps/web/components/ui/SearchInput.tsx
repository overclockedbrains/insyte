'use client'

import { useRef } from 'react'
import { SearchIcon, XIcon } from 'lucide-react'

interface SearchInputProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className = '' }: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      className={[
        'flex items-center gap-3 bg-surface-container-low border rounded-2xl px-4 py-2.5 transition-all duration-200 focus-within:border-secondary/30 focus-within:ring-1 focus-within:ring-secondary/50',
        value ? 'border-secondary/30' : 'border-outline-variant hover:border-outline',
        className,
      ].join(' ')}
    >
      <SearchIcon className="h-4 w-4 text-on-surface-variant shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="searchbar-input-no-ring flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant outline-none font-body"
      />
      {value && (
        <button
          type="button"
          onClick={() => { onChange(''); inputRef.current?.focus() }}
          className="text-on-surface-variant hover:text-on-surface transition-colors"
          aria-label="Clear"
        >
          <XIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

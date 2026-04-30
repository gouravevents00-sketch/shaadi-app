'use client'

import React, { useState } from 'react'

interface QuickDate { label: string; value: string }

interface Props {
  value: string
  onChange: (v: string) => void
  onBlur?: React.FocusEventHandler<HTMLInputElement>
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>
  onQuickSelect?: (v: string) => void
  quickDates?: QuickDate[]
  className?: string
  autoFocus?: boolean
  required?: boolean
}

export default function SmartDatePicker({
  value, onChange, onBlur, onKeyDown, onQuickSelect,
  quickDates, className, autoFocus, required,
}: Props) {
  const [focused, setFocused] = useState(false)
  const showChips = focused && quickDates && quickDates.length > 0

  return (
    <div className="relative inline-block w-full">
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={e => { setFocused(false); onBlur?.(e) }}
        onKeyDown={onKeyDown}
        autoFocus={autoFocus}
        required={required}
        className={className}
      />
      {showChips && (
        <div className="absolute top-full left-0 mt-1 flex flex-wrap gap-1 z-30 bg-white shadow-lg border border-stone-100 rounded-lg px-2 py-1.5 min-w-max">
          <p className="w-full text-[10px] text-stone-400 font-medium mb-0.5">Quick select</p>
          {quickDates.map(d => (
            <button
              key={d.value}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onChange(d.value); onQuickSelect?.(d.value); setFocused(false) }}
              className={`text-xs border rounded px-2 py-0.5 font-medium transition-colors whitespace-nowrap ${
                value === d.value
                  ? 'bg-rose-700 border-rose-700 text-white'
                  : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

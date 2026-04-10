import React from 'react'
import { label9 } from './outlinerStyles'

export default function LabelField({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={label9}>{label}</label>
      {children}
    </div>
  )
}

export const mono = { fontFamily: 'var(--font-mono)' }
export const label9 = { ...mono, fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 5 }
export const inputBase = { width: '100%', padding: '7px 10px', background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
export const taBase = { ...inputBase, lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit' }
export const btnSm = { padding: '3px 8px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text-secondary)', ...mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em' }
export const btnDanger = { ...btnSm, border: '1px solid rgba(196,64,64,0.35)', color: 'var(--danger)' }
export const btnGreen = { padding: '6px 14px', background: 'var(--green-bright)', color: '#0a0f0a', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', ...mono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }

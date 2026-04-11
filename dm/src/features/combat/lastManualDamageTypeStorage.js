const KEY = 'gh.dm.lastManualDamageType'

export function readLastManualDamageType() {
  try {
    return sessionStorage.getItem(KEY) || ''
  } catch {
    return ''
  }
}

export function writeLastManualDamageType(id) {
  try {
    if (id) sessionStorage.setItem(KEY, id)
    else sessionStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

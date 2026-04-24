import { beforeEach, describe, expect, it } from 'vitest'
import { readLastManualDamageType, writeLastManualDamageType } from './lastManualDamageTypeStorage.js'

describe('lastManualDamageTypeStorage', () => {
  const storage = new Map()

  beforeEach(() => {
    storage.clear()
    globalThis.sessionStorage = {
      getItem: (k) => storage.get(k) ?? null,
      setItem: (k, v) => {
        storage.set(k, String(v))
      },
      removeItem: (k) => {
        storage.delete(k)
      },
    }
  })

  it('reads empty string when unset', () => {
    expect(readLastManualDamageType()).toBe('')
  })

  it('writes and reads a selected damage type id', () => {
    writeLastManualDamageType('necrotic')
    expect(readLastManualDamageType()).toBe('necrotic')
  })

  it('removes persisted value when writing empty id', () => {
    writeLastManualDamageType('fire')
    writeLastManualDamageType('')
    expect(readLastManualDamageType()).toBe('')
  })
})

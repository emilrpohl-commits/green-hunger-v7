import React, { useState, useEffect } from 'react'
import { resolvePortraitSrc, portraitInitial } from '../../lib/resolvePortraitSrc.js'

/**
 * Circular (or rounded) portrait with fallback initial.
 * @param {'sm'|'md'|'lg'|'hero'} [size='md']
 */
export default function CharacterPortrait({
  char = {},
  size = 'md',
  className = '',
  style = {},
}) {
  const [broken, setBroken] = useState(false)
  const dim = size === 'sm' ? 40 : size === 'lg' ? 56 : size === 'hero' ? 120 : 48
  useEffect(() => {
    setBroken(false)
  }, [char.id, char.image, char.portrait_thumb_storage_path])
  const src = resolvePortraitSrc({
    portraitUrl: char.portraitUrl || char.portrait_url,
    portrait_thumb_storage_path: char.portrait_thumb_storage_path,
    portrait_original_storage_path: char.portrait_original_storage_path,
    image: char.image,
    name: char.name,
  })
  const initial = portraitInitial(char.name)
  const borderColor = char.colour || 'var(--border)'

  return (
    <div
      className={className}
      style={{
        width: dim,
        height: dim,
        borderRadius: size === 'hero' ? 'var(--radius-lg)' : '50%',
        overflow: 'hidden',
        flexShrink: 0,
        border: `2px solid ${borderColor}`,
        background: 'var(--bg-raised)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {src && !broken ? (
        <img
          src={src}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top center',
            display: 'block',
          }}
          onError={() => setBroken(true)}
        />
      ) : (
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: dim * 0.38,
            color: 'var(--text-muted)',
            lineHeight: 1,
          }}
        >
          {initial}
        </span>
      )}
    </div>
  )
}

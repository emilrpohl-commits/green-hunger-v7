import React from 'react'
import { getSceneMediaPublicUrl } from '@shared/lib/sceneMediaStorage.js'

/**
 * Atmospheric scene image: vignette + dark overlay; content stays readable (sibling should be position relative z-index).
 */
export default function SceneBackdrop({ imageUrlOrPath, transitionKey }) {
  const url = imageUrlOrPath ? getSceneMediaPublicUrl(imageUrlOrPath) : null
  if (!url) return null

  return (
    <div
      key={transitionKey || url}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        animation: 'ghSceneFade 0.45s ease-out',
      }}
    >
      <style>{`
        @keyframes ghSceneFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      <img
        src={url}
        alt=""
        loading="lazy"
        decoding="async"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'brightness(0.35) saturate(0.85)',
          transform: 'scale(1.03)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(8,12,10,0.55) 0%, rgba(8,12,10,0.82) 45%, rgba(8,12,10,0.92) 100%)',
          boxShadow: 'inset 0 0 120px rgba(0,0,0,0.5)',
        }}
      />
    </div>
  )
}

/** Best-effort cleanup after a failed legacy import (session + stat blocks created in this pass). */
export async function rollbackPartialImport(supabase, sessionId, statBlockIds) {
  const now = new Date().toISOString()
  const errors = []
  if (sessionId) {
    const { error } = await supabase.from('sessions').update({ archived_at: now }).eq('id', sessionId)
    if (error) errors.push(`Session rollback: ${error.message}`)
  }
  for (const sid of [...(statBlockIds || [])].reverse()) {
    const { error } = await supabase.from('stat_blocks').update({ archived_at: now }).eq('id', sid)
    if (error) errors.push(`Stat block rollback (${sid}): ${error.message}`)
  }
  return errors
}

/**
 * Non-transactional import with rollback on failure.
 * @param {object} deps
 * @param {import('@supabase/supabase-js').SupabaseClient} deps.supabase
 */
export async function runLegacySessionImport(deps) {
  const {
    supabase,
    parsed,
    adventureId,
    saveStatBlock,
    saveSession,
    saveScene,
    saveBeat,
    saveBranch,
    addLog,
    onSessionCreated,
  } = deps

  let currentStep = 'init'
  let createdSessionId = null
  const createdStatBlockIds = []
  try {
    const statBlockIdMap = {}
    for (const sb of parsed.statBlocks) {
      currentStep = `stat block: ${sb.name}`
      addLog('pending', `Saving stat block: ${sb.name}…`)
      const { modifiers: _m, ...sbPayload } = sb
      const { data, error } = await saveStatBlock(sbPayload)
      if (error) throw new Error(`Stat block "${sb.name}": ${error}`)
      if (data?.id) createdStatBlockIds.push(data.id)
      statBlockIdMap[sb.name.toLowerCase()] = data.id
      if (data.slug) statBlockIdMap[String(data.slug).toLowerCase()] = data.id
      addLog('ok', `Stat block: ${sb.name}`)
    }

    currentStep = 'session'
    addLog('pending', `Saving session: ${parsed.sessionTitle}…`)
    const { data: session, error: sessErr } = await saveSession({
      adventure_id: adventureId,
      session_number: parsed.sessionNumber,
      order: parsed.sessionNumber,
      title: parsed.sessionTitle,
      subtitle: parsed.chapterSubtitle,
      notes: parsed.backgroundNotes,
      estimated_duration: parsed.estimatedDuration,
      objectives: parsed.objectives,
    })
    if (sessErr) throw new Error(`Session: ${sessErr}`)
    createdSessionId = session.id
    addLog('ok', `Session: ${parsed.sessionTitle}`)
    if (typeof onSessionCreated === 'function') onSessionCreated(session.id)

    const sceneIdMap = {}
    const sortedScenes = [
      ...parsed.scenes.filter((s) => !s.isBranching),
      ...parsed.scenes.filter((s) => s.isBranching),
    ]

    for (const scene of sortedScenes) {
      currentStep = `scene: ${scene.title}`
      addLog('pending', `Saving Scene ${scene.sceneNumber}: ${scene.title}…`)

      const { data: savedScene, error: sceneErr } = await saveScene({
        session_id: session.id,
        order: scene.order,
        slug: scene.slug,
        title: scene.title,
        scene_type: scene.sceneType,
        purpose: scene.purpose,
        estimated_time: scene.estimatedTime,
        fallback_notes: scene.fallbackNotes,
        dm_notes: scene.dmNotes,
        outcomes: scene.outcomes,
        is_published: false,
      })
      if (sceneErr) throw new Error(`Scene "${scene.title}": ${sceneErr}`)
      sceneIdMap[scene.sceneNumber] = savedScene
      addLog('ok', `Scene ${scene.sceneNumber}: ${scene.title}`)

      for (const beat of scene.beats) {
        currentStep = `beat: ${beat.title}`
        const sbNameLower = beat.statBlockRef?.toLowerCase()
        const sbIndexLower = beat.statBlockSourceIndex?.toLowerCase()
        const sbKey = sbNameLower
          ? Object.keys(statBlockIdMap).find((k) => sbNameLower.includes(k) || k.includes(sbNameLower))
          : null
        const sbKeyByIndex = sbIndexLower
          ? Object.keys(statBlockIdMap).find((k) => k === sbIndexLower)
          : null

        const { error: beatErr } = await saveBeat({
          scene_id: savedScene.id,
          order: beat.order,
          slug: beat.slug,
          title: beat.title,
          type: beat.type,
          trigger_text: beat.triggerText,
          content: beat.content,
          player_text: beat.playerText || beat.content,
          dm_notes: beat.dmNotes,
          mechanical_effect: beat.mechanicalEffect || null,
          stat_block_id: sbKeyByIndex ? statBlockIdMap[sbKeyByIndex] : (sbKey ? statBlockIdMap[sbKey] : null),
        })
        if (beatErr) throw new Error(`Beat "${beat.title}": ${beatErr}`)
      }
    }

    for (const scene of parsed.scenes) {
      for (const branch of scene.branches || []) {
        currentStep = `branch: ${branch.label}`
        const parentScene = sceneIdMap[scene.sceneNumber]
        const targetScene = sceneIdMap[branch.targetSceneNumber]
        if (!parentScene || !targetScene) continue

        const { error: branchErr } = await saveBranch({
          scene_id: parentScene.id,
          order: branch.order,
          label: branch.label,
          description: branch.description,
          condition_text: branch.conditionText,
          condition_type: 'explicit',
          target_scene_id: targetScene.id,
          target_slug: targetScene.slug,
          is_dm_only: false,
        })
        if (branchErr) throw new Error(`Branch "${branch.label}": ${branchErr}`)
      }
    }

    return { sessionId: createdSessionId, rollbackErrors: [] }
  } catch (e) {
    const rollbackErrors = await rollbackPartialImport(supabase, createdSessionId, createdStatBlockIds)
    const rbMsg = rollbackErrors.length ? ` Rollback: ${rollbackErrors.join(' · ')}` : ''
    throw new Error(`Import failed at "${currentStep}": ${e.message}.${rbMsg}`)
  }
}

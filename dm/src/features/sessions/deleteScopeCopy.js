/** Copy for destructive confirmations — dependent counts where available. */

export function sceneDependentCounts(scene) {
  const beats = scene?.beats?.length ?? 0
  const branches = scene?.branches?.length ?? 0
  return { beats, branches }
}

export function sceneDeleteConfirmMessage(scene) {
  const { beats, branches } = sceneDependentCounts(scene)
  const title = scene?.title || 'this scene'
  return (
    `Permanently delete "${title}"?\n\n` +
    `This will remove ${beats} beat(s) and ${branches} branch(es). This cannot be undone.`
  )
}

export function sessionDependentCounts(session) {
  const scenes = session?.scenes || []
  let beats = 0
  let branches = 0
  for (const sc of scenes) {
    beats += sc.beats?.length ?? 0
    branches += sc.branches?.length ?? 0
  }
  return { sceneCount: scenes.length, beatCount: beats, branchCount: branches }
}

export function sessionArchiveConfirmMessage(session) {
  const { sceneCount, beatCount, branchCount } = sessionDependentCounts(session)
  const title = session?.title || 'this session'
  return (
    `Archive session "${title}"?\n\n` +
    `This will hide ${sceneCount} scene(s), ${beatCount} beat(s), and ${branchCount} branch(es) from active builder/runtime views.\n\n` +
    `You can restore it later from Archived.`
  )
}

export function sessionRestoreConfirmMessage(session) {
  const title = session?.title || 'this session'
  const when = session?.archived_at ? new Date(session.archived_at).toLocaleString() : 'previously'
  return (
    `Restore session "${title}" to the active builder list?\n\n` +
    `Archived: ${when}.\n\n` +
    `It will be visible again in Sessions and runtime pickers.`
  )
}

export function statBlockRestoreConfirmMessage(sb) {
  const name = sb?.name || 'this stat block'
  return (
    `Restore "${name}" from the archive?\n\n` +
    `It will reappear in the main stat block library and can be linked to beats again.`
  )
}

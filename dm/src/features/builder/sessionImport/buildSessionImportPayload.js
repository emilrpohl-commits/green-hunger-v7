/**
 * Pure builder for `import_session_bundle_tx` payload (session markdown import).
 */

export function buildSessionImportPayload(parsed, adventureId) {
  if (!parsed) return null
  return {
    session: {
      adventure_id: adventureId,
      session_number: parsed.sessionNumber,
      order: parsed.sessionNumber,
      title: parsed.sessionTitle,
      subtitle: parsed.chapterSubtitle,
      notes: parsed.backgroundNotes,
      estimated_duration: parsed.estimatedDuration,
      objectives: parsed.objectives || [],
    },
    stat_blocks: (parsed.statBlocks || []).map((sb) => {
      const { modifiers: _m, ...rest } = sb
      return rest
    }),
    scenes: (parsed.scenes || []).map((scene) => ({
      scene_key: String(scene.sceneNumber),
      order: scene.order,
      slug: scene.slug,
      title: scene.title,
      scene_type: scene.sceneType,
      purpose: scene.purpose,
      estimated_time: scene.estimatedTime,
      fallback_notes: scene.fallbackNotes,
      dm_notes: scene.dmNotes,
      outcomes: scene.outcomes || [],
      is_published: false,
      beats: (scene.beats || []).map((beat) => ({
        order: beat.order,
        slug: beat.slug,
        title: beat.title,
        type: beat.type,
        trigger_text: beat.triggerText,
        content: beat.content,
        player_text: beat.playerText || beat.content,
        dm_notes: beat.dmNotes,
        mechanical_effect: beat.mechanicalEffect || null,
        stat_block_ref: beat.statBlockRef || null,
        stat_block_source_index: beat.statBlockSourceIndex || null,
      })),
      branches: (scene.branches || []).map((branch) => ({
        order: branch.order,
        label: branch.label,
        description: branch.description,
        condition_text: branch.conditionText,
        condition_type: 'explicit',
        target_scene_key: String(branch.targetSceneNumber),
        is_dm_only: false,
      })),
    })),
  }
}

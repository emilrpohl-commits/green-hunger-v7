import { z } from 'zod'

const beatTypes = z.enum(['narrative', 'prompt', 'check', 'decision', 'combat', 'reveal', 'transition'])

const branchSchema = z.object({
  order: z.number().int(),
  label: z.coerce.string(),
  description: z.union([z.string(), z.null()]).optional(),
  condition_text: z.coerce.string(),
  condition_type: z.string().optional(),
  target_scene_key: z.string(),
  is_dm_only: z.boolean().optional(),
})

const beatSchema = z.object({
  order: z.number().int(),
  slug: z.string(),
  title: z.string().min(1),
  type: beatTypes,
  trigger_text: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  player_text: z.string().optional().nullable(),
  dm_notes: z.string().optional().nullable(),
  mechanical_effect: z.string().nullable().optional(),
  stat_block_ref: z.string().nullable().optional(),
  stat_block_source_index: z.string().nullable().optional(),
})

const sceneSchema = z.object({
  scene_key: z.string(),
  order: z.number().int(),
  slug: z.string(),
  title: z.string().min(1),
  scene_type: z.string(),
  purpose: z.string().optional().nullable(),
  estimated_time: z.string().optional().nullable(),
  fallback_notes: z.string().optional().nullable(),
  dm_notes: z.string().optional().nullable(),
  outcomes: z.array(z.unknown()).optional(),
  is_published: z.boolean().optional(),
  beats: z.array(beatSchema).default([]),
  branches: z.array(branchSchema).default([]),
})

export const importPayloadSchema = z.object({
  session: z.object({
    adventure_id: z.string().uuid(),
    session_number: z.number().int().nullable().optional(),
    order: z.number().int().nullable().optional(),
    title: z.string().min(1),
    subtitle: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    estimated_duration: z.string().optional().nullable(),
    objectives: z.array(z.string()).optional(),
  }),
  stat_blocks: z.array(z.record(z.any())).default([]),
  scenes: z.array(sceneSchema).min(1),
})

export function validateSessionImportPayload(payload) {
  return importPayloadSchema.safeParse(payload)
}

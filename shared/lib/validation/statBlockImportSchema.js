import { z } from 'zod'

/** Zod schema for parsed stat block rows before DB write (ImportModal / paste path). */
export const statBlockImportSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    slug: z.union([z.string(), z.null()]).optional(),
    cr: z.union([z.string(), z.number()]).optional(),
    ac: z.coerce.number().optional(),
    max_hp: z.coerce.number().optional(),
    creature_type: z.union([z.string(), z.null()]).optional(),
    size: z.string().optional(),
    alignment: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough()

export function validateStatBlockImport(parsed) {
  return statBlockImportSchema.safeParse(parsed)
}

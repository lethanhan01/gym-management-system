/**
 * fix-null-exercises.mjs
 * 
 * Finds exercises in DB with NULL FK values and tries to match them
 * to exercises in the snapshot using fuzzy name matching.
 * Generates a patch SQL to fix these.
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { PrismaClient } from '@prisma/client'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SNAPSHOT_FILE = resolve(__dirname, 'exercise-snapshot.json')
const OUTPUT_FILE = resolve(__dirname, 'backfill-exercise-lookup-patch.sql')

function normStr(v) {
  if (typeof v !== 'string') return null
  return v.replace(/\s+/g, ' ').trim().toLowerCase()
}
function list(v) {
  return Array.isArray(v) ? v.map(normStr).filter(Boolean) : []
}
function sqlStr(s) {
  return `'${s.replace(/'/g, "''")}'`
}

// Normalize name more aggressively: remove special chars, strip "v. N" suffixes, etc.
function aggressiveNorm(name) {
  return name
    .toLowerCase()
    .replace(/°/g, ' degree')
    .replace(/[^a-z0-9 ]/g, ' ')  // remove special chars
    .replace(/\bv\b\.?\s*\d+/g, '')   // remove "v. 2" etc
    .replace(/\(.*?\)/g, '')        // remove parenthetical notes
    .replace(/\s+/g, ' ')
    .trim()
}

const prisma = new PrismaClient()

async function main() {
  // Load snapshot
  const raw = JSON.parse(readFileSync(SNAPSHOT_FILE, 'utf8'))
  console.log(`Snapshot: ${raw.length} exercises`)

  // Build lookup from snapshot by normalized name
  const snapshotMap = new Map()
  for (const item of raw) {
    const name = normStr(item.name)
    if (!name) continue
    snapshotMap.set(name, item)
    // Also index by aggressive norm
    const aggName = aggressiveNorm(item.name)
    if (aggName && !snapshotMap.has(aggName)) snapshotMap.set(aggName, item)
  }

  // Get all exercises with NULL bodyPartId
  const nullExercises = await prisma.exercise.findMany({
    where: { source: 'exercisedb', bodyPartId: null },
    select: { exerciseId: true, name: true, externalId: true }
  })
  console.log(`\nExercises with NULL bodyPartId: ${nullExercises.length}`)

  // Try to match each
  const matched = []
  const unmatched = []

  for (const ex of nullExercises) {
    const norm = normStr(ex.name)
    const agg = aggressiveNorm(ex.name)
    
    let snapshot = snapshotMap.get(norm) || snapshotMap.get(agg)
    
    if (snapshot) {
      matched.push({ db: ex, snapshot })
    } else {
      unmatched.push(ex)
    }
  }

  console.log(`Matched: ${matched.length}`)
  console.log(`Unmatched: ${unmatched.length}`)
  
  if (unmatched.length > 0) {
    console.log('\nStill unmatched (first 20):')
    unmatched.slice(0, 20).forEach(e => console.log(`  "${e.name}" (externalId: ${e.externalId})`))
  }

  // Generate patch SQL
  const lines = []
  lines.push(`-- ===================================================`)
  lines.push(`-- Exercise Lookup Tables PATCH (aggressive name match)`)
  lines.push(`-- Generated: ${new Date().toISOString()}`)
  lines.push(`-- Fixes ${matched.length} exercises with NULL FK values`)
  lines.push(`-- ===================================================`)
  lines.push(``)
  lines.push(`BEGIN;`)
  lines.push(``)

  // Group matched exercises by their lookup values
  const patchByBodyPart = new Map()
  const patchByMuscle = new Map()
  const patchByEquipment = new Map()
  const patchSecondary = []

  for (const { db, snapshot } of matched) {
    const bodyPart = normStr((snapshot.bodyParts || [])[0])
    const targetMuscle = normStr((snapshot.targetMuscles || [])[0])
    const equipment = normStr((snapshot.equipments || [])[0])
    const secondaryMuscles = list(snapshot.secondaryMuscles)

    if (bodyPart) {
      if (!patchByBodyPart.has(bodyPart)) patchByBodyPart.set(bodyPart, [])
      patchByBodyPart.get(bodyPart).push(db.exerciseId)
    }
    if (targetMuscle) {
      if (!patchByMuscle.has(targetMuscle)) patchByMuscle.set(targetMuscle, [])
      patchByMuscle.get(targetMuscle).push(db.exerciseId)
    }
    if (equipment) {
      if (!patchByEquipment.has(equipment)) patchByEquipment.set(equipment, [])
      patchByEquipment.get(equipment).push(db.exerciseId)
    }
    for (const muscle of secondaryMuscles) {
      patchSecondary.push({ exerciseId: db.exerciseId, muscle })
    }
  }

  // body_part_id updates
  lines.push(`-- Patch body_part_id for ${matched.length} exercises`)
  for (const [bp, ids] of patchByBodyPart.entries()) {
    lines.push(`UPDATE exercises SET body_part_id = (SELECT body_part_id FROM exercise_body_parts WHERE name = ${sqlStr(bp)})`)
    lines.push(`  WHERE exercise_id IN (${ids.map(id => id.toString()).join(', ')});`)
    lines.push(``)
  }

  // target_muscle_id updates  
  lines.push(`-- Patch target_muscle_id`)
  for (const [muscle, ids] of patchByMuscle.entries()) {
    lines.push(`UPDATE exercises SET target_muscle_id = (SELECT muscle_id FROM exercise_muscles WHERE name = ${sqlStr(muscle)})`)
    lines.push(`  WHERE exercise_id IN (${ids.map(id => id.toString()).join(', ')});`)
    lines.push(``)
  }

  // equipment_id updates
  lines.push(`-- Patch equipment_id`)
  for (const [eq, ids] of patchByEquipment.entries()) {
    lines.push(`UPDATE exercises SET equipment_id = (SELECT equipment_id FROM exercise_equipments WHERE name = ${sqlStr(eq)})`)
    lines.push(`  WHERE exercise_id IN (${ids.map(id => id.toString()).join(', ')});`)
    lines.push(``)
  }

  // Secondary muscles patch
  if (patchSecondary.length > 0) {
    lines.push(`-- Patch secondary muscles`)
    for (let i = 0; i < patchSecondary.length; i += 200) {
      const batch = patchSecondary.slice(i, i + 200)
      lines.push(`INSERT INTO exercise_secondary_muscles (exercise_id, muscle_id)`)
      lines.push(`SELECT p.exercise_id, m.muscle_id FROM (VALUES`)
      lines.push(batch.map(({ exerciseId, muscle }) => `  (${exerciseId.toString()}::bigint, ${sqlStr(muscle)})`).join(',\n'))
      lines.push(`) AS p(exercise_id, muscle_name)`)
      lines.push(`JOIN exercise_muscles m ON m.name = p.muscle_name`)
      lines.push(`ON CONFLICT DO NOTHING;`)
      lines.push(``)
    }
  }

  // Final count
  lines.push(`-- Verification`)
  lines.push(`SELECT 'exercises_still_null_body_part' AS check_name, COUNT(*) AS count`)
  lines.push(`FROM exercises WHERE source = 'exercisedb' AND body_part_id IS NULL;`)
  lines.push(``)
  lines.push(`COMMIT;`)

  writeFileSync(OUTPUT_FILE, lines.join('\n'), 'utf8')
  console.log(`\nPatch SQL written to: ${OUTPUT_FILE}`)
  console.log(`Will fix ${matched.length} more exercises`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

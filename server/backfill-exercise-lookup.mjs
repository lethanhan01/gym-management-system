/**
 * backfill-exercise-lookup.mjs
 * 
 * Reads exercise-snapshot.json (from download-exercise-snapshot.mjs using free API v1)
 * and generates a SQL backfill script that:
 *  1. Inserts all unique body parts, muscles, and equipment into lookup tables
 *  2. Updates exercises with FK references using exercise name as the match key
 *     (since externalId format may differ between API v1 and RapidAPI v2)
 *  3. Inserts exercise_secondary_muscles junction rows
 *
 * NOTE: The exercises in DB were inserted via RapidAPI v2 (external_id = "0001", "0002", etc.)
 * The free API v1 uses a different exerciseId format (e.g., "EIeI8Vf").
 * We match exercises by normalized name.
 *
 * Usage: node backfill-exercise-lookup.mjs
 * Output: backfill-exercise-lookup.sql
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SNAPSHOT_FILE = resolve(__dirname, 'exercise-snapshot.json')
const OUTPUT_FILE = resolve(__dirname, 'backfill-exercise-lookup.sql')

// --- Helpers ---
function normStr(v) {
  if (typeof v !== 'string') return null
  const s = v.replace(/\s+/g, ' ').trim().toLowerCase()
  return s || null
}
function list(v) {
  return Array.isArray(v) ? v.map(normStr).filter(Boolean) : []
}
function sqlStr(s) {
  // Escape single quotes for SQL
  return `'${s.replace(/'/g, "''")}'`
}

// --- Load snapshot ---
console.log(`Reading snapshot from: ${SNAPSHOT_FILE}`)
let raw
try {
  raw = JSON.parse(readFileSync(SNAPSHOT_FILE, 'utf8'))
} catch (e) {
  console.error('ERROR: Could not read exercise-snapshot.json:', e.message)
  process.exit(1)
}

if (!Array.isArray(raw) || raw.length === 0) {
  console.error('ERROR: Snapshot is empty or invalid')
  process.exit(1)
}

console.log(`Loaded ${raw.length} exercises from snapshot`)

// --- Normalize free API v1 response format ---
// v1 uses: exerciseId, name, bodyParts[], targetMuscles[], equipments[], secondaryMuscles[]
const exercises = raw.map(item => ({
  exerciseId: item.exerciseId || null,            // v1 format (e.g., "EIeI8Vf")
  name: normStr(item.name),
  bodyParts: list(item.bodyParts),               // v1: array of strings
  targetMuscles: list(item.targetMuscles),       // v1: array of strings
  secondaryMuscles: list(item.secondaryMuscles), // same in both
  equipment: list(item.equipments),             // v1: "equipments" (plural)
})).filter(e => e.name)

console.log(`Normalized ${exercises.length} exercises`)

// Collect unique lookup values
const allBodyParts = [...new Set(exercises.flatMap(e => e.bodyParts))].sort()
const allMuscles = [...new Set([
  ...exercises.flatMap(e => e.targetMuscles),
  ...exercises.flatMap(e => e.secondaryMuscles),
])].sort()
const allEquipment = [...new Set(exercises.flatMap(e => e.equipment))].sort()

console.log(`\nUnique body parts (${allBodyParts.length}): ${allBodyParts.join(', ')}`)
console.log(`Unique muscles (${allMuscles.length}): ${allMuscles.join(', ')}`)
console.log(`Unique equipment (${allEquipment.length}): ${allEquipment.join(', ')}`)
console.log(`Exercises with secondary muscles: ${exercises.filter(e => e.secondaryMuscles.length > 0).length}`)

// --- Build SQL ---
const lines = []

lines.push(`-- ==========================================================`)
lines.push(`-- Exercise Lookup Tables Backfill`)
lines.push(`-- Generated: ${new Date().toISOString()}`)
lines.push(`-- Source: exercise-snapshot.json (${exercises.length} exercises from oss.exercisedb.dev)`)
lines.push(`-- Matches exercises by normalized name (case-insensitive LOWER(name))`)
lines.push(`-- ==========================================================`)
lines.push(``)
lines.push(`BEGIN;`)
lines.push(``)

// 1. Insert body parts
lines.push(`-- --------------------------------------------------------`)
lines.push(`-- 1. Insert body parts (${allBodyParts.length} unique values)`)
lines.push(`-- --------------------------------------------------------`)
if (allBodyParts.length > 0) {
  lines.push(`INSERT INTO exercise_body_parts (name) VALUES`)
  lines.push(allBodyParts.map(bp => `  (${sqlStr(bp)})`).join(',\n'))
  lines.push(`ON CONFLICT (name) DO NOTHING;`)
}
lines.push(``)

// 2. Insert muscles
lines.push(`-- --------------------------------------------------------`)
lines.push(`-- 2. Insert muscles (${allMuscles.length} unique values)`)
lines.push(`-- --------------------------------------------------------`)
if (allMuscles.length > 0) {
  lines.push(`INSERT INTO exercise_muscles (name) VALUES`)
  lines.push(allMuscles.map(m => `  (${sqlStr(m)})`).join(',\n'))
  lines.push(`ON CONFLICT (name) DO NOTHING;`)
}
lines.push(``)

// 3. Insert equipment
lines.push(`-- --------------------------------------------------------`)
lines.push(`-- 3. Insert equipment (${allEquipment.length} unique values)`)
lines.push(`-- --------------------------------------------------------`)
if (allEquipment.length > 0) {
  lines.push(`INSERT INTO exercise_equipments (name) VALUES`)
  lines.push(allEquipment.map(eq => `  (${sqlStr(eq)})`).join(',\n'))
  lines.push(`ON CONFLICT (name) DO NOTHING;`)
}
lines.push(``)

// 4. Update exercises: body_part_id — grouped by body part, matched by name
// Since v1 exercises have bodyParts as array, take the first one as primary
lines.push(`-- --------------------------------------------------------`)
lines.push(`-- 4. Update exercises: set body_part_id (match by normalized name)`)
lines.push(`-- --------------------------------------------------------`)
const byBodyPart = new Map()
for (const ex of exercises) {
  if (!ex.bodyParts.length || !ex.name) continue
  const bp = ex.bodyParts[0] // primary body part
  if (!byBodyPart.has(bp)) byBodyPart.set(bp, [])
  byBodyPart.get(bp).push(ex.name)
}
for (const [bp, names] of byBodyPart.entries()) {
  // Batch names in groups of 50 to avoid very long IN clauses
  for (let i = 0; i < names.length; i += 50) {
    const batch = names.slice(i, i + 50)
    lines.push(`UPDATE exercises`)
    lines.push(`  SET body_part_id = (SELECT body_part_id FROM exercise_body_parts WHERE name = ${sqlStr(bp)})`)
    lines.push(`  WHERE source = 'exercisedb'`)
    lines.push(`    AND LOWER(name) IN (${batch.map(sqlStr).join(', ')});`)
    lines.push(``)
  }
}

// 5. Update exercises: target_muscle_id
lines.push(`-- --------------------------------------------------------`)
lines.push(`-- 5. Update exercises: set target_muscle_id (match by normalized name)`)
lines.push(`-- --------------------------------------------------------`)
const byTargetMuscle = new Map()
for (const ex of exercises) {
  if (!ex.targetMuscles.length || !ex.name) continue
  const muscle = ex.targetMuscles[0] // primary target muscle
  if (!byTargetMuscle.has(muscle)) byTargetMuscle.set(muscle, [])
  byTargetMuscle.get(muscle).push(ex.name)
}
for (const [muscle, names] of byTargetMuscle.entries()) {
  for (let i = 0; i < names.length; i += 50) {
    const batch = names.slice(i, i + 50)
    lines.push(`UPDATE exercises`)
    lines.push(`  SET target_muscle_id = (SELECT muscle_id FROM exercise_muscles WHERE name = ${sqlStr(muscle)})`)
    lines.push(`  WHERE source = 'exercisedb'`)
    lines.push(`    AND LOWER(name) IN (${batch.map(sqlStr).join(', ')});`)
    lines.push(``)
  }
}

// 6. Update exercises: equipment_id
lines.push(`-- --------------------------------------------------------`)
lines.push(`-- 6. Update exercises: set equipment_id (match by normalized name)`)
lines.push(`-- --------------------------------------------------------`)
const byEquipment = new Map()
for (const ex of exercises) {
  if (!ex.equipment.length || !ex.name) continue
  const eq = ex.equipment[0] // primary equipment
  if (!byEquipment.has(eq)) byEquipment.set(eq, [])
  byEquipment.get(eq).push(ex.name)
}
for (const [eq, names] of byEquipment.entries()) {
  for (let i = 0; i < names.length; i += 50) {
    const batch = names.slice(i, i + 50)
    lines.push(`UPDATE exercises`)
    lines.push(`  SET equipment_id = (SELECT equipment_id FROM exercise_equipments WHERE name = ${sqlStr(eq)})`)
    lines.push(`  WHERE source = 'exercisedb'`)
    lines.push(`    AND LOWER(name) IN (${batch.map(sqlStr).join(', ')});`)
    lines.push(``)
  }
}

// 7. Insert secondary muscles
lines.push(`-- --------------------------------------------------------`)
lines.push(`-- 7. Insert exercise_secondary_muscles junction rows`)
lines.push(`-- --------------------------------------------------------`)
const secondaryPairs = []
for (const ex of exercises) {
  if (!ex.name || ex.secondaryMuscles.length === 0) continue
  for (const muscle of ex.secondaryMuscles) {
    secondaryPairs.push({ name: ex.name, muscle })
  }
}

if (secondaryPairs.length > 0) {
  // Batch in chunks of 500 pairs
  for (let i = 0; i < secondaryPairs.length; i += 500) {
    const batch = secondaryPairs.slice(i, i + 500)
    lines.push(`INSERT INTO exercise_secondary_muscles (exercise_id, muscle_id)`)
    lines.push(`SELECT e.exercise_id, m.muscle_id`)
    lines.push(`FROM (VALUES`)
    lines.push(batch.map(({ name, muscle }) => `  (${sqlStr(name)}, ${sqlStr(muscle)})`).join(',\n'))
    lines.push(`) AS pairs(exercise_name, muscle_name)`)
    lines.push(`JOIN exercises e ON e.source = 'exercisedb' AND LOWER(e.name) = pairs.exercise_name`)
    lines.push(`JOIN exercise_muscles m ON m.name = pairs.muscle_name`)
    lines.push(`ON CONFLICT DO NOTHING;`)
    lines.push(``)
  }
}

// 8. Verification counts
lines.push(`-- --------------------------------------------------------`)
lines.push(`-- 8. Verification counts`)
lines.push(`-- --------------------------------------------------------`)
lines.push(`SELECT 'exercise_body_parts' AS table_name, COUNT(*) AS count FROM exercise_body_parts`)
lines.push(`UNION ALL SELECT 'exercise_muscles', COUNT(*) FROM exercise_muscles`)
lines.push(`UNION ALL SELECT 'exercise_equipments', COUNT(*) FROM exercise_equipments`)
lines.push(`UNION ALL SELECT 'exercise_secondary_muscles', COUNT(*) FROM exercise_secondary_muscles`)
lines.push(`UNION ALL SELECT 'exercises_with_body_part', COUNT(*) FROM exercises WHERE body_part_id IS NOT NULL`)
lines.push(`UNION ALL SELECT 'exercises_with_target_muscle', COUNT(*) FROM exercises WHERE target_muscle_id IS NOT NULL`)
lines.push(`UNION ALL SELECT 'exercises_with_equipment', COUNT(*) FROM exercises WHERE equipment_id IS NOT NULL;`)
lines.push(``)

lines.push(`COMMIT;`)
lines.push(``)

// --- Write output ---
const sql = lines.join('\n')
writeFileSync(OUTPUT_FILE, sql, 'utf8')

console.log(`\nSQL backfill script written to: ${OUTPUT_FILE}`)
console.log(`Total lines: ${lines.length}`)
console.log(`Total secondary muscle pairs: ${secondaryPairs.length}`)
console.log(`\nTo run:`)
console.log(`  $env:DATABASE_URL="<connection_string>"`)
console.log(`  Get-Content backfill-exercise-lookup.sql | npx prisma db execute --stdin --schema="prisma/schema/schema.prisma"`)

-- ===================================================
-- Exercise Lookup Tables PATCH (aggressive name match)
-- Generated: 2026-07-26T08:48:13.588Z
-- Fixes 11 exercises with NULL FK values
-- ===================================================

BEGIN;

-- Patch body_part_id for 11 exercises
UPDATE exercises SET body_part_id = (SELECT body_part_id FROM exercise_body_parts WHERE name = 'waist')
  WHERE exercise_id IN (2);

UPDATE exercises SET body_part_id = (SELECT body_part_id FROM exercise_body_parts WHERE name = 'lower arms')
  WHERE exercise_id IN (74);

UPDATE exercises SET body_part_id = (SELECT body_part_id FROM exercise_body_parts WHERE name = 'shoulders')
  WHERE exercise_id IN (331, 1120);

UPDATE exercises SET body_part_id = (SELECT body_part_id FROM exercise_body_parts WHERE name = 'lower legs')
  WHERE exercise_id IN (583);

UPDATE exercises SET body_part_id = (SELECT body_part_id FROM exercise_body_parts WHERE name = 'upper legs')
  WHERE exercise_id IN (584, 585, 926, 927, 1203);

UPDATE exercises SET body_part_id = (SELECT body_part_id FROM exercise_body_parts WHERE name = 'cardio')
  WHERE exercise_id IN (1101);

-- Patch target_muscle_id
UPDATE exercises SET target_muscle_id = (SELECT muscle_id FROM exercise_muscles WHERE name = 'abs')
  WHERE exercise_id IN (2);

UPDATE exercises SET target_muscle_id = (SELECT muscle_id FROM exercise_muscles WHERE name = 'forearms')
  WHERE exercise_id IN (74);

UPDATE exercises SET target_muscle_id = (SELECT muscle_id FROM exercise_muscles WHERE name = 'delts')
  WHERE exercise_id IN (331, 1120);

UPDATE exercises SET target_muscle_id = (SELECT muscle_id FROM exercise_muscles WHERE name = 'calves')
  WHERE exercise_id IN (583);

UPDATE exercises SET target_muscle_id = (SELECT muscle_id FROM exercise_muscles WHERE name = 'glutes')
  WHERE exercise_id IN (584, 585, 926, 927);

UPDATE exercises SET target_muscle_id = (SELECT muscle_id FROM exercise_muscles WHERE name = 'cardiovascular system')
  WHERE exercise_id IN (1101);

UPDATE exercises SET target_muscle_id = (SELECT muscle_id FROM exercise_muscles WHERE name = 'quads')
  WHERE exercise_id IN (1203);

-- Patch equipment_id
UPDATE exercises SET equipment_id = (SELECT equipment_id FROM exercise_equipments WHERE name = 'body weight')
  WHERE exercise_id IN (2, 1120);

UPDATE exercises SET equipment_id = (SELECT equipment_id FROM exercise_equipments WHERE name = 'barbell')
  WHERE exercise_id IN (74);

UPDATE exercises SET equipment_id = (SELECT equipment_id FROM exercise_equipments WHERE name = 'dumbbell')
  WHERE exercise_id IN (331, 1203);

UPDATE exercises SET equipment_id = (SELECT equipment_id FROM exercise_equipments WHERE name = 'sled machine')
  WHERE exercise_id IN (583, 584, 585, 926, 927);

UPDATE exercises SET equipment_id = (SELECT equipment_id FROM exercise_equipments WHERE name = 'stationary bike')
  WHERE exercise_id IN (1101);

-- Patch secondary muscles
INSERT INTO exercise_secondary_muscles (exercise_id, muscle_id)
SELECT p.exercise_id, m.muscle_id FROM (VALUES
  (2::bigint, 'obliques'),
  (74::bigint, 'biceps'),
  (74::bigint, 'brachialis'),
  (331::bigint, 'trapezius'),
  (331::bigint, 'rhomboids'),
  (583::bigint, 'hamstrings'),
  (584::bigint, 'quadriceps'),
  (584::bigint, 'hamstrings'),
  (584::bigint, 'calves'),
  (585::bigint, 'quadriceps'),
  (585::bigint, 'hamstrings'),
  (585::bigint, 'calves'),
  (926::bigint, 'quadriceps'),
  (926::bigint, 'hamstrings'),
  (926::bigint, 'calves'),
  (927::bigint, 'quadriceps'),
  (927::bigint, 'hamstrings'),
  (927::bigint, 'calves'),
  (1101::bigint, 'quadriceps'),
  (1101::bigint, 'hamstrings'),
  (1101::bigint, 'calves'),
  (1120::bigint, 'biceps'),
  (1120::bigint, 'triceps'),
  (1120::bigint, 'forearms'),
  (1203::bigint, 'glutes'),
  (1203::bigint, 'hamstrings'),
  (1203::bigint, 'calves')
) AS p(exercise_id, muscle_name)
JOIN exercise_muscles m ON m.name = p.muscle_name
ON CONFLICT DO NOTHING;

-- Verification
SELECT 'exercises_still_null_body_part' AS check_name, COUNT(*) AS count
FROM exercises WHERE source = 'exercisedb' AND body_part_id IS NULL;

COMMIT;
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.users (
  user_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  email character varying NOT NULL UNIQUE,
  phone character varying UNIQUE,
  password_hash character varying,
  full_name character varying NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'pending_verification'::user_status,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  avatar_file_id bigint,
  deleted_at timestamp without time zone,
  email_verified_at timestamp without time zone,
  line_id character varying,
  CONSTRAINT users_pkey PRIMARY KEY (user_id),
  CONSTRAINT users_avatar_file_id_fkey FOREIGN KEY (avatar_file_id) REFERENCES public.files(file_id)
);
CREATE TABLE public.members (
  member_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id bigint NOT NULL UNIQUE,
  member_code character varying NOT NULL UNIQUE,
  date_of_birth date,
  address character varying,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  deleted_at timestamp without time zone,
  primary_trainer_id bigint,
  CONSTRAINT members_pkey PRIMARY KEY (member_id),
  CONSTRAINT members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id),
  CONSTRAINT members_primary_trainer_id_fkey FOREIGN KEY (primary_trainer_id) REFERENCES public.staff(staff_id)
);
CREATE TABLE public.staff (
  staff_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id bigint NOT NULL UNIQUE,
  staff_code character varying NOT NULL UNIQUE,
  position character varying NOT NULL,
  deleted_at timestamp without time zone,
  CONSTRAINT staff_pkey PRIMARY KEY (staff_id),
  CONSTRAINT staff_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.groups (
  group_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying NOT NULL,
  description character varying,
  deleted_at timestamp without time zone,
  CONSTRAINT groups_pkey PRIMARY KEY (group_id)
);
CREATE TABLE public.permissions (
  permission_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  code character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  description character varying,
  CONSTRAINT permissions_pkey PRIMARY KEY (permission_id)
);
CREATE TABLE public.user_groups (
  user_id bigint NOT NULL,
  group_id bigint NOT NULL,
  CONSTRAINT user_groups_pkey PRIMARY KEY (user_id, group_id),
  CONSTRAINT user_groups_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id),
  CONSTRAINT user_groups_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(group_id)
);
CREATE TABLE public.group_permissions (
  group_id bigint NOT NULL,
  permission_id bigint NOT NULL,
  CONSTRAINT group_permissions_pkey PRIMARY KEY (group_id, permission_id),
  CONSTRAINT group_permissions_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(group_id),
  CONSTRAINT group_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(permission_id)
);
CREATE TABLE public.packages (
  package_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  package_code character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  duration_days integer NOT NULL,
  price numeric NOT NULL,
  benefits character varying,
  status USER-DEFINED NOT NULL DEFAULT 'active'::package_status,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  deleted_at timestamp without time zone,
  includes_pt boolean NOT NULL DEFAULT false,
  CONSTRAINT packages_pkey PRIMARY KEY (package_id)
);
CREATE TABLE public.subscriptions (
  subscription_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  member_id bigint NOT NULL,
  package_id bigint NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  cancelled_at timestamp without time zone,
  deleted_at timestamp without time zone,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::subscription_status,
  CONSTRAINT subscriptions_pkey PRIMARY KEY (subscription_id),
  CONSTRAINT subscriptions_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(member_id),
  CONSTRAINT subscriptions_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.packages(package_id)
);
CREATE TABLE public.payments (
  payment_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  member_id bigint NOT NULL,
  subscription_id bigint NOT NULL,
  amount numeric NOT NULL,
  method USER-DEFINED NOT NULL,
  status USER-DEFINED NOT NULL,
  transaction_reference character varying,
  paid_at timestamp without time zone NOT NULL,
  CONSTRAINT payments_pkey PRIMARY KEY (payment_id),
  CONSTRAINT payments_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(member_id),
  CONSTRAINT payments_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(subscription_id)
);
CREATE TABLE public.gym_rooms (
  room_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  room_code character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  room_type character varying,
  capacity integer NOT NULL,
  description character varying,
  CONSTRAINT gym_rooms_pkey PRIMARY KEY (room_id)
);
CREATE TABLE public.equipment (
  equipment_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  room_id bigint NOT NULL,
  equipment_code character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  import_date date NOT NULL,
  warranty_until date,
  status USER-DEFINED NOT NULL,
  CONSTRAINT equipment_pkey PRIMARY KEY (equipment_id),
  CONSTRAINT equipment_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.gym_rooms(room_id)
);
CREATE TABLE public.maintenance_logs (
  maintenance_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  equipment_id bigint NOT NULL,
  reported_by_staff_id bigint NOT NULL,
  description text NOT NULL,
  status USER-DEFINED NOT NULL,
  reported_at timestamp without time zone NOT NULL,
  resolved_at timestamp without time zone,
  CONSTRAINT maintenance_logs_pkey PRIMARY KEY (maintenance_id),
  CONSTRAINT maintenance_logs_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipment(equipment_id),
  CONSTRAINT maintenance_logs_reported_by_staff_id_fkey FOREIGN KEY (reported_by_staff_id) REFERENCES public.staff(staff_id)
);
CREATE TABLE public.training_sessions (
  session_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  member_id bigint NOT NULL,
  trainer_staff_id bigint NOT NULL,
  room_id bigint NOT NULL,
  start_time timestamp without time zone NOT NULL,
  end_time timestamp without time zone NOT NULL,
  deleted_at timestamp without time zone,
  status USER-DEFINED NOT NULL DEFAULT 'scheduled'::training_session_status,
  CONSTRAINT training_sessions_pkey PRIMARY KEY (session_id),
  CONSTRAINT training_sessions_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(member_id),
  CONSTRAINT training_sessions_trainer_staff_id_fkey FOREIGN KEY (trainer_staff_id) REFERENCES public.staff(staff_id),
  CONSTRAINT training_sessions_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.gym_rooms(room_id)
);
CREATE TABLE public.attendance_logs (
  attendance_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  member_id bigint NOT NULL,
  subscription_id bigint NOT NULL,
  session_id bigint,
  start_time timestamp without time zone NOT NULL,
  end_time timestamp without time zone,
  method USER-DEFINED NOT NULL,
  CONSTRAINT attendance_logs_pkey PRIMARY KEY (attendance_id),
  CONSTRAINT attendance_logs_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(member_id),
  CONSTRAINT attendance_logs_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(subscription_id),
  CONSTRAINT attendance_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.training_sessions(session_id)
);
CREATE TABLE public.member_progress (
  progress_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  member_id bigint NOT NULL,
  staff_id bigint NOT NULL,
  weight numeric,
  bmi numeric,
  goal character varying,
  notes text,
  recorded_at timestamp without time zone NOT NULL,
  deleted_at timestamp without time zone,
  CONSTRAINT member_progress_pkey PRIMARY KEY (progress_id),
  CONSTRAINT member_progress_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(member_id),
  CONSTRAINT member_progress_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(staff_id)
);
CREATE TABLE public.feedback (
  feedback_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  member_id bigint NOT NULL,
  feedback_type USER-DEFINED NOT NULL,
  content text NOT NULL,
  severity USER-DEFINED NOT NULL DEFAULT 'low'::feedback_severity,
  status USER-DEFINED NOT NULL DEFAULT 'open'::feedback_status,
  handled_by_staff_id bigint,
  handled_at timestamp without time zone,
  subject_staff_id bigint,
  subject_equipment_id bigint,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  deleted_at timestamp without time zone,
  CONSTRAINT feedback_pkey PRIMARY KEY (feedback_id),
  CONSTRAINT feedback_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(member_id),
  CONSTRAINT feedback_handled_by_staff_id_fkey FOREIGN KEY (handled_by_staff_id) REFERENCES public.staff(staff_id),
  CONSTRAINT feedback_subject_staff_id_fkey FOREIGN KEY (subject_staff_id) REFERENCES public.staff(staff_id),
  CONSTRAINT feedback_subject_equipment_id_fkey FOREIGN KEY (subject_equipment_id) REFERENCES public.equipment(equipment_id)
);
CREATE TABLE public.staff_schedules (
  schedule_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  staff_id bigint NOT NULL,
  shift USER-DEFINED NOT NULL,
  work_date date NOT NULL,
  deleted_at timestamp without time zone,
  CONSTRAINT staff_schedules_pkey PRIMARY KEY (schedule_id),
  CONSTRAINT staff_schedules_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(staff_id)
);
CREATE TABLE public.audit_logs (
  audit_id bigint NOT NULL DEFAULT nextval('audit_logs_audit_id_seq'::regclass),
  actor_user_id bigint,
  action character varying NOT NULL,
  resource_type character varying NOT NULL,
  resource_id character varying,
  before_data jsonb,
  after_data jsonb,
  ip_address character varying,
  user_agent character varying,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT audit_logs_pkey PRIMARY KEY (audit_id),
  CONSTRAINT audit_logs_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.files (
  file_id bigint NOT NULL DEFAULT nextval('files_file_id_seq'::regclass),
  owner_user_id bigint NOT NULL,
  file_type USER-DEFINED NOT NULL,
  storage_path character varying NOT NULL,
  public_url character varying,
  mime_type character varying NOT NULL,
  size_bytes bigint NOT NULL,
  deleted_at timestamp without time zone,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT files_pkey PRIMARY KEY (file_id),
  CONSTRAINT files_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.exercises (
  exercise_id bigint NOT NULL DEFAULT nextval('exercises_exercise_id_seq'::regclass),
  name character varying NOT NULL,
  category USER-DEFINED NOT NULL,
  muscle_group character varying,
  equipment_needed character varying,
  description text,
  created_by_staff_id bigint,
  deleted_at timestamp without time zone,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  image_url character varying,
  CONSTRAINT exercises_pkey PRIMARY KEY (exercise_id),
  CONSTRAINT exercises_created_by_staff_id_fkey FOREIGN KEY (created_by_staff_id) REFERENCES public.staff(staff_id)
);
CREATE TABLE public.workout_plans (
  plan_id bigint NOT NULL DEFAULT nextval('workout_plans_plan_id_seq'::regclass),
  creator_staff_id bigint,
  creator_member_id bigint,
  creator_type USER-DEFINED NOT NULL,
  name character varying NOT NULL,
  description text,
  status USER-DEFINED NOT NULL DEFAULT 'draft'::workout_plan_status,
  deleted_at timestamp without time zone,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT workout_plans_pkey PRIMARY KEY (plan_id),
  CONSTRAINT workout_plans_creator_staff_id_fkey FOREIGN KEY (creator_staff_id) REFERENCES public.staff(staff_id),
  CONSTRAINT workout_plans_creator_member_id_fkey FOREIGN KEY (creator_member_id) REFERENCES public.members(member_id)
);
CREATE TABLE public.workout_plan_days (
  plan_day_id bigint NOT NULL DEFAULT nextval('workout_plan_days_plan_day_id_seq'::regclass),
  plan_id bigint NOT NULL,
  day_number integer NOT NULL,
  name character varying NOT NULL,
  notes text,
  week_number integer NOT NULL DEFAULT 1,
  day_of_week integer NOT NULL,
  CONSTRAINT workout_plan_days_pkey PRIMARY KEY (plan_day_id),
  CONSTRAINT workout_plan_days_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.workout_plans(plan_id)
);
CREATE TABLE public.workout_plan_exercises (
  plan_exercise_id bigint NOT NULL DEFAULT nextval('workout_plan_exercises_plan_exercise_id_seq'::regclass),
  plan_day_id bigint NOT NULL,
  exercise_id bigint NOT NULL,
  order_index integer NOT NULL,
  target_sets integer NOT NULL,
  target_reps integer,
  target_duration_sec integer,
  target_weight_kg numeric,
  rest_seconds integer DEFAULT 60,
  notes text,
  CONSTRAINT workout_plan_exercises_pkey PRIMARY KEY (plan_exercise_id),
  CONSTRAINT workout_plan_exercises_plan_day_id_fkey FOREIGN KEY (plan_day_id) REFERENCES public.workout_plan_days(plan_day_id),
  CONSTRAINT workout_plan_exercises_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.exercises(exercise_id)
);
CREATE TABLE public.member_workout_plans (
  assignment_id bigint NOT NULL DEFAULT nextval('member_workout_plans_assignment_id_seq'::regclass),
  member_id bigint NOT NULL,
  plan_id bigint NOT NULL,
  assigned_by_staff_id bigint,
  start_date date NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'active'::workout_assignment_status,
  ended_at timestamp without time zone,
  notes text,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT member_workout_plans_pkey PRIMARY KEY (assignment_id),
  CONSTRAINT member_workout_plans_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(member_id),
  CONSTRAINT member_workout_plans_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.workout_plans(plan_id),
  CONSTRAINT member_workout_plans_assigned_by_staff_id_fkey FOREIGN KEY (assigned_by_staff_id) REFERENCES public.staff(staff_id)
);
CREATE TABLE public.workout_logs (
  log_id bigint NOT NULL DEFAULT nextval('workout_logs_log_id_seq'::regclass),
  member_id bigint NOT NULL,
  assignment_id bigint NOT NULL,
  plan_day_id bigint NOT NULL,
  logged_at timestamp without time zone NOT NULL,
  duration_min integer,
  notes text,
  CONSTRAINT workout_logs_pkey PRIMARY KEY (log_id),
  CONSTRAINT workout_logs_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(member_id),
  CONSTRAINT workout_logs_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.member_workout_plans(assignment_id),
  CONSTRAINT workout_logs_plan_day_id_fkey FOREIGN KEY (plan_day_id) REFERENCES public.workout_plan_days(plan_day_id)
);
CREATE TABLE public.workout_log_sets (
  log_set_id bigint NOT NULL DEFAULT nextval('workout_log_sets_log_set_id_seq'::regclass),
  log_id bigint NOT NULL,
  plan_exercise_id bigint NOT NULL,
  set_number integer NOT NULL,
  actual_reps integer,
  actual_weight_kg numeric,
  actual_duration_sec integer,
  completed boolean NOT NULL DEFAULT true,
  CONSTRAINT workout_log_sets_pkey PRIMARY KEY (log_set_id),
  CONSTRAINT workout_log_sets_log_id_fkey FOREIGN KEY (log_id) REFERENCES public.workout_logs(log_id),
  CONSTRAINT workout_log_sets_plan_exercise_id_fkey FOREIGN KEY (plan_exercise_id) REFERENCES public.workout_plan_exercises(plan_exercise_id)
);
CREATE TABLE public.payment_accounts (
  account_id integer NOT NULL DEFAULT nextval('payment_accounts_account_id_seq'::regclass),
  member_id bigint NOT NULL,
  type USER-DEFINED NOT NULL,
  provider character varying,
  account_ref character varying,
  label character varying,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp without time zone,
  CONSTRAINT payment_accounts_pkey PRIMARY KEY (account_id),
  CONSTRAINT payment_accounts_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(member_id)
);
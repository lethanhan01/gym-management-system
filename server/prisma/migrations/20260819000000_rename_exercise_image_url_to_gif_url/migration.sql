BEGIN;

DO $$
DECLARE
  has_image_url BOOLEAN;
  has_gif_url BOOLEAN;
  has_description_override BOOLEAN;
  has_image_url_override BOOLEAN;
  override_count INTEGER;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'image_url'
  ) INTO has_image_url;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'gifUrl'
  ) INTO has_gif_url;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'description_override'
  ) INTO has_description_override;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'image_url_override'
  ) INTO has_image_url_override;

  IF has_description_override THEN
    EXECUTE 'SELECT count(*) FROM public.exercises WHERE description_override IS NOT NULL'
      INTO override_count;
    IF override_count > 0 THEN
      RAISE EXCEPTION 'Cannot remove exercise overrides: description_override contains data';
    END IF;
  END IF;
  IF has_image_url_override THEN
    EXECUTE 'SELECT count(*) FROM public.exercises WHERE image_url_override IS NOT NULL'
      INTO override_count;
    IF override_count > 0 THEN
      RAISE EXCEPTION 'Cannot remove exercise overrides: image_url_override contains data';
    END IF;
  END IF;

  IF has_image_url AND has_gif_url THEN
    RAISE EXCEPTION 'Cannot rename exercise URL: both image_url and gifUrl exist';
  ELSIF has_image_url THEN
    EXECUTE 'ALTER TABLE public.exercises RENAME COLUMN image_url TO "gifUrl"';
  ELSIF NOT has_gif_url THEN
    RAISE EXCEPTION 'Cannot rename exercise URL: neither image_url nor gifUrl exists';
  END IF;

  IF has_description_override THEN
    EXECUTE 'ALTER TABLE public.exercises DROP COLUMN description_override';
  END IF;
  IF has_image_url_override THEN
    EXECUTE 'ALTER TABLE public.exercises DROP COLUMN image_url_override';
  END IF;
END
$$;

COMMIT;

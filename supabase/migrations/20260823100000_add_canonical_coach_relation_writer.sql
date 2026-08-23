BEGIN;

DO $preflight$
DECLARE
  required_column text;
BEGIN
  IF to_regclass('public.coach_clients') IS NULL THEN
    RAISE EXCEPTION 'COACH_RELATION_WRITER_REQUIRES_COACH_CLIENTS';
  END IF;

  FOREACH required_column IN ARRAY ARRAY[
    'status',
    'source',
    'started_at',
    'ended_at',
    'ended_by',
    'end_reason'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'coach_clients'
        AND column_name = required_column
    ) THEN
      RAISE EXCEPTION 'COACH_RELATION_WRITER_REQUIRES_COLUMN: %', required_column;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'coach_clients'
      AND column_name IN ('status', 'source', 'started_at')
      AND is_nullable = 'NO'
    GROUP BY table_schema, table_name
    HAVING count(*) = 3
  ) THEN
    RAISE EXCEPTION 'COACH_RELATION_WRITER_REQUIRES_FINAL_LIFECYCLE_COLUMNS';
  END IF;

  IF to_regclass('public.coach_clients_one_active_per_client_idx') IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM pg_index AS relation_index
      JOIN pg_attribute AS client_column
        ON client_column.attrelid = relation_index.indrelid
        AND client_column.attname = 'client_id'
      WHERE relation_index.indexrelid =
        'public.coach_clients_one_active_per_client_idx'::regclass
        AND relation_index.indisunique
        AND relation_index.indisvalid
        AND relation_index.indnkeyatts = 1
        AND relation_index.indkey::text = client_column.attnum::text
        AND pg_get_expr(relation_index.indpred, relation_index.indrelid) =
          '(status = ''active''::text)'
    )
  THEN
    RAISE EXCEPTION 'COACH_RELATION_WRITER_REQUIRES_ACTIVE_UNIQUE_INDEX';
  END IF;
END
$preflight$;

CREATE OR REPLACE FUNCTION public.transition_coach_client_relation(
  p_client_id uuid,
  p_coach_id uuid,
  p_operation text,
  p_source text,
  p_actor_id uuid,
  p_end_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  active_count integer;
  active_relation public.coach_clients%ROWTYPE;
  inserted_relation public.coach_clients%ROWTYPE;
  ended_relation public.coach_clients%ROWTYPE;
  transition_time timestamptz;
BEGIN
  IF p_client_id IS NULL OR p_coach_id IS NULL OR p_actor_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'outcome', 'error',
      'code', 'RELATION_IDENTITY_REQUIRED'
    );
  END IF;

  IF p_operation IS NULL OR p_operation NOT IN ('create', 'end', 'replace') THEN
    RETURN jsonb_build_object(
      'success', false,
      'outcome', 'error',
      'code', 'RELATION_OPERATION_INVALID'
    );
  END IF;

  IF p_source IS NULL OR p_source NOT IN ('default', 'invitation', 'admin', 'legacy') THEN
    RETURN jsonb_build_object(
      'success', false,
      'outcome', 'error',
      'code', 'RELATION_SOURCE_INVALID'
    );
  END IF;

  IF p_end_reason IS NOT NULL
    AND p_end_reason NOT IN (
      'client_request',
      'coach_request',
      'replaced',
      'admin_action',
      'legacy_reconciliation'
    )
  THEN
    RETURN jsonb_build_object(
      'success', false,
      'outcome', 'error',
      'code', 'RELATION_END_REASON_INVALID'
    );
  END IF;

  IF p_operation = 'create' AND p_end_reason IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'outcome', 'error',
      'code', 'RELATION_CREATE_REASON_FORBIDDEN'
    );
  END IF;

  IF p_operation = 'end'
    AND (p_end_reason IS NULL OR p_end_reason = 'replaced')
  THEN
    RETURN jsonb_build_object(
      'success', false,
      'outcome', 'error',
      'code', 'RELATION_END_REASON_REQUIRED'
    );
  END IF;

  IF p_operation = 'replace'
    AND p_end_reason IS NOT NULL
    AND p_end_reason <> 'replaced'
  THEN
    RETURN jsonb_build_object(
      'success', false,
      'outcome', 'error',
      'code', 'RELATION_REPLACE_REASON_INVALID'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_client_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'outcome', 'error',
      'code', 'RELATION_CLIENT_NOT_FOUND'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_coach_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'outcome', 'error',
      'code', 'RELATION_COACH_NOT_FOUND'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_actor_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'outcome', 'error',
      'code', 'RELATION_ACTOR_NOT_FOUND'
    );
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_client_id::text, 0)
  );

  SELECT count(*)
  INTO active_count
  FROM public.coach_clients AS relation
  WHERE relation.client_id = p_client_id
    AND relation.status = 'active';

  IF active_count > 1 THEN
    RAISE EXCEPTION 'COACH_RELATION_MULTIPLE_ACTIVE_ROWS'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT relation.*
  INTO active_relation
  FROM public.coach_clients AS relation
  WHERE relation.client_id = p_client_id
    AND relation.status = 'active'
  ORDER BY relation.started_at DESC, relation.id
  LIMIT 1
  FOR UPDATE;

  IF p_operation = 'create' THEN
    IF active_count = 1 THEN
      IF active_relation.coach_id = p_coach_id THEN
        RETURN jsonb_build_object(
          'success', true,
          'outcome', 'already_active_same_coach',
          'relationId', active_relation.id,
          'coachId', active_relation.coach_id,
          'clientId', active_relation.client_id
        );
      END IF;

      RETURN jsonb_build_object(
        'success', false,
        'outcome', 'conflict',
        'code', 'RELATION_ACTIVE_COACH_CONFLICT',
        'relationId', active_relation.id,
        'coachId', active_relation.coach_id,
        'clientId', active_relation.client_id
      );
    END IF;

    transition_time := clock_timestamp();

    INSERT INTO public.coach_clients (
      coach_id,
      client_id,
      status,
      source,
      started_at,
      ended_at,
      ended_by,
      end_reason
    ) VALUES (
      p_coach_id,
      p_client_id,
      'active',
      p_source,
      transition_time,
      NULL,
      NULL,
      NULL
    )
    RETURNING * INTO inserted_relation;

    RETURN jsonb_build_object(
      'success', true,
      'outcome', 'created',
      'relationId', inserted_relation.id,
      'coachId', inserted_relation.coach_id,
      'clientId', inserted_relation.client_id
    );
  END IF;

  IF active_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'outcome', 'no_active_relation',
      'code', 'RELATION_ACTIVE_NOT_FOUND',
      'coachId', p_coach_id,
      'clientId', p_client_id
    );
  END IF;

  IF p_operation = 'end' THEN
    IF active_relation.coach_id <> p_coach_id THEN
      RETURN jsonb_build_object(
        'success', false,
        'outcome', 'conflict',
        'code', 'RELATION_ACTIVE_COACH_CONFLICT',
        'relationId', active_relation.id,
        'coachId', active_relation.coach_id,
        'clientId', active_relation.client_id
      );
    END IF;

    transition_time := clock_timestamp();

    UPDATE public.coach_clients AS relation
    SET
      status = 'ended',
      ended_at = transition_time,
      ended_by = p_actor_id,
      end_reason = p_end_reason
    WHERE relation.id = active_relation.id
      AND relation.status = 'active'
    RETURNING relation.* INTO ended_relation;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'COACH_RELATION_CONCURRENT_TRANSITION'
        USING ERRCODE = '40001';
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'outcome', 'ended',
      'relationId', ended_relation.id,
      'coachId', ended_relation.coach_id,
      'clientId', ended_relation.client_id
    );
  END IF;

  IF active_relation.coach_id = p_coach_id THEN
    RETURN jsonb_build_object(
      'success', true,
      'outcome', 'already_active_same_coach',
      'relationId', active_relation.id,
      'coachId', active_relation.coach_id,
      'clientId', active_relation.client_id
    );
  END IF;

  transition_time := clock_timestamp();

  UPDATE public.coach_clients AS relation
  SET
    status = 'ended',
    ended_at = transition_time,
    ended_by = p_actor_id,
    end_reason = 'replaced'
  WHERE relation.id = active_relation.id
    AND relation.status = 'active'
  RETURNING relation.* INTO ended_relation;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COACH_RELATION_CONCURRENT_TRANSITION'
      USING ERRCODE = '40001';
  END IF;

  INSERT INTO public.coach_clients (
    coach_id,
    client_id,
    status,
    source,
    started_at,
    ended_at,
    ended_by,
    end_reason
  ) VALUES (
    p_coach_id,
    p_client_id,
    'active',
    p_source,
    transition_time,
    NULL,
    NULL,
    NULL
  )
  RETURNING * INTO inserted_relation;

  RETURN jsonb_build_object(
    'success', true,
    'outcome', 'replaced',
    'relationId', inserted_relation.id,
    'previousRelationId', ended_relation.id,
    'coachId', inserted_relation.coach_id,
    'clientId', inserted_relation.client_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.transition_coach_client_relation(
  uuid,
  uuid,
  text,
  text,
  uuid,
  text
) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.transition_coach_client_relation(
  uuid,
  uuid,
  text,
  text,
  uuid,
  text
) TO service_role;

COMMENT ON FUNCTION public.transition_coach_client_relation(
  uuid,
  uuid,
  text,
  text,
  uuid,
  text
) IS
  'Canonical server-only writer for atomic coach/client relation create, end and replace transitions.';

DO $postflight$
BEGIN
  IF has_function_privilege(
    'anon',
    'public.transition_coach_client_relation(uuid,uuid,text,text,uuid,text)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.transition_coach_client_relation(uuid,uuid,text,text,uuid,text)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'service_role',
    'public.transition_coach_client_relation(uuid,uuid,text,text,uuid,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'COACH_RELATION_WRITER_EXECUTE_GRANTS_INVALID';
  END IF;
END
$postflight$;

COMMIT;

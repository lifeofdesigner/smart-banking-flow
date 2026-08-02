-- Lets customers log in with either their email or their bank account number.
-- Supabase Auth only accepts an email/phone identifier, so the client resolves
-- an account number to its owning email via this RPC *before* calling
-- signInWithPassword. The RPC never reveals whether a given identifier
-- exists: if it can't resolve an account number, it echoes the input back
-- unchanged (so the caller falls through to signInWithPassword's own
-- generic "Invalid login credentials" error either way).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.login_identifier_attempts (
  identifier_hash text PRIMARY KEY,
  attempt_count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.login_identifier_attempts ENABLE ROW LEVEL SECURITY;

-- Backend bookkeeping only; no client (anon or authenticated) can read/write
-- this table directly, only the SECURITY DEFINER function below can.
CREATE POLICY "No direct access to login identifier attempts"
  ON public.login_identifier_attempts
  FOR ALL
  USING (false)
  WITH CHECK (false);

REVOKE ALL ON public.login_identifier_attempts FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.resolve_login_identifier(p_identifier text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_identifier text := trim(p_identifier);
  v_hash text;
  v_max_requests CONSTANT integer := 20;
  v_window_seconds CONSTANT integer := 900;
  v_attempt public.login_identifier_attempts%ROWTYPE;
  v_resolved_email text;
BEGIN
  IF v_identifier IS NULL OR length(v_identifier) = 0 OR length(v_identifier) > 254 THEN
    RETURN p_identifier;
  END IF;

  v_hash := encode(digest(lower(v_identifier), 'sha256'), 'hex');

  SELECT * INTO v_attempt FROM public.login_identifier_attempts WHERE identifier_hash = v_hash FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.login_identifier_attempts (identifier_hash, attempt_count, window_start)
    VALUES (v_hash, 1, now());
  ELSIF v_attempt.window_start < now() - (v_window_seconds || ' seconds')::interval THEN
    UPDATE public.login_identifier_attempts
    SET attempt_count = 1, window_start = now()
    WHERE identifier_hash = v_hash;
  ELSIF v_attempt.attempt_count >= v_max_requests THEN
    RAISE EXCEPTION 'Too many login attempts. Please wait a few minutes and try again.'
      USING ERRCODE = 'P0001';
  ELSE
    UPDATE public.login_identifier_attempts
    SET attempt_count = attempt_count + 1
    WHERE identifier_hash = v_hash;
  END IF;

  -- Only account numbers (our generate_account_number() format: digits only,
  -- 9-12 characters) are eligible for resolution; anything else (including a
  -- plain email) is returned unchanged for signInWithPassword to handle.
  IF v_identifier !~ '^[0-9]{9,12}$' THEN
    RETURN p_identifier;
  END IF;

  SELECT u.email INTO v_resolved_email
  FROM public.accounts a
  JOIN auth.users u ON u.id = a.user_id
  WHERE a.account_number = v_identifier
    AND a.user_id IS NOT NULL
  LIMIT 1;

  RETURN COALESCE(v_resolved_email, p_identifier);
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_login_identifier(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_login_identifier(text) TO anon, authenticated;

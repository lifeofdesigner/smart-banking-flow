import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

export const rootDir = resolve(import.meta.dirname, "..", "..");
const migrationEnvPath = resolve(rootDir, ".env.migration.local");
const localEnvPath = resolve(rootDir, ".env.local-user-manager");

export const parseEnvFile = (path) => {
  if (!existsSync(path)) return {};

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        const key = line.slice(0, separatorIndex);
        const value = line.slice(separatorIndex + 1).replace(/^["']|["']$/g, "");

        return [key, value];
      }),
  );
};

export const getDatabaseUrl = () => {
  const localEnv = parseEnvFile(localEnvPath);
  const migrationEnv = parseEnvFile(migrationEnvPath);
  return (
    process.env.LOCAL_USER_MANAGER_DB_URL
    || process.env.NEW_DB_CONNECTION_STRING
    || localEnv.LOCAL_USER_MANAGER_DB_URL
    || localEnv.NEW_DB_CONNECTION_STRING
    || migrationEnv.NEW_DB_CONNECTION_STRING
  );
};

export const sqlLiteral = (value) => {
  if (value === null || value === undefined || value === "") return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
};

export const numberLiteral = (value, fallback = 0) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) return fallback.toFixed(2);
  return numberValue.toFixed(2);
};

export const normalizeEmail = (value) => value.trim().toLowerCase();

const psqlBin = () => process.env.PSQL_BIN || "psql";

export const runPsql = (databaseUrl, sql) => {
  const backupDir = resolve(rootDir, "migration-backups");
  mkdirSync(backupDir, { recursive: true });

  const sqlPath = resolve(backupDir, `local-user-manager-${Date.now()}-${Math.random().toString(36).slice(2)}.sql`);
  writeFileSync(sqlPath, sql);

  const result = spawnSync(psqlBin(), [`--dbname=${databaseUrl}`, "-v", "ON_ERROR_STOP=1", "-f", sqlPath], {
    cwd: rootDir,
    encoding: "utf8",
  });

  try {
    unlinkSync(sqlPath);
  } catch {
    // Best-effort cleanup only.
  }

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error([result.stdout, result.stderr].filter(Boolean).join("\n").trim());
  }

  return [result.stdout, result.stderr].filter(Boolean).join("\n");
};

/** Runs a single read-only query and parses its one-column, one-row output as JSON. */
export const runPsqlJson = (databaseUrl, query) => {
  const result = spawnSync(psqlBin(), [`--dbname=${databaseUrl}`, "-v", "ON_ERROR_STOP=1", "-t", "-A", "-q", "-c", query], {
    cwd: rootDir,
    encoding: "utf8",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error([result.stdout, result.stderr].filter(Boolean).join("\n").trim());
  }

  const raw = result.stdout.trim();
  if (!raw) return null;

  return JSON.parse(raw);
};

export const buildCreateUserSql = ({
  fullName,
  email,
  password,
  role,
  phone,
  address,
  kycStatus,
  accountType,
  openingBalance,
}) => {
  const metadata = JSON.stringify({ full_name: fullName });
  const accountTypeName = accountType === "checking" ? "Checking Account" : "Savings Account";

  return `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_existing_user_id uuid;
  v_user_id uuid := gen_random_uuid();
  v_identity_id uuid := gen_random_uuid();
  v_account_type_id uuid;
  v_account_id uuid;
BEGIN
  SELECT id INTO v_existing_user_id
  FROM auth.users
  WHERE lower(email) = lower(${sqlLiteral(email)})
  LIMIT 1;

  IF v_existing_user_id IS NOT NULL THEN
    v_user_id := v_existing_user_id;

    UPDATE auth.users
    SET
      encrypted_password = crypt(${sqlLiteral(password)}, gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = ${sqlLiteral(metadata)}::jsonb,
      updated_at = now()
    WHERE id = v_user_id;
  ELSE
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      ${sqlLiteral(email)},
      crypt(${sqlLiteral(password)}, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      ${sqlLiteral(metadata)}::jsonb,
      now(),
      now()
    );
  END IF;

  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_identity_id,
    v_user_id,
    v_user_id::text,
    jsonb_build_object('sub', v_user_id::text, 'email', ${sqlLiteral(email)}),
    'email',
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    updated_at = now();

  UPDATE auth.users
  SET
    confirmation_token = coalesce(confirmation_token, ''),
    recovery_token = coalesce(recovery_token, ''),
    email_change_token_new = coalesce(email_change_token_new, ''),
    email_change = coalesce(email_change, ''),
    email_change_token_current = coalesce(email_change_token_current, ''),
    phone_change = coalesce(phone_change, ''),
    phone_change_token = coalesce(phone_change_token, ''),
    reauthentication_token = coalesce(reauthentication_token, ''),
    email_change_confirm_status = coalesce(email_change_confirm_status, 0),
    is_sso_user = coalesce(is_sso_user, false),
    is_anonymous = coalesce(is_anonymous, false)
  WHERE id = v_user_id;

  INSERT INTO public.profiles (id, full_name, email, phone, address, kyc_status)
  VALUES (
    v_user_id,
    ${sqlLiteral(fullName)},
    ${sqlLiteral(email)},
    ${sqlLiteral(phone)},
    ${sqlLiteral(address)},
    ${sqlLiteral(kycStatus)}
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    kyc_status = EXCLUDED.kyc_status,
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'user'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF ${sqlLiteral(role)} = 'admin' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles
    WHERE user_id = v_user_id
      AND role = 'admin'::public.app_role;
  END IF;

  SELECT id INTO v_account_type_id
  FROM public.account_types
  WHERE name = ${sqlLiteral(accountTypeName)}
  LIMIT 1;

  SELECT id INTO v_account_id
  FROM public.accounts
  WHERE user_id = v_user_id
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1;

  IF v_account_id IS NULL THEN
    INSERT INTO public.accounts (
      user_id,
      account_number,
      account_type,
      account_type_id,
      balance,
      available_balance,
      ledger_balance,
      currency,
      status
    ) VALUES (
      v_user_id,
      public.generate_account_number(),
      ${sqlLiteral(accountType)},
      v_account_type_id,
      ${numberLiteral(openingBalance)},
      ${numberLiteral(openingBalance)},
      ${numberLiteral(openingBalance)},
      'USD',
      'active'
    );
  ELSE
    UPDATE public.accounts
    SET
      account_type = ${sqlLiteral(accountType)},
      account_type_id = v_account_type_id,
      balance = ${numberLiteral(openingBalance)},
      available_balance = ${numberLiteral(openingBalance)},
      ledger_balance = ${numberLiteral(openingBalance)},
      currency = 'USD',
      status = 'active',
      updated_at = now()
    WHERE id = v_account_id;
  END IF;

  RAISE NOTICE 'Created/updated % user: %', ${sqlLiteral(role)}, ${sqlLiteral(email)};
END $$;
`;
};

export const buildResetPasswordSql = (userId, password) => `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_user_id uuid := ${sqlLiteral(userId)}::uuid;
  v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'No user found with id %', v_user_id;
  END IF;

  UPDATE auth.users
  SET
    encrypted_password = crypt(${sqlLiteral(password)}, gen_salt('bf')),
    updated_at = now()
  WHERE id = v_user_id;

  RAISE NOTICE 'Password reset for % (%)', v_email, v_user_id;
END $$;
`;

export const buildDeleteUserSql = (userId) => `
DO $$
DECLARE
  v_user_id uuid := ${sqlLiteral(userId)}::uuid;
  v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'No user found with id %', v_user_id;
  END IF;

  DELETE FROM auth.users WHERE id = v_user_id;

  RAISE NOTICE 'Deleted user % (%)', v_email, v_user_id;
END $$;
`;

/**
 * Sources from auth.users (not public.profiles) so it lists every Supabase Auth
 * user even if their profile row is missing, mirroring the production admin
 * user list which reads from the Auth Admin API rather than public.profiles.
 */
export const listUsersQuery = `
SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::jsonb)
FROM (
  SELECT
    u.id,
    u.email,
    COALESCE(p.full_name, u.raw_user_meta_data->>'full_name', 'User') AS full_name,
    COALESCE(p.kyc_status, 'pending') AS kyc_status,
    u.created_at,
    (u.email_confirmed_at IS NOT NULL) AS email_confirmed,
    (u.banned_until IS NOT NULL AND u.banned_until > now()) AS banned,
    u.last_sign_in_at,
    (p.id IS NULL) AS missing_profile,
    COALESCE((
      SELECT array_agg(ur.role::text ORDER BY ur.role::text)
      FROM public.user_roles ur
      WHERE ur.user_id = u.id
    ), '{}') AS roles,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'account_number', a.account_number,
        'account_type', a.account_type,
        'balance', a.balance,
        'status', a.status
      ) ORDER BY a.created_at ASC)
      FROM public.accounts a
      WHERE a.user_id = u.id
    ), '[]'::jsonb) AS accounts
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
) t;
`;

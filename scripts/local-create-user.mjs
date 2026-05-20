import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { resolve } from "node:path";

const rootDir = resolve(import.meta.dirname, "..");
const migrationEnvPath = resolve(rootDir, ".env.migration.local");
const localEnvPath = resolve(rootDir, ".env.local-user-manager");

const parseEnvFile = (path) => {
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

const parseArgs = () => {
  const args = process.argv.slice(2);
  const values = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;

    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    values[key] = inlineValue ?? args[index + 1];

    if (inlineValue === undefined) index += 1;
  }

  return values;
};

const rl = createInterface({ input, output });

const ask = async (question, defaultValue = "") => {
  const suffix = defaultValue ? ` (${defaultValue})` : "";
  const answer = await rl.question(`${question}${suffix}: `);

  return answer.trim() || defaultValue;
};

const sqlLiteral = (value) => {
  if (value === null || value === undefined || value === "") return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
};

const numberLiteral = (value, fallback = 0) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) return fallback.toFixed(2);
  return numberValue.toFixed(2);
};

const normalizeEmail = (value) => value.trim().toLowerCase();

const hasRequiredCliFields = (args) => Boolean(
  (args.name || args.fullName)
    && args.email
    && args.password,
);

const getDatabaseUrl = () => {
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

const runPsql = (databaseUrl, sql) => {
  const backupDir = resolve(rootDir, "migration-backups");
  mkdirSync(backupDir, { recursive: true });

  const sqlPath = resolve(backupDir, `local-create-user-${Date.now()}.sql`);
  writeFileSync(sqlPath, sql);

  const psqlBin = process.env.PSQL_BIN || "psql";
  const result = spawnSync(psqlBin, [`--dbname=${databaseUrl}`, "-v", "ON_ERROR_STOP=1", "-f", sqlPath], {
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

const buildCreateUserSql = ({
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
  const userId = randomUUID();
  const identityId = randomUUID();
  const metadata = JSON.stringify({ full_name: fullName });
  const identityData = JSON.stringify({ sub: userId, email });
  const accountTypeName = accountType === "checking" ? "Checking Account" : "Savings Account";

  return `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_existing_user_id uuid;
  v_user_id uuid := ${sqlLiteral(userId)}::uuid;
  v_identity_id uuid := ${sqlLiteral(identityId)}::uuid;
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
    ${sqlLiteral(identityData)}::jsonb,
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

const main = async () => {
  const args = parseArgs();
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    throw new Error(
      "Missing database URL. Add NEW_DB_CONNECTION_STRING to .env.migration.local or LOCAL_USER_MANAGER_DB_URL to .env.local-user-manager.",
    );
  }

  const roleAnswer = (args.role || await ask("Role (admin/customer)", "customer")).toLowerCase();
  const role = roleAnswer === "admin" ? "admin" : "user";
  const canUseCliDefaults = hasRequiredCliFields(args);
  const fullName = args.name || args.fullName || await ask("Full name");
  const email = normalizeEmail(args.email || await ask("Email"));
  const password = args.password || await ask("Password (minimum 8 chars)");
  const phone = args.phone || (canUseCliDefaults ? "" : await ask("Phone", ""));
  const address = args.address || (canUseCliDefaults ? "" : await ask("Address", ""));
  const kycStatusAnswer = (args.kycStatus || (canUseCliDefaults ? "verified" : await ask("KYC status (pending/verified/rejected)", "verified"))).toLowerCase();
  const accountTypeAnswer = (args.accountType || (canUseCliDefaults ? "savings" : await ask("Account type (savings/checking)", "savings"))).toLowerCase();
  const openingBalance = args.balance || (canUseCliDefaults ? "0" : await ask("Opening balance", "0"));

  const kycStatus = ["pending", "verified", "rejected"].includes(kycStatusAnswer) ? kycStatusAnswer : "verified";
  const accountType = accountTypeAnswer === "checking" || accountTypeAnswer === "current" ? "checking" : "savings";

  if (!fullName.trim()) throw new Error("Full name is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("A valid email address is required.");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");

  const sql = buildCreateUserSql({
    fullName: fullName.trim(),
    email,
    password,
    role,
    phone: phone.trim(),
    address: address.trim(),
    kycStatus,
    accountType,
    openingBalance,
  });

  const outputText = runPsql(databaseUrl, sql);
  const noticeLines = outputText
    .split(/\r?\n/)
    .filter((line) => line.includes("NOTICE") || line.includes("DO"));

  for (const line of noticeLines) console.log(line);

  console.log(`Done. ${role === "admin" ? "Admin" : "Customer"} account is ready: ${email}`);
};

main()
  .catch((error) => {
    console.error(`Local user creation failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => {
    rl.close();
  });

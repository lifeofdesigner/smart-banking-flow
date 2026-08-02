import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { buildCreateUserSql, getDatabaseUrl, normalizeEmail, runPsql } from "./lib/local-db.mjs";

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

const hasRequiredCliFields = (args) => Boolean(
  (args.name || args.fullName)
    && args.email
    && args.password,
);

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

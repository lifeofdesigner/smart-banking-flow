import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(import.meta.dirname, "..");
const envPath = resolve(rootDir, ".env");

const readEnv = () => {
  if (!existsSync(envPath)) {
    throw new Error("Missing .env. Run npm run setup:supabase or create .env first.");
  }

  return Object.fromEntries(
    readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        const key = line.slice(0, separatorIndex);
        const rawValue = line.slice(separatorIndex + 1);
        const value = rawValue.replace(/^["']|["']$/g, "");

        return [key, value];
      }),
  );
};

const jsonRequest = async (url, anonKey) => {
  const response = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });
  const text = await response.text();
  let body = text;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  return { response, body };
};

const assetRequest = async (url) => {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.status;
  } catch {
    const response = await fetch(url, { method: "GET" });
    return response.status;
  }
};

const compactError = (body) => {
  if (!body || typeof body !== "object") {
    return body || "";
  }

  return body.message || body.hint || body.details || JSON.stringify(body);
};

const auditTable = async ({ supabaseUrl, anonKey, table, query }) => {
  const url = `${supabaseUrl}/rest/v1/${table}?${query}`;
  const { response, body } = await jsonRequest(url, anonKey);

  if (!response.ok) {
    console.log(`FAIL ${table}: HTTP ${response.status} ${compactError(body)}`);
    return { ok: false, rows: [], status: response.status, body };
  }

  const rows = Array.isArray(body) ? body : [];
  console.log(`OK   ${table}: HTTP ${response.status}, ${rows.length} row(s)`);
  return { ok: true, rows, status: response.status, body };
};

const auditHomepageSections = async ({ supabaseUrl, anonKey }) => {
  const modern = await auditTable({
    supabaseUrl,
    anonKey,
    table: "homepage_sections",
    query: "select=section_type,title,status&order=display_order.asc&limit=20",
  });

  if (modern.ok) {
    return modern;
  }

  if (!String(compactError(modern.body)).includes("status")) {
    return modern;
  }

  console.log("WARN homepage_sections: live table is using legacy is_active; push migrations to add status.");
  return auditTable({
    supabaseUrl,
    anonKey,
    table: "homepage_sections",
    query: "select=section_type,title,is_active&order=display_order.asc&limit=20",
  });
};

const main = async () => {
  const env = readEnv();
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const projectId = env.VITE_SUPABASE_PROJECT_ID;
  const anonKey = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const urlProjectRef = supabaseUrl?.match(/^https:\/\/([^.]+)\.supabase\.co\/?$/)?.[1];
  const expectedProjectRef = projectId || urlProjectRef;
  const expectedUrl = expectedProjectRef ? `https://${expectedProjectRef}.supabase.co` : "";

  console.log("Supabase connection audit");
  console.log(`Expected URL: ${expectedUrl || "(unknown)"}`);
  console.log(`Configured URL: ${supabaseUrl || "(missing)"}`);
  console.log(`Configured project id: ${projectId || "(missing)"}`);

  if (!supabaseUrl) {
    throw new Error("Missing VITE_SUPABASE_URL.");
  }

  if (expectedUrl && supabaseUrl !== expectedUrl) {
    throw new Error(`VITE_SUPABASE_URL must be ${expectedUrl}.`);
  }

  if (projectId && urlProjectRef !== projectId) {
    throw new Error(`Supabase URL points to ${urlProjectRef || "an unknown project"}, but VITE_SUPABASE_PROJECT_ID is ${projectId}.`);
  }

  if (!anonKey) {
    throw new Error("Missing VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY.");
  }

  console.log("Anon/publishable key: present (not printed)");

  const settings = await auditTable({
    supabaseUrl,
    anonKey,
    table: "site_settings",
    query: "select=key,value&key=in.(site_name,site_logo_url,site_favicon_url)&limit=20",
  });
  await auditHomepageSections({ supabaseUrl, anonKey });
  await auditTable({
    supabaseUrl,
    anonKey,
    table: "product_pages",
    query: "select=slug,product_name,status&order=display_order.asc&limit=20",
  });
  await auditTable({
    supabaseUrl,
    anonKey,
    table: "media_library",
    query: "select=file_url,file_type&order=created_at.desc&limit=5",
  });

  const assetRows = settings.rows.filter((row) =>
    ["site_logo_url", "site_favicon_url"].includes(row.key) && typeof row.value === "string" && row.value,
  );

  for (const row of assetRows) {
    const status = await assetRequest(row.value);
    console.log(`${status >= 200 && status < 400 ? "OK" : "FAIL"} ${row.key}: asset HTTP ${status}`);
  }

  console.log("Audit complete. These REST calls should increment the Supabase API request count.");
};

main().catch((error) => {
  console.error(`Audit failed: ${error.message}`);
  process.exitCode = 1;
});

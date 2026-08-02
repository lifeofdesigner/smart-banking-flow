import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildCreateUserSql,
  buildDeleteUserSql,
  getDatabaseUrl,
  listUsersQuery,
  normalizeEmail,
  rootDir,
  runPsql,
  runPsqlJson,
} from "./lib/local-db.mjs";

const HOST = "127.0.0.1";
const PORT = Number(process.env.LOCAL_USER_MANAGER_PORT) || 5399;
const htmlPath = resolve(rootDir, "scripts", "local-user-manager.html");

const databaseUrl = getDatabaseUrl();
if (!databaseUrl) {
  console.error(
    "Missing database URL. Add NEW_DB_CONNECTION_STRING to .env.migration.local or LOCAL_USER_MANAGER_DB_URL to .env.local-user-manager.",
  );
  process.exitCode = 1;
  process.exit();
}

const readBody = (req) => new Promise((resolvePromise, rejectPromise) => {
  let raw = "";
  req.on("data", (chunk) => {
    raw += chunk;
    if (raw.length > 1_000_000) req.destroy();
  });
  req.on("end", () => {
    if (!raw) return resolvePromise({});
    try {
      resolvePromise(JSON.parse(raw));
    } catch {
      rejectPromise(new Error("Invalid JSON body."));
    }
  });
  req.on("error", rejectPromise);
});

const sendJson = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};

const extractNoticeSummary = (psqlOutput) => {
  const noticeLines = psqlOutput.split(/\r?\n/).filter((line) => line.includes("NOTICE"));
  const lastNotice = noticeLines.at(-1);
  return lastNotice ? lastNotice.replace(/^.*NOTICE:\s*/, "") : "Done.";
};

const handleCreateUser = async (req, res) => {
  const body = await readBody(req);
  const fullName = String(body.fullName || "").trim();
  const email = normalizeEmail(String(body.email || ""));
  const password = String(body.password || "");
  const role = body.role === "admin" ? "admin" : "user";
  const phone = String(body.phone || "").trim();
  const address = String(body.address || "").trim();
  const kycStatus = ["pending", "verified", "rejected"].includes(body.kycStatus) ? body.kycStatus : "verified";
  const accountType = body.accountType === "checking" ? "checking" : "savings";
  const openingBalance = body.balance ?? "0";

  if (!fullName) return sendJson(res, 400, { ok: false, error: "Full name is required." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJson(res, 400, { ok: false, error: "A valid email address is required." });
  if (password.length < 8) return sendJson(res, 400, { ok: false, error: "Password must be at least 8 characters." });

  const sql = buildCreateUserSql({
    fullName, email, password, role, phone, address, kycStatus, accountType, openingBalance,
  });

  try {
    const outputText = runPsql(databaseUrl, sql);
    sendJson(res, 200, {
      ok: true,
      message: `${role === "admin" ? "Admin" : "Customer"} account ready: ${email}. ${extractNoticeSummary(outputText)}`,
    });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
};

const handleDeleteUser = async (req, res) => {
  const body = await readBody(req);
  const id = String(body.id || "");

  if (!/^[0-9a-f-]{36}$/i.test(id)) return sendJson(res, 400, { ok: false, error: "A valid user id is required." });

  try {
    runPsql(databaseUrl, buildDeleteUserSql(id));
    sendJson(res, 200, { ok: true });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
};

const handleListUsers = async (_req, res) => {
  try {
    const users = runPsqlJson(databaseUrl, listUsersQuery) || [];
    sendJson(res, 200, { ok: true, users });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
};

const server = createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(readFileSync(htmlPath));
      return;
    }

    if (req.method === "GET" && req.url === "/api/users") return handleListUsers(req, res);
    if (req.method === "POST" && req.url === "/api/create-user") return handleCreateUser(req, res);
    if (req.method === "POST" && req.url === "/api/delete-user") return handleDeleteUser(req, res);

    sendJson(res, 404, { ok: false, error: "Not found." });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Local User Manager running at http://${HOST}:${PORT} (localhost only)`);
});

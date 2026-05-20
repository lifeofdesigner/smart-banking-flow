import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

const envPath = resolve(rootDir, ".env");
const envExamplePath = resolve(rootDir, ".env.example");
const supabaseConfigPath = resolve(rootDir, "supabase", "config.toml");
const seedSourcePath = resolve(rootDir, "seed-demo.sql");
const seedTargetPath = resolve(rootDir, "supabase", "seed.sql");

const rl = createInterface({ input, output });

const parseArgs = () => {
  const args = new Set(process.argv.slice(2));

  return {
    skipLink: args.has("--skip-link"),
    skipDbPush: args.has("--skip-db-push"),
    skipSeed: args.has("--skip-seed"),
    yes: args.has("--yes") || args.has("-y"),
  };
};

const ask = async (question, defaultValue = "") => {
  const suffix = defaultValue ? ` (${defaultValue})` : "";
  const answer = await rl.question(`${question}${suffix}: `);

  return answer.trim() || defaultValue;
};

const askSecret = async (question) => {
  output.write(`${question}: `);
  const previousRawMode = input.isRaw;
  if (input.isTTY) {
    input.setRawMode(true);
  }

  return new Promise((resolveSecret) => {
    let value = "";

    const onData = (chunk) => {
      const text = chunk.toString("utf8");

      for (const char of text) {
        if (char === "\u0003") {
          output.write("\n");
          process.exit(130);
        }

        if (char === "\r" || char === "\n") {
          input.off("data", onData);
          if (input.isTTY) {
            input.setRawMode(Boolean(previousRawMode));
          }
          output.write("\n");
          resolveSecret(value.trim());
          return;
        }

        if (char === "\b" || char === "\u007f") {
          value = value.slice(0, -1);
          return;
        }

        value += char;
      }
    };

    input.on("data", onData);
  });
};

const readExistingEnv = () => {
  const sourcePath = existsSync(envPath) ? envPath : envExamplePath;
  if (!existsSync(sourcePath)) {
    return {};
  }

  return Object.fromEntries(
    readFileSync(sourcePath, "utf8")
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

const writeEnv = (values) => {
  const lines = [
    `VITE_SUPABASE_PROJECT_ID="${values.projectRef}"`,
    `VITE_SUPABASE_URL="${values.supabaseUrl}"`,
    `VITE_SUPABASE_ANON_KEY="${values.anonKey}"`,
    `VITE_SUPABASE_PUBLISHABLE_KEY="${values.anonKey}"`,
    "",
  ];

  writeFileSync(envPath, lines.join("\n"));
  console.log(`Wrote ${envPath}`);
};

const writeSupabaseConfig = (projectRef) => {
  const existingConfig = existsSync(supabaseConfigPath)
    ? readFileSync(supabaseConfigPath, "utf8")
    : "";
  const nextProjectLine = `project_id = "${projectRef}"`;
  const nextConfig = existingConfig.match(/^project_id\s*=/m)
    ? existingConfig.replace(/^project_id\s*=.*$/m, nextProjectLine)
    : `${nextProjectLine}\n${existingConfig}`.trimEnd() + "\n";

  writeFileSync(supabaseConfigPath, nextConfig);
  console.log(`Linked config project_id to ${projectRef}`);
};

const prepareSeedFile = () => {
  if (!existsSync(seedSourcePath)) {
    throw new Error(`Missing seed source: ${seedSourcePath}`);
  }

  mkdirSync(dirname(seedTargetPath), { recursive: true });
  writeFileSync(seedTargetPath, readFileSync(seedSourcePath, "utf8"));
  console.log(`Prepared ${seedTargetPath} from seed-demo.sql`);
};

const runCommand = (label, command, args, env = {}) => {
  console.log(`\n${label}`);
  console.log(`> ${command} ${args.join(" ")}`);

  const result = spawnSync(command, args, {
    cwd: rootDir,
    env: { ...process.env, ...env },
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}`);
  }
};

const runSupabase = (label, args, env = {}) => {
  runCommand(label, "npx", ["--yes", "supabase@latest", ...args], env);
};

const main = async () => {
  const options = parseArgs();
  const existingEnv = readExistingEnv();
  const defaultRef =
    existingEnv.VITE_SUPABASE_PROJECT_ID
    || existingEnv.VITE_SUPABASE_URL?.match(/^https:\/\/([^.]+)\.supabase\.co/)?.[1]
    || "";

  console.log("Smart Banking Supabase setup");
  console.log("This writes .env, updates supabase/config.toml, links the Supabase CLI, pushes migrations, and seeds demo data.");
  console.log("You will need your Supabase project ref, anon key, database password, and a personal access token.");
  console.log("The access token and DB password are only passed to the Supabase CLI for this run.\n");

  const projectRef = await ask("Supabase project ref", defaultRef);
  if (!projectRef) {
    throw new Error("Supabase project ref is required.");
  }

  const supabaseUrl = await ask("Supabase project URL", existingEnv.VITE_SUPABASE_URL || `https://${projectRef}.supabase.co`);
  const anonKey = await ask("Supabase anon/publishable key", existingEnv.VITE_SUPABASE_ANON_KEY || existingEnv.VITE_SUPABASE_PUBLISHABLE_KEY || "");
  if (!anonKey) {
    throw new Error("Supabase anon/publishable key is required.");
  }

  writeEnv({ projectRef, supabaseUrl, anonKey });
  writeSupabaseConfig(projectRef);

  let cliEnv = {};
  if (!options.skipLink || !options.skipDbPush) {
    const accessToken = await askSecret("Supabase personal access token (starts with sbp_)");
    const dbPassword = await askSecret("Supabase database password");

    if (!accessToken && !options.skipLink) {
      throw new Error("Supabase access token is required to link the project.");
    }
    if (!dbPassword && (!options.skipLink || !options.skipDbPush)) {
      throw new Error("Supabase database password is required for link/db push.");
    }

    cliEnv = {
      SUPABASE_ACCESS_TOKEN: accessToken,
      SUPABASE_DB_PASSWORD: dbPassword,
    };
  }

  if (!options.skipSeed) {
    prepareSeedFile();
  }

  if (!options.skipLink) {
    runSupabase("Linking Supabase project", ["link", "--project-ref", projectRef], cliEnv);
  }

  if (!options.skipDbPush) {
    const pushArgs = ["db", "push"];
    if (!options.skipSeed) {
      pushArgs.push("--include-seed");
    }

    runSupabase("Pushing migrations to Supabase", pushArgs, cliEnv);
  }

  if (!options.skipDbPush) {
    runCommand("Verifying frontend build", "npm", ["run", "build"]);
  } else if (!options.yes) {
    const shouldBuild = (await ask("Run frontend build verification now?", "yes")).toLowerCase();
    if (["yes", "y"].includes(shouldBuild)) {
      runCommand("Verifying frontend build", "npm", ["run", "build"]);
    }
  }

  console.log("\nSupabase setup complete.");
  console.log("Demo credentials:");
  console.log("  Customer: customer@demo.local / DemoCustomer123!");
  console.log("  Admin:    admin@demo.local / DemoAdmin123!");
};

main()
  .catch((error) => {
    console.error(`\nSetup failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => {
    rl.close();
  });

const fs = require("node:fs/promises");
const path = require("node:path");

const { Client } = require("pg");
const { runner } = require("node-pg-migrate");

const ENV_PATH = path.join(process.cwd(), ".env");
const MIGRATIONS_DIR = path.join(process.cwd(), "infra", "migrations");
const MIGRATIONS_DIR_RELATIVE = "infra/migrations";
const MIGRATIONS_TABLE = "pgmigrations";
const MIGRATIONS_SCHEMA = "public";
const TIMESTAMP_WARNING_PREFIX = "Can't determine timestamp for ";

const loadEnvIfNeeded = () => {
  if (process.env.DATABASE_URL || typeof process.loadEnvFile !== "function") {
    return;
  }

  try {
    process.loadEnvFile(ENV_PATH);
  } catch (error) {
    if (!error || error.code !== "ENOENT") {
      throw error;
    }
  }
};

loadEnvIfNeeded();

const parseArgs = (argv) => {
  const [value] = argv;

  if (!value) {
    return {};
  }

  if (/^\d+$/.test(value)) {
    return { count: Number(value) };
  }

  return { file: value };
};

const getMigrationPrefix = (fileName) => {
  const [prefix = ""] = fileName.split("_");
  return /^\d+$/.test(prefix) ? Number(prefix) : Number.POSITIVE_INFINITY;
};

const compareMigrationFiles = (left, right) => {
  const prefixDiff = getMigrationPrefix(left) - getMigrationPrefix(right);
  if (prefixDiff !== 0) {
    return prefixDiff;
  }

  return left.localeCompare(right, undefined, { numeric: true });
};

const getLocalMigrationNames = async () => {
  const entries = await fs.readdir(MIGRATIONS_DIR, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort(compareMigrationFiles)
    .map((fileName) => fileName.replace(/\.[^.]+$/, ""));
};

const getAppliedMigrationNames = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não está definido.");
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });

  await client.connect();

  try {
    const result = await client.query(
      `SELECT name FROM "${MIGRATIONS_SCHEMA}"."${MIGRATIONS_TABLE}" ORDER BY run_on, id`,
    );

    return result.rows.map((row) => row.name);
  } catch (error) {
    if (error && error.code === "42P01") {
      return [];
    }

    throw error;
  } finally {
    await client.end();
  }
};

const findOrderMismatch = (appliedNames, localNames) => {
  const len = Math.min(appliedNames.length, localNames.length);

  for (let index = 0; index < len; index += 1) {
    if (appliedNames[index] !== localNames[index]) {
      return {
        index,
        appliedName: appliedNames[index],
        localName: localNames[index],
      };
    }
  }

  return null;
};

const createLogger = () => ({
  debug: () => {},
  info: (...messages) => console.log(...messages),
  warn: (...messages) => console.warn(...messages),
  error: (...messages) => {
    const [firstMessage] = messages;

    if (
      typeof firstMessage === "string" &&
      firstMessage.startsWith(TIMESTAMP_WARNING_PREFIX)
    ) {
      return;
    }

    console.error(...messages);
  },
});

const main = async () => {
  const logger = createLogger();
  const runtimeOptions = parseArgs(process.argv.slice(2));
  const [localNames, appliedNames] = await Promise.all([
    getLocalMigrationNames(),
    getAppliedMigrationNames(),
  ]);

  const localNameSet = new Set(localNames);
  const missingDefinitions = appliedNames.filter(
    (name) => !localNameSet.has(name),
  );

  if (missingDefinitions.length > 0) {
    throw new Error(
      `As migrations já aplicadas não existem mais em ${MIGRATIONS_DIR_RELATIVE}: ${missingDefinitions.join(", ")}`,
    );
  }

  const orderMismatch = findOrderMismatch(appliedNames, localNames);

  if (orderMismatch) {
    logger.warn(
      `[migrations] Histórico fora de ordem detectado em ${MIGRATIONS_TABLE}: ${orderMismatch.appliedName} foi registrado antes de ${orderMismatch.localName}. Executando com checkOrder=false para preservar o ambiente atual.`,
    );
  }

  await runner({
    databaseUrl: process.env.DATABASE_URL,
    dir: MIGRATIONS_DIR_RELATIVE,
    direction: "up",
    checkOrder: !orderMismatch,
    migrationsTable: MIGRATIONS_TABLE,
    migrationsSchema: MIGRATIONS_SCHEMA,
    schema: MIGRATIONS_SCHEMA,
    logger,
    verbose: false,
    ...runtimeOptions,
  });
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

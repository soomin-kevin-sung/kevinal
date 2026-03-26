import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Read version from package.json (source of truth after changesets bump)
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf-8"));
const version = pkg.version;

console.log(`Syncing version: ${version}`);

// Update Cargo.toml
const cargoPath = resolve(root, "src-tauri", "Cargo.toml");
let cargo = readFileSync(cargoPath, "utf-8");
cargo = cargo.replace(/^(version\s*=\s*)"[^"]*"/m, `$1"${version}"`);
writeFileSync(cargoPath, cargo, "utf-8");

// Update tauri.conf.json
const tauriConfPath = resolve(root, "src-tauri", "tauri.conf.json");
const tauriConf = JSON.parse(readFileSync(tauriConfPath, "utf-8"));
tauriConf.version = version;
writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + "\n", "utf-8");

console.log(`Synced version ${version} to Cargo.toml and tauri.conf.json`);

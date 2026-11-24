#!/usr/bin/env node
/**
 * main 브랜치의 플러그인 폴더를 공식 디렉터리 제출본으로 바꿉니다.
 *   node .github/directory/build-directory.mjs <플러그인 폴더> [원격 MCP URL]
 *
 * - 로컬 MCP 서버(server/) 삭제 → .mcp.json을 원격 HTTP 서버로 교체
 *   (Verified가 아닌 조직은 사용자 PC에서 실행되는 서버를 제출할 수 없음)
 * - plugin.json: network 등 디렉터리가 허용하지 않는 필드 삭제, 목록용 필드(icon, 정책 URL) 추가
 * - README.md: <!-- local:start/end --> 구간 삭제, <!-- directory:start ... directory:end --> 구간 표시
 * 설정은 같은 폴더의 listing.json에 있습니다.
 */
import { readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(readFileSync(join(here, "listing.json"), "utf8"));
const pluginDir = process.argv[2];
const mcpUrl = process.argv[3] || cfg.mcpUrl;
if (!pluginDir || !existsSync(join(pluginDir, ".claude-plugin", "plugin.json"))) {
  console.error("사용법: node build-directory.mjs <플러그인 폴더> [원격 MCP URL]");
  process.exit(1);
}
if (!/^https:\/\//.test(mcpUrl)) {
  console.error(`원격 MCP URL은 https:// 로 시작해야 합니다: ${mcpUrl}`);
  process.exit(1);
}

// 1) 로컬 서버 삭제
for (const p of cfg.removePaths) rmSync(join(pluginDir, p), { recursive: true, force: true });

// 2) 원격 MCP 서버 연결
writeFileSync(
  join(pluginDir, ".mcp.json"),
  JSON.stringify({ mcpServers: { nsmall: { type: "http", url: mcpUrl } } }, null, 2) + "\n",
);

// 3) plugin.json
const pj = join(pluginDir, ".claude-plugin", "plugin.json");
const manifest = JSON.parse(readFileSync(pj, "utf8"));
for (const k of cfg.removeFromPluginJson) delete manifest[k];
Object.assign(manifest, cfg.pluginJson);
writeFileSync(pj, JSON.stringify(manifest, null, 2) + "\n");

// 4) README
const rp = join(pluginDir, "README.md");
let readme = readFileSync(rp, "utf8");
readme = readme
  .replace(/\r\n/g, "\n")
  .replace(/<!-- local:start -->[\s\S]*?<!-- local:end -->\n?/g, "")
  .replace(/<!-- directory:start\n([\s\S]*?)directory:end -->\n?/g, "$1")
  .replaceAll("__MCP_URL__", mcpUrl);
writeFileSync(rp, readme);

console.log(`디렉터리 제출본 생성 완료: ${pluginDir} (원격 MCP: ${mcpUrl}, 버전 ${manifest.version})`);

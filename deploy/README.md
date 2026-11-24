# NS홈쇼핑 Claude 원격 MCP 서버 배포

공식 디렉터리 제출본(`directory` 브랜치)은 사용자 PC가 아니라 **원격 서버** `https://image.nsmall.com/claude/mcp`에 연결합니다.
(Verified가 아닌 조직은 사용자 PC에서 실행되는 로컬 MCP 서버를 디렉터리에 제출할 수 없습니다.)
이 서버가 동작해야 디렉터리 검사에서 툴 확인이 되고, 사용자가 툴을 쓸 수 있습니다.

## 구조

```
Claude (Anthropic 서버 / Claude Code)
   │  POST https://image.nsmall.com/claude/mcp
   ▼
KT CDN (image.nsmall.com)   ← ① /claude/mcp 캐시 안 함 + POST 허용
   ▼
원본 Apache / Nginx         ← ② /claude/mcp → 127.0.0.1:3100 프록시
   ▼
Node.js MCP 서버            ← ③ nsmall-shopping/server/index.mjs --http
```

ChatGPT용 서버(`/mcp`, 3000번 포트)와 경로, 포트가 겹치지 않게 `/claude/mcp`, 3100번 포트를 씁니다.

## 서버 (외부 패키지 없음, Node.js 18 이상)

| 파일 | 내용 |
|---|---|
| `../nsmall-shopping/server/index.mjs` | MCP 서버 단일 파일. `--http`로 실행하면 원격 서버로 동작 |
| `nsmall-claude-mcp.service` | systemd 등록 파일 |
| `nginx-claude-mcp.conf` / `apache-claude-mcp.conf` | 원본 웹서버 프록시 설정 |

```bash
sudo mkdir -p /opt/nsmall-claude-mcp
sudo cp nsmall-shopping/server/index.mjs /opt/nsmall-claude-mcp/
sudo cp deploy/nsmall-claude-mcp.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now nsmall-claude-mcp
```

환경변수 (서비스 파일에 지정):

| 변수 | 값 | 설명 |
|---|---|---|
| `PORT` | `3100` | 서버 포트 |
| `HOST` | `127.0.0.1` | 프록시 뒤에서만 접속 |
| `MCP_PATH` | `/claude/mcp` | MCP 엔드포인트 경로 |

서버는 인증 정보를 쓰지 않습니다. NS홈쇼핑 공개 편성표 API(`mapi.nsmall.com`)만 호출합니다.

## CDN 요청 사항 (image.nsmall.com)

| 대상 경로 | 요청 |
|---|---|
| `/claude/mcp` | POST, OPTIONS 허용, 원본으로 전달 |
| `/claude/mcp` | 캐시 사용 안 함 (요청마다 원본 전달) |
| `/claude/mcp` | 요청 헤더 `Content-Type`, `Accept`, `Mcp-Protocol-Version` 전달 |
| `/claude/mcp` | 원본 응답 타임아웃 60초 이상, 요청 본문 최대 1MB |
| `/claude/healthz` | 캐시 사용 안 함 (선택) |

## 확인

```bash
# ③ Node 서버 (원본 서버에서)
curl http://127.0.0.1:3100/healthz                       # {"ok":true,...}

# ① CDN 포함 전체 (외부에서): 405가 아니라 툴 3개 JSON이 나와야 정상
curl -X POST https://image.nsmall.com/claude/mcp \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## 주소를 바꾸려면

다른 도메인이나 경로로 배포했다면 `.github/directory/listing.json`의 `mcpUrl`을 바꾸고 `main`에 push합니다.
GitHub 저장소 변수 `NSMALL_MCP_URL`을 설정해도 됩니다. Actions가 `directory` 브랜치를 새 주소로 다시 만듭니다.

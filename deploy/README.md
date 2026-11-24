# NS홈쇼핑 Claude 원격 MCP 서버 배포

공식 디렉터리 제출본(`directory` 브랜치)은 사용자 PC가 아니라 **원격 서버** `https://ai-mcp.nsmall.com/mcp`에 연결합니다.
(Verified가 아닌 조직은 사용자 PC에서 실행되는 로컬 MCP 서버를 디렉터리에 제출할 수 없습니다.)
이 서버가 동작해야 디렉터리 검사에서 툴 확인이 되고, 사용자가 툴을 쓸 수 있습니다.

요청과 응답 형식, 툴별 입력과 출력은 [docs/MCP-SERVER-GUIDE.md](../docs/MCP-SERVER-GUIDE.md)를 보세요.

## 구조

```
Claude (Anthropic 서버 / Claude Code)
   │  POST https://ai-mcp.nsmall.com/mcp
   ▼
DNS + TLS (ai-mcp.nsmall.com)   ← ① DNS 레코드 등록, *.nsmall.com 인증서
   ▼
Apache / Nginx (443)            ← ② /mcp → 127.0.0.1:3100 프록시
   ▼
Node.js MCP 서버                ← ③ nsmall-shopping/server/index.mjs --http
```

## 준비할 것

| # | 담당 | 내용 |
|---|---|---|
| ① | 인프라 | `ai-mcp.nsmall.com` DNS 레코드 등록 (현재 미등록), HTTPS 인증서 적용, 외부(Anthropic 서버)에서 443 접속 허용 |
| ② | 웹서버 | `nginx-claude-mcp.conf` 또는 `apache-claude-mcp.conf` 적용 |
| ③ | 서버 | Node.js 18 이상 설치, 아래 순서로 서버 실행 |

CDN을 앞에 둔다면 `/mcp`는 **캐시 사용 안 함, POST/OPTIONS 허용, 요청 본문과 `Content-Type`, `Accept`, `Mcp-Protocol-Version` 헤더 전달, 원본 타임아웃 60초 이상**으로 설정해야 합니다.

## 서버 실행 (외부 패키지 없음)

```bash
sudo mkdir -p /opt/nsmall-claude-mcp
sudo cp nsmall-shopping/server/index.mjs /opt/nsmall-claude-mcp/
sudo cp deploy/nsmall-claude-mcp.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now nsmall-claude-mcp
```

| 변수 (서비스 파일) | 값 | 설명 |
|---|---|---|
| `PORT` | `3100` | 서버 포트 |
| `HOST` | `127.0.0.1` | 프록시 뒤에서만 접속 |
| `MCP_PATH` | `/mcp` | MCP 엔드포인트 경로 |

서버는 인증 정보를 쓰지 않습니다. NS홈쇼핑 공개 편성표 API(`mapi.nsmall.com`)만 호출하므로, 서버에서 `mapi.nsmall.com:443`으로 나가는 통신이 허용돼야 합니다.

## 확인

```bash
# ③ Node 서버 (서버 안에서)
curl http://127.0.0.1:3100/healthz                       # {"ok":true,...}

# 전체 (외부에서): 툴 3개 JSON이 나와야 정상
curl -X POST https://ai-mcp.nsmall.com/mcp   -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream"   -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## 주소를 바꾸려면

`.github/directory/listing.json`의 `mcpUrl`을 바꾸고 `main`에 push합니다(또는 GitHub 저장소 변수 `NSMALL_MCP_URL`).
Actions가 `directory` 브랜치를 새 주소로 다시 만듭니다.

# NS홈쇼핑 Claude 플러그인: 기능, 접근 주소, MCP 데이터 전달 가이드

대상: 플러그인 운영자, MCP 서버 개발/운영 담당자
서버 코드: `nsmall-shopping/server/index.mjs` (외부 패키지 없음, Node.js 18+) · 배포 방법: [deploy/README.md](../deploy/README.md)

---

## 1. 플러그인 기능

### 1-1. 사용자에게 보이는 항목 (스킬 4개)

Claude 앱의 플러그인 메뉴에 보이는 4개 항목입니다.

| 항목 | 종류 | 언제 동작하나 | 하는 일 |
|---|---|---|---|
| `get-started` | 스킬 | "NS홈쇼핑 플러그인으로 뭘 할 수 있어?" 같은 첫 질문 | 기능 3가지(편성표, 상품 찾기, 상품 상세)를 3~4줄로 소개하고 예시 질문 제안 |
| `nsmall-shopping-guide` | 스킬 | NS홈쇼핑 상품, 가격, 편성표 질문 전반 (Claude가 자동 선택) | 질문을 MCP 툴 호출로 바꾸는 규칙, m.nsmall.com URL 규칙, **NS홈쇼핑 공식 출처만 인용**하는 규칙, 답변 형식(표, 링크, "최종 가격은 m.nsmall.com에서 확인") |
| `/schedule` | 명령 | 사용자가 직접 입력: `/nsmall-shopping:schedule 내일 저녁` | "내일 → 날짜", "저녁 → 18시 이후", "지금 → 방송중"으로 바꿔 `get_broadcast_schedule` 호출, 표로 정리 |
| `/search` | 명령 | 사용자가 직접 입력: `/nsmall-shopping:search 20만원 이하 청소기` | 키워드와 가격 조건을 뽑아 `search_products` 호출 |

### 1-2. MCP 서버 툴 3개 (실제 데이터 조회)

스킬은 "어떻게 답할지"를 정하고, 실제 데이터는 MCP 서버의 툴이 가져옵니다.

| 툴 | 하는 일 | 데이터 출처 |
|---|---|---|
| `get_broadcast_schedule` | TV / TV Shop+ 편성표와 방송 상품(상품명, 판매가, 할인, 혜택, 상품코드, 링크) | 편성표 API (해당 날짜) |
| `search_products` | 어제~모레 방송 상품에서 키워드, 가격대로 검색 + m.nsmall.com 검색 링크 | 편성표 API (4일치) |
| `get_product_detail` | 상품코드로 판매가, 정상가/할인율, 혜택, 방송 일정, 이미지, 상세 링크 | 편성표 API (4일치) |

> 모든 툴은 **읽기 전용**입니다. 로그인, 주문, 결제, 배송 조회는 하지 않고 개인정보를 받지 않습니다.
> 툴이 메뉴에 안 보이고 스킬만 보이면 MCP 서버에 연결되지 않은 상태입니다(예: claude.ai 웹에서 로컬 서버판 사용, 원격 서버 미배포).

---

## 2. 접근 주소

```
 사용자 ──▶ Claude (claude.ai / 데스크톱 / Claude Code)
                │  ① MCP 요청  POST https://ai-mcp.nsmall.com/mcp
                ▼
           NS홈쇼핑 MCP 서버 (Node.js, index.mjs --http)
                │  ② 데이터 조회  GET https://mapi.nsmall.com/md/api/v1/display/media/schedule/...
                ▼
           NS홈쇼핑 편성표 API (공개, 인증 없음)

 답변 속 링크 ──▶ ③ https://m.nsmall.com/goods/{상품코드} 등 (사용자가 클릭)
```

### ① Claude → MCP 서버

| 용도 | 주소 | 메서드 |
|---|---|---|
| MCP 엔드포인트 (디렉터리 제출본) | `https://ai-mcp.nsmall.com/mcp` | POST |
| 상태 확인 | `https://ai-mcp.nsmall.com/healthz` | GET → `{"ok":true,"version":"0.3.0"}` |
| 로컬판 (`main` 브랜치, 마켓플레이스) | 주소 없음: 사용자 PC에서 `node server/index.mjs`를 stdio로 실행 | - |

### ② MCP 서버 → NS홈쇼핑 데이터

| 데이터 | 주소 | 비고 |
|---|---|---|
| NS홈쇼핑 TV 편성표 | `https://mapi.nsmall.com/md/api/v1/display/media/schedule/tv/{YYYYMMDD}` | 인증 없음 |
| TV Shop+ 편성표 | `https://mapi.nsmall.com/md/api/v1/display/media/schedule/shopplus/{YYYYMMDD}` | 인증 없음 |
| N라이브 편성표 | API 없음 | 편성표 페이지 링크만 안내 |
| 상품 이미지 | `https://product-image.prod-nsmall.com/new/{상품코드}_0.jpg` | 응답에 이미지 URL이 없을 때 사용 |

서버에서 `mapi.nsmall.com:443`으로 나가는 통신이 허용돼야 합니다.

### ③ 답변에 넣는 사용자용 링크 (m.nsmall.com)

| 용도 | URL |
|---|---|
| 상품 상세 | `https://m.nsmall.com/goods/{상품코드}` |
| 상품 검색 결과 | `https://m.nsmall.com/search/{URL 인코딩된 검색어}` |
| TV 편성표 | `https://m.nsmall.com/store/fixed/schedule/tv/{YYYYMMDD}` |
| TV Shop+ 편성표 | `https://m.nsmall.com/store/fixed/schedule/shop-plus/{YYYYMMDD}` |
| N라이브 편성표 | `https://m.nsmall.com/store/fixed/schedule/nlive` |

---

## 3. MCP 서버의 데이터 전달 방법

### 3-1. 전송 규칙 (Streamable HTTP, stateless)

| 항목 | 규칙 |
|---|---|
| 요청 | `POST /mcp`, 본문은 JSON-RPC 2.0 메시지 1개(또는 배열) |
| 요청 헤더 | `Content-Type: application/json`, `Accept: application/json, text/event-stream` (Claude가 보냄) |
| 정상 응답 | `200`, `Content-Type: application/json`, 본문은 JSON-RPC 응답 |
| 알림만 온 경우 (`id` 없음, 예: `notifications/initialized`) | `202`, 본문 없음 |
| `GET /mcp`, `DELETE /mcp` | `405` (서버 → 클라이언트 스트림과 세션을 쓰지 않는 stateless 서버) |
| 본문 크기 | 최대 1MB (초과 시 `413`) |
| 캐시 | `Cache-Control: no-store`. CDN이 있다면 `/mcp`는 반드시 캐시하지 않음 |
| 인증 | 없음 (공개 데이터만 제공) |
| 세션 | 없음. 요청마다 독립 처리 (`Mcp-Session-Id` 발급 안 함) |

### 3-2. 호출 순서

```
Claude                                  MCP 서버
  │── initialize ─────────────────────────▶│  서버 정보, 지원 기능(tools) 응답
  │── notifications/initialized ──────────▶│  202 (응답 본문 없음)
  │── tools/list ─────────────────────────▶│  툴 3개 이름, 설명, 입력 스키마
  │── tools/call (사용자 질문마다) ────────▶│  편성표 API 조회 → 텍스트 결과
```

#### initialize

```bash
curl -X POST https://ai-mcp.nsmall.com/mcp \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"claude","version":"1"}}}'
```

```json
{"jsonrpc":"2.0","id":1,"result":{
  "protocolVersion":"2025-06-18",
  "capabilities":{"tools":{"listChanged":false}},
  "serverInfo":{"name":"nsmall","title":"NS홈쇼핑","version":"0.3.0"},
  "instructions":"NS홈쇼핑(m.nsmall.com) 방송 편성표와 방송 상품 정보를 조회합니다. 정보 조회 전용이며 주문/결제는 하지 않습니다."}}
```

- `protocolVersion`: 클라이언트가 보낸 버전이 `2025-06-18`, `2025-03-26`, `2024-11-05` 중 하나면 그대로, 아니면 `2025-06-18`로 응답합니다.

#### tools/list

```bash
curl ... -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
```

응답 `result.tools[]`의 각 항목: `name`, `title`, `description`, `inputSchema`(JSON Schema), `annotations`(`readOnlyHint: true` 등). 툴별 입력은 3-3을 보세요.

#### tools/call

```bash
curl ... -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_broadcast_schedule","arguments":{"status":"live"}}}'
```

```json
{"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"2026-11-25 편성표 (2건, 한국시간)\n- 07:15~08:20 [NS홈쇼핑 TV] 닥터데피리프트샷세럼 [방송중]\n    · 닥터 데피 PDRN 99.9 리프팅 샷 세럼 15mlX8+브러쉬X2 | 198,000원 | 상품코드 36342489 | https://m.nsmall.com/goods/36342489\n..."}]}}
```

**결과는 `content[0].text`의 사람이 읽을 수 있는 텍스트**로 전달합니다. Claude는 이 텍스트를 읽고, 스킬 규칙에 따라 표와 링크로 다시 정리해 답합니다.

#### 오류 전달 방식

| 상황 | 전달 방식 | 예 |
|---|---|---|
| 데이터 조회 실패 (편성표 API 장애, 시간 초과) | 정상 응답 + `"isError": true` + 안내 텍스트 | `{"result":{"isError":true,"content":[{"type":"text","text":"NS홈쇼핑 데이터 조회 실패: 응답 시간 초과\n공식 편성표: https://m.nsmall.com/store/fixed/schedule/tv"}]}}` |
| 결과 없음 (검색 0건, 편성에 없는 상품코드) | 정상 응답 + 안내 텍스트 (오류 아님) | `"상품코드 1는 최근 방송 편성에 없어 ... 상세 페이지에서 확인하도록 안내하세요: https://m.nsmall.com/goods/1"` |
| 없는 툴 이름 | JSON-RPC 오류 `-32602` | `{"error":{"code":-32602,"message":"알 수 없는 툴: x"}}` |
| 없는 메서드 | JSON-RPC 오류 `-32601` | |
| JSON 형식 오류 | HTTP 400 + JSON-RPC 오류 `-32700` | |

> 데이터 문제는 `isError` 텍스트로 알려야 Claude가 사용자에게 "공식 편성표에서 확인하세요"라고 자연스럽게 안내합니다. 실패 텍스트에는 항상 대신 볼 수 있는 공식 링크를 넣습니다.

### 3-3. 툴별 입력과 출력

#### ① `get_broadcast_schedule`

| 입력 | 타입 | 설명 |
|---|---|---|
| `date` | `"YYYY-MM-DD"` | 생략 시 오늘 (한국시간) |
| `channel` | `TV` / `PLUS` / `LIVE` | 생략 시 TV+PLUS. `LIVE`는 데이터 없음 → 링크 안내 |
| `status` | `live` / `upcoming` / `past` / `all` | 기본 `all` |
| `fromHour`, `toHour` | 정수 (KST 시) | 시작 시각 필터 (예: 저녁 = `fromHour: 18`) |

처리: 채널별 편성표 API 호출 → 시작 시각순 정렬 → 필터 → 텍스트.

출력 형식:
```
2026-11-25 편성표 (N건, 한국시간)
- HH:mm~HH:mm [채널명] 방송명 [방송중|지난방송]
    · 상품명 | 판매가 (정상가 OO원, N% 할인) | 혜택 | 상품코드 12345678 | https://m.nsmall.com/goods/12345678
공식 편성표: NS홈쇼핑 TV: https://m.nsmall.com/store/fixed/schedule/tv/20261125 / TV Shop+: ...
※ 가격과 혜택은 수시로 바뀝니다. 최종 정보는 m.nsmall.com에서 확인하도록 안내하세요.
```

#### ② `search_products`

| 입력 | 타입 | 설명 |
|---|---|---|
| `query` (필수) | 문자열 | 검색어. 공백으로 나눈 단어가 상품명, 브랜드, 방송명에 들어 있으면 일치 |
| `minPrice`, `maxPrice` | 정수 (원) | 판매가 기준 |
| `sort` | `relevance` / `priceAsc` / `priceDesc` / `soon` | 기본 `relevance` |
| `limit` | 1~20 | 기본 10 |

처리: 어제~모레 4일 × 2채널 편성표 조회 → 상품코드로 중복 제거 → 검색 → 정렬.

출력 형식:
```
'흑염소' 방송 상품 1건 (어제~모레 편성 기준):
1. 상품명 | 판매가 | 혜택 | 상품코드 36041298 | https://m.nsmall.com/goods/36041298
   방송: 11/24 15:30~16:30 NS홈쇼핑 TV [지난방송], ...
전체 검색 결과: https://m.nsmall.com/search/%ED%9D%91%EC%97%BC%EC%86%8C
※ 위 목록은 방송 상품만 포함합니다. ...
```
0건이면 검색 결과 링크와 "`site:m.nsmall.com/goods 키워드`로만 웹 검색" 안내를 돌려줍니다.

#### ③ `get_product_detail`

| 입력 | 타입 | 설명 |
|---|---|---|
| `productId` (필수) | 숫자 문자열 | 상품코드 |

출력 형식:
```
상품명 (브랜드)
상품코드: 36041269
판매가: 318,000원 (정상가 328,000원, 3% 할인)
혜택: 구매 후 3천원 적립
방송: 11/24 15:30~16:30 NS홈쇼핑 TV [지난방송]
이미지: https://product-image.prod-nsmall.com/new/36041269_0.jpg
상세 링크: https://m.nsmall.com/goods/36041269
※ 최종 가격과 혜택은 m.nsmall.com에서 확인하도록 안내하세요.
```

### 3-4. 편성표 API 응답 → 툴 출력 변환 규칙

편성표 API 응답의 `data.resultData.totalOrgan[]`이 방송 목록입니다.

| API 필드 | 의미 | 툴 출력에서 |
|---|---|---|
| `liveCd` | `A` 방송중 / `B` 예정 / `C` 지난방송 | `[방송중]`, `[지난방송]` 표시, `status` 필터 |
| `startDtm`, `endDtm` | `YYYYMMDDHHmmss` (KST) | `HH:mm~HH:mm` |
| `pgmNm` | 방송명 | 방송명 |
| `goodsCd` | 대표 상품코드 | 상품코드, 상세 링크 |
| `goods.productNm` | 상품명 | 상품명 (연속 공백, 탭 정리) |
| `goods.brandNm` | 브랜드 | 상세의 `(브랜드)` |
| `goods.dcPrice` | **판매가 (할인 반영)** | 가격은 항상 이 값 |
| `goods.salePrice` | 정상가 | `dcPrice`보다 클 때만 "정상가 OO원, N% 할인" |
| `goods.headCopyInfo.hdcpNm` 또는 `goods.headCopy` | 혜택 문구 | 혜택 |
| `relTotalOrgan[]` | 같은 방송의 함께 파는 상품 | 방송당 최대 5개까지 함께 표시 |

전달하지 않는 값: 원가, 재고, 내부 코드 등 위 표에 없는 필드.

### 3-5. 운영 규칙

| 항목 | 값 |
|---|---|
| 편성표 API 타임아웃 | 8초 (`NSMALL_API_TIMEOUT_MS`) |
| 캐시 | 채널·날짜별 60초 (메모리) |
| 일부 채널 실패 | 성공한 채널만 보여주고 "일부 채널 조회 실패" 문구 추가 |
| 시간대 | 모든 날짜와 시각은 한국시간(KST) |
| 개인정보 | 받지 않음, 저장하지 않음 |

---

## 4. 사내 API로 확장할 때 (선택)

지금은 공개된 편성표 API만 쓰기 때문에, 검색과 상세는 **방송 상품**만 됩니다. 사내 상품 검색/상세 API가 준비되면 아래만 지키면 플러그인(스킬, 명령)을 고치지 않고 서버만 바꿔서 확장할 수 있습니다.

1. **툴 이름과 입력 스키마를 그대로 유지합니다.** 스킬이 이 이름과 인자로 툴을 부릅니다.
2. **출력은 3-3의 텍스트 형식을 유지합니다.** 특히 `상품명 | 판매가 | 혜택 | 상품코드 | 상세 링크` 순서, 판매가 기준 가격, 끝의 공식 링크와 안내 문구.
3. 바꿀 곳: `server/index.mjs`의 `search_products`, `get_product_detail` 핸들러. 결과가 없으면 지금처럼 검색 링크와 "추측하지 말라"는 안내를 돌려줍니다.
4. 사내 API에 인증 키가 필요하면 **서버 환경변수**로만 넣습니다. 플러그인 파일(`.mcp.json`, `plugin.json`)에는 절대 넣지 않습니다(디렉터리 검사 "자격증명 사용" 항목).
5. 툴을 새로 추가하면 `tools/list`에 자동으로 나옵니다. 스킬 `nsmall-shopping-guide`의 "도구 사용 규칙" 표에 사용 조건도 한 줄 추가해 주세요.

---

## 5. 배포 후 점검 체크리스트

```bash
# 1) 상태 확인
curl https://ai-mcp.nsmall.com/healthz                         # {"ok":true,...}

# 2) 툴 목록 (툴 3개)
curl -X POST https://ai-mcp.nsmall.com/mcp \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# 3) 실데이터 (지금 방송 중인 상품)
curl -X POST https://ai-mcp.nsmall.com/mcp \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_broadcast_schedule","arguments":{"status":"live"}}}'

# 4) Claude Code 연결 (✔ Connected 가 나오면 정상)
claude mcp add --transport http nsmall-check https://ai-mcp.nsmall.com/mcp
claude mcp list
claude mcp remove nsmall-check
```

- [ ] 1~3이 외부 네트워크에서 성공
- [ ] 같은 요청을 두 번 보냈을 때 CDN 캐시 응답(`X-Cache: HIT`)이 아님
- [ ] `GET https://ai-mcp.nsmall.com/mcp` → 405
- [ ] 4에서 `✔ Connected`

# NS홈쇼핑 Claude 플러그인 (nsmall-shopping)

Claude Code에서 **NS홈쇼핑(m.nsmall.com)** 방송 편성표, 방송 상품 검색, 상품 가격/혜택을 조회하는 플러그인입니다.
`D:\챗gpt`의 ChatGPT App(MCP 서버 + 스킬)을 Claude Code 플러그인 형식으로 옮겼습니다. 정보 조회만 하고 주문이나 결제는 처리하지 않습니다.

## 구성

| 구성 요소 | 이름 | 설명 |
|---|---|---|
| MCP 서버 (stdio) | `nsmall` | `server/index.mjs`. 외부 패키지 없이 Node.js 18+만 있으면 실행됩니다 |
| 툴 | `get_broadcast_schedule` | TV / TV Shop+ 편성표와 방송 상품 (날짜, 채널, 방송중, 시간대 필터) |
| 툴 | `search_products` | 어제~모레 방송 상품에서 키워드, 가격대로 검색 + m.nsmall.com 검색 링크 |
| 툴 | `get_product_detail` | 상품코드로 판매가, 할인, 혜택, 방송 일정, 상세 링크 조회 |
| 스킬 | `get-started` | 처음 쓰는 사용자에게 기능 소개 |
| 스킬 | `nsmall-shopping-guide` | 툴 사용 규칙, URL 규칙, 공식 출처만 인용하는 규칙 |
| 커맨드 | `/nsmall-shopping:schedule` | 예: `/nsmall-shopping:schedule 내일 저녁` |
| 커맨드 | `/nsmall-shopping:search` | 예: `/nsmall-shopping:search 20만원 이하 청소기` |

## 설치

```text
/plugin marketplace add nsshopping/repo
/plugin install nsmall-shopping@nsmall-plugins
```

설치 후 Claude Code를 다시 시작하고, `/mcp`에서 `nsmall` 서버가 연결됐는지 확인합니다.

## 사용 예

- "NS홈쇼핑 지금 뭐 팔아?"
- "내일 저녁 NS홈쇼핑 TV 편성표 보여줘"
- "NS홈쇼핑에서 10만원 이하 패딩 찾아줘"
- "상품코드 36183443 자세히 알려줘"

## 데이터 출처와 한계

- 편성표와 방송 상품은 NS홈쇼핑 공개 편성표 API(`mapi.nsmall.com`, 인증 불필요)의 실데이터입니다.
- 일반 상품 전체 검색 API는 공개되어 있지 않아, 방송 상품이 아닌 상품은 `https://m.nsmall.com/search/{검색어}` 링크로 안내합니다.
  사내 검색/상품 API가 준비되면 `server/index.mjs`의 `search_products`, `get_product_detail` 핸들러에 연결하면 됩니다.
- N라이브는 편성 데이터가 없어 편성표 링크만 안내합니다.

## 환경변수 (선택)

| 변수 | 기본값 |
|---|---|
| `NSMALL_SCHEDULE_API_BASE_URL` | `https://mapi.nsmall.com/md/api/v1/display/media/schedule` |
| `NSMALL_PRODUCT_IMAGE_BASE_URL` | `https://product-image.prod-nsmall.com` |
| `NSMALL_API_TIMEOUT_MS` | `8000` |

## ChatGPT 버전과의 차이

| ChatGPT App | Claude 플러그인 |
|---|---|
| 원격 HTTP MCP 서버(Express) 배포 필요 | 로컬 stdio 서버. 배포 없이 바로 사용 |
| 위젯(카드 UI) 렌더링 | 텍스트/표로 응답 (Claude Code에는 위젯이 없음) |
| 상품 검색/상세는 Mock 또는 사내 API(TODO) | 편성표 실데이터 기반 검색/상세 + 검색 링크 |
| `plugin.json`의 `com.openai` 확장 | `.claude-plugin/plugin.json` + `.mcp.json` + `skills/` + `commands/` |

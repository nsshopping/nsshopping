# NS홈쇼핑

NS홈쇼핑에서 제공하는 상품을 손쉽게 볼 수 있습니다.

TV에서 본 상품 그대로, 가입부터 결제까지 쉽고 빠르게
새로워진 NSmall 앱으로 쇼핑이 쉬워집니다.

■ NSmall 이렇게 달라졌어요!

1. 혜택은 더 크게
   - 할인 정보를 더 잘 보이게 강조했어요.
   - 상품 상세화면에서 쿠폰을 바로 받을 수 있어요.

2. 상품 정보는 보기 쉽게
   - 씽씽배송 상품인지, 언제 배송되는지 바로 확인할 수 있어요.
   - 최대 혜택가를 상품에서 바로 확인해 보세요.

3. 더 간편한 주문·결제
   - 복잡한 장바구니를 배송 정보에 맞추어 분리했어요.
   - 쿠폰과 카드 혜택을 정확하게 보여드려요.
   - 결제 수단을 더 간편하게 선택할 수 있어요.

■ NSmall 회원만의 특별한 혜택

- 가입만 해도 신규 회원 전용 할인 쿠폰 제공
- 멤버십 등급에 따라 매달 쿠폰과 혜택 제공
- 이벤트, 체험단 참여 가능

■ TV쇼핑, NS Shop+

- 방송시간 전에 미리 주문할 수 있습니다.
- 방송이 끝난 후에도 앱에서 상품을 찾을 수 있습니다.

---

## Claude 플러그인 안내

NS홈쇼핑(m.nsmall.com) 방송 편성표, 방송 상품 검색, 상품 가격과 혜택을 Claude에서 조회합니다. 이 플러그인은 정보 조회만 하며, 주문과 결제는 m.nsmall.com 또는 NSmall 앱에서 진행합니다.

### 구성

| 구성 요소 | 이름 | 설명 |
|---|---|---|
<!-- local:start -->
| MCP 서버 (로컬) | `nsmall` | 사용자 PC에서 실행됩니다. 외부 패키지 없이 Node.js 18+만 있으면 됩니다 |
<!-- local:end -->
<!-- directory:start
| MCP 서버 (원격) | `nsmall` | NS홈쇼핑이 운영하는 원격 서버(`__MCP_URL__`)에 연결합니다. 설치할 것이 없습니다 |
directory:end -->
| 툴 | `get_broadcast_schedule` (방송 편성표 조회) | TV / TV Shop+ 편성표와 방송 상품 (날짜, 채널, 방송중, 시간대 필터) |
| 툴 | `search_products` (상품 검색) | 어제~모레 방송 상품에서 키워드, 가격대로 검색 + m.nsmall.com 검색 링크 |
| 툴 | `get_product_detail` (상품 상세 조회) | 상품코드로 판매가, 할인, 혜택, 방송 일정, 상세 링크 조회 |
| 스킬 | `get-started` | 처음 쓰는 사용자에게 기능 소개 |
| 스킬 | `nsmall-shopping-guide` | 툴 사용 규칙, URL 규칙, 공식 출처만 인용하는 규칙 |
| 커맨드 | `/nsmall-shopping:schedule` | 예: `/nsmall-shopping:schedule 내일 저녁` |
| 커맨드 | `/nsmall-shopping:search` | 예: `/nsmall-shopping:search 20만원 이하 청소기` |

<!-- local:start -->
### 설치

```text
/plugin marketplace add nsshopping/nsshopping
/plugin install nsmall-shopping@nsmall-plugins
```

설치 후 Claude Code를 다시 시작하고, `/mcp`에서 `nsmall` 서버가 연결됐는지 확인합니다.

<!-- local:end -->
<!-- directory:start
### 설치

```text
/plugin install nsmall-shopping --marketplace nsshopping/nsshopping
```

directory:end -->
### 사용 예

- "NS홈쇼핑 지금 뭐 팔아?"
- "내일 저녁 NS홈쇼핑 TV 편성표 보여줘"
- "NS홈쇼핑에서 10만원 이하 패딩 찾아줘"
- "상품코드 36183443 자세히 알려줘"

### 데이터 출처와 한계

- 편성표와 방송 상품은 NS홈쇼핑 공개 편성표 API(`mapi.nsmall.com`, 인증 불필요)의 실데이터입니다.
- 일반 상품 전체 검색 API는 공개되어 있지 않아, 방송 상품이 아닌 상품은 `https://m.nsmall.com/search/{검색어}` 링크로 안내합니다.
- N라이브는 편성 데이터가 없어 편성표 링크만 안내합니다.
- 로그인, 주문, 결제, 배송 조회 기능은 없으며 개인정보를 수집하지 않습니다.

### 개발자 안내

- 기능, 접근 주소, MCP 데이터 전달 규격: [docs/MCP-SERVER-GUIDE.md](docs/MCP-SERVER-GUIDE.md)
- 서버 원격 배포: [deploy/README.md](deploy/README.md)
- 업로드와 디렉터리 제출: [PLUGIN-UPLOAD-GUIDE.md](PLUGIN-UPLOAD-GUIDE.md)
- ZIP 만들기: `python scripts/build-plugin-zip.py`

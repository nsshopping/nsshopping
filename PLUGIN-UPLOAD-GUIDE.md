# NS홈쇼핑 Claude 플러그인: 업로드 가이드

저장소: https://github.com/nsshopping/nsshopping

| 방법 | 대상 | 올리는 것 | 리뷰 |
|---|---|---|---|
| A. GitHub 마켓플레이스 | Claude 앱, Claude Code 사용자 | `main` 브랜치 (push하면 끝) | 없음 |
| B. 공식 디렉터리 제출 | 모든 Claude 사용자 (공개 목록) | `directory` 브랜치 | 자동 검사 + 사람 리뷰 |
| C. ZIP 업로드 | 나 또는 우리 조직 | `dist/nsmall-shopping-<버전>.zip` | 없음 |

## 브랜치 구성

수정은 **`main`에서만** 합니다. `main`에 push하면 GitHub Actions(`.github/workflows/sync-directory.yml`)가 `directory` 브랜치를 자동으로 다시 만듭니다. 결과는 GitHub 저장소의 **Actions** 탭에서 확인합니다.

| | `main` (마켓플레이스, ZIP) | `directory` (디렉터리 제출본, 자동 생성) |
|---|---|---|
| MCP 서버 | 로컬: 사용자 PC에서 `server/index.mjs` 실행 | **원격**: `https://image.nsmall.com/claude/mcp` |
| `server/` 폴더 | 있음 | 없음 |
| `plugin.json`의 `network` | 없음 | 없음 |
| 목록용 필드 (`icon`, 정책 URL 4개) | 없음 (Claude 앱이 모르는 키로 경고하기 때문) | 있음 |
| README | 로컬 설치 안내 | 원격 서버 안내 |

디렉터리 제출본 설정은 `.github/directory/listing.json`에 있습니다(원격 주소, 목록용 필드).
로컬에서 미리 만들어 보려면:

```bash
cp -r nsmall-shopping /tmp/dir-preview
node .github/directory/build-directory.mjs /tmp/dir-preview
claude plugin validate /tmp/dir-preview --profile directory --strict
```

새 버전을 올릴 때마다 `nsmall-shopping/.claude-plugin/plugin.json`과 `.claude-plugin/marketplace.json`의 `version`을 같이 올립니다.

---

## A. GitHub 마켓플레이스

- Claude 앱: **마켓플레이스 추가**에 `nsshopping/nsshopping`을 입력합니다.
- Claude Code:
  ```text
  /plugin marketplace add nsshopping/nsshopping
  /plugin install nsmall-shopping@nsmall-plugins
  ```
- 마켓플레이스로 설치한 플러그인 화면에는 로고, 제작자, 상세설명이 나오지 않습니다(출처와 한 줄 소개만 표시). 이 항목은 디렉터리(B)에 게시돼야 보입니다.
- `main`의 MCP 서버는 사용자 PC에서 실행되므로 Claude Code와 데스크톱 앱의 로컬 세션에서 동작합니다. claude.ai 웹 채팅에서는 스킬만 동작합니다.

---

## B. 공식 디렉터리 제출

### 사전 조건

1. **원격 MCP 서버 배포**: `https://image.nsmall.com/claude/mcp`가 실제로 응답해야 합니다. 배포 방법은 [deploy/README.md](deploy/README.md)를 보세요. 현재 이 주소는 CDN에서 405로 막혀 있습니다.
2. **회사 claude.ai 계정**: 유료 플랜(Team, Enterprise)의 **Owner**가 제출합니다.

### 제출 순서

1. https://claude.ai/directory/manage → **Submit new** → **Plugin bundle**
2. **Source**

   | 항목 | 값 |
   |---|---|
   | Repository | `https://github.com/nsshopping/nsshopping` |
   | Plugin path | `nsmall-shopping` |
   | Branch or tag | **`directory`** |

3. **Validate**: 차단(Blocking) 항목이 없어야 다음 단계로 갑니다.
4. **Listing details**: `directory` 브랜치의 `plugin.json`과 `README.md`에서 자동으로 채워집니다.

   | 목록 항목 | 값 |
   |---|---|
   | 이름 | NS홈쇼핑 (`displayName`) |
   | 로고 | NS 로고 (`icon: ./logo.png`) |
   | 제작 | NS Shopping (`author.name`) |
   | 한 줄 소개 | NS홈쇼핑에서 제공하는 상품을 손쉽게 볼 수 있습니다. |
   | 상세설명 | README 맨 앞 문구 |

5. **Data handling**

   | 질문 | 답변 |
   |---|---|
   | 개인정보 수집 | 없음. 로그인과 사용자 정보가 없고 공개 편성표 데이터만 조회합니다. |
   | 다른 곳으로 전송 | 원격 MCP 서버(`image.nsmall.com`, NS홈쇼핑 운영)가 `mapi.nsmall.com`(NS홈쇼핑 편성표 API)을 호출합니다. 요청에는 날짜, 채널, 검색어만 들어갑니다. |
   | 보관 | 저장하지 않습니다. 서버 메모리에 조회 결과를 1분간 캐시만 합니다. |
   | 미성년자 사용 | 미성년자 대상 서비스가 아닙니다. |

6. **Compliance**: 연락 메일 `nsai@nsmall.com`, 확인 항목 4개 동의
7. **Review and submit**: 업데이트 방식은 **GitHub push webhook**, 자동 게시는 처음에는 끄기

### 이름 관련 "거부 예정" 항목 (이의제기)

조직이 Verified가 아니면 `NS홈쇼핑` 같은 브랜드 이름을 쓸 때 "기존 목록과 이름이 헷갈릴 수 있음", "게시자 이름이 다른 이름과 헷갈릴 수 있음"이 나옵니다. 실제 회사 브랜드이므로 이름은 유지하고 **이의제기**합니다.

- 제출 화면에서 이의제기(appeal)를 선택하고 회사 소유 증빙을 냅니다.
  - 공식 도메인 `nsmall.com` 소유 (연락 메일 `nsai@nsmall.com`이 같은 도메인)
  - GitHub 조직 `nsshopping` 소유
  - 공식 사이트 https://www.nsmall.com , https://m.nsmall.com
- 게시자 이름은 GitHub 조직과 맞춰 `NS Shopping`으로 설정했습니다.
- 조직 인증(Verified)을 받으면 이 항목과 로컬 MCP 서버 제한이 함께 풀립니다.

제출 한도: 조직당 24시간에 10건, 저장소 폴더 하나당 제출 1건.

---

## C. ZIP 업로드 (claude.ai / Claude 데스크톱 앱)

```bash
python scripts/build-plugin-zip.py      # dist/nsmall-shopping-<버전>.zip
```

Claude에서 **사용자 지정 → 플러그인 → 추가 → 플러그인 업로드**로 올립니다. 조직 전체에 배포하려면 Owner가 **조직 설정 → 플러그인 및 스킬**에서 올립니다. ZIP은 `main` 기준(로컬 MCP 서버)입니다.

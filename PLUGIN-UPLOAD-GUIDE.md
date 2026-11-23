# NS홈쇼핑 Claude 플러그인: 업로드 가이드

Claude에 플러그인을 올리는 방법은 세 가지입니다. 목적에 맞는 방법을 고르세요.

| 방법 | 대상 | 올리는 것 | 리뷰 |
|---|---|---|---|
| A. ZIP 업로드 | 나 또는 우리 조직 (claude.ai, 데스크톱 앱) | `dist/nsmall-shopping-<버전>.zip` | 없음 |
| B. 공식 디렉터리 제출 | 모든 Claude 사용자 (공개 목록) | **GitHub 저장소** (ZIP 아님) | 자동 검사 + 사람 리뷰 |
| C. GitHub 마켓플레이스 | 링크를 아는 Claude Code 사용자 | GitHub 저장소 push | 없음 |

## 업로드 전 공통 준비

```bash
claude plugin validate ./nsmall-shopping --profile directory --strict   # 제출 기준 검증
python scripts/build-plugin-zip.py                                     # dist/ 에 ZIP 생성
```

새 버전을 올릴 때마다 `nsmall-shopping/.claude-plugin/plugin.json`과 `.claude-plugin/marketplace.json`의 `version`을 같이 올립니다.

### 브랜치 구성 (중요)

| 브랜치 | 용도 | `plugin.json` |
|---|---|---|
| `main` | 마켓플레이스 동기화(Claude 앱, Claude Code), ZIP 업로드 | 디렉터리 전용 필드 **없음** |
| `directory` | 공식 디렉터리 제출 | `main` + 디렉터리 전용 필드 5개 (`icon`, `documentationUrl`, `supportUrl`, `privacyPolicyUrl`, `termsOfServiceUrl`) |

- Claude 앱은 디렉터리 전용 필드를 모르는 키로 보고 "unrecognized keys in plugin.json" 경고를 띄웁니다. 그래서 `main`에서는 이 필드를 뺐습니다.
- 디렉터리는 이 필드를 `plugin.json`에서 읽기 때문에, 제출할 때는 `directory` 브랜치를 지정합니다.
- 수정은 `main`에서 하고, 디렉터리에 반영할 때 `directory` 브랜치로 합칩니다.
  ```bash
  git checkout directory && git merge main && git push origin directory && git checkout main
  ```

`directory` 브랜치의 디렉터리 전용 필드 값:

| 항목 | 값 |
|---|---|
| `displayName` | `NS홈쇼핑` (`main`에도 있음) |
| `author.name` / `author.email` | `엔에스쇼핑` / `nsai@nsmall.com` (`main`에도 있음) |
| `icon` | `./logo.png` (플러그인 폴더 맨 위의 NS 로고, 512×512 PNG) |
| `supportUrl` | `https://m.nsmall.com/customer-center` |
| `privacyPolicyUrl` | `https://m.nsmall.com/common/policy/privacy-policy` |
| `termsOfServiceUrl` | `https://m.nsmall.com/common/terms/nsmall-terms` |
| `documentationUrl` | `https://m.nsmall.com` |

> **아이콘 표시에 대해:** 공식 문서상 `icon`은 디렉터리 목록에서만 쓰입니다. Claude 앱과 Claude Code의 플러그인 화면에서 아이콘을 지정하는 방법은 문서에 없어서, 앱에서는 로고가 보이지 않습니다. 디렉터리에 게시되면 로고가 표시됩니다.

---|---|
| `displayName` | `NS홈쇼핑` (화면에 보이는 이름. `name`은 `nsmall-shopping` 그대로 유지) |
| `author.name` / `author.email` | `엔에스쇼핑` / `nsai@nsmall.com` |
| `supportUrl` | `https://m.nsmall.com/customer-center` |
| `privacyPolicyUrl` | `https://m.nsmall.com/common/policy/privacy-policy` |
| `termsOfServiceUrl` | `https://m.nsmall.com/common/terms/nsmall-terms` |
| `icon` | `./logo.png` (플러그인 루트의 NS 로고, 512×512 PNG) |

---

## A. ZIP 업로드 (claude.ai / Claude 데스크톱 앱)

1. `python scripts/build-plugin-zip.py`를 실행합니다. ZIP 루트에 `.claude-plugin/plugin.json`이 오도록 압축됩니다.
2. Claude에서 **사용자 지정(Customize) → 플러그인(Plugins) → 추가(Add) → 플러그인 업로드(Upload plugin)**를 선택하고 ZIP을 올립니다.
   - 조직 전체에 배포하려면 Owner가 **조직 설정(Organization settings) → 플러그인 및 스킬(Plugins & skills)**에서 올립니다.
   - 한도: 파일당 200MB, 플러그인당 5,000개 파일. 최상위 `bin/` 폴더는 거부됩니다.
3. Claude Code에서 먼저 확인하려면: `claude --plugin-dir dist/nsmall-shopping-0.2.2.zip`

> **이름과 이미지 표시에 대해**
> - 이름은 `plugin.json`의 `displayName`(`NS홈쇼핑`)으로 표시됩니다. 예전 ZIP(0.2.0)에는 이 필드가 없어 `nsmall-shopping`으로 보였습니다.
> - 이미지 필드 `icon`은 공식 문서상 **디렉터리 목록(B) 전용**이고, Claude 앱은 이 필드를 읽지 않습니다. 그래서 `main`과 ZIP에서는 빼 두었고, 앱에서는 로고가 보이지 않습니다. 디렉터리에 게시되면 로고가 표시됩니다.
> - 이미 올린 이전 버전이 있으면 삭제하고 새 ZIP을 올리세요.

> **주의: 로컬 MCP 서버는 claude.ai 웹 채팅에서 실행되지 않습니다.**
> 웹 채팅에서는 스킬만 동작하고, 스킬에 적힌 대로 웹 검색과 페치로 편성표 API(`mapi.nsmall.com`)를 직접 읽어 답합니다.
> MCP 툴(`get_broadcast_schedule` 등)은 **Claude Code**와 **내 컴퓨터에서 실행하는 Cowork 세션**에서 동작합니다.
> 웹과 모바일에서도 툴을 쓰려면 ChatGPT 버전처럼 원격 HTTPS MCP 서버를 배포해야 합니다. (`D:\챗gpt`의 서버를 재사용하면 됩니다. 아래 "참고" 참조)

---

## B. Claude 공식 디렉터리 제출

디렉터리는 **ZIP을 받지 않고 GitHub 저장소를 받습니다.**

### 1) GitHub 저장소

플러그인은 https://github.com/nsshopping/repo (`main` 브랜치)에 올라가 있습니다. 수정한 뒤에는 `version`을 올리고 commit, push만 하면 됩니다.

- 검증과 리뷰 중에는 비공개 저장소여도 되지만, **게시(Publish) 전에는 공개**로 바꿔야 합니다.
- 비공개 저장소로 제출하려면 push 권한이 있는 GitHub 계정을 연결하고, 저장소에 Claude GitHub App을 설치해야 합니다.

### 2) 제출

1. https://claude.ai/directory/manage 에 접속합니다.
   - 유료 플랜(Pro, Max, Team, Enterprise)이 필요합니다. Team, Enterprise는 **Owner**가 제출합니다(Enterprise는 "Directory" 권한을 받은 사용자도 제출 가능).
2. **Submit new → Plugin bundle**을 선택합니다.
3. **Source** 단계에서 다음을 입력합니다.

   | 항목 | 값 |
   |---|---|
   | Repository | `https://github.com/nsshopping/repo` |
   | Plugin path | `nsmall-shopping` |
   | Branch or tag | `directory` (아이콘과 정책 URL이 들어 있는 제출용 브랜치) |

   표시 이름(`NS홈쇼핑`), 로고(`./logo.png`), 설명, 정책 URL은 `directory` 브랜치의 `plugin.json`과 `README.md`에서 자동으로 읽힙니다.
   Validate에서 `displayName` 문자 체계 경고("한 가지 문자 체계로 작성")가 나오면 `NS홈쇼핑`(영문+한글 혼합) 때문이므로, 한글만 쓰는 `엔에스홈쇼핑`으로 바꿉니다.

4. **Validate**: "Blocks" 항목이 없어질 때까지 고쳐서 다시 검증합니다.
5. **Listing details**: `plugin.json`과 `README.md`에서 자동으로 채워집니다. 확인만 합니다.
6. **Data handling** 질문에 답합니다. 이 플러그인 기준 답변 예시:
   - 개인정보 수집: **없음**. 공개 편성표 API만 조회하고, 사용자 정보를 저장하거나 외부로 보내지 않습니다.
   - 외부 전송 대상: `mapi.nsmall.com`(편성표 API). 사용자가 입력한 날짜와 채널만 요청 경로에 들어갑니다.
   - 데이터 보관: 서버 프로세스 메모리에 1분 캐시만 두고, 파일이나 DB에 저장하지 않습니다.
7. **Compliance**: 담당자 연락 이메일을 입력하고 확인 항목 4개에 동의합니다.
8. **Review and submit**: 업데이트 방식(GitHub push webhook 또는 Scheduled check only)과 자동 게시 여부를 고르고 제출합니다.
9. 자동 검사와 보안 스캔을 통과하면 사람이 리뷰합니다. 승인 후 게시됩니다.

제출 한도: 조직당 24시간에 10건, 저장소 폴더 하나당 제출 1건.

---

## C. GitHub 마켓플레이스 (리뷰 없이 바로 배포)

B의 1)처럼 GitHub에 push하면 끝입니다. `.claude-plugin/marketplace.json`이 이미 들어 있습니다.

사용자는 Claude Code에서 이렇게 설치합니다.

```text
/plugin marketplace add nsshopping/repo
/plugin install nsmall-shopping@nsmall-plugins
```

업데이트는 `version`을 올려 push한 뒤, 사용자가 `claude plugin update nsmall-shopping@nsmall-plugins`를 실행하면 됩니다.
비공개 저장소도 되므로 사내 배포에 적합합니다.

---

## 참고: 웹과 모바일에서도 툴을 쓰려면

claude.ai 웹 채팅과 모바일에서는 원격 MCP 서버만 연결됩니다. `D:\챗gpt`의 MCP 서버(`/mcp`, Streamable HTTP)를 공개 HTTPS로 배포한 뒤 아래 중 하나를 고릅니다.

- 이 플러그인의 `nsmall-shopping/.mcp.json`을 원격 서버로 바꿉니다.
  ```json
  { "mcpServers": { "nsmall": { "type": "http", "url": "https://<배포 도메인>/mcp" } } }
  ```
- 또는 https://claude.ai/directory/manage 에서 **MCP connector**로 서버 URL을 따로 제출합니다.

---
description: NS홈쇼핑 상품을 찾습니다 (예: /nsmall-shopping:search 20만원 이하 청소기)
argument-hint: "<검색어> [가격 조건]"
---

NS홈쇼핑에서 상품을 찾아 주세요. 요청: $ARGUMENTS

- `nsmall-shopping-guide` 스킬의 규칙을 따르세요.
- 요청에서 키워드와 가격 조건을 뽑아 `search_products`를 호출하세요 ("N만원 이하" → `maxPrice`, "저렴한" → `sort: "priceAsc"`).
- 방송 상품이 있으면 상품명 / 판매가 / 방송 시간 / 링크를 정리하고, 없으면 m.nsmall.com 검색 결과 링크로 안내하세요.
- 요청이 비어 있으면 무엇을 찾을지 물어보세요.

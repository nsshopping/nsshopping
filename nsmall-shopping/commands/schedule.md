---
description: NS홈쇼핑 방송 편성표를 조회합니다 (예: /nsmall-shopping:schedule 내일 저녁)
argument-hint: "[오늘|내일|YYYY-MM-DD] [TV|플러스|라이브] [지금|저녁 ...]"
---

NS홈쇼핑 방송 편성표를 조회해 주세요. 사용자 조건: $ARGUMENTS

- `nsmall-shopping-guide` 스킬의 규칙을 따르고, `get_broadcast_schedule` 도구를 사용하세요.
- 조건이 비어 있으면 오늘(한국시간) TV와 TV Shop+를 모두 조회하고, 지금 방송 중인 상품을 먼저 알려 주세요.
- "내일", "모레"는 한국시간 기준 YYYY-MM-DD로 바꿔 `date`에 넣고, "지금"은 `status: "live"`, "저녁"은 `fromHour: 18`처럼 시간 조건으로 바꾸세요.
- 결과는 시간 / 채널 / 방송명 / 대표 상품 / 판매가 / 링크를 표로 정리하고, 마지막에 공식 편성표 링크를 넣으세요.

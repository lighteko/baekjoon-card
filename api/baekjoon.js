function renderSingleColumn({
  tierGroup,
  tierSub,
  rating,
  solved,
  classNum,
  handle,
  fractionText,
  percentText,
  circlePercent,
  rank,
}) {
  const width = 400;
  const height = 300;

  // 색상 설정
  const bgColor = "#101010";
  const textColor = "#ffffff";
  const subTextColor = "#C9D1D9";
  const trackColor = "#30363d";
  const accentColor = "#f79a09";

  // 원형 게이지 (비율에 맞춰 확장)
  const gaugeCenterX = 80;           // 기존 60 -> 80 (수평 확장)
  const gaugeCenterY = 150;          // 기존 100 -> 150 (수직 확장)
  const radius = 60;                 // 기존 40 -> 60 (비율에 맞춰)
  const circleCircum = 2 * Math.PI * radius;
  const dashVal = (circlePercent / 100) * circleCircum;

  // 하단 바 (게이지 밑)
  const barX = 20;
  const barY = 240;                // 기존 160 -> 240 (80% 정도 아래)
  const barWidth = width - 40;     // 360
  const barHeight = 12;            // 기존 8 -> 12
  const barFillWidth = Math.round((circlePercent / 100) * barWidth);

  // 애니메이션 (원형, 바)
  const circleAnim = `
    <animate
      attributeName="stroke-dasharray"
      from="0, ${circleCircum}"
      to="${dashVal}, ${circleCircum - dashVal}"
      begin="0s"
      dur="1s"
      fill="freeze"
    />
  `;
  const barAnim = `
    <animate
      attributeName="width"
      from="0"
      to="${barFillWidth}"
      begin="0s"
      dur="1s"
      fill="freeze"
    />
  `;

  // 텍스트 페이드인 함수
  function fadeIn(begin = "0s") {
    return `
      <animate
        attributeName="opacity"
        from="0"
        to="1"
        dur="1s"
        begin="${begin}"
        fill="freeze"
      />
    `;
  }

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- 배경과 테두리 (rx도 살짝 늘렸어) -->
  <rect
    width="${width}" height="${height}"
    rx="12"
    fill="${bgColor}"
    stroke="#30363d" stroke-width="2"
  />

  <!-- 상단: 티어와 handle (폰트 크기 30, 여백 조정) -->
  <text x="25" y="50" fill="${textColor}" font-size="30" font-weight="bold" opacity="0">
    ${tierGroup} ${tierSub}
    ${fadeIn("0s")}
  </text>
  <text x="${width - 25}" y="50" text-anchor="end" fill="${textColor}" font-size="30" font-weight="bold" opacity="0">
    ${handle}
    ${fadeIn("0s")}
  </text>

  <!-- 원형 게이지 배경 -->
  <circle
    cx="${gaugeCenterX}" cy="${gaugeCenterY}" r="${radius}"
    stroke="${trackColor}" stroke-width="8" fill="none"
    opacity="0"
  >
    ${fadeIn("0s")}
  </circle>

  <!-- 원형 게이지 진행 (애니메이션 적용) -->
  <circle
    cx="${gaugeCenterX}" cy="${gaugeCenterY}" r="${radius}"
    stroke="${accentColor}" stroke-width="8" fill="none"
    stroke-dasharray="0, ${circleCircum}"
    stroke-linecap="round"
    transform="rotate(-90, ${gaugeCenterX}, ${gaugeCenterY})"
    opacity="0"
  >
    ${fadeIn("0s")}
    ${circleAnim}
  </circle>

  <!-- 중앙에 rating 숫자 (폰트 크기 33) -->
  <text x="${gaugeCenterX}" y="${gaugeCenterY + 5}" text-anchor="middle" fill="${textColor}" font-size="33" font-weight="bold" opacity="0">
    ${rating}
    ${fadeIn("0.1s")}
  </text>

  <!-- 오른쪽에 4줄 info (rate, solved, class, rank) -->
  <g transform="translate(160,90)" opacity="0">
    ${fadeIn("0.2s")}
    <text x="0" y="0" fill="${textColor}" font-size="24">rate: ${rating}</text>
    <text x="0" y="35" fill="${textColor}" font-size="24">solved: ${solved}</text>
    <text x="0" y="70" fill="${textColor}" font-size="24">class: ${classNum}</text>
    <text x="0" y="105" fill="${textColor}" font-size="24">rank: #${rank}</text>
  </g>

  <!-- 하단 바: 트랙 -->
  <rect
    x="${barX}" y="${barY}"
    width="${barWidth}" height="${barHeight}"
    fill="${trackColor}" rx="4"
    opacity="0"
  >
    ${fadeIn("0.3s")}
  </rect>

  <!-- 하단 바: 채워지는 부분 (애니메이션 적용) -->
  <rect
    x="${barX}" y="${barY}"
    width="0" height="${barHeight}"
    fill="${accentColor}" rx="4"
    opacity="0"
  >
    ${fadeIn("0.3s")}
    ${barAnim}
  </rect>

  <!-- 바 위쪽 오른쪽: 퍼센트 텍스트 (폰트 크기 21) -->
  <text x="${width - 20}" y="${barY - 5}" text-anchor="end" fill="${subTextColor}" font-size="21" opacity="0">
    ${percentText}
    ${fadeIn("0.4s")}
  </text>

  <!-- 바 아래쪽 오른쪽: 분수 텍스트 (폰트 크기 21) -->
  <text x="${width - 20}" y="${barY + barHeight + 20}" text-anchor="end" fill="${subTextColor}" font-size="21" opacity="0">
    ${fractionText}
    ${fadeIn("0.4s")}
  </text>
</svg>
`;
}

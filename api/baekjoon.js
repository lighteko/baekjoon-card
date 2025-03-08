const axios = require("axios");

/** 티어 번호(1~30)를 "Bronze IV" 형태로 변환 */
function getTierNameAndNumber(tierNum) {
  if (tierNum < 1 || tierNum > 30) {
    return { tierGroup: "Unranked", tierSub: "" };
  }
  const groups = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ruby"];
  const subTiers = ["V", "IV", "III", "II", "I"];

  const groupIndex = Math.floor((tierNum - 1) / 5);
  const subIndex = (tierNum - 1) % 5;
  return {
    tierGroup: groups[groupIndex],
    tierSub: subTiers[subIndex],
  };
}

/** 티어 번호별 대략적 레이팅 범위 (예시) */
function getTierRange(tierNum) {
  if (tierNum >= 1 && tierNum <= 5) {
    return [800, 1299];
  } else if (tierNum <= 10) {
    return [1300, 1599];
  } else if (tierNum <= 15) {
    return [1600, 1899];
  } else if (tierNum <= 20) {
    return [1900, 2199];
  } else if (tierNum <= 25) {
    return [2200, 2699];
  } else if (tierNum <= 30) {
    return [2700, 4000];
  }
  return [0, 4000]; // Unranked
}

module.exports = async (req, res) => {
  const { username } = req.query;
  if (!username) {
    return sendErrorCard(res, "No username provided");
  }

  try {
    // 1. solved.ac API 호출
    const { data } = await axios.get(
      `https://solved.ac/api/v3/user/show?handle=${username}`
    );

    // 2. 주요 정보
    const tierNum = data.tier || 0;
    const { tierGroup, tierSub } = getTierNameAndNumber(tierNum);
    const rating = data.rating || 0;
    const solved = data.solvedCount || 0;
    const classNum = data.class || 0;
    const handle = data.handle || username;

    // 티어별 레이팅 범위
    const [minRating, maxRating] = getTierRange(tierNum);
    let clamped = Math.max(rating, minRating);
    clamped = Math.min(clamped, maxRating);

    // 진행도 계산
    const ratio = (clamped - minRating) / (maxRating - minRating);
    const progressPercent = Math.round(ratio * 100);

    // 분수 텍스트 / 퍼센트 텍스트
    const fractionText = `${rating} / ${maxRating}`;
    const percentText = `${progressPercent}%`;

    // 원형 게이지 (rating / 4000)
    const ratingCap = Math.min(rating, 4000);
    const circlePercent = Math.round((ratingCap / 4000) * 100);

    // 3. SVG 생성
    const svg = renderAnimatedCard({
      tierGroup,
      tierSub,
      rating,
      solved,
      classNum,
      handle,
      fractionText,
      percentText,
      circlePercent,
    });

    // 응답
    res.setHeader("Content-Type", "image/svg+xml");
    res.send(svg);
  } catch (err) {
    console.error(err);
    sendErrorCard(res, "Error fetching user data");
  }
};

function sendErrorCard(res, message) {
  const errorSvg = `
    <svg width="450" height="120" xmlns="http://www.w3.org/2000/svg">
      <rect width="450" height="120" rx="10" fill="#0d1117"/>
      <text x="20" y="65" fill="#fff" font-size="16" font-weight="bold">${message}</text>
    </svg>`;
  res.setHeader("Content-Type", "image/svg+xml");
  res.send(errorSvg);
}

/**
 * LeetCode 다크 테마(배경=#0d1117) + "더 큰" 애니메이션 효과
 * - 원형 그래프: 2초 동안 0 → dashVal
 * - 하단 바: 2초 동안 0 → (circlePercent%) 길이
 * - 텍스트(타이틀, rate/solved/class): 페이드 인 (opacity: 0→1)
 */
function renderAnimatedCard({
  tierGroup,
  tierSub,
  rating,
  solved,
  classNum,
  handle,
  fractionText,
  percentText,
  circlePercent,
}) {
  const width = 450;
  const height = 200;

  // 색상
  const bgColor = "#0d1117";
  const textColor = "#ffffff";
  const subTextColor = "#C9D1D9";
  const trackColor = "#30363d";
  const accentColor = "#f79a09";

  // 원형 그래프
  const radius = 40;
  const circleCircum = 2 * Math.PI * radius;
  const dashVal = (circlePercent / 100) * circleCircum;

  // 하단 바
  const barX = 20;
  const barY = 160;
  const barWidth = width - 40;
  const barHeight = 8;

  // 원형 그래프 애니메이션 (2초)
  const circleAnim = `
    <animate
      attributeName="stroke-dasharray"
      from="0, ${circleCircum}"
      to="${dashVal}, ${circleCircum - dashVal}"
      dur="2s"
      fill="freeze"
    />
  `;

  // 하단 바 애니메이션 (2초)
  const barAnim = `
    <animate
      attributeName="width"
      from="0"
      to="${barWidth * (circlePercent / 100)}"
      dur="2s"
      fill="freeze"
    />
  `;

  // 텍스트 페이드 인 (1.5초)
  // (처음 opacity=0, 1.5초 동안 1로)
  function fadeIn(begin = "0s") {
    return `
      <animate
        attributeName="opacity"
        from="0"
        to="1"
        dur="1.5s"
        begin="${begin}"
        fill="freeze"
      />
    `;
  }

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- 배경 -->
  <rect width="${width}" height="${height}" rx="10" fill="${bgColor}" />

  <!-- 상단: 티어 + handle (페이드 인) -->
  <text id="titleText" x="20" y="30" fill="${textColor}" font-size="16" font-weight="bold" opacity="0">
    ${tierGroup} ${tierSub}
    ${fadeIn("0.3s")}
  </text>
  <text id="handleText" x="${
    width - 20
  }" y="30" text-anchor="end" fill="${textColor}" font-size="16" font-weight="bold" opacity="0">
    ${handle}
    ${fadeIn("0.3s")}
  </text>

  <!-- 원형 그래프 (왼쪽) -->
  <circle
    cx="80" cy="100" r="${radius}"
    stroke="${trackColor}" stroke-width="8" fill="none"
    opacity="0"
  >
    <!-- 배경 원도 페이드 인 -->
    ${fadeIn("0.3s")}
  </circle>

  <circle
    cx="80" cy="100" r="${radius}"
    stroke="${accentColor}" stroke-width="8" fill="none"
    stroke-dasharray="0, ${circleCircum}"
    stroke-linecap="round"
    transform="rotate(-90, 80, 100)"
    opacity="0"
  >
    <!-- 원 그래프 선도 페이드 인 & dasharray 애니메이션 -->
    ${fadeIn("0.3s")}
    ${circleAnim}
  </circle>

  <!-- 중앙 rating 숫자 (페이드 인) -->
  <text x="80" y="105" text-anchor="middle" fill="${textColor}" font-size="18" font-weight="bold" opacity="0">
    ${rating}
    ${fadeIn("1s")}
  </text>

  <!-- 가운데 info: rate / solved / class (폰트 16, 페이드 인) -->
  <g transform="translate(150, 70)" opacity="0">
    ${fadeIn("0.7s")}
    <text x="0" y="0" fill="${textColor}" font-size="16">rate: ${rating}</text>
    <text x="0" y="25" fill="${textColor}" font-size="16">solved: ${solved}</text>
    <text x="0" y="50" fill="${textColor}" font-size="16">class: ${classNum}</text>
  </g>

  <!-- 하단 진행 바 (트랙, 페이드 인) -->
  <rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}"
        fill="${trackColor}" rx="4" opacity="0">
    ${fadeIn("0.3s")}
  </rect>
  <!-- 하단 진행 바 (채워지는 부분) -->
  <rect x="${barX}" y="${barY}" width="0" height="${barHeight}"
        fill="${accentColor}" rx="4" opacity="0">
    ${fadeIn("0.3s")}
    ${barAnim}
  </rect>

  <!-- 바 위쪽 오른쪽: 퍼센트 (페이드 인) -->
  <text x="${width - 20}" y="${
    barY - 3
  }" text-anchor="end" fill="${subTextColor}" font-size="14" opacity="0">
    ${percentText}
    ${fadeIn("0.7s")}
  </text>

  <!-- 바 아래 오른쪽: 분수 (fraction) (페이드 인) -->
  <text x="${width - 20}" y="${
    barY + barHeight + 15
  }" text-anchor="end" fill="${subTextColor}" font-size="14" opacity="0">
    ${fractionText}
    ${fadeIn("0.7s")}
  </text>
</svg>
`;
}

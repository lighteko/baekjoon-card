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

    // 티어 범위 (레이팅 진행 바)
    const [minRating, maxRating] = getTierRange(tierNum);
    let clamp = Math.max(rating, minRating);
    clamp = Math.min(clamp, maxRating);
    const ratio = (clamp - minRating) / (maxRating - minRating);
    const progressPercent = Math.round(ratio * 100);

    // 분수 텍스트 / 퍼센트 텍스트
    const fractionText = `${rating} / ${maxRating}`;
    const percentText = `${progressPercent}%`;

    // 원형 게이지 (rating / 4000)
    const ratingCapped = Math.min(rating, 4000);
    const circlePercent = Math.round((ratingCapped / 4000) * 100);

    // 3. SVG 생성 (SMIL, 1초로 빠르게)
    const svg = renderSingleRunSMIL({
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
      <rect width="450" height="120" rx="10" fill="#0d1117" stroke="#30363d" stroke-width="2"/>
      <text x="20" y="65" fill="#fff" font-size="16" font-weight="bold">${message}</text>
    </svg>`;
  res.setHeader("Content-Type", "image/svg+xml");
  res.send(errorSvg);
}

/**
 * LeetCode 다크 테마(#0d1117) +
 *  - 테두리 둥글기: rx="10" (원하는대로 조정 가능)
 *  - 외곽선(stroke="#30363d" stroke-width="2")
 *  - SMIL 애니메이션 dur="1s"
 *  - (rating / 4000) 원형 게이지
 *  - (min~max) 하단 바
 *  - 로딩 시 한 번만 재생
 */
function renderSingleRunSMIL({
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

  // 원형 게이지
  const radius = 40;
  const circleCircum = 2 * Math.PI * radius;
  const dashVal = (circlePercent / 100) * circleCircum;

  // 하단 바
  const barX = 20;
  const barY = 160;
  const barWidth = width - 40;
  const barHeight = 8;

  // 원형 그래프 애니 (1초)
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
  // 하단 바 애니 (1초)
  const barAnim = `
    <animate
      attributeName="width"
      from="0"
      to="${barWidth * (circlePercent / 100)}"
      begin="0s"
      dur="1s"
      fill="freeze"
    />
  `;

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- 배경 + 테두리 -->
  <rect
    width="${width}" height="${height}"
    rx="10"
    fill="${bgColor}"
    stroke="#30363d" stroke-width="2"
  />

  <!-- 상단: 티어 + handle -->
  <text x="20" y="30" fill="${textColor}" font-size="16" font-weight="bold">
    ${tierGroup} ${tierSub}
  </text>
  <text x="${
    width - 20
  }" y="30" text-anchor="end" fill="${textColor}" font-size="16" font-weight="bold">
    ${handle}
  </text>

  <!-- 원형 그래프 (왼쪽) -->
  <circle
    cx="80" cy="100" r="${radius}"
    stroke="${trackColor}" stroke-width="8" fill="none"
  />
  <circle
    cx="80" cy="100" r="${radius}"
    stroke="${accentColor}" stroke-width="8" fill="none"
    stroke-dasharray="0, ${circleCircum}"
    stroke-linecap="round"
    transform="rotate(-90, 80, 100)"
  >
    ${circleAnim}
  </circle>
  <!-- 중앙 rating 숫자 -->
  <text x="80" y="105" text-anchor="middle" fill="${textColor}" font-size="18" font-weight="bold">
    ${rating}
  </text>

  <!-- 가운데 info -->
  <g transform="translate(150, 70)">
    <text x="0" y="0" fill="${textColor}" font-size="16">rate: ${rating}</text>
    <text x="0" y="25" fill="${textColor}" font-size="16">solved: ${solved}</text>
    <text x="0" y="50" fill="${textColor}" font-size="16">class: ${classNum}</text>
  </g>

  <!-- 하단 바 (트랙) -->
  <rect
    x="${barX}" y="${barY}"
    width="${barWidth}" height="${barHeight}"
    fill="${trackColor}" rx="4"
  />
  <rect
    x="${barX}" y="${barY}"
    width="0" height="${barHeight}"
    fill="${accentColor}" rx="4"
  >
    ${barAnim}
  </rect>

  <!-- 바 위쪽 오른쪽: 퍼센트 -->
  <!-- (minRating~maxRating) 비율은 굳이 표기 안 했지만 필요하면 추가 가능 -->
  <text x="${width - 20}" y="${
    barY - 3
  }" text-anchor="end" fill="${subTextColor}" font-size="14">
    ${percentText}
  </text>

  <!-- 바 아래 오른쪽: fraction (rating / maxRating) -->
  <text x="${width - 20}" y="${
    barY + barHeight + 15
  }" text-anchor="end" fill="${subTextColor}" font-size="14">
    ${fractionText}
  </text>
</svg>
`;
}

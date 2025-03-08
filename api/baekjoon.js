const axios = require("axios");

/**
 * 티어 번호(1~30)를 "Diamond 5" 식 문자열로 변환
 */
function getTierNameAndNumber(tierNum) {
  if (tierNum < 1 || tierNum > 30) {
    return { tierGroup: "Unranked", tierSub: "" };
  }
  const groups = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ruby"];
  const subTiers = ["V", "IV", "III", "II", "I"];

  // 예) tier=1 => Bronze V, tier=10 => Silver I
  const groupIndex = Math.floor((tierNum - 1) / 5);
  const subIndex = (tierNum - 1) % 5;

  return {
    tierGroup: groups[groupIndex],
    tierSub: subTiers[subIndex],
  };
}

/**
 * 티어 번호별 대략적인 레이팅 범위(예시)
 *  - 실제 solved.ac와 1:1 일치하진 않지만, 예시로 사용
 *    Bronze (1~5)     : [800, 1299]
 *    Silver (6~10)    : [1300, 1599]
 *    Gold (11~15)     : [1600, 1899]
 *    Platinum (16~20) : [1900, 2199]
 *    Diamond (21~25)  : [2200, 2699]
 *    Ruby (26~30)     : [2700, 4000]
 *    그 외 (Unranked) : [0, 4000]
 */
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
  // Unranked
  return [0, 4000];
}

module.exports = async (req, res) => {
  const { username } = req.query;
  if (!username) {
    return sendErrorCard(res, "No username provided");
  }

  try {
    // 1. solved.ac API 호출: Baekjoon 유저 정보
    const { data } = await axios.get(
      `https://solved.ac/api/v3/user/show?handle=${username}`
    );

    // 2. 주요 정보 파싱
    const tierNum = data.tier || 0;
    const { tierGroup, tierSub } = getTierNameAndNumber(tierNum);
    const rating = data.rating || 0;
    const solved = data.solvedCount || 0;
    const classNum = data.class || 0;
    const handle = data.handle || username;
    const [minRating, maxRating] = getTierRange(tierNum);

    // 티어 범위를 벗어나면 범위 안으로 보정
    let clamped = Math.max(rating, minRating);
    clamped = Math.min(clamped, maxRating);

    // 진행도 계산
    const ratio = (clamped - minRating) / (maxRating - minRating);
    const progressPercent = Math.round(ratio * 100);

    // 예: "2260 / 2300 => 60%"
    const progressText = `${rating} / ${maxRating} => ${progressPercent}%`;

    // 원형 게이지 % (rating / 4000) 가정
    const ratingCap = Math.min(rating, 4000);
    const circlePercent = Math.round((ratingCap / 4000) * 100);

    // 3. SVG 생성
    const svg = renderLeetTierCard({
      tierGroup,
      tierSub,
      rating,
      solved,
      classNum,
      handle,
      minRating,
      maxRating,
      progressText,
      circlePercent,
    });

    // 4. 응답
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
 * LeetCode 다크 테마(배경= #0d1117) + 원형 그래프 유지
 * 내용(티어명, 숫자, rate/solved/class, 진행 바) => 첨부 이미지 참고
 */
function renderLeetTierCard({
  tierGroup,
  tierSub,
  rating,
  solved,
  classNum,
  handle,
  minRating,
  maxRating,
  progressText,
  circlePercent,
}) {
  const width = 450;
  const height = 200;

  // 색상
  const bgColor = "#0d1117"; // LeetCode 다크 테마
  const textColor = "#ffffff";
  const subTextColor = "#C9D1D9";
  const trackColor = "#30363d";
  const accentColor = "#f79a09"; // 원형 그래프/바 색상

  // 원형 그래프(왼쪽) 설정
  const radius = 40;
  const circleCircum = 2 * Math.PI * radius;
  // circlePercent% => stroke-dasharray
  const dashVal = (circlePercent / 100) * circleCircum;

  // 하단 진행 바
  const barX = 20;
  const barY = 160;
  const barWidth = width - 40;
  const barHeight = 8;

  // SMIL 애니메이션 (원형 그래프: 0->dashVal)
  const circleAnim = `
    <animate
      attributeName="stroke-dasharray"
      from="0, ${circleCircum}"
      to="${dashVal}, ${circleCircum - dashVal}"
      dur="1s"
      fill="freeze"
    />
  `;

  // SMIL 애니메이션 (하단 바: width 0-> barWidth*ratio)
  // ratio = circlePercent / 100?
  // 하지만 여기서는 tier 범위별 ratio가 다르므로, 그냥 1초 동안 풀로 채우거나
  // 혹은 원하는 만큼만 채우도록 수정 가능
  // 여기서는 풀로 채우고, "progressText"로 비율 표기
  const barAnim = `
    <animate
      attributeName="width"
      from="0"
      to="${barWidth * (circlePercent / 100)}"
      dur="1s"
      fill="freeze"
    />
  `;

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- 배경 -->
  <rect width="${width}" height="${height}" rx="10" fill="${bgColor}" />

  <!-- 상단: 티어명 & 숫자 (왼쪽), 유저 handle (오른쪽) -->
  <text x="20" y="30" fill="${textColor}" font-size="16" font-weight="bold">
    ${tierGroup} ${tierSub}
  </text>
  <text x="${
    width - 20
  }" y="30" text-anchor="end" fill="${textColor}" font-size="16" font-weight="bold">
    ${handle}
  </text>

  <!-- 원형 그래프 (왼쪽) - ratingPercent -->
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

  <!-- 가운데 정보: rate, solved, class -->
  <g transform="translate(150, 70)">
    <text x="0" y="0" fill="${textColor}" font-size="14">rate: ${rating}</text>
    <text x="0" y="20" fill="${textColor}" font-size="14">solved: ${solved}</text>
    <text x="0" y="40" fill="${textColor}" font-size="14">class: ${classNum}</text>
  </g>

  <!-- 하단 진행 바 -->
  <rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}"
        fill="${trackColor}" rx="4" />
  <rect x="${barX}" y="${barY}" width="0" height="${barHeight}"
        fill="${accentColor}" rx="4">
    ${barAnim}
  </rect>

  <!-- 진행 바 텍스트 (오른쪽 정렬) -->
  <text x="${width - 20}" y="${
    barY - 2
  }" text-anchor="end" fill="${subTextColor}"
        font-size="12" alignment-baseline="baseline">
    ${progressText}
  </text>
</svg>
`;
}

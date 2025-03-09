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
    return [0, 1299];
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
    // solved.ac API로 사용자 정보
    const { data } = await axios.get(
      `https://solved.ac/api/v3/user/show?handle=${username}`
    );

    // 주요 정보
    const tierNum = data.tier || 0;
    const { tierGroup, tierSub } = getTierNameAndNumber(tierNum);
    const rating = data.rating || 0;
    const solved = data.solvedCount || 0;
    const classNum = data.class || 0;
    const handle = data.handle || username;
    const rank = data.rank || 0;

    // 티어 범위
    const [minRating, maxRating] = getTierRange(tierNum);
    let clamp = Math.max(rating, minRating);
    clamp = Math.min(clamp, maxRating);
    const ratio = (clamp - minRating) / (maxRating - minRating);
    const progressPercent = Math.round(ratio * 100);

    // 하단 바 텍스트
    const fractionText = `${rating} / ${maxRating}`;
    const percentText = `${progressPercent}%`;

    // 원형 게이지 퍼센트 (rating / 4000)
    const ratingCapped = Math.min(rating, 4000);
    const circlePercent = Math.round((ratingCapped / 4000) * 100);

    // 하단 바 게이지 퍼센트 (rating / 현재 티어 최댓값)
    const barPercent = Math.round((ratingCapped / getTierRange(ratingCapped)[1]) * 100);

    // 최종 SVG
    const svg = renderLeftGaugeCard({
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
      barPercent,
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
    <svg width="400" height="120" xmlns="http://www.w3.org/2000/svg">
      <rect
        width="400" height="120"
        rx="8"
        fill="#101010"
        stroke="#404040" stroke-width="2"
      />
      <text 
        x="20" y="65" 
        fill="#fff" 
        font-size="16" 
        font-weight="bold"
        font-family="Baloo 2, cursive, sans-serif"
      >
        ${message}
      </text>
    </svg>`;
  res.setHeader("Content-Type", "image/svg+xml");
  res.send(errorSvg);
}

/**
 * 🏆 400×300 카드
 * 🏆 색상 유지 (#101010, #404040, #f79a09 등)
 * 🏆 Baloo 2 폰트 지정 (폴백: cursive, sans-serif)
 */
function renderLeftGaugeCard({
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
  barPercent
}) {
  const width = 400;
  const height = 300;

  const bgColor = "#101010";
  const textColor = "#dcdcdc";       // 상단 닉네임
  const contentTextColor = "#f1f1f0"; // 게이지 중앙, 오른쪽 텍스트
  const subTextColor = "#C9D1D9";
  const trackColor = "#404040";
  const accentColor = "#f79a09";

  const radius = 60;
  const cx = 80;
  const cy = 150;
  const circleCircum = 2 * Math.PI * radius;
  const dashVal = (circlePercent / 100) * circleCircum;

  const barX = 20;
  const barY = 260;
  const barWidth = width - 40; 
  const barHeight = 8;
  const barFillWidth = (barPercent / 100) * barWidth;

  // SMIL
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
<svg
  width="${width}" height="${height}"
  viewBox="0 0 ${width} ${height}"
  xmlns="http://www.w3.org/2000/svg"
>
  <rect
    width="${width}" height="${height}"
    rx="8"
    fill="${bgColor}"
    stroke="${trackColor}" stroke-width="2"
  />

  <!-- 상단 텍스트 (티어 / 닉네임) -->
  <text 
    x="20" y="50" 
    fill="#ffffff" 
    font-size="26" font-weight="bold" 
    font-family="Baloo 2, cursive, sans-serif"
    opacity="0"
  >
    ${tierGroup} ${tierSub}
    ${fadeIn("0s")}
  </text>
  <text 
    x="${width - 20}" y="50" 
    text-anchor="end" 
    fill="${textColor}" 
    font-size="26" font-weight="bold"
    font-family="Baloo 2, cursive, sans-serif"
    opacity="0"
  >
    ${handle}
    ${fadeIn("0s")}
  </text>

  <!-- 원형 게이지 배경 -->
  <circle
    cx="${cx}" cy="${cy}" r="${radius}"
    stroke="${trackColor}" stroke-width="8" fill="none"
    opacity="0"
  >
    ${fadeIn("0s")}
  </circle>
  <circle
    cx="${cx}" cy="${cy}" r="${radius}"
    stroke="${accentColor}" stroke-width="8" fill="none"
    stroke-dasharray="0, ${circleCircum}"
    stroke-linecap="round"
    transform="rotate(-90, ${cx}, ${cy})"
    opacity="0"
  >
    ${fadeIn("0s")}
    ${circleAnim}
  </circle>

  <!-- 중앙 rating -->
  <text
    x="${cx}"
    y="${cy}"
    text-anchor="middle"
    dominant-baseline="middle"
    fill="${contentTextColor}"
    font-size="36"
    font-weight="bold"
    font-family="Baloo 2, cursive, sans-serif"
    opacity="0"
  >
    ${rating}
    ${fadeIn("0.1s")}
  </text>

  <!-- 오른쪽 4줄 -->
  <g transform="translate(220, 110)" opacity="0">
    ${fadeIn("0.2s")}
    <text 
      x="0" y="0" 
      fill="${contentTextColor}" 
      font-size="22" font-weight="bold"
      font-family="Baloo 2, cursive, sans-serif"
    >
      Rate: ${rating}
    </text>
    <text 
      x="0" y="30" 
      fill="${contentTextColor}" 
      font-size="22" font-weight="bold"
      font-family="Baloo 2, cursive, sans-serif"
    >
      Solved: ${solved}
    </text>
    <text 
      x="0" y="60" 
      fill="${contentTextColor}" 
      font-size="22" font-weight="bold"
      font-family="Baloo 2, cursive, sans-serif"
    >
      Class: ${classNum}
    </text>
    <text 
      x="0" y="90" 
      fill="${contentTextColor}" 
      font-size="22" font-weight="bold"
      font-family="Baloo 2, cursive, sans-serif"
    >
      Rank: #${rank}
    </text>
  </g>

  <!-- 하단 바 -->
  <rect 
    x="${barX}" y="${barY}" 
    width="${barWidth}" height="${barHeight}"
    fill="${trackColor}" rx="4" opacity="0"
  >
    ${fadeIn("0.3s")}
  </rect>
  <rect 
    x="${barX}" y="${barY}" 
    width="0" height="${barHeight}"
    fill="${accentColor}" rx="4" opacity="0"
  >
    ${fadeIn("0.3s")}
    ${barAnim}
  </rect>

  <!-- 바 위쪽 오른쪽 -->
  <text 
    x="${width - 20}" 
    y="${barY - 3}" 
    text-anchor="end"
    fill="${subTextColor}" 
    font-size="16" 
    font-family="Baloo 2, cursive, sans-serif"
    opacity="0"
  >
    ${percentText}
    ${fadeIn("0.4s")}
  </text>

  <!-- 바 아래 오른쪽 -->
  <text 
    x="${width - 20}" 
    y="${barY + barHeight + 20}" 
    text-anchor="end"
    fill="${subTextColor}" 
    font-size="16"
    font-family="Baloo 2, cursive, sans-serif"
    opacity="0"
  >
    ${fractionText}
    ${fadeIn("0.4s")}
  </text>
</svg>
`;
}

const axios = require("axios");

/** solved.ac 티어 숫자를 "Bronze V" 식으로 변환하는 함수 */
function getTierName(tier) {
  if (tier < 1 || tier > 30) return "Unranked";

  const groups = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ruby"];
  const subTiers = ["V", "IV", "III", "II", "I"];
  // 예: tier=1 => Bronze V, tier=10 => Silver I
  const groupIndex = Math.floor((tier - 1) / 5);
  const subIndex = (tier - 1) % 5;
  return groups[groupIndex] + " " + subTiers[subIndex];
}

module.exports = async (req, res) => {
  const { username } = req.query;
  if (!username) {
    return sendErrorCard(res, "No username provided");
  }

  try {
    // solved.ac API로 Baekjoon 유저 정보 가져오기
    const { data } = await axios.get(
      `https://solved.ac/api/v3/user/show?handle=${username}`
    );

    // 주요 정보
    const solvedCount = data.solvedCount || 0; // 푼 문제 수
    const rank = data.rank || 999999; // solved.ac 랭킹
    const tierNum = data.tier || 0; // 티어(숫자)
    const rating = data.rating || 0; // 레이팅 (대략 800~4000)
    const exp = data.exp || 0; // 경험치(누적)
    const tierName = getTierName(tierNum);

    // rating 최대값을 4000으로 가정 (넘으면 4000으로 처리)
    const ratingCapped = Math.min(rating, 4000);
    // 게이지 진행도 (0~100)
    const ratingPercent = Math.round((ratingCapped / 4000) * 100);

    // LeetCard 스타일 + 애니메이션 적용한 SVG 생성
    const svg = renderLeetStyleSVG({
      username,
      rank,
      solvedCount,
      rating,
      ratingPercent,
      tierName,
      exp,
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
      <rect width="450" height="120" rx="10" fill="#1F1F1F"/>
      <text x="20" y="65" fill="#FFFFFF" font-size="16" font-weight="bold">${message}</text>
    </svg>
  `;
  res.setHeader("Content-Type", "image/svg+xml");
  res.send(errorSvg);
}

/**
 * LeetCard 비슷한 스타일의 SVG 생성
 * - 원형 게이지 크게 (r=40)
 * - 게이지 채워지는 애니메이션 (SMIL)
 * - 오른쪽에 Rank, Solved, Tier, Exp 표시
 */
function renderLeetStyleSVG({
  username,
  rank,
  solvedCount,
  rating,
  ratingPercent,
  tierName,
  exp,
}) {
  // 원형 게이지 설정
  const radius = 40;
  const circleCircum = 2 * Math.PI * radius;
  // 최종 stroke-dasharray
  const strokeVal = (ratingPercent / 100) * circleCircum;

  // 색상/스타일
  const bgColor = "#0d1117";
  const textColor = "#FFFFFF";
  const subTextColor = "#C9D1D9";
  const circleTrackColor = "#30363d";
  const circleProgressColor = "#f79a09";

  // SMIL 애니메이션:
  // 1) stroke-dasharray를 0 -> 최종값으로 1초간 변경
  // 2) text(가운데 rating)도 0 -> rating 으로 변환하는 건 SMIL로 복잡해서 생략 or 정적 표시
  //    (문자열 애니메이션은 GitHub 등에서 잘 안 먹힐 수도 있음)
  const dashAnim = `
    <animate
      attributeName="stroke-dasharray"
      from="0, ${circleCircum}"
      to="${strokeVal}, ${circleCircum - strokeVal}"
      dur="1s"
      fill="freeze"
    />
  `;

  return `
<svg width="450" height="180" viewBox="0 0 450 180" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- 카드 배경 -->
  <rect width="450" height="180" rx="10" fill="${bgColor}" />

  <!-- 상단: Baekjoon / username#rank -->
  <text x="20" y="30" fill="${textColor}" font-size="16" font-weight="bold">Baekjoon</text>
  <text x="430" y="30" text-anchor="end" fill="${textColor}" font-size="16" font-weight="bold">
    ${username} #${rank}
  </text>

  <!-- 원형 게이지 (왼쪽) - rating -->
  <!-- 배치: cx=80, cy=100, r=40 -->
  <circle
    cx="80" cy="100" r="${radius}"
    stroke="${circleTrackColor}" stroke-width="8" fill="none"
  />
  <circle
    cx="80" cy="100" r="${radius}"
    stroke="${circleProgressColor}" stroke-width="8" fill="none"
    stroke-dasharray="0, ${circleCircum}"
    stroke-linecap="round"
    transform="rotate(-90, 80, 100)"
  >
    ${dashAnim}
  </circle>

  <!-- 중앙에 rating 표시 -->
  <text x="80" y="105" text-anchor="middle" fill="${textColor}" font-size="18" font-weight="bold">
    ${rating}
  </text>

  <!-- 오른쪽 정보 (x=160, y=55) -->
  <g transform="translate(160, 55)">
    <!-- Solved -->
    <text x="0" y="0" fill="${textColor}" font-size="14" font-weight="bold">Solved</text>
    <text x="220" y="0" text-anchor="end" fill="${subTextColor}" font-size="14">
      ${solvedCount}
    </text>
    <line x1="0" y1="5" x2="220" y2="5" stroke="${circleTrackColor}" stroke-width="1"/>

    <!-- Tier -->
    <text x="0" y="30" fill="${textColor}" font-size="14" font-weight="bold">Tier</text>
    <text x="220" y="30" text-anchor="end" fill="${subTextColor}" font-size="14">
      ${tierName}
    </text>
    <line x1="0" y1="35" x2="220" y2="35" stroke="${circleTrackColor}" stroke-width="1"/>

    <!-- Exp -->
    <text x="0" y="60" fill="${textColor}" font-size="14" font-weight="bold">Exp</text>
    <text x="220" y="60" text-anchor="end" fill="${subTextColor}" font-size="14">
      ${exp}
    </text>
    <line x1="0" y1="65" x2="220" y2="65" stroke="${circleTrackColor}" stroke-width="1"/>
  </g>
</svg>
`;
}

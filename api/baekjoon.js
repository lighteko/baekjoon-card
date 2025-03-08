const axios = require("axios");

/** solved.ac 티어 숫자를 "Bronze V" 같은 문자열로 변환하는 함수 */
function getTierName(tier) {
  // 티어 범위 벗어나면 Unranked 처리
  if (tier < 1 || tier > 30) return "Unranked";

  const groups = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ruby"];
  const subTiers = ["V", "IV", "III", "II", "I"];

  // 예: tier=1 → groupIndex=0(Bronze), subIndex=0(V) => "Bronze V"
  //     tier=10 → groupIndex=1(Silver), subIndex=4(I) => "Silver I"
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

    // 주요 정보 추출
    const solvedCount = data.solvedCount || 0; // 푼 문제 수
    const rank = data.rank || 999999;         // solved.ac 랭킹
    const tierNum = data.tier || 0;           // 티어 (숫자)
    const rating = data.rating || 0;          // 레이팅 (대략 800~4000 범위)
    const tierName = getTierName(tierNum);

    // 원형 게이지에서 rating이 최대 4000 기준으로 표시되도록
    // (4000 초과 시 4000으로 고정)
    const ratingCapped = Math.min(rating, 4000);
    const ratingPercent = Math.round((ratingCapped / 4000) * 100);

    // LeetCard 스타일 SVG 생성
    const svg = renderLeetStyleSVG({
      username,
      rank,
      solvedCount,
      rating,
      ratingPercent,
      tierName,
    });

    res.setHeader("Content-Type", "image/svg+xml");
    res.send(svg);
  } catch (err) {
    console.error(err);
    sendErrorCard(res, "Error fetching user data");
  }
};

/** 에러 시 간단한 SVG 카드 */
function sendErrorCard(res, message) {
  const errorSvg = `
    <svg width="400" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="100" rx="10" fill="#1F1F1F"/>
      <text x="20" y="55" fill="#FFFFFF" font-size="16" font-weight="bold">${message}</text>
    </svg>
  `;
  res.setHeader("Content-Type", "image/svg+xml");
  res.send(errorSvg);
}

/** LeetCard 비슷한 스타일의 SVG 생성 */
function renderLeetStyleSVG({
  username,
  rank,
  solvedCount,
  rating,
  ratingPercent,
  tierName,
}) {
  // 원형 게이지 설정
  const radius = 30;
  const circleCircum = 2 * Math.PI * radius;
  // ratingPercent% 만큼 stroke-dasharray
  const strokeVal = (ratingPercent / 100) * circleCircum;
  const dashArray = `${strokeVal} ${circleCircum - strokeVal}`;

  // 색상/스타일 상수
  const bgColor = "#0d1117";         // 다크 배경
  const textColor = "#FFFFFF";       // 메인 텍스트
  const subTextColor = "#C9D1D9";    // 서브 텍스트
  const circleTrackColor = "#30363d";  
  const circleProgressColor = "#f79a09"; // 오렌지

  return `
<svg width="400" height="180" viewBox="0 0 400 180" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- 카드 배경 -->
  <rect width="400" height="180" rx="10" fill="${bgColor}" />

  <!-- 상단: Baekjoon / username#rank -->
  <text x="20" y="30" fill="${textColor}" font-size="14" font-weight="bold">
    Baekjoon
  </text>
  <text x="380" y="30" text-anchor="end" fill="${textColor}" font-size="14" font-weight="bold">
    ${username} #${rank}
  </text>

  <!-- 원형 게이지 (왼쪽) - rating -->
  <circle cx="60" cy="100" r="${radius}" stroke="${circleTrackColor}" stroke-width="8" fill="none" />
  <circle
    cx="60" cy="100" r="${radius}"
    stroke="${circleProgressColor}" stroke-width="8" fill="none"
    stroke-dasharray="${dashArray}"
    stroke-dashoffset="${circleCircum / 4}"
    stroke-linecap="round"
    transform="rotate(-90, 60, 100)"
  />
  <!-- 중앙에 rating 수치 표시 -->
  <text x="60" y="105" text-anchor="middle" fill="${textColor}" font-size="16" font-weight="bold">
    ${rating}
  </text>

  <!-- 오른쪽 정보 텍스트 -->
  <g transform="translate(120, 60)">
    <!-- Solved -->
    <text x="0" y="0" fill="${textColor}" font-size="14" font-weight="bold">Solved</text>
    <text x="110" y="0" text-anchor="end" fill="${subTextColor}" font-size="14">
      ${solvedCount}
    </text>
    <line x1="0" y1="5" x2="110" y2="5" stroke="${circleTrackColor}" stroke-width="1"/>

    <!-- Tier -->
    <text x="0" y="30" fill="${textColor}" font-size="14" font-weight="bold">Tier</text>
    <text x="110" y="30" text-anchor="end" fill="${subTextColor}" font-size="14">
      ${tierName}
    </text>
    <line x1="0" y1="35" x2="110" y2="35" stroke="${circleTrackColor}" stroke-width="1"/>
  </g>
</svg>
`;
}

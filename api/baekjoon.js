const axios = require("axios");

/**
 * 난이도를 임의로 구분(Easy / Medium / Hard)
 * solved.ac tier 기준 (https://solved.ac/)
 *  0~5   : Bronze 1~5
 *  6~10  : Silver 1~5
 * 11~15  : Gold 1~5
 * 16~20  : Platinum 1~5
 * 21~25  : Diamond 1~5
 * 26~30  : Ruby 1~5
 *
 * 예) Easy = Bronze+Silver, Medium = Gold+Platinum, Hard = Diamond+Ruby
 */
function classifyTier(tier) {
  if (tier <= 10) return "easy";
  if (tier <= 20) return "medium";
  return "hard";
}

module.exports = async (req, res) => {
  const { username } = req.query;
  if (!username) {
    return sendErrorCard(res, "No username provided");
  }

  try {
    // 1. solved.ac API 호출: 백준 사용자 정보
    const { data } = await axios.get(
      `https://solved.ac/api/v3/user/show?handle=${username}`
    );

    // 주요 정보
    const solvedCount = data.solvedCount || 0; // 총 해결 문제 수
    const rank = data.rank || 999999;         // solved.ac 순위
    const tier = data.tier || 0;              // solved.ac 티어 (숫자)
    const tierClass = classifyTier(tier);

    // 2. 난이도별로 분류하기 위해, 추가 API 호출 (문제 풀이 현황)
    //    실제로는 /user/problem_stats 같은 API를 더 호출해야 정확한 Easy/Medium/Hard를 구분 가능
    //    여기서는 단순 예시로 "티어"만 이용해서 Easy/Medium/Hard를 대략 나눔
    let easySolved = 0;
    let mediumSolved = 0;
    let hardSolved = 0;

    // 예: 티어 범위에 따라 Easy/Medium/Hard 해결 문제를 "가정"
    if (tierClass === "easy") {
      easySolved = solvedCount;
    } else if (tierClass === "medium") {
      mediumSolved = solvedCount;
    } else {
      hardSolved = solvedCount;
    }

    // 3. 총 문제수(예시로 3000문제 중 easy가 863, medium 1807, hard 806처럼 보이게)
    //    실제 Baekjoon 문제수는 30,000개 이상이지만, LeetCode 예시처럼 "대표값"으로 설정
    const easyTotal = 863;
    const mediumTotal = 1807;
    const hardTotal = 806;

    // 4. Progress Circle(원형) 계산: 예시로 전체(E+M+H=3476) 중 solvedCount 비율
    const overallTotal = easyTotal + mediumTotal + hardTotal; // 3476
    const overallPercent = Math.round((solvedCount / overallTotal) * 100);

    // 5. SVG 생성
    const svg = renderLeetStyleSVG({
      username,
      rank,
      solvedCount,
      easySolved,
      mediumSolved,
      hardSolved,
      easyTotal,
      mediumTotal,
      hardTotal,
      overallPercent,
    });

    res.setHeader("Content-Type", "image/svg+xml");
    return res.send(svg);
  } catch (err) {
    console.error(err);
    return sendErrorCard(res, "Error fetching user data");
  }
};

/** 에러 상황에서 보여줄 SVG */
function sendErrorCard(res, message) {
  const errorSvg = `
  <svg width="400" height="100" viewBox="0 0 400 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="100" rx="10" fill="#1F1F1F"/>
    <text x="20" y="55" fill="#FFFFFF" font-size="16" font-weight="bold">${message}</text>
  </svg>`;
  res.setHeader("Content-Type", "image/svg+xml");
  res.send(errorSvg);
}

/** LeetCode 카드 스타일의 SVG를 생성하는 함수 */
function renderLeetStyleSVG({
  username,
  rank,
  solvedCount,
  easySolved,
  mediumSolved,
  hardSolved,
  easyTotal,
  mediumTotal,
  hardTotal,
  overallPercent,
}) {
  // 원형 Progress(왼쪽)
  // - 원 둘레는 2πr. 여기서 r=30 => 둘레 ~ 188.5
  // - (overallPercent / 100) * 둘레 만큼 stroke-dasharray를 설정하면 됨
  const radius = 30;
  const circleCircum = 2 * Math.PI * radius;
  const strokeVal = (overallPercent / 100) * circleCircum;
  const dashArray = `${strokeVal} ${circleCircum - strokeVal}`;

  // 색상/스타일 상수
  const bgColor = "#0d1117"; // 배경
  const textColor = "#FFFFFF";
  const subTextColor = "#C9D1D9";
  const circleTrackColor = "#30363d"; // 배경 원 트랙
  const circleProgressColor = "#f79a09"; // 진행 원
  const easyColor = "#00af9b";
  const mediumColor = "#f5af00";
  const hardColor = "#ff2e2e";

  // 실제 SVG 문자열
  return `
<svg width="400" height="180" viewBox="0 0 400 180" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- 배경 -->
  <rect width="400" height="180" rx="10" fill="${bgColor}" />

  <!-- 상단 영역 (아이콘 + 닉네임) -->
  <!-- 좌측 상단: '백준' 아이콘 대용 텍스트, 우측 상단: username #rank -->
  <text x="20" y="30" fill="${textColor}" font-size="14" font-weight="bold">Baekjoon</text>
  <text x="380" y="30" text-anchor="end" fill="${textColor}" font-size="14" font-weight="bold">${username} #${rank}</text>

  <!-- 원형 진행도 (왼쪽 중앙) -->
  <circle
    cx="60" cy="100" r="${radius}"
    stroke="${circleTrackColor}" stroke-width="8" fill="none"
  />
  <circle
    cx="60" cy="100" r="${radius}"
    stroke="${circleProgressColor}" stroke-width="8" fill="none"
    stroke-dasharray="${dashArray}"
    stroke-dashoffset="${circleCircum / 4}"  <!-- 회전 위치 조정 -->
    stroke-linecap="round"
    transform="rotate(-90, 60, 100)"
  />
  <!-- 중앙 텍스트 (총 해결 문제 수) -->
  <text x="60" y="105" text-anchor="middle" fill="${textColor}" font-size="16" font-weight="bold">
    ${solvedCount}
  </text>

  <!-- 난이도별 스탯 (오른쪽) -->
  <g transform="translate(120, 60)">
    <!-- Easy -->
    <text x="0" y="0" fill="${textColor}" font-size="14" font-weight="bold">Easy</text>
    <text x="110" y="0" text-anchor="end" fill="${subTextColor}" font-size="14">
      ${easySolved} / ${easyTotal}
    </text>
    <line x1="0" y1="5" x2="110" y2="5" stroke="${easyColor}" stroke-width="2"/>

    <!-- Medium -->
    <text x="0" y="30" fill="${textColor}" font-size="14" font-weight="bold">Medium</text>
    <text x="110" y="30" text-anchor="end" fill="${subTextColor}" font-size="14">
      ${mediumSolved} / ${mediumTotal}
    </text>
    <line x1="0" y1="35" x2="110" y2="35" stroke="${mediumColor}" stroke-width="2"/>

    <!-- Hard -->
    <text x="0" y="60" fill="${textColor}" font-size="14" font-weight="bold">Hard</text>
    <text x="110" y="60" text-anchor="end" fill="${subTextColor}" font-size="14">
      ${hardSolved} / ${hardTotal}
    </text>
    <line x1="0" y1="65" x2="110" y2="65" stroke="${hardColor}" stroke-width="2"/>
  </g>
</svg>
`;
}

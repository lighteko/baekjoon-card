const axios = require("axios");

/** solved.ac 난이도별 해결 개수 확인을 위해 (0~5 인덱스가 Bronze~Ruby) */
function getProblemStats(data) {
  if (!data.solvedByLevel) {
    // solvedByLevel이 없으면 임시 데이터
    return [10, 20, 30, 25, 10, 5];
  }
  // [ Bronze, Silver, Gold, Platinum, Diamond, Ruby ]
  // data.solvedByLevel[0] = Bronze 해결 수
  // ...
  return [
    data.solvedByLevel[0] || 0, // Bronze
    data.solvedByLevel[1] || 0, // Silver
    data.solvedByLevel[2] || 0, // Gold
    data.solvedByLevel[3] || 0, // Platinum
    data.solvedByLevel[4] || 0, // Diamond
    data.solvedByLevel[5] || 0, // Ruby
  ];
}

/** 티어 번호(1~30)를 "Bronze IV" 등으로 변환 */
function getTierName(tierNum) {
  if (tierNum < 1 || tierNum > 30) return "Unranked";
  const groups = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ruby"];
  const subTiers = ["V", "IV", "III", "II", "I"];
  const gIdx = Math.floor((tierNum - 1) / 5);
  const sIdx = (tierNum - 1) % 5;
  return `${groups[gIdx]} ${subTiers[sIdx]}`;
}

/** 단순 분류: tier<=10 => easy, <=20 => medium, else => hard */
function classifyTier(tierNum) {
  if (tierNum <= 10) return "easy";
  if (tierNum <= 20) return "medium";
  return "hard";
}

/** 레이팅 게이지 범위 (대략) */
function getTierRange(tierNum) {
  if (tierNum >= 1 && tierNum <= 5) return [800, 1299];
  if (tierNum <= 10) return [1300, 1599];
  if (tierNum <= 15) return [1600, 1899];
  if (tierNum <= 20) return [1900, 2199];
  if (tierNum <= 25) return [2200, 2699];
  if (tierNum <= 30) return [2700, 4000];
  return [0, 4000];
}

module.exports = async (req, res) => {
  const { username, card } = req.query;
  if (!username) {
    return sendErrorCard(res, "No username provided");
  }

  try {
    // solved.ac API 호출
    const { data } = await axios.get(
      `https://solved.ac/api/v3/user/show?handle=${username}`
    );

    if (card === "eemh") {
      // Easy/Medium/Hard 카드
      return sendSVG(res, renderEasyMediumHard(data));
    } else {
      // 기본: 티어/레이팅/클래스 카드 (card=rsc)
      return sendSVG(res, renderRatingSolvedClass(data));
    }
  } catch (err) {
    console.error(err);
    return sendErrorCard(res, "Error fetching user data");
  }
};

function sendErrorCard(res, message) {
  const svg = `
    <svg width="400" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="100" rx="10" fill="#0d1117" stroke="#30363d" stroke-width="1"/>
      <text x="20" y="55" fill="#fff" font-size="16" font-weight="bold">${message}</text>
    </svg>`;
  sendSVG(res, svg);
}

function sendSVG(res, svg) {
  res.setHeader("Content-Type", "image/svg+xml");
  res.send(svg);
}

/**
 * 1) "Easy/Medium/Hard" 카드 (LeetCode 왼쪽 스타일)
 *    - 원형 게이지에 "총 해결 문제 수" 표시
 *    - Easy/Medium/Hard 통계
 *    - 상단: left "Baekjoon", right "username #rank"
 *    - 배경 + border + 1초 애니메이션
 */
function renderEasyMediumHard(data) {
  const width = 450;
  const height = 200;

  const bgColor = "#0d1117";
  const textColor = "#ffffff";
  const trackColor = "#30363d";
  const accentColor = "#f79a09";
  const subTextColor = "#C9D1D9";

  const { handle, rank, solvedCount } = data;
  // 난이도별 해결 (Bronze,Silver,Gold,Platinum,Diamond,Ruby)
  const [bronze, silver, gold, plat, dia, ruby] = getProblemStats(data);
  const totalE = bronze + silver; // Easy
  const totalM = gold + plat; // Medium
  const totalH = dia + ruby; // Hard

  // 총 문제풀이
  const totalSolved = solvedCount || 0;
  // 원형 게이지 = (총 해결 / 임의값 5000?) → 그냥 100% 이상이면 꽉 채우기
  const percent = Math.min(Math.round((totalSolved / 5000) * 100), 100);

  // 원형 게이지용
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const dashVal = (percent / 100) * circ;

  // SMIL 애니메이션 (1초)
  const circleAnim = `
    <animate
      attributeName="stroke-dasharray"
      from="0, ${circ}"
      to="${dashVal}, ${circ - dashVal}"
      dur="1s"
      fill="freeze"
    />
  `;

  return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- 배경 + 테두리 -->
  <rect width="${width}" height="${height}" rx="10" fill="${bgColor}" stroke="#30363d" stroke-width="1"/>

  <!-- 상단 -->
  <text x="20" y="30" fill="${textColor}" font-size="14" font-weight="bold">Baekjoon</text>
  <text x="${
    width - 20
  }" y="30" text-anchor="end" fill="${textColor}" font-size="14" font-weight="bold">
    ${handle} #${data.rank}
  </text>

  <!-- 원형 게이지 (왼쪽) -->
  <circle cx="60" cy="100" r="${radius}" stroke="${trackColor}" stroke-width="8" fill="none" />
  <circle
    cx="60" cy="100" r="${radius}"
    stroke="${accentColor}" stroke-width="8" fill="none"
    stroke-dasharray="0, ${circ}"
    stroke-linecap="round"
    transform="rotate(-90, 60, 100)"
  >
    ${circleAnim}
  </circle>
  <!-- 중앙에 총 해결 -->
  <text x="60" y="105" text-anchor="middle" fill="${textColor}" font-size="16" font-weight="bold">
    ${totalSolved}
  </text>

  <!-- E/M/H 라벨 (오른쪽) -->
  <g transform="translate(120, 60)">
    <!-- Easy -->
    <text x="0" y="0" fill="${textColor}" font-size="14" font-weight="bold">Easy</text>
    <text x="110" y="0" text-anchor="end" fill="${subTextColor}" font-size="14">
      ${totalE} / ${bronze + silver}
    </text>
    <line x1="0" y1="5" x2="110" y2="5" stroke="#00af9b" stroke-width="2"/>

    <!-- Medium -->
    <text x="0" y="30" fill="${textColor}" font-size="14" font-weight="bold">Medium</text>
    <text x="110" y="30" text-anchor="end" fill="${subTextColor}" font-size="14">
      ${totalM} / ${gold + plat}
    </text>
    <line x1="0" y1="35" x2="110" y2="35" stroke="#f5af00" stroke-width="2"/>

    <!-- Hard -->
    <text x="0" y="60" fill="${textColor}" font-size="14" font-weight="bold">Hard</text>
    <text x="110" y="60" text-anchor="end" fill="${subTextColor}" font-size="14">
      ${totalH} / ${dia + ruby}
    </text>
    <line x1="0" y1="65" x2="110" y2="65" stroke="#ff2e2e" stroke-width="2"/>
  </g>
</svg>
`;
}

/**
 * 2) "티어/레이팅/클래스" 카드 (LeetCode 오른쪽 스타일)
 *    - 원형 게이지: (rating / 4000)
 *    - 하단 바: 티어 범위 내 진행도
 *    - 상단: 티어명 + username
 *    - 중앙: rate/solved/class
 */
function renderRatingSolvedClass(data) {
  const width = 450;
  const height = 200;

  const bgColor = "#0d1117";
  const textColor = "#ffffff";
  const subTextColor = "#C9D1D9";
  const trackColor = "#30363d";
  const accentColor = "#f79a09";

  const handle = data.handle;
  const solved = data.solvedCount || 0;
  const classNum = data.class || 0;
  const tierNum = data.tier || 0;
  const tierName = getTierName(tierNum);
  const rating = data.rating || 0;

  // 원형 게이지 = (rating / 4000)
  const ratingCapped = Math.min(rating, 4000);
  const circlePercent = Math.round((ratingCapped / 4000) * 100);

  // SMIL 애니메이션 (1초)
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const dashVal = (circlePercent / 100) * circ;
  const circleAnim = `
    <animate
      attributeName="stroke-dasharray"
      from="0, ${circ}"
      to="${dashVal}, ${circ - dashVal}"
      dur="1s"
      fill="freeze"
    />
  `;

  // 하단 바: 티어 범위
  const [minR, maxR] = getTierRange(tierNum);
  let clamp = Math.max(rating, minR);
  clamp = Math.min(clamp, maxR);
  const ratio = (clamp - minR) / (maxR - minR);
  const progressPercent = Math.round(ratio * 100);

  // 바 애니메이션
  const barX = 20;
  const barY = 160;
  const barWidth = width - 40;
  const barHeight = 8;
  const barAnim = `
    <animate
      attributeName="width"
      from="0"
      to="${(barWidth * progressPercent) / 100}"
      dur="1s"
      fill="freeze"
    />
  `;

  return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- 배경 + 테두리 -->
  <rect width="${width}" height="${height}" rx="10" fill="${bgColor}" stroke="#30363d" stroke-width="1"/>

  <!-- 상단: 티어 + handle -->
  <text x="20" y="30" fill="${textColor}" font-size="16" font-weight="bold">${tierName}</text>
  <text x="${
    width - 20
  }" y="30" text-anchor="end" fill="${textColor}" font-size="16" font-weight="bold">
    ${handle}
  </text>

  <!-- 원형 그래프 (왼쪽) - rating -->
  <circle
    cx="80" cy="100" r="${radius}"
    stroke="${trackColor}" stroke-width="8" fill="none"
  />
  <circle
    cx="80" cy="100" r="${radius}"
    stroke="${accentColor}" stroke-width="8" fill="none"
    stroke-dasharray="0, ${circ}"
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

  <!-- 하단 바 -->
  <rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" fill="${trackColor}" rx="4" />
  <rect x="${barX}" y="${barY}" width="0" height="${barHeight}" fill="${accentColor}" rx="4">
    ${barAnim}
  </rect>

  <!-- 바 위쪽 오른쪽: % -->
  <text x="${width - 20}" y="${
    barY - 3
  }" text-anchor="end" fill="${subTextColor}" font-size="14">
    ${progressPercent}%
  </text>
  <!-- 바 아래 오른쪽: fraction -->
  <text x="${width - 20}" y="${
    barY + barHeight + 15
  }" text-anchor="end" fill="${subTextColor}" font-size="14">
    ${rating} / ${maxR}
  </text>
</svg>
`;
}

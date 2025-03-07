const axios = require("axios");

module.exports = async (req, res) => {
  const { username } = req.query;
  if (!username) {
    res.setHeader("Content-Type", "image/svg+xml");
    return res.send(`
      <svg xmlns="http://www.w3.org/2000/svg" width="450" height="200">
        <rect width="450" height="200" rx="10" fill="#20232a"/>
        <text x="20" y="35" fill="#ffffff" font-size="20" font-weight="bold">Username required</text>
      </svg>
    `);
  }
  try {
    // solved.ac API 호출: 백준 사용자 정보 획득
    const { data } = await axios.get(`https://solved.ac/api/v3/user/show?handle=${username}`);
    const solvedCount = data.solvedCount || 0;
    const tier = data.tier || 0;
    const rating = data.rating || 0;
    const rank = data.rank || 0;

    // GitHub readme stats와 유사한 스타일의 SVG 생성
    const svg = `
      <svg width="450" height="200" xmlns="http://www.w3.org/2000/svg">
        <style>
          .card {
            fill: #20232a;
          }
          .title {
            fill: #ffffff;
            font-family: 'Segoe UI', Ubuntu, Sans-Serif;
            font-size: 20px;
            font-weight: bold;
          }
          .stat {
            fill: #ffffff;
            font-family: 'Segoe UI', Ubuntu, Sans-Serif;
            font-size: 16px;
          }
          .value {
            fill: #58A6FF;
            font-weight: bold;
          }
        </style>
        <rect class="card" x="0" y="0" rx="10" ry="10" width="450" height="200"/>
        <text x="20" y="35" class="title">Baekjoon Stats - ${username}</text>
        <text x="20" y="70" class="stat">✔ Solved: <tspan class="value">${solvedCount}</tspan></text>
        <text x="20" y="100" class="stat">🏆 Rank: <tspan class="value">${rank}</tspan></text>
        <text x="20" y="130" class="stat">⭐ Tier: <tspan class="value">${tier}</tspan></text>
        <text x="20" y="160" class="stat">📊 Rating: <tspan class="value">${rating}</tspan></text>
      </svg>
    `;
    res.setHeader("Content-Type", "image/svg+xml");
    res.send(svg);
  } catch (error) {
    console.error(error);
    res.setHeader("Content-Type", "image/svg+xml");
    res.send(`
      <svg width="450" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="450" height="200" rx="10" fill="#20232a"/>
        <text x="20" y="35" fill="#ffffff" font-size="20" font-weight="bold">Error fetching data</text>
      </svg>
    `);
  }
};

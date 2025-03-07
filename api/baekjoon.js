const { createCanvas } = require("canvas");
const axios = require("axios");

module.exports = async (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).send("Username is required.");
  }

  try {
    // 백준 solved.ac API 호출
    const { data } = await axios.get(
      `https://solved.ac/api/v3/user/show?handle=${username}`
    );

    const solvedCount = data.solvedCount || 0;
    const tier = data.tier || 0;
    const rating = data.rating || 0;
    const rank = data.rank || 0;

    // 문제 유형별 해결 개수 (임시 데이터, 실제 API로 수정 가능)
    const problemStats = [
      { name: "Bronze", value: data.solvedByLevel[0] || 0, color: "#CD7F32" }, // Bronze
      { name: "Silver", value: data.solvedByLevel[1] || 0, color: "#C0C0C0" }, // Silver
      { name: "Gold", value: data.solvedByLevel[2] || 0, color: "#FFD700" }, // Gold
      { name: "Platinum", value: data.solvedByLevel[3] || 0, color: "#E5E4E2" }, // Platinum
      { name: "Diamond", value: data.solvedByLevel[4] || 0, color: "#B9F2FF" }, // Diamond
      { name: "Ruby", value: data.solvedByLevel[5] || 0, color: "#E0115F" }, // Ruby
    ];

    // 캔버스 크기 설정
    const width = 450;
    const height = 220;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // 배경 색상 (GitHub 카드 스타일)
    ctx.fillStyle = "#20232a";
    ctx.fillRect(0, 0, width, height);

    // 텍스트 스타일
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px Arial";
    ctx.fillText(`Baekjoon Stats - ${username}`, 20, 35);

    ctx.font = "bold 16px Arial";
    ctx.fillText(`✔ Solved: ${solvedCount}`, 20, 70);
    ctx.fillText(`🏆 Rank: ${rank}`, 20, 95);
    ctx.fillText(`⭐ Tier: ${tier}`, 20, 120);
    ctx.fillText(`📊 Rating: ${rating}`, 20, 145);

    // 파이 차트 위치 설정
    const chartX = width - 100;
    const chartY = height / 2;
    const chartRadius = 40;

    // 전체 문제 수 계산
    const totalProblems = problemStats.reduce((sum, p) => sum + p.value, 0);

    // 파이 차트 그리기
    let startAngle = 0;
    problemStats.forEach((p) => {
      if (p.value > 0) {
        const sliceAngle = (p.value / totalProblems) * (Math.PI * 2);
        ctx.beginPath();
        ctx.moveTo(chartX, chartY);
        ctx.arc(
          chartX,
          chartY,
          chartRadius,
          startAngle,
          startAngle + sliceAngle
        );
        ctx.closePath();
        ctx.fillStyle = p.color;
        ctx.fill();
        startAngle += sliceAngle;
      }
    });

    // 애니메이션 효과 추가 (원형 로딩)
    ctx.beginPath();
    ctx.arc(chartX, chartY, chartRadius + 5, 0, Math.PI * 2);
    ctx.strokeStyle = "#58A6FF";
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 10]);
    ctx.stroke();

    // 이미지 응답 반환
    res.setHeader("Content-Type", "image/png");
    res.send(canvas.toBuffer());
  } catch (error) {
    res.status(500).send("Error fetching Baekjoon data.");
  }
};

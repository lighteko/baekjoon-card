const { createCanvas } = require("@napi-rs/canvas");
const axios = require("axios");

module.exports = async (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).send("Username is required.");
  }

  try {
    // solved.ac API로 사용자 데이터 가져오기
    const { data } = await axios.get(
      `https://solved.ac/api/v3/user/show?handle=${username}`
    );

    // 기본 통계값
    const solvedCount = data.solvedCount || 0;
    const tier = data.tier || 0;
    const rating = data.rating || 0;
    const rank = data.rank || 0;

    // 문제 유형별 통계 (solvedByLevel 배열이 없으면 임의 데이터 사용)
    let problemStats;
    if (data.solvedByLevel) {
      problemStats = [
        { name: "Bronze", value: data.solvedByLevel[0] || 0, color: "#CD7F32" },
        { name: "Silver", value: data.solvedByLevel[1] || 0, color: "#C0C0C0" },
        { name: "Gold", value: data.solvedByLevel[2] || 0, color: "#FFD700" },
        {
          name: "Platinum",
          value: data.solvedByLevel[3] || 0,
          color: "#E5E4E2",
        },
        {
          name: "Diamond",
          value: data.solvedByLevel[4] || 0,
          color: "#B9F2FF",
        },
        { name: "Ruby", value: data.solvedByLevel[5] || 0, color: "#E0115F" },
      ];
    } else {
      // fallback dummy data
      problemStats = [
        { name: "Bronze", value: 10, color: "#CD7F32" },
        { name: "Silver", value: 20, color: "#C0C0C0" },
        { name: "Gold", value: 30, color: "#FFD700" },
        { name: "Platinum", value: 25, color: "#E5E4E2" },
        { name: "Diamond", value: 10, color: "#B9F2FF" },
        { name: "Ruby", value: 5, color: "#E0115F" },
      ];
    }

    // 캔버스 설정 (GitHub 카드 스타일)
    const width = 450;
    const height = 220;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // 배경 색상 설정
    ctx.fillStyle = "#20232a";
    ctx.fillRect(0, 0, width, height);

    // 둥근 모서리 클리핑 함수
    function roundRect(ctx, x, y, width, height, radius) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(
        x + width,
        y + height,
        x + width - radius,
        y + height
      );
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }
    roundRect(ctx, 0, 0, width, height, 10);
    ctx.clip();

    // 텍스트 스타일 적용 (타이틀과 통계)
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px Arial";
    ctx.fillText(`Baekjoon Stats - ${username}`, 20, 35);

    ctx.font = "bold 16px Arial";
    ctx.fillText(`✔ Solved: ${solvedCount}`, 20, 70);
    ctx.fillText(`🏆 Rank: ${rank}`, 20, 95);
    ctx.fillText(`⭐ Tier: ${tier}`, 20, 120);
    ctx.fillText(`📊 Rating: ${rating}`, 20, 145);

    // 파이 차트 그리기 (오른쪽 하단)
    const chartX = width - 100;
    const chartY = height / 2;
    const chartRadius = 40;
    const totalProblems = problemStats.reduce((sum, p) => sum + p.value, 0);
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

    // 애니메이션 효과를 흉내내는 원형 외곽선 (실제 애니메이션은 불가능하므로, 움직이는 효과를 준 듯한 스타일)
    ctx.beginPath();
    ctx.arc(chartX, chartY, chartRadius + 5, 0, Math.PI * 2);
    ctx.strokeStyle = "#58A6FF";
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 10]);
    ctx.stroke();

    // 이미지 응답 전송 (PNG 형식)
    res.setHeader("Content-Type", "image/png");
    res.send(canvas.toBuffer("image/png"));
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching Baekjoon data.");
  }
};

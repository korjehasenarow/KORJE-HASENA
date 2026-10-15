// High-performance Canvas Charts for Bengali Dashboard

const DashboardCharts = {
  renderIncomeExpense(canvasId, incomeAmount, expenseAmount) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.parentElement.clientWidth || 340;
    const height = canvas.height = 200;

    ctx.clearRect(0, 0, width, height);

    const max = Math.max(incomeAmount, expenseAmount, 1000);
    const barWidth = 60;
    const gap = 50;
    const startX = (width - (barWidth * 2 + gap)) / 2;
    const baseY = height - 40;
    const availableHeight = height - 70;

    // Income Bar
    const incomeHeight = (incomeAmount / max) * availableHeight;
    const incY = baseY - incomeHeight;
    const incGrad = ctx.createLinearGradient(0, incY, 0, baseY);
    incGrad.addColorStop(0, '#075B3B');
    incGrad.addColorStop(1, '#0c9460');
    ctx.fillStyle = incGrad;
    ctx.beginPath();
    ctx.roundRect(startX, incY, barWidth, incomeHeight, [6, 6, 0, 0]);
    ctx.fill();

    // Income Labels
    ctx.fillStyle = '#1A2E26';
    ctx.font = 'bold 12px "Noto Sans Bengali", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('মোট অনুদান', startX + barWidth / 2, baseY + 20);
    ctx.fillText('৳' + bnNum(incomeAmount), startX + barWidth / 2, incY - 8);

    // Expense Bar
    const expX = startX + barWidth + gap;
    const expenseHeight = (expenseAmount / max) * availableHeight;
    const expY = baseY - expenseHeight;
    const expGrad = ctx.createLinearGradient(0, expY, 0, baseY);
    expGrad.addColorStop(0, '#C62828');
    expGrad.addColorStop(1, '#e55353');
    ctx.fillStyle = expGrad;
    ctx.beginPath();
    ctx.roundRect(expX, expY, barWidth, expenseHeight, [6, 6, 0, 0]);
    ctx.fill();

    // Expense Labels
    ctx.fillStyle = '#1A2E26';
    ctx.fillText('মোট ব্যয়', expX + barWidth / 2, baseY + 20);
    ctx.fillText('৳' + bnNum(expenseAmount), expX + barWidth / 2, expY - 8);

    // Baseline
    ctx.strokeStyle = '#D3E4DB';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(20, baseY);
    ctx.lineTo(width - 20, baseY);
    ctx.stroke();
  },

  renderDonationTrend(canvasId, dataPoints = []) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.parentElement.clientWidth || 340;
    const height = canvas.height = 200;

    ctx.clearRect(0, 0, width, height);

    // Default mock months if empty
    const points = dataPoints.length > 0 ? dataPoints : [
      { label: 'মে', val: 24000 },
      { label: 'জুন', val: 38000 },
      { label: 'জুলাই', val: 42000 },
      { label: 'আগস্ট', val: 31000 },
      { label: 'সেপ্টেম্বর', val: 49000 },
      { label: 'অক্টোবর', val: 62000 }
    ];

    const maxVal = Math.max(...points.map(p => p.val), 10000);
    const paddingX = 40;
    const baseY = height - 35;
    const usableH = height - 60;
    const stepX = (width - paddingX * 2) / (points.length - 1);

    // Draw grid lines
    ctx.strokeStyle = '#EBF3EE';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const y = baseY - (usableH / 3) * i;
      ctx.beginPath();
      ctx.moveTo(paddingX, y);
      ctx.lineTo(width - paddingX, y);
      ctx.stroke();
    }

    // Draw line & gradient area
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = paddingX + i * stepX;
      const y = baseY - (p.val / maxVal) * usableH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#D9B84C';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Area fill
    ctx.lineTo(paddingX + (points.length - 1) * stepX, baseY);
    ctx.lineTo(paddingX, baseY);
    ctx.closePath();
    const areaGrad = ctx.createLinearGradient(0, baseY - usableH, 0, baseY);
    areaGrad.addColorStop(0, 'rgba(217, 184, 76, 0.35)');
    areaGrad.addColorStop(1, 'rgba(217, 184, 76, 0.0)');
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // Draw dots and text
    points.forEach((p, i) => {
      const x = paddingX + i * stepX;
      const y = baseY - (p.val / maxVal) * usableH;

      ctx.fillStyle = '#075B3B';
      ctx.beginPath();
      ctx.arc(x, y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#52665D';
      ctx.font = '11px "Noto Sans Bengali", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, x, baseY + 18);
    });
  }
};

/**
 * FitPlus Stage 4C — Social Share Card Engine
 * Generates branded high-resolution Canvas cards for viral social sharing (Instagram Stories 9:16 and Posts 1:1).
 */

export type ShareCardAspect = 'story' | 'square';

export type ShareCardType = 'streak' | 'workout' | 'achievement';

export interface ShareCardData {
  type: ShareCardType;
  clientName: string;
  trainerName?: string;
  referralCode?: string;
  // Streak
  streakDays?: number;
  streakTitle?: string;
  // Workout
  workoutTitle?: string;
  totalSets?: number;
  totalVolumeKg?: number;
  durationMinutes?: number;
  // Achievement
  achievementTitle?: string;
  achievementDescription?: string;
}

export function renderShareCardToCanvas(
  canvas: HTMLCanvasElement,
  data: ShareCardData,
  aspect: ShareCardAspect = 'story',
): void {
  const width = aspect === 'story' ? 1080 : 1080;
  const height = aspect === 'story' ? 1920 : 1080;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 1. Dark sleek Apple Liquid Glass canvas background
  ctx.fillStyle = '#090B10';
  ctx.fillRect(0, 0, width, height);

  // 2. Ambient lighting orbs
  const grad1 = ctx.createRadialGradient(width * 0.5, height * 0.25, 50, width * 0.5, height * 0.25, width * 0.6);
  grad1.addColorStop(0, 'rgba(255, 128, 62, 0.25)');
  grad1.addColorStop(0.6, 'rgba(255, 68, 68, 0.08)');
  grad1.addColorStop(1, 'rgba(9, 11, 16, 0)');
  ctx.fillStyle = grad1;
  ctx.fillRect(0, 0, width, height);

  // Subtle bottom cool ambient light
  const grad2 = ctx.createRadialGradient(width * 0.8, height * 0.85, 30, width * 0.8, height * 0.85, width * 0.5);
  grad2.addColorStop(0, 'rgba(42, 63, 110, 0.2)');
  grad2.addColorStop(1, 'rgba(9, 11, 16, 0)');
  ctx.fillStyle = grad2;
  ctx.fillRect(0, 0, width, height);

  // 3. Central Glass Frame
  const marginX = aspect === 'story' ? 70 : 60;
  const marginY = aspect === 'story' ? 120 : 60;
  const cardW = width - marginX * 2;
  const cardH = height - marginY * 2;
  const cardRadius = 48;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(marginX, marginY, cardW, cardH, cardRadius);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.stroke();
  ctx.clip();

  // Glass card ambient highlight
  const glassHighlight = ctx.createLinearGradient(marginX, marginY, marginX + cardW, marginY + cardH);
  glassHighlight.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
  glassHighlight.addColorStop(0.3, 'rgba(255, 255, 255, 0.02)');
  glassHighlight.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
  ctx.fillStyle = glassHighlight;
  ctx.fillRect(marginX, marginY, cardW, cardH);
  ctx.restore();

  // 4. Header: FitPlus Logo & Pill
  const contentTop = marginY + (aspect === 'story' ? 90 : 70);
  ctx.textAlign = 'center';

  // Pill badge
  const pillY = contentTop;
  const pillW = 280;
  const pillH = 48;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(width / 2 - pillW / 2, pillY, pillW, pillH, 24);
  ctx.fillStyle = 'rgba(255, 128, 62, 0.15)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 128, 62, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = '600 20px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#FF9D5C';
  ctx.fillText('FITPLUS • VERIFIED COACHING', width / 2, pillY + 31);
  ctx.restore();

  // 5. Main Card Content based on type
  if (data.type === 'streak') {
    const centerY = aspect === 'story' ? height * 0.44 : height * 0.46;

    // Big Fire Emoji / Glow
    ctx.font = aspect === 'story' ? '140px sans-serif' : '100px sans-serif';
    ctx.fillText('🔥', width / 2, centerY - (aspect === 'story' ? 80 : 50));

    // Big Streak Number
    ctx.font = aspect === 'story' ? '900 130px system-ui, -apple-system, sans-serif' : '900 96px system-ui, -apple-system, sans-serif';
    const streakGradient = ctx.createLinearGradient(0, centerY, 0, centerY + 120);
    streakGradient.addColorStop(0, '#FFFFFF');
    streakGradient.addColorStop(1, '#FFB06B');
    ctx.fillStyle = streakGradient;
    ctx.fillText(`${data.streakDays || 1} DAYS`, width / 2, centerY + (aspect === 'story' ? 50 : 40));

    // Subtitle
    ctx.font = '600 32px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#E5E7EB';
    ctx.fillText('CONSISTENCY STREAK', width / 2, centerY + (aspect === 'story' ? 115 : 90));

    ctx.font = '400 24px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText('Every single workout, tracked & verified.', width / 2, centerY + (aspect === 'story' ? 165 : 130));
  } else if (data.type === 'workout') {
    const centerY = aspect === 'story' ? height * 0.42 : height * 0.44;

    ctx.font = aspect === 'story' ? '120px sans-serif' : '90px sans-serif';
    ctx.fillText('⚡', width / 2, centerY - (aspect === 'story' ? 80 : 40));

    ctx.font = aspect === 'story' ? '800 64px system-ui, -apple-system, sans-serif' : '800 52px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(data.workoutTitle || 'WORKOUT COMPLETED', width / 2, centerY + 10);

    // Stats Grid
    const statY = centerY + (aspect === 'story' ? 110 : 80);
    const boxW = 240;
    const boxH = 120;
    const gap = 30;
    const stats = [
      { label: 'SETS', val: `${data.totalSets || 12}` },
      { label: 'VOLUME', val: `${data.totalVolumeKg || 420} KG` },
      { label: 'TIME', val: `${data.durationMinutes || 45} MIN` },
    ];

    const totalStatsW = stats.length * boxW + (stats.length - 1) * gap;
    const startX = (width - totalStatsW) / 2;

    stats.forEach((s, idx) => {
      const bx = startX + idx * (boxW + gap);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(bx, statY, boxW, boxH, 20);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.stroke();

      ctx.font = '800 36px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#FF9D5C';
      ctx.fillText(s.val, bx + boxW / 2, statY + 54);

      ctx.font = '500 18px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#9CA3AF';
      ctx.fillText(s.label, bx + boxW / 2, statY + 92);
      ctx.restore();
    });
  } else {
    // Achievement
    const centerY = aspect === 'story' ? height * 0.44 : height * 0.46;

    ctx.font = aspect === 'story' ? '140px sans-serif' : '100px sans-serif';
    ctx.fillText('🏆', width / 2, centerY - (aspect === 'story' ? 80 : 50));

    ctx.font = aspect === 'story' ? '900 68px system-ui, -apple-system, sans-serif' : '900 54px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('MILESTONE UNLOCKED', width / 2, centerY + 20);

    ctx.font = '700 38px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#FFB06B';
    ctx.fillText(data.achievementTitle || 'Personal Best', width / 2, centerY + 80);

    ctx.font = '400 24px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText(data.achievementDescription || 'Stepping up every single day.', width / 2, centerY + 130);
  }

  // 6. Bottom Client & Coach Attribution
  const bottomBoxY = height - marginY - (aspect === 'story' ? 260 : 180);
  const bottomBoxH = aspect === 'story' ? 180 : 120;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(marginX + 40, bottomBoxY, cardW - 80, bottomBoxH, 24);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.stroke();

  ctx.textAlign = 'left';
  const textLeft = marginX + 80;

  // Athlete name
  ctx.font = '700 28px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(data.clientName, textLeft, bottomBoxY + (bottomBoxH === 180 ? 55 : 45));

  // Trainer attribution
  ctx.font = '500 20px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#A2A8B5';
  const coachText = data.trainerName ? `Coached by ${data.trainerName}` : 'FitPlus Personal Training';
  ctx.fillText(coachText, textLeft, bottomBoxY + (bottomBoxH === 180 ? 95 : 80));

  // Referral pill on the right
  if (data.referralCode) {
    ctx.textAlign = 'right';
    const pillRight = marginX + cardW - 80;
    ctx.font = '600 20px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#FF9D5C';
    ctx.fillText(`Code: ${data.referralCode}`, pillRight, bottomBoxY + (bottomBoxH === 180 ? 55 : 45));

    ctx.font = '400 16px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText('Get ₹500 off at fitplus.in', pillRight, bottomBoxY + (bottomBoxH === 180 ? 95 : 80));
  }

  ctx.restore();
}

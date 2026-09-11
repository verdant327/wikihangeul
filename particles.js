// Dynamic Water Balloon & Splash Particle FX Engine

class BattleFX {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.projectiles = [];
    this.particles = [];
    this.shockwaves = [];
    this.floatingTexts = [];
    this.animating = false;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.loop();
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  // Launch a water balloon from player to opponent (or vice versa)
  throwBalloon(fromPos, toPos, isCritical, damage, onHitCallback) {
    window.soundFX.playThrow();

    const duration = 650; // ms flight time
    const heightArc = Math.min(180, Math.abs(toPos.x - fromPos.x) * 0.35 + 80);

    const projectile = {
      startX: fromPos.x,
      startY: fromPos.y,
      targetX: toPos.x,
      targetY: toPos.y,
      heightArc,
      startTime: performance.now(),
      duration,
      isCritical,
      damage,
      onHitCallback,
      color: isCritical ? '#00e5ff' : '#00b0ff',
      tailParticles: []
    };

    this.projectiles.push(projectile);
  }

  // Create splash explosion at coordinates
  createSplash(x, y, isCritical, damage) {
    window.soundFX.playSplash(isCritical);

    // Screen Shake effect
    this.triggerScreenShake(isCritical ? 14 : 8);

    // 1. Water Shockwave Ripple
    this.shockwaves.push({
      x,
      y,
      radius: 10,
      maxRadius: isCritical ? 130 : 90,
      opacity: 0.9,
      color: isCritical ? 'rgba(0, 229, 255,' : 'rgba(56, 189, 248,'
    });

    // 2. 45 Water Droplets Explosion
    const dropletCount = isCritical ? 55 : 38;
    for (let i = 0; i < dropletCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (isCritical ? 14 : 10) + 3;
      const size = Math.random() * 6 + 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (Math.random() * 5 + 3), // bias upwards
        size,
        color: Math.random() > 0.3 ? '#38bdf8' : '#e0f2fe',
        alpha: 1,
        decay: Math.random() * 0.02 + 0.015,
        gravity: 0.38
      });
    }

    // 3. Floating Damage / Critical Text
    this.floatingTexts.push({
      x: x + (Math.random() * 40 - 20),
      y: y - 20,
      text: isCritical ? `⚡-${damage} 치명타!` : `💥-${damage} HP`,
      color: isCritical ? '#facc15' : '#ef4444',
      fontSize: isCritical ? 34 : 26,
      alpha: 1,
      vy: -2.2,
      scale: 1.4
    });
  }

  triggerScreenShake(intensity = 10) {
    const container = document.getElementById('game-arena') || document.body;
    container.classList.remove('screen-shake', 'screen-shake-intense');
    void container.offsetWidth; // trigger reflow
    container.classList.add(intensity > 10 ? 'screen-shake-intense' : 'screen-shake');
    setTimeout(() => {
      container.classList.remove('screen-shake', 'screen-shake-intense');
    }, 450);
  }

  loop() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const now = performance.now();

    // 1. Update & Draw Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const progress = Math.min(1, (now - p.startTime) / p.duration);

      // Parabolic Arc calculation
      const curX = p.startX + (p.targetX - p.startX) * progress;
      const linearY = p.startY + (p.targetY - p.startY) * progress;
      const arcY = -4 * p.heightArc * progress * (1 - progress);
      const curY = linearY + arcY;

      // Draw Water Balloon
      this.ctx.save();
      this.ctx.translate(curX, curY);

      // Slight rotation & liquid squish effect
      const squish = 1 + Math.sin(progress * Math.PI * 4) * 0.18;
      this.ctx.scale(squish, 2 - squish);

      // Water Balloon Body
      const grad = this.ctx.createRadialGradient(-4, -6, 2, 0, 0, 18);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, p.color);
      grad.addColorStop(1, '#0284c7');

      this.ctx.beginPath();
      this.ctx.arc(0, 0, 16, 0, Math.PI * 2);
      this.ctx.fillStyle = grad;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = p.isCritical ? 18 : 10;
      this.ctx.fill();

      // Balloon tie knot
      this.ctx.beginPath();
      this.ctx.ellipse(progress < 0.5 ? -15 : 15, 2, 4, 6, 0, 0, Math.PI * 2);
      this.ctx.fillStyle = '#0369a1';
      this.ctx.fill();

      this.ctx.restore();

      // Water droplet trail
      if (Math.random() > 0.2) {
        this.particles.push({
          x: curX,
          y: curY,
          vx: (Math.random() - 0.5) * 2,
          vy: Math.random() * 2,
          size: Math.random() * 4 + 2,
          color: '#7dd3fc',
          alpha: 0.8,
          decay: 0.05,
          gravity: 0.1
        });
      }

      if (progress >= 1) {
        // Hit!
        this.createSplash(p.targetX, p.targetY, p.isCritical, p.damage);
        if (p.onHitCallback) p.onHitCallback();
        this.projectiles.splice(i, 1);
      }
    }

    // 2. Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += (sw.maxRadius - sw.radius) * 0.18;
      sw.opacity -= 0.035;

      if (sw.opacity <= 0 || sw.radius >= sw.maxRadius - 2) {
        this.shockwaves.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `${sw.color}${sw.opacity})`;
      this.ctx.lineWidth = 5 * sw.opacity;
      this.ctx.stroke();
      this.ctx.restore();
    }

    // 3. Water Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += pt.gravity;
      pt.alpha -= pt.decay;

      if (pt.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = pt.alpha;
      this.ctx.fillStyle = pt.color;
      this.ctx.beginPath();
      this.ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // 4. Floating Damage Text
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.02;
      ft.scale = Math.max(1, ft.scale - 0.03);

      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = ft.alpha;
      this.ctx.font = `900 ${ft.fontSize * ft.scale}px 'Jua', 'Pretendard', sans-serif`;
      this.ctx.textAlign = 'center';

      // Outline
      this.ctx.lineWidth = 5;
      this.ctx.strokeStyle = '#000000';
      this.ctx.strokeText(ft.text, ft.x, ft.y);

      // Fill
      this.ctx.fillStyle = ft.color;
      this.ctx.fillText(ft.text, ft.x, ft.y);
      this.ctx.restore();
    }

    requestAnimationFrame(() => this.loop());
  }
}

window.BattleFX = BattleFX;

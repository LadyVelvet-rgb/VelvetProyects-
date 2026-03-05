const canvas = document.getElementById("bgCanvas");
const ctx = canvas.getContext("2d");

function resize(){
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);
resize();

const maxDist = 120;   // distancia máxima para conectar (px)
const lineWidth = 1;   // grosor de la línea

const particles = Array.from({ length: 70 }, () => ({
  x: Math.random() * window.innerWidth,
  y: Math.random() * window.innerHeight,
  r: 1 + Math.random() * 2,
  vx: (-0.4 + Math.random() * 0.8),
  vy: (-0.4 + Math.random() * 0.8),
}));

function animate(){
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  // fondo rojo transparente (sutil)
  ctx.fillStyle = "rgba(132, 4, 4, 0.20)";
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  // 1) mover partículas
  for (const p of particles){
    p.x += p.vx;
    p.y += p.vy;

    if (p.x < 0 || p.x > window.innerWidth) p.vx *= -1;
    if (p.y < 0 || p.y > window.innerHeight) p.vy *= -1;
  }

  // 2) líneas entre partículas cercanas (sin glow)
  ctx.shadowBlur = 0;
  ctx.lineWidth = lineWidth;

  for (let i = 0; i < particles.length; i++){
    for (let j = i + 1; j < particles.length; j++){
      const a = particles[i];
      const b = particles[j];

      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.hypot(dx, dy);

      if (dist < maxDist){
        const alpha = (1 - dist / maxDist) * 0.35;
        ctx.strokeStyle = `rgba(255, 59, 59, ${alpha})`;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  // 3) partículas con glow encima
  ctx.shadowBlur = 14;
  ctx.shadowColor = "rgba(255, 59, 59, 0.75)";
  ctx.fillStyle = "rgba(228, 54, 54, 0.85)";

  for (const p of particles){
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // reset
  ctx.shadowBlur = 0;

  requestAnimationFrame(animate);
}

animate();
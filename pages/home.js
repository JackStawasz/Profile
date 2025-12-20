let homeAnimationController = null;

function initHome() {
  if (homeAnimationController) {
    homeAnimationController.stop();
  }
  
  initTextRotation();
  initSkillsInteractivity();
  initResearchCard();

  const canvas = document.getElementById("fourierCanvas");
  if (!canvas) return;
  
  const ctx = canvas.getContext("2d");
  const path = document.getElementById("svgPath");
  if (!path) return;

  const controller = {
    isRunning: true,
    animationId: null,
    resizeTimeout: null,
    stop: function() {
      this.isRunning = false;
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout);
      }
    }
  };
  
  homeAnimationController = controller;

  let displayWidth, displayHeight, CENTER_X, CENTER_Y, signal, fourier;

  function setupCanvas() {
    const container = canvas.parentElement;
    displayWidth = container.offsetWidth;
    displayHeight = container.offsetHeight;
    
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    
    CENTER_X = displayWidth / 3;
    CENTER_Y = displayHeight / 2;

    const SAMPLE_COUNT = 600;
    signal = sampleSVG(path, SAMPLE_COUNT);
    const MAX_TERMS = 80;
    const half = Math.floor(MAX_TERMS / 2);
    fourier = dft(signal).filter(f =>
      f.freq <= half || f.freq >= signal.length - half
    );
  }

  setupCanvas();

  window.addEventListener('resize', () => {
    if (controller.resizeTimeout) {
      clearTimeout(controller.resizeTimeout);
    }
    controller.resizeTimeout = setTimeout(() => {
      if (controller.isRunning) {
        setupCanvas();
      }
    }, 250);
  });

  let time = 0;
  let trace = [];
  let dots = [];
  let dotTime = 0;
  let nextDotId = 0;

  function initDots() {
    const numDots = 20;
    for (let i = 0; i < numDots; i++) {
      dots.push(createDot(i * 0.5));
    }
  }

  function createDot(offset) {
    return {
      id: nextDotId++,
      spawnTime: dotTime - offset,
      phase: Math.random() * Math.PI * 2,
      speed: 0.65 + Math.random() * 0.1,
      trail: []
    };
  }

  initDots();

  function sampleSVG(path, N) {
    const len = path.getTotalLength();
    const pts = [];
    for (let i = 0; i < N; i++) {
      const p = path.getPointAtLength((i / N) * len);
      pts.push({ x: p.x, y: p.y });
    }
    const mx = pts.reduce((s, p) => s + p.x, 0) / N;
    const my = pts.reduce((s, p) => s + p.y, 0) / N;
    const SCALE_FACTOR = displayHeight / 11 * 0.6;
    return pts.map(p => ({ re: (p.x - mx) * SCALE_FACTOR, im: (p.y - my) * SCALE_FACTOR }));
  }

  function dft(signal) {
    const X = [];
    const N = signal.length;
    for (let k = 0; k < N; k++) {
      let re = 0, im = 0;
      for (let n = 0; n < N; n++) {
        const phi = (2 * Math.PI * k * n) / N;
        re += signal[n].re * Math.cos(phi) + signal[n].im * Math.sin(phi);
        im += -signal[n].re * Math.sin(phi) + signal[n].im * Math.cos(phi);
      }
      re /= N;
      im /= N;
      X.push({
        freq: k,
        amp: Math.hypot(re, im),
        phase: Math.atan2(im, re)
      });
    }
    return X.sort((a, b) => b.amp - a.amp);
  }

  function drawEpicycles(x, y, fourier, signal) {
    for (const f of fourier) {
      const px = x;
      const py = y;
      const k = (f.freq > signal.length / 2) ? f.freq - signal.length : f.freq;
      const angle = k * time + f.phase;
      x += f.amp * Math.cos(angle);
      y += f.amp * Math.sin(angle);
      
      ctx.strokeStyle = "#fff";
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    return { x, y };
  }

  const DURATION = 9;
  const dt = (2 * Math.PI) / (DURATION * 60);
  const MAX_TRACE_POINTS = 1000;

  let isSettled = false;
  const SETTLE_TIME = 1;
  let settleCounter = 0;

  function animate() {
    if (!controller.isRunning) return;

    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    const positions = [];
    let groupCenterY = 0;
    const dotsToRemove = [];
    
    for (let i = 0; i < dots.length; i++) {
      const dot = dots[i];
      const t = (dotTime - dot.spawnTime) * dot.speed;
      const x = -50 + (t * (displayWidth + 100) / 10);
      
      if (x > displayWidth + 100) {
        dotsToRemove.push(i);
        continue;
      }
      
      if (x < displayWidth + 50) {
        const progress = ((x + 50) / (displayWidth + 100));
        const bandCenterY = displayHeight * 0.725 + Math.sin((1 - progress) * Math.PI * 2) * (displayHeight * 0.1);
        const swoosh1 = Math.sin((dotTime - dot.spawnTime) * 1.5 + dot.phase) * (displayHeight * 0.085);
        const swoosh2 = Math.sin((dotTime - dot.spawnTime) * 0.8 + dot.phase * 1.3) * (displayHeight * 0.06);
        let y = bandCenterY + swoosh1 + swoosh2;
        positions.push({ x, y, index: i });
        groupCenterY += y;
      }
    }
    
    for (let i = dotsToRemove.length - 1; i >= 0; i--) {
      dots.splice(dotsToRemove[i], 1);
      dots.push(createDot(0));
    }
    
    groupCenterY = positions.length > 0 ? groupCenterY / positions.length : displayHeight * 0.725;
    
    for (let i = 0; i < positions.length; i++) {
      const posData = positions[i];
      const dot = dots[posData.index];
      let pos = { x: posData.x, y: posData.y };
      
      pos.y = pos.y + (groupCenterY - pos.y) * 0.125;
      
      dot.trail.push({ x: pos.x, y: pos.y });
      if (dot.trail.length > 20) dot.trail.shift();
      
      if (dot.trail.length > 1) {
        for (let j = 0; j < dot.trail.length - 1; j++) {
          const fadeProgress = j / (dot.trail.length - 1);
          const alpha = fadeProgress * 0.85;
          const size = 1.5 + fadeProgress * 2.5;
          const glowSize = 20 * fadeProgress;
          
          ctx.shadowBlur = glowSize;
          ctx.shadowColor = `rgba(100, 150, 255, ${alpha * 0.8})`;
          ctx.fillStyle = `rgba(120, 170, 255, ${alpha})`;
          ctx.beginPath();
          ctx.arc(dot.trail[j].x, dot.trail[j].y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      ctx.shadowBlur = 25;
      ctx.shadowColor = "rgba(100, 150, 255, 1)";
      ctx.fillStyle = "rgba(150, 200, 255, 1)";
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.shadowBlur = 0;

    const v = drawEpicycles(CENTER_X, CENTER_Y, fourier, signal);
    
    if (!isSettled) {
      settleCounter++;
      if (settleCounter >= SETTLE_TIME * 60) {
        isSettled = true;
        time = 0;
        trace = [];
      }
    } else {
      trace.push(v);
      if (trace.length > MAX_TRACE_POINTS) trace.shift();
    }

    if (trace.length > 1) {
      ctx.lineWidth = 2;
      let prev = null;
      let currentPath = [];
      
      for (let i = 0; i < trace.length; i++) {
        const p = trace[i];
        if (prev) {
          const dx = p.x - prev.x;
          const dy = p.y - prev.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 30) {
            currentPath.push(p);
          } else {
            if (currentPath.length > 1) drawPathWithGlow(currentPath);
            currentPath = [p];
          }
        } else {
          currentPath = [p];
        }
        prev = p;
      }
      if (currentPath.length > 1) drawPathWithGlow(currentPath);
    }

    function drawPathWithGlow(pathPoints) {
      for (let i = 1; i < pathPoints.length; i++) {
        const age = trace.length - trace.indexOf(pathPoints[i]);
        const fadeFactor = Math.max(0, 1 - (age / trace.length));
        const enhancedFade = Math.pow(fadeFactor, 1.2);
        const brightness = 40 + (205 * enhancedFade);
        const alpha = 0.3 + (0.7 * enhancedFade);
        
        if (enhancedFade > 0.5) {
          ctx.shadowBlur = 15 * enhancedFade;
          ctx.shadowColor = `rgb(0, ${brightness}, 0)`;
        } else {
          ctx.shadowBlur = 0;
        }
        
        ctx.strokeStyle = `rgba(0, ${brightness}, 0, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(pathPoints[i-1].x, pathPoints[i-1].y);
        ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }

    time += dt;
    dotTime += dt;

    if (time >= 2 * Math.PI) {
      time = time % (2 * Math.PI);
    }

    controller.animationId = requestAnimationFrame(animate);
  }

  animate();
}

function cleanupHome() {
  if (homeAnimationController) {
    homeAnimationController.stop();
    homeAnimationController = null;
  }
}

function initTextRotation() {
  const textElement = document.getElementById("welcome-text");
  if (!textElement) return;
  
  const messages = [
    "My name is Jack Stawasz",
    "I am a Physicist",
    "I research neutrinos",
    "I code software",
    "I am a W&M student"
  ];
  
  let currentIndex = 0;
  let isTyping = false;
  
  function typeText(text, callback) {
    if (isTyping) return;
    isTyping = true;
    
    let charIndex = 0;
    textElement.textContent = '';
    
    const typingInterval = setInterval(() => {
      if (charIndex < text.length) {
        textElement.textContent += text[charIndex];
        charIndex++;
      } else {
        clearInterval(typingInterval);
        isTyping = false;
        setTimeout(callback, 1000);
      }
    }, 80);
  }
  
  function deleteText(callback) {
    if (isTyping) return;
    isTyping = true;
    
    const text = textElement.textContent;
    let charIndex = text.length;
    
    const deletingInterval = setInterval(() => {
      if (charIndex > 0) {
        textElement.textContent = text.substring(0, charIndex - 1);
        charIndex--;
      } else {
        clearInterval(deletingInterval);
        isTyping = false;
        setTimeout(callback, 500);
      }
    }, 40);
  }
  
  function cycleMessages() {
    const currentMessage = messages[currentIndex];
    
    typeText(currentMessage, () => {
      deleteText(() => {
        currentIndex = (currentIndex + 1) % messages.length;
        cycleMessages();
      });
    });
  }
  
  cycleMessages();
}

function initSkillsInteractivity() {
  const skillCategories = document.querySelectorAll('.skills-grid > div');
  
  skillCategories.forEach((category, index) => {
    category.classList.add('skill-category');
    
    category.style.animationDelay = `${index * 0.1}s`;
    
    const h3 = category.querySelector('h3');
    if (h3) {
      const icons = {
        'Physics': '⚛️',
        'Math': '∑',
        'Programming': '💻',
        'Tools': '🔧'
      };
      const icon = icons[h3.textContent.trim()];
      if (icon) {
        h3.innerHTML = `<span class="skill-icon">${icon}</span>${h3.textContent}`;
      }
    }
  });
}

function initResearchCard() {
  const researchCard = document.querySelector('.card');
  if (!researchCard) return;
  
  let particles = [];
  const canvas = document.createElement('canvas');
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.opacity = '0';
  canvas.style.transition = 'opacity 0.3s ease';
  researchCard.appendChild(canvas);
  
  const ctx = canvas.getContext('2d');
  let animationId = null;
  
  function resize() {
    canvas.width = researchCard.offsetWidth;
    canvas.height = researchCard.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);
  
  researchCard.addEventListener('mouseenter', () => {
    canvas.style.opacity = '1';
    particles = [];
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1
      });
    }
    animate();
  });
  
  researchCard.addEventListener('mouseleave', () => {
    canvas.style.opacity = '0';
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  });
  
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      
      ctx.fillStyle = 'rgba(125, 211, 252, 0.6)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 100) {
          ctx.strokeStyle = `rgba(125, 211, 252, ${0.2 * (1 - dist / 100)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
    
    animationId = requestAnimationFrame(animate);
  }
}
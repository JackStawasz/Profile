// Global references
let homeAnimationController = null;

function initHome() {
  // If animation is already running, stop it first
  if (homeAnimationController) {
    homeAnimationController.stop();
  }
  
  // Initialize components
  initTextRotation();

  const canvas = document.getElementById("fourierCanvas");
  if (!canvas) return;
  
  const ctx = canvas.getContext("2d");
  const path = document.getElementById("svgPath");
  if (!path) return;

  // Create controller object to manage animation lifecycle
  const controller = {
    isRunning: true,
    animationId: null,
    stop: function() {
      this.isRunning = false;
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    }
  };
  
  homeAnimationController = controller;

  // Get actual display size
  const displayWidth = canvas.offsetWidth;
  const displayHeight = canvas.offsetHeight;
  
  // Set internal canvas size to fixed dimensions for consistent rendering
  const INTERNAL_WIDTH = 500;
  const INTERNAL_HEIGHT = 300;
  canvas.width = INTERNAL_WIDTH;
  canvas.height = INTERNAL_HEIGHT;
  
  // Calculate scale factor for positioning elements across the stretched canvas
  const scaleX = displayWidth / INTERNAL_WIDTH;

  const SAMPLE_COUNT = 600;
  const CENTER_X = INTERNAL_WIDTH / 3;
  const CENTER_Y = INTERNAL_HEIGHT / 2;

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
    const SCALE = INTERNAL_HEIGHT / 11 * 0.6;
    return pts.map(p => ({ re: (p.x - mx) * SCALE, im: (p.y - my) * SCALE }));
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

  const MAX_TERMS = 80;
  const signal = sampleSVG(path, SAMPLE_COUNT);
  const half = Math.floor(MAX_TERMS / 2);
  const fourier = dft(signal).filter(f =>
    f.freq <= half || f.freq >= signal.length - half
  );

  const DURATION = 9;
  const dt = (2 * Math.PI) / (DURATION * 60);
  const MAX_TRACE_POINTS = 1000;

  let isSettled = false;
  const SETTLE_TIME = 1;
  let settleCounter = 0;

  function animate() {
    // Check if animation should stop
    if (!controller.isRunning) return;

    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);

    // Particle logic
    const positions = [];
    let groupCenterY = 0;
    const dotsToRemove = [];
    
    for (let i = 0; i < dots.length; i++) {
      const dot = dots[i];
      const t = (dotTime - dot.spawnTime) * dot.speed;
      const x = -50 + (t * (canvas.width + 100) / 10);
      
      if (x > canvas.width + 100) {
        dotsToRemove.push(i);
        continue;
      }
      
      if (x < canvas.width + 50) {
        const progress = ((x + 50) / (canvas.width + 100));
        const bandCenterY = canvas.height * 0.725 + Math.sin((1 - progress) * Math.PI * 2) * (canvas.height * 0.1);
        const swoosh1 = Math.sin((dotTime - dot.spawnTime) * 1.5 + dot.phase) * (canvas.height * 0.085);
        const swoosh2 = Math.sin((dotTime - dot.spawnTime) * 0.8 + dot.phase * 1.3) * (canvas.height * 0.06);
        let y = bandCenterY + swoosh1 + swoosh2;
        positions.push({ x, y, index: i });
        groupCenterY += y;
      }
    }
    
    for (let i = dotsToRemove.length - 1; i >= 0; i--) {
      dots.splice(dotsToRemove[i], 1);
      dots.push(createDot(0));
    }
    
    groupCenterY = positions.length > 0 ? groupCenterY / positions.length : canvas.height * 0.725;
    
    // Draw particles with flocking
    for (let i = 0; i < positions.length; i++) {
      const posData = positions[i];
      const dot = dots[posData.index];
      let pos = { x: posData.x, y: posData.y };
      
      pos.y = pos.y + (groupCenterY - pos.y) * 0.125;
      
      dot.trail.push({ x: pos.x, y: pos.y });
      if (dot.trail.length > 20) dot.trail.shift();
      
      // Draw trail
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
      
      // Draw main dot
      ctx.shadowBlur = 25;
      ctx.shadowColor = "rgba(100, 150, 255, 1)";
      ctx.fillStyle = "rgba(150, 200, 255, 1)";
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.shadowBlur = 0;

    // Epicycles
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

    // Draw trace path
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

    // Store the animation frame ID for cleanup
    controller.animationId = requestAnimationFrame(animate);
  }

  animate();
}

// Optional: Stop animation when navigating away
function cleanupHome() {
  if (homeAnimationController) {
    homeAnimationController.stop();
    homeAnimationController = null;
  }
}

// Text rotation functionality
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
        // Wait 1 second before starting to delete
        setTimeout(callback, 1000);
      }
    }, 80); // 80ms per character when typing
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
        // Wait 500ms before typing next message
        setTimeout(callback, 500);
      }
    }, 40); // 40ms per character when deleting (2x faster)
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
  
  // Start the cycle
  cycleMessages();
}
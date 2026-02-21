let homeAnimationController = null;
let skillsData = null;

async function loadSkillsData() {
  try {
    const response = await fetch('data/skills/skills.json');
    if (!response.ok) throw new Error('Failed to load skills data');
    skillsData = await response.json();
    console.log('Skills data loaded successfully:', Object.keys(skillsData));
    console.log('Physics skills count:', skillsData.physics?.length);
    console.log('Math skills count:', skillsData.math?.length);
    console.log('Programming skills count:', skillsData.programming?.length);
    console.log('Tools skills count:', skillsData.tools?.length);
  } catch (error) {
    console.error('Error loading skills:', error);
    skillsData = null;
  }
}

async function initHome() {
  if (homeAnimationController) {
    homeAnimationController.stop();
  }
  
  // Load skills data first
  await loadSkillsData();
  
  initTextRotation();
  initSkillsCarousel();
  initResearchCard();
  initTestimonials();

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
    const MAX_TERMS = 800;
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
        // Clear user drawn paths since their coordinates are invalid after resize
        userDrawnPaths = [];
      }
    }, 250);
  });

  let time = 0;
  let trace = [];
  let dots = [];
  let dotTime = 0;
  let nextDotId = 0;

  function initDots() {
    const numDots = 15;
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
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    return { x, y };
  }

  const DURATION = 5;
  const dt = (2 * Math.PI) / (DURATION * 60);
  const MAX_TRACE_POINTS = 300; // Reduced from 500

  let isSettled = false;
  const SETTLE_TIME = 1;
  let settleCounter = 0;

  let userDrawing = false;
  let userTrace = [];
  let userDrawnPaths = [];

  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    userDrawing = true;
    userTrace = [{ x, y, time: Date.now() }];
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!userDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    userTrace.push({ x, y, time: Date.now() });
  });

  canvas.addEventListener('mouseup', (e) => {
    if (e.button !== 0) return;
    if (userDrawing && userTrace.length > 1) {
      userDrawnPaths.push({
        points: [...userTrace],
        startTime: Date.now()
      });
    }
    userDrawing = false;
    userTrace = [];
  });

  canvas.addEventListener('mouseleave', () => {
    if (userDrawing && userTrace.length > 1) {
      userDrawnPaths.push({
        points: [...userTrace],
        startTime: Date.now()
      });
    }
    userDrawing = false;
    userTrace = [];
  });

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

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
      const dotAlpha = 0.5;
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
          ctx.shadowColor = `rgba(100, 150, 255, ${0.6 * alpha * dotAlpha})`;
          ctx.fillStyle = `rgba(120, 170, 255, ${alpha * dotAlpha})`;
          ctx.beginPath();
          ctx.arc(dot.trail[j].x, dot.trail[j].y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      ctx.shadowBlur = 25;
      ctx.shadowColor = `rgba(100, 150, 255, ${dotAlpha}))`;
      ctx.fillStyle = `rgba(150, 200, 255, ${dotAlpha})`;
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
      ctx.lineWidth = 2.5;
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

    if (userTrace.length > 1) {
      ctx.lineWidth = 2;
      drawActivePath(userTrace);
    }

    const currentTime = Date.now();
    const fadeTime = 2000;
    userDrawnPaths = userDrawnPaths.filter(path => {
      const elapsed = currentTime - path.startTime;
      if (elapsed > fadeTime) return false;
      ctx.lineWidth = 2;
      drawUserPath(path.points, elapsed, fadeTime);
      return true;
    });

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

    function drawActivePath(pathPoints) {
      for (let i = 1; i < pathPoints.length; i++) {
        const brightness = 245;
        const alpha = 1.0;
        
        ctx.shadowBlur = 15;
        ctx.shadowColor = `rgb(0, ${brightness}, 0)`;
        ctx.strokeStyle = `rgba(0, ${brightness}, 0, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(pathPoints[i-1].x, pathPoints[i-1].y);
        ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }

    function drawUserPath(pathPoints, elapsed, fadeTime) {
      const fadeFactor = Math.max(0, 1 - (elapsed / fadeTime));
      const enhancedFade = Math.pow(fadeFactor, 1.2);
      const brightness = 40 + (205 * enhancedFade);
      const alpha = 0.3 + (0.7 * enhancedFade);
      
      for (let i = 1; i < pathPoints.length; i++) {
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

function initSkillsCarousel() {
  const skillsCard = document.querySelector('.skills-card');
  const track = document.getElementById('skillsTrack');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const bookmarks = document.querySelectorAll('.category-bookmark');
  
  if (!track || !prevBtn || !nextBtn || !skillsCard) {
    console.error('Carousel elements not found');
    return;
  }
  
  if (!skillsData) {
    console.error('Skills data not loaded');
    track.innerHTML = '<div class="skill-slide"><div class="skill-description">Error loading skills data. Please check that ../data/skills/skills.json exists.</div></div>';
    return;
  }
  
  console.log('Initializing carousel with data:', skillsData);
  
  // Create carousel wrapper
  const carouselWrapper = document.createElement('div');
  carouselWrapper.className = 'carousel-wrapper';
  
  // Move carousel container into wrapper
  const carouselContainer = document.querySelector('.carousel-container');
  if (carouselContainer) {
    carouselContainer.remove();
  }
  
  // Create new carousel container
  const newCarouselContainer = document.createElement('div');
  newCarouselContainer.className = 'carousel-container';
  newCarouselContainer.appendChild(track);
  
  carouselWrapper.appendChild(newCarouselContainer);
  
  // Insert wrapper after category bookmarks
  const bookmarksContainer = document.querySelector('.category-bookmarks');
  bookmarksContainer.parentNode.insertBefore(carouselWrapper, bookmarksContainer.nextSibling);
  
  let currentCategory = 'physics';
  let currentSlide = 0;
  let allSkills = [];
  let slideWidth = 0;
  let slidesPerView = 1;
  let isTransitioning = false;
  
  // Flatten all skills into one continuous array with category info
  let flattenedSkills = [];
  let categoryRanges = {};
  
  function buildFlattenedSkills() {
    flattenedSkills = [];
    categoryRanges = {};
    let currentIndex = 0;
    
    const categories = ['physics', 'math', 'programming', 'tools'];
    categories.forEach(cat => {
      const skills = skillsData[cat];
      if (skills && Array.isArray(skills)) {
        categoryRanges[cat] = {
          start: currentIndex,
          end: currentIndex + skills.length - 1
        };
        skills.forEach(skill => {
          flattenedSkills.push({
            ...skill,
            category: cat
          });
        });
        currentIndex += skills.length;
      }
    });
  }
  
  function updateCarouselWidth() {
    const viewportWidth = window.innerWidth;
    
    // Determine slides per view based on viewport
    if (viewportWidth >= 1200) {
      slidesPerView = 3;
    } else if (viewportWidth >= 768) {
      slidesPerView = 2;
    } else {
      slidesPerView = 1;
    }
    
    slideWidth = viewportWidth / slidesPerView;
  }
  
  function createSlide(skill) {
    const slide = document.createElement('div');
    slide.className = 'skill-slide';
    
    const imageName = skill.name.toLowerCase().replace(/\s+/g, '_').replace(/\//g, '_');
    const imagePath = `data/skills/${imageName}.png`;
    
    // Use loading="lazy" for images and simpler fallback
    slide.innerHTML = `
      <img src="${imagePath}" alt="${skill.name}" class="skill-image" loading="lazy" onerror="this.remove()">
      <div class="skill-icon-large">${skill.icon}</div>
      <div class="skill-name">${skill.icon} ${skill.name}</div>
      <div class="skill-description">${skill.description}</div>
    `;
    return slide;
  }
  
  function renderCarousel(category) {
    if (!flattenedSkills.length) {
      buildFlattenedSkills();
    }
    
    if (!flattenedSkills.length) {
      console.error('No skills found');
      track.innerHTML = '<div class="skill-slide"><div class="skill-description">No skills found.</div></div>';
      return;
    }
    
    // Update dimensions first before calculating positions
    updateCarouselWidth();
    
    // Find starting position for this category
    const catRange = categoryRanges[category];
    if (catRange) {
      // Start at first slide of category (accounting for prepended clones)
      currentSlide = catRange.start + slidesPerView;
    } else {
      currentSlide = slidesPerView;
    }
    
    allSkills = flattenedSkills;
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    // Clone last few slides and prepend (for wrapping left)
    for (let i = flattenedSkills.length - slidesPerView; i < flattenedSkills.length; i++) {
      const slide = createSlide(flattenedSkills[i]);
      slide.classList.add('clone');
      fragment.appendChild(slide);
    }
    
    // Add all real slides
    flattenedSkills.forEach((skill) => {
      const slide = createSlide(skill);
      fragment.appendChild(slide);
    });
    
    // Clone first few slides and append (for wrapping right)
    for (let i = 0; i < slidesPerView; i++) {
      const slide = createSlide(flattenedSkills[i]);
      slide.classList.add('clone');
      fragment.appendChild(slide);
    }
    
    // Clear track and append fragment in one operation
    track.innerHTML = '';
    track.appendChild(fragment);
    
    // Set initial position without transition
    track.style.transition = 'none';
    track.style.transform = `translateX(${-currentSlide * slideWidth}px)`;
    
    // Double rAF: ensures no-transition paint is committed before re-enabling
    requestAnimationFrame(() => requestAnimationFrame(() => {
      track.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
      updateActiveCategory();
    }));
  }
  
  function updateActiveCategory() {
    // Determine which category is currently showing based on leftmost visible slide
    const realIndex = ((currentSlide - slidesPerView) % flattenedSkills.length + flattenedSkills.length) % flattenedSkills.length;
    const currentSkill = flattenedSkills[realIndex];
    
    if (currentSkill && currentSkill.category !== currentCategory) {
      currentCategory = currentSkill.category;
      
      // Update bookmark highlights
      bookmarks.forEach(b => {
        b.classList.toggle('active', b.dataset.category === currentCategory);
      });
    }
  }
  
  function updateCarousel() {
    updateCarouselWidth();
    const offset = -currentSlide * slideWidth;
    track.style.transform = `translateX(${offset}px)`;
  }
  
  let transitionTimeout = null;

  function finishTransition() {
    if (transitionTimeout) { clearTimeout(transitionTimeout); transitionTimeout = null; }
    isTransitioning = false;

    // Check if we're at a clone and need to jump to real position
    if (currentSlide < slidesPerView) {
      track.style.transition = 'none';
      currentSlide = flattenedSkills.length + currentSlide;
      track.style.transform = `translateX(${-currentSlide * slideWidth}px)`;
      // Double rAF: first frame commits the no-transition paint, second re-enables
      requestAnimationFrame(() => requestAnimationFrame(() => {
        track.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        updateActiveCategory();
      }));
    } else if (currentSlide >= flattenedSkills.length + slidesPerView) {
      track.style.transition = 'none';
      currentSlide = currentSlide - flattenedSkills.length;
      track.style.transform = `translateX(${-currentSlide * slideWidth}px)`;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        track.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        updateActiveCategory();
      }));
    } else {
      updateActiveCategory();
    }
  }

  track.addEventListener('transitionend', finishTransition);
  
  // Event listeners
  prevBtn.addEventListener('click', () => {
    if (isTransitioning) return;
    isTransitioning = true;
    currentSlide--;
    updateCarousel();
    transitionTimeout = setTimeout(finishTransition, 600);
  });
  
  nextBtn.addEventListener('click', () => {
    if (isTransitioning) return;
    isTransitioning = true;
    currentSlide++;
    updateCarousel();
    transitionTimeout = setTimeout(finishTransition, 600);
  });
  
  bookmarks.forEach(bookmark => {
    bookmark.addEventListener('click', () => {
      const targetCategory = bookmark.dataset.category;
      if (targetCategory === currentCategory) return;
      
      // Jump to the start of the clicked category
      const catRange = categoryRanges[targetCategory];
      if (catRange) {
        isTransitioning = true;
        currentSlide = catRange.start + slidesPerView; // Account for clones
        currentCategory = targetCategory;
        
        bookmarks.forEach(b => b.classList.remove('active'));
        bookmark.classList.add('active');
        
        updateCarousel();
        transitionTimeout = setTimeout(finishTransition, 600);
      }
    });
  });
  
  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      if (isTransitioning) return;
      isTransitioning = true;
      currentSlide--;
      updateCarousel();
      transitionTimeout = setTimeout(finishTransition, 600);
    } else if (e.key === 'ArrowRight') {
      if (isTransitioning) return;
      isTransitioning = true;
      currentSlide++;
      updateCarousel();
      transitionTimeout = setTimeout(finishTransition, 600);
    }
  });
  
  // Touch support
  let touchStartX = 0;
  let touchEndX = 0;
  
  track.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });
  
  track.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  });
  
  function handleSwipe() {
    if (touchStartX - touchEndX > 50) {
      // Swipe left - go forward
      if (isTransitioning) return;
      isTransitioning = true;
      currentSlide++;
      updateCarousel();
      transitionTimeout = setTimeout(finishTransition, 600);
    } else if (touchEndX - touchStartX > 50) {
      // Swipe right - go back
      if (isTransitioning) return;
      isTransitioning = true;
      currentSlide--;
      updateCarousel();
      transitionTimeout = setTimeout(finishTransition, 600);
    }
  }
  
  // Window resize handler
  window.addEventListener('resize', () => {
    updateCarousel();
  });
  
  // Initialize with physics category
  renderCarousel('physics');
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
// ─── Testimonials ────────────────────────────────────────────
async function initTestimonials() {
  const section  = document.getElementById('testimonials-section');
  const track    = document.getElementById('testimonials-track');
  const scrubber = document.getElementById('testimonials-scrubber');
  const pauseBtn = document.getElementById('testimonials-pause');
  if (!section || !track || !scrubber || !pauseBtn) return;

  // ── Load data ───────────────────────────────────────────────
  let testimonials = [];
  try {
    const res = await fetch('data/testimonials.json');
    if (!res.ok) throw new Error('Not found');
    testimonials = await res.json();
  } catch {
    track.innerHTML = '<div style="padding:1rem;color:var(--muted);text-align:center;">No testimonials found.</div>';
    section.classList.add('static');
    return;
  }
  if (!testimonials.length) {
    section.classList.add('static');
    return;
  }

  // ── Helpers ─────────────────────────────────────────────────
  function initials(name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  function makeCard(t) {
    const card = document.createElement('div');
    card.className = 'testimonial-card';
    card.innerHTML = `
      <div class="testimonial-quote">${t.quote}</div>
      <div class="testimonial-footer">
        <div class="testimonial-avatar">${initials(t.name)}</div>
        <div class="testimonial-meta">
          <div class="testimonial-name">${t.name}</div>
          <div class="testimonial-title">${t.title}</div>
          ${t.organization ? `<div class="testimonial-org">${t.organization}</div>` : ''}
        </div>
      </div>`;
    return card;
  }

  // ── Render one real set ──────────────────────────────────────
  testimonials.forEach(t => track.appendChild(makeCard(t)));

  // Wait two frames for layout to settle
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  // ── Measure ──────────────────────────────────────────────────
  const GAP = 20; // 1.25rem at 16px
  function measureOneSet() {
    const cards = track.querySelectorAll('.testimonial-card');
    let w = 0;
    // Only sum the first real set (testimonials.length cards)
    for (let i = 0; i < testimonials.length; i++) {
      w += cards[i].getBoundingClientRect().width + GAP;
    }
    return w;
  }

  let oneSetW = measureOneSet();
  const viewW = window.innerWidth;

  // ── Static mode: cards fit on screen ────────────────────────
  if (oneSetW <= viewW) {
    section.classList.add('static');
    return; // nothing more to do — no scroll, no controls
  }

  // ── Scroll mode: append one clone set as seamless tail ───────
  // We only need one extra copy: when we've scrolled oneSetW px the
  // tail (which is identical to the head) is now on screen and we
  // silently jump offset back to 0.
  testimonials.forEach(t => {
    const clone = makeCard(t);
    clone.classList.add('t-clone');
    track.appendChild(clone);
  });

  // ── State ────────────────────────────────────────────────────
  let offset   = 0;
  let paused   = false;
  let scrubbing = false;
  const SPEED  = 0.6; // px/frame ≈ 36 px/s at 60 fps

  function applyOffset(px) {
    track.style.transform = `translateX(${-px}px)`;
  }

  function syncScrubber() {
    const v = Math.round((offset / oneSetW) * 1000);
    scrubber.value = v;
    scrubber.style.setProperty('--scrub', (v / 10) + '%');
  }

  function setPauseIcon() {
    pauseBtn.innerHTML = paused ? '&#9654;' : '&#10074;&#10074;';
  }
  setPauseIcon();

  // ── Animation loop ──────────────────────────────────────────
  function tick() {
    requestAnimationFrame(tick);
    if (paused || scrubbing) return;

    offset += SPEED;
    if (offset >= oneSetW) offset -= oneSetW; // seamless wrap

    applyOffset(offset);
    syncScrubber();
  }
  requestAnimationFrame(tick);

  // ── Pause button ─────────────────────────────────────────────
  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    setPauseIcon();
  });

  // ── Scrubber ─────────────────────────────────────────────────
  scrubber.addEventListener('mousedown',  () => { scrubbing = true; paused = true; setPauseIcon(); });
  scrubber.addEventListener('touchstart', () => { scrubbing = true; paused = true; setPauseIcon(); }, { passive: true });
  scrubber.addEventListener('mouseup',    () => { scrubbing = false; });
  scrubber.addEventListener('touchend',   () => { scrubbing = false; });

  scrubber.addEventListener('input', () => {
    offset = (Number(scrubber.value) / 1000) * oneSetW;
    applyOffset(offset);
    scrubber.style.setProperty('--scrub', (Number(scrubber.value) / 10) + '%');
  });

  // ── Pointer drag on track ────────────────────────────────────
  let isDragging = false, dragStartX = 0, dragStartOffset = 0;

  track.style.pointerEvents = 'auto';

  track.addEventListener('pointerdown', (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartOffset = offset;
    track.classList.add('grabbing');
    track.setPointerCapture(e.pointerId);
    scrubbing = true;
    paused = true;
    setPauseIcon();
  });

  track.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const delta = dragStartX - e.clientX;
    offset = ((dragStartOffset + delta) % oneSetW + oneSetW) % oneSetW;
    applyOffset(offset);
    syncScrubber();
  });

  const endDrag = () => {
    isDragging = false;
    scrubbing = false;
    track.classList.remove('grabbing');
  };
  track.addEventListener('pointerup',     endDrag);
  track.addEventListener('pointercancel', endDrag);

  // ── Resize ───────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    oneSetW = measureOneSet();
    // Re-check if we now fit statically (e.g. window grew)
    if (oneSetW <= window.innerWidth && !section.classList.contains('static')) {
      section.classList.add('static');
    }
  });
}
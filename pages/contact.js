function initContacts() {
  document.querySelectorAll('.social-links svg').forEach(svg => {
    const path = svg.querySelector('path');
    if (!path) return;

    const bbox = path.getBBox();
    const containerSize = 32;
    const scale = Math.min(containerSize / bbox.width, containerSize / bbox.height);

    const offsetX = (containerSize - bbox.width * scale) / 2 - bbox.x * scale;
    const offsetY = (containerSize - bbox.height * scale) / 2 - bbox.y * scale;

    path.setAttribute('transform', `translate(${offsetX}, ${offsetY}) scale(${scale})`);
    path.style.vectorEffect = 'non-scaling-stroke';
  });

  document.querySelectorAll('.social-links a').forEach(link => {
    const canvas = document.createElement('canvas');
    canvas.className = 'glow-canvas';
    canvas.style.position = 'absolute';
    canvas.style.top = '-20px';
    canvas.style.left = '-20px';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '-2';
    canvas.style.opacity = '0';
    canvas.style.transition = 'opacity 0.4s ease';
    
    link.parentNode.insertBefore(canvas, link);

    const rect = link.getBoundingClientRect();
    const glowPadding = 20;
    canvas.width = rect.width + glowPadding * 2;
    canvas.height = rect.height + glowPadding * 2;

    const ctx = canvas.getContext('2d');
    const width = rect.width;
    const height = rect.height;
    const radius = height / 2;

    const computedStyle = window.getComputedStyle(link);
    const color = computedStyle.color;
    
    const rgb = color.match(/\d+/g);
    const colorRGB = rgb ? `${rgb[0]}, ${rgb[1]}, ${rgb[2]}` : '254, 254, 254';

    function getRoundedRectPath(numPoints) {
      const points = [];
      const straightWidth = width - 2 * radius;
      
      const topStraight = straightWidth;
      const rightArc = Math.PI * radius;
      const bottomStraight = straightWidth;
      const leftArc = Math.PI * radius;
      const totalPerimeter = topStraight + rightArc + bottomStraight + leftArc;
      
      for (let i = 0; i < numPoints; i++) {
        const t = i / numPoints;
        const distance = t * totalPerimeter;
        
        let x, y;
        
        if (distance < topStraight) {
          x = glowPadding + radius + distance;
          y = glowPadding;
        } else if (distance < topStraight + rightArc) {
          const arcDist = distance - topStraight;
          const angle = -Math.PI / 2 + (arcDist / radius);
          x = glowPadding + width - radius + radius * Math.cos(angle);
          y = glowPadding + radius + radius * Math.sin(angle);
        } else if (distance < topStraight + rightArc + bottomStraight) {
          const straightDist = distance - topStraight - rightArc;
          x = glowPadding + width - radius - straightDist;
          y = glowPadding + height;
        } else {
          const arcDist = distance - topStraight - rightArc - bottomStraight;
          const angle = Math.PI / 2 + (arcDist / radius);
          x = glowPadding + radius + radius * Math.cos(angle);
          y = glowPadding + radius + radius * Math.sin(angle);
        }
        
        points.push({ x, y, t: t * Math.PI * 2 });
      }
      
      return points;
    }

    let animationId = null;
    let time = 0;

    function drawGlow() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const numPoints = 400;
      const numPeaks = 3;
      const points = getRoundedRectPath(numPoints);

      const maxGlowRadius = 10;
      
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        
        const staticIntensity = 0.25;
        
        const waveValue = Math.sin(numPeaks * point.t + time);
        const smoothedWave = Math.pow(Math.max(0, waveValue), 2);
        const travelingIntensity = smoothedWave * 0.8;
        
        const totalIntensity = staticIntensity + travelingIntensity;
        
        const gradient = ctx.createRadialGradient(
          point.x, point.y, 0,
          point.x, point.y, maxGlowRadius
        );
        
        const alpha = totalIntensity;
        gradient.addColorStop(0.00, `rgba(${colorRGB}, ${alpha * 1.000})`);
        gradient.addColorStop(0.25, `rgba(${colorRGB}, ${alpha * 0.317})`);
        gradient.addColorStop(0.50, `rgba(${colorRGB}, ${alpha * 0.1})`);
        gradient.addColorStop(0.75, `rgba(${colorRGB}, ${alpha * 0.032})`);
        gradient.addColorStop(1.00, `rgba(${colorRGB}, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(point.x, point.y, maxGlowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      time += 0.015;
      animationId = requestAnimationFrame(drawGlow);
    }

    link.addEventListener('mouseenter', () => {
      canvas.style.opacity = '1';
      if (!animationId) {
        drawGlow();
      }
    });

    link.addEventListener('mouseleave', () => {
      canvas.style.opacity = '0';
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    });
  });
}
const links = document.querySelectorAll('.nav-links a');
const main = document.getElementById('main-content');

let cursor, cursorDot;
let mouseX = 0, mouseY = 0;

function initCustomCursor() {
  cursor = document.createElement('div');
  cursor.className = 'custom-cursor';
  
  cursorDot = document.createElement('div');
  cursorDot.className = 'custom-cursor-dot';
  cursor.appendChild(cursorDot);
  
  document.body.appendChild(cursor);
  document.body.classList.add('custom-cursor-enabled');
  
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.left = mouseX + 'px';
    cursor.style.top = mouseY + 'px';
    cursor.classList.add('active');
    
    // Check if hovering over clickable element
    const target = e.target;
    const isClickable = target.closest('a, button, input, select, .project-card, .category-bookmark, .carousel-btn, .indicator-dot, [role="button"]');
    
    if (isClickable) {
      cursor.classList.add('hovering');
    } else {
      cursor.classList.remove('hovering');
    }
  });
  
  document.addEventListener('mouseleave', () => {
    cursor.classList.remove('active');
    cursor.classList.remove('hovering');
  });
  
  document.addEventListener('mouseenter', () => {
    cursor.classList.add('active');
  });
  
  document.addEventListener('mousedown', (e) => {
    cursor.classList.add('clicking');
    createRipple(e.clientX, e.clientY);
  });
  
  document.addEventListener('mouseup', () => {
    cursor.classList.remove('clicking');
  });
}

function createRipple(x, y) {
  const ripple = document.createElement('div');
  ripple.className = 'ripple';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  document.body.appendChild(ripple);
  
  setTimeout(() => ripple.remove(), 800);
}

function createDistortion(x, y) {
  const canvas = document.createElement('canvas');
  canvas.className = 'distortion-canvas';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  
  const ctx = canvas.getContext('2d');
  let frame = 0;
  const maxFrames = 20;
  
  canvas.style.opacity = '0.3';
  
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const progress = frame / maxFrames;
    const radius = 60 * progress;
    const strength = (1 - progress) * 8;
    
    for (let angle = 0; angle < Math.PI * 2; angle += 0.2) {
      const waveOffset = Math.sin(angle * 8 + frame * 0.5) * strength * 0.2;
      const distance = Math.max(0, radius + waveOffset);
      
      ctx.strokeStyle = `rgba(125, 211, 252, ${(1 - progress) * 0.2})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, distance, angle, angle + 0.2);
      ctx.stroke();
    }
    
    frame++;
    if (frame < maxFrames) {
      requestAnimationFrame(animate);
    } else {
      canvas.style.opacity = '0';
      setTimeout(() => canvas.remove(), 300);
    }
  }
  
  animate();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCustomCursor);
} else {
  initCustomCursor();
}

async function showSection(target) {
  const sections = main.querySelectorAll('section');
  sections.forEach(s => s.hidden = true);

  const sectionId = target.split('/').pop();
  const section = document.getElementById(sectionId);
  if (!section) return;

  section.hidden = false;

  try {
    const res = await fetch(`pages/${sectionId}.html`);
    if (!res.ok) throw new Error('Page not found');
    section.innerHTML = await res.text();
  } catch (err) {
    section.innerHTML = `<p>⚠️ Failed to load ${sectionId}.html</p>`;
  }

  if (sectionId === 'home') setTimeout(() => initHome(), 0);
  if (sectionId === 'projects') setTimeout(() => initProjects(), 0);
  if (sectionId === 'contact') setTimeout(() => initContacts(), 0);
  if (sectionId === 'education') setTimeout(() => initEducation(), 0);
}

links.forEach(link => {
  link.addEventListener('click', async e => {
    e.preventDefault();

    links.forEach(l => l.classList.remove('active'));
    link.classList.add('active');

    const target = link.getAttribute('href').substring(1);
    await showSection(target);

    window.location.hash = target;
  });
});

const initialPage = window.location.hash.substring(1) || 'pages/home';
showSection(initialPage);

setTimeout(() => {
  links.forEach(l => {
    l.classList.remove('active');
    const linkHref = l.getAttribute('href').substring(1);
    const currentSection = document.querySelector('section:not([hidden])');
    if (currentSection && linkHref === `pages/${currentSection.id}`) {
      l.classList.add('active');
    }
  });
}, 100);
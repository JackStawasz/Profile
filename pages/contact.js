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
}
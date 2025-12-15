function initContacts() {
    document.querySelectorAll('.social-links svg').forEach(svg => {
    const path = svg.querySelector('path');
    if (!path) return;

    // Calculate scale to fit 32x32 container (or icon container size)
    const bbox = path.getBBox(); // Get the bounding box of the path
    const containerSize = 32; // matches CSS .icon width/height
    const scale = Math.min(containerSize / bbox.width, containerSize / bbox.height);

    // Calculate translation to center path
    const offsetX = (containerSize - bbox.width * scale) / 2 - bbox.x * scale;
    const offsetY = (containerSize - bbox.height * scale) / 2 - bbox.y * scale;

    // Apply transform
    path.setAttribute('transform', `translate(${offsetX}, ${offsetY}) scale(${scale})`);

    // Ensure stroke does not scale
    path.style.vectorEffect = 'non-scaling-stroke';
    });
}
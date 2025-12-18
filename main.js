const links = document.querySelectorAll('.nav-links a');
const main = document.getElementById('main-content');

// Show/hide section and optionally fetch content
async function showSection(target) {
  const sections = main.querySelectorAll('section');
  sections.forEach(s => s.hidden = true); // hide all sections

  // get section by ID (last part of target)
  const sectionId = target.split('/').pop();
  const section = document.getElementById(sectionId);
  if (!section) return;

  section.hidden = false;

  // fetch HTML for this section
  try {
    const res = await fetch(`pages/${sectionId}.html`);
    if (!res.ok) throw new Error('Page not found');
    section.innerHTML = await res.text();
  } catch (err) {
    section.innerHTML = `<p>⚠️ Failed to load ${sectionId}.html</p>`;
  }

  // Initialize section-specific scripts (run after the HTML is injected)
  if (sectionId === 'home') setTimeout(() => initHome(), 0);
  if (sectionId === 'projects') setTimeout(() => initProjects(), 0);
  if (sectionId === 'contact') setTimeout(() => initContacts(), 0);
}

// Click handler
links.forEach(link => {
  link.addEventListener('click', async e => {
    e.preventDefault();

    // Update active link
    links.forEach(l => l.classList.remove('active'));
    link.classList.add('active');

    const target = link.getAttribute('href').substring(1);
    await showSection(target);

    window.location.hash = target;
  });
});

// Load initial section
const initialPage = window.location.hash.substring(1) || 'home';
showSection(initialPage);
links.forEach(l => {
  if (l.getAttribute('href') === `#${initialPage}`) l.classList.add('active');
});
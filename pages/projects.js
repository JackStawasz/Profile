const JSON_PATH = './data/projects/projects.json';

let projects = [];

function initProjects() {
  const statusEl = document.getElementById('status');
  const listEl = document.getElementById('list');
  const qEl = document.getElementById('q');
  const sortEl = document.getElementById('sort');

  function showStatus(message, type = 'loading', showRetry = false) {
    statusEl.className = type;
    statusEl.innerHTML = '';
    
    const text = document.createElement('div');
    text.textContent = message;
    statusEl.appendChild(text);

    if (showRetry) {
      const btn = document.createElement('button');
      btn.textContent = 'Retry';
      btn.className = 'retry';
      btn.onclick = () => fetchProjects();
      statusEl.appendChild(btn);
    }

    statusEl.hidden = false;
    listEl.hidden = true;
  }

  function clearStatus() {
    statusEl.hidden = true;
    listEl.hidden = false;
  }

  async function fetchProjects() {
    showStatus('Loading projects…', 'loading');
    try {
      const res = await fetch(JSON_PATH, { cache: 'no-store' });
      if (!res.ok) throw new Error('Network response not ok: ' + res.status);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('JSON root must be an array of projects.');
      projects = data;
      renderList(projects);
    } catch (err) {
      console.error(err);
      showStatus('Failed to load projects. ' + err.message, 'error', true);
    }
  }

  function renderList(items) {
    listEl.innerHTML = '';
    
    if (!items.length) {
      showStatus('No projects found.', 'empty', false);
      return;
    }
    
    clearStatus();

    items.forEach(p => {
      const card = document.createElement('article');
      card.className = 'project-card';
      card.setAttribute('role', 'article');

      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      if (p.thumbnail) {
        thumb.style.background = `url(${p.thumbnail}) center/cover`;
        thumb.textContent = '';
      } else {
        thumb.textContent = (p.title || 'P').trim().slice(0, 2).toUpperCase();
      }

      if (p.difficulty) {
        const difficulty = document.createElement('div');
        difficulty.className = 'difficulty';
        const filled = '★'.repeat(p.difficulty);
        const hollow = '☆'.repeat(3 - p.difficulty);
        difficulty.textContent = filled + hollow;
        card.appendChild(difficulty);
      }

      const meta = document.createElement('div');
      meta.className = 'meta';

      const title = document.createElement('h2');
      title.className = 'title';
      title.textContent = p.title || 'Untitled project';

      const desc = document.createElement('p');
      desc.className = 'desc';
      desc.textContent = p.description || '';

      const metaRow = document.createElement('div');
      metaRow.className = 'meta-row';
      
      // Left side - tags
      const tags = document.createElement('div');
      tags.className = 'tags';
      (p.tags || []).slice(0, 6).forEach(t => {
        const span = document.createElement('span');
        span.className = 'tag';
        span.textContent = t;
        tags.appendChild(span);
      });
      
      // Right side - links
      const linksContainer = document.createElement('div');
      linksContainer.className = 'project-links';
      
      if (p.url) {
        const urlLink = document.createElement('a');
        urlLink.href = '#';
        urlLink.className = 'project-link';
        urlLink.innerHTML = '🔗 Go to Project';
        urlLink.title = 'View project';
        urlLink.addEventListener('click', e => {
          e.preventDefault();
          openPopup(p.url);
        });
        urlLink.setAttribute('aria-label', `Open project ${p.title || 'Untitled project'}`);
        linksContainer.appendChild(urlLink);
      }
      
      if (p.repo) {
        const repoLink = document.createElement('a');
        repoLink.href = p.repo;
        repoLink.className = 'project-link';
        repoLink.innerHTML = '📦 Go to Repo';
        repoLink.title = 'View repository';
        repoLink.addEventListener('click', e => {
          e.preventDefault();
          window.open(p.repo, '_blank', 'noopener,noreferrer');
        });
        repoLink.setAttribute('aria-label', `View repository for ${p.title || 'Untitled project'}`);
        linksContainer.appendChild(repoLink);
      }
      
      metaRow.appendChild(tags);
      metaRow.appendChild(linksContainer);

      meta.appendChild(title);
      if (p.description) meta.appendChild(desc);
      if ((p.tags || []).length || p.url || p.repo) meta.appendChild(metaRow);
      
      if (p.organization) {
        const org = document.createElement('div');
        org.className = 'organization';
        org.textContent = p.organization;
        card.appendChild(org);
      }
      
      card.appendChild(thumb);
      card.appendChild(meta);
      listEl.appendChild(card);
    });
  }

  function filterProjects(q) {
    const text = (q || '').trim().toLowerCase();
    if (!text) return projects;
    
    return projects.filter(p => {
      const inTitle = (p.title || '').toLowerCase().includes(text);
      const inDesc = (p.description || '').toLowerCase().includes(text);
      const inTags = (p.tags || []).some(t => t.toLowerCase().includes(text));
      const inOrgs = (p.organization || '').toLowerCase().includes(text);
      return inTitle || inDesc || inTags || inOrgs;
    });
  }

  function sortProjects(items, criterion) {
    if (!criterion) return items;
    
    return [...items].sort((a, b) => {
      switch (criterion) {
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'organization':
          return (a.organization || '').localeCompare(b.organization || '');
        case 'difficulty':
          return (a.difficulty || 0) - (b.difficulty || 0);
        case 'has-link':
          return (b.url ? 1 : 0) - (a.url ? 1 : 0);
        case 'has-repo':
          return (b.repo ? 1 : 0) - (a.repo ? 1 : 0);
        default:
          return 0;
      }
    });
  }

  function updateList() {
    const filtered = filterProjects(qEl.value);
    const sorted = sortProjects(filtered, sortEl.value);
    renderList(sorted);
  }

  qEl.addEventListener('input', updateList);
  sortEl.addEventListener('change', updateList);

  fetchProjects();
}

const popup = document.getElementById('popup');
const frame = document.getElementById('popup-frame');
const closeBtn = popup.querySelector('.close');

function openPopup(url) {
  frame.src = url;
  popup.classList.remove('hidden');
}

function closePopup() {
  popup.classList.add('hidden');
  frame.src = '';
}

closeBtn.addEventListener('click', closePopup);
popup.addEventListener('click', e => {
  if (e.target === popup) closePopup();
});
const JSON_PATH = './data/projects.json';

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
      const a = document.createElement('a');
      a.href = '#';
      a.textContent = p.title || 'Untitled project';
      a.title = 'View project';
      a.addEventListener('click', e => {
        e.preventDefault();
        if (p.url) openPopup(p.url);
      });
      a.setAttribute('aria-label', `Open project ${p.title || 'Untitled project'}`);
      title.appendChild(a);

      const desc = document.createElement('p');
      desc.className = 'desc';
      desc.textContent = p.description || '';

      const tags = document.createElement('div');
      tags.className = 'tags';
      (p.tags || []).slice(0, 6).forEach(t => {
        const span = document.createElement('span');
        span.className = 'tag';
        span.textContent = t;
        tags.appendChild(span);
      });

      const metaRow = document.createElement('div');
      metaRow.className = 'meta-row';
      const small = document.createElement('div');
      small.className = 'small';
      small.textContent = p.repo ? 'Repo: ' + p.repo : '';
      
      metaRow.appendChild(small);
      meta.appendChild(title);
      if (p.description) meta.appendChild(desc);
      if ((p.tags || []).length) meta.appendChild(tags);
      
      if (p.organization) {
        const org = document.createElement('div');
        org.className = 'organization';
        org.textContent = p.organization;
        card.appendChild(org);
      }
      
      meta.appendChild(metaRow);

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
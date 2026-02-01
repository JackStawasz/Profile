const EDUCATION_JSON_PATH = './data/education.json';

let allCourses = [];
let allDisciplines = new Set();
let allOrganizations = new Set();
let sortOrder = ['organization', 'number', 'department', 'semester'];
let reverseSort = false;
let viewMode = 'card';
let selectedFilters = {
  organizations: new Set(),
  disciplines: new Set()
};

function initEducation() {
  const statusEl = document.getElementById('status');
  const contentEl = document.getElementById('education-content');
  const qEl = document.getElementById('q');
  const sortToggle = document.getElementById('sort-toggle');
  const sortDropdown = document.getElementById('sort-dropdown');
  const viewToggle = document.getElementById('view-toggle');
  const viewDropdown = document.getElementById('view-dropdown');
  const filterToggle = document.getElementById('filter-toggle');
  const filterDropdown = document.getElementById('filter-dropdown');
  const clearFiltersBtn = document.getElementById('clear-filters');
  const applyFiltersBtn = document.getElementById('apply-filters');

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
      btn.onclick = () => fetchEducation();
      statusEl.appendChild(btn);
    }

    statusEl.hidden = false;
    contentEl.hidden = true;
  }

  function clearStatus() {
    statusEl.hidden = true;
    contentEl.hidden = false;
  }

  async function fetchEducation() {
    showStatus('Loading courses…', 'loading');
    try {
      const res = await fetch(EDUCATION_JSON_PATH, { cache: 'no-store' });
      if (!res.ok) throw new Error('Network response not ok: ' + res.status);
      const data = await res.json();
      if (typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('JSON root must be an object with institution keys.');
      }
      
      // Flatten all courses with their institution
      allCourses = [];
      allDisciplines.clear();
      allOrganizations.clear();
      
      Object.entries(data).forEach(([institution, courses]) => {
        allOrganizations.add(institution);
        if (Array.isArray(courses)) {
          courses.forEach(course => {
            allCourses.push({
              ...course,
              institution: institution
            });
            if (course.discipline) {
              allDisciplines.add(course.discipline);
            }
          });
        }
      });
      
      // Populate filter options
      populateFilterOptions();
      
      // Render with current sort order
      updateDisplay();
      
      // Initialize drag and drop for sort chips after a short delay to ensure DOM is ready
      setTimeout(() => {
        initSortDragAndDrop();
      }, 100);
    } catch (err) {
      console.error(err);
      showStatus('Failed to load courses. ' + err.message, 'error', true);
    }
  }

  function populateFilterOptions() {
    const orgFilters = document.getElementById('org-filters');
    const discFilters = document.getElementById('discipline-filters');
    
    orgFilters.innerHTML = '';
    discFilters.innerHTML = '';
    
    // Add organization checkboxes
    Array.from(allOrganizations).sort().forEach(org => {
      const option = createFilterOption('org', org);
      orgFilters.appendChild(option);
    });
    
    // Add discipline checkboxes
    Array.from(allDisciplines).sort().forEach(disc => {
      const option = createFilterOption('disc', disc);
      discFilters.appendChild(option);
    });
  }

  function createFilterOption(type, value) {
    const div = document.createElement('div');
    div.className = 'filter-option';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `filter-${type}-${value.replace(/\s+/g, '-')}`;
    checkbox.value = value;
    checkbox.dataset.type = type;
    
    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = value;
    
    div.appendChild(checkbox);
    div.appendChild(label);
    
    return div;
  }

  function initSortDragAndDrop() {
    const container = document.getElementById('sort-chips');
    if (!container) return;

    let draggedChip = null;

    container.addEventListener('dragstart', e => {
      const chip = e.target.closest('.sort-chip');
      if (!chip) return;

      draggedChip = chip;
      chip.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    container.addEventListener('dragend', () => {
      if (draggedChip) {
        draggedChip.classList.remove('dragging');
        draggedChip = null;
      }
    });

    container.addEventListener('dragover', e => {
      e.preventDefault();
      const chip = e.target.closest('.sort-chip');
      if (!chip || chip === draggedChip) return;
      chip.classList.add('drag-over');
    });

    container.addEventListener('dragleave', e => {
      const chip = e.target.closest('.sort-chip');
      if (!chip) return;
      chip.classList.remove('drag-over');
    });

    container.addEventListener('drop', e => {
      e.preventDefault();
      const targetChip = e.target.closest('.sort-chip');
      if (!targetChip || targetChip === draggedChip) return;

      targetChip.classList.remove('drag-over');

      const container = targetChip.parentNode;
      const draggedIndex = [...container.children].indexOf(draggedChip);
      const targetIndex = [...container.children].indexOf(targetChip);

      if (draggedIndex < targetIndex) {
        container.insertBefore(draggedChip, targetChip.nextSibling);
      } else {
        container.insertBefore(draggedChip, targetChip);
      }

      updateSortOrderFromChips();
    });
  }
  let draggedElement = null;
  let placeholder = null;

  function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
    
    // Create placeholder
    placeholder = document.createElement('div');
    placeholder.className = 'sort-chip-placeholder';
    placeholder.innerHTML = this.innerHTML;
    
    // Insert placeholder at original position
    this.parentNode.insertBefore(placeholder, this);
    
    // Hide the original element
    this.style.visibility = 'hidden';
  }

  function handleDragEnd(e) {
    this.classList.remove('dragging');
    this.style.visibility = 'visible';
    
    document.querySelectorAll('.sort-chip').forEach(chip => {
      chip.classList.remove('drag-over');
    });
    
    // Remove placeholder
    if (placeholder && placeholder.parentNode) {
      placeholder.parentNode.removeChild(placeholder);
    }
    placeholder = null;
  }

  function handleDragOver(e) {
    if (e.preventDefault) {
      e.preventDefault();
    }
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    e.dataTransfer.dropEffect = 'move';
    
    // Insert placeholder at hover position
    if (placeholder && draggedElement && this !== placeholder && this.classList.contains('sort-chip')) {
      const container = document.getElementById('sort-chips');
      if (!container) return false;
      
      const allChips = Array.from(container.querySelectorAll('.sort-chip'));
      const targetIndex = allChips.indexOf(this);
      
      if (targetIndex !== -1) {
        // Find where placeholder currently is
        const placeholderIndex = Array.from(container.children).indexOf(placeholder);
        
        if (placeholderIndex !== targetIndex) {
          // Insert placeholder before or after target
          const rect = this.getBoundingClientRect();
          const midpoint = rect.top + rect.height / 2;
          
          if (e.clientY < midpoint) {
            container.insertBefore(placeholder, this);
          } else {
            container.insertBefore(placeholder, this.nextSibling);
          }
        }
      }
    }
    
    return false;
  }

  function handleDragEnter(e) {
    if (this !== draggedElement && this !== placeholder) {
      this.classList.add('drag-over');
      
      // Insert placeholder
      if (placeholder) {
        const container = this.parentNode;
        const allChips = Array.from(container.children);
        const draggedIndex = allChips.indexOf(draggedElement);
        const targetIndex = allChips.indexOf(this);
        
        if (draggedIndex < targetIndex) {
          container.insertBefore(placeholder, this.nextSibling);
        } else {
          container.insertBefore(placeholder, this);
        }
      }
    }
  }

  function handleDragLeave(e) {
    this.classList.remove('drag-over');
  }

  function handleDrop(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }

    if (draggedElement !== this) {
      const container = this.parentNode;
      
      // Replace placeholder with dragged element
      if (placeholder && placeholder.parentNode) {
        container.replaceChild(draggedElement, placeholder);
        draggedElement.style.visibility = 'visible';
      }

      // Update sort order based on new DOM order
      updateSortOrder();
      updateDisplay();
    } else {
      // Just restore visibility if dropped on itself
      draggedElement.style.visibility = 'visible';
    }

    return false;
  }

  function updateSortOrder() {
    const container = document.getElementById('sort-chips');
    const chips = container.querySelectorAll('.sort-chip');
    sortOrder = Array.from(chips).map(chip => chip.dataset.sort);
  }

  function renderEducation() {
    contentEl.innerHTML = '';
    
    if (!allCourses.length) {
      showStatus('No courses found.', 'empty', false);
      return;
    }
    
    clearStatus();

    // Update content class based on view mode
    if (viewMode === 'list') {
      contentEl.classList.add('list-view');
    } else {
      contentEl.classList.remove('list-view');
    }

    // Sort courses based on current sort order
    let sortedCourses = [...allCourses];
    
    sortedCourses.sort((a, b) => {
      for (const criterion of sortOrder) {
        let comparison = 0;
        
        if (criterion === 'organization') {
          comparison = (a.institution || '').localeCompare(b.institution || '');
        } else if (criterion === 'department') {
          comparison = extractDepartment(a.number).localeCompare(extractDepartment(b.number));
        } else if (criterion === 'number') {
          const aNum = extractCourseNumber(a.number);
          const bNum = extractCourseNumber(b.number);
          comparison = aNum - bNum;
        } else if (criterion === 'semester') {
          comparison = compareSemesters(a.semester, b.semester);
        }
        
        if (comparison !== 0) {
          return reverseSort ? -comparison : comparison;
        }
      }
      return 0;
    });

    // Render based on view mode
    if (viewMode === 'list') {
      renderListView(sortedCourses);
    } else {
      renderCardView(sortedCourses);
    }
  }

  function renderListView(courses) {
    courses.forEach(course => {
      if (!course.title) return;

      const item = document.createElement('div');
      item.className = 'course-list-item';
      item.setAttribute('data-discipline', course.discipline || '');
      item.setAttribute('data-title', (course.title || '').toLowerCase());
      item.setAttribute('data-number', (course.number || '').toLowerCase());
      item.setAttribute('data-institution', course.institution || '');

      const number = course.number ? `<span class="course-list-number">${course.number}</span>` : '';
      item.innerHTML = `${number}${course.title}`;

      contentEl.appendChild(item);
    });
  }

  function renderCardView(courses) {
    courses.forEach(course => {
      if (!course.title) return;

      const card = document.createElement('article');
      card.className = 'course-card';
      card.setAttribute('role', 'article');
      card.setAttribute('data-discipline', course.discipline || '');
      card.setAttribute('data-title', (course.title || '').toLowerCase());
      card.setAttribute('data-number', (course.number || '').toLowerCase());
      card.setAttribute('data-institution', course.institution || '');

      // Institution badge (top right)
      const institutionBadge = document.createElement('div');
      institutionBadge.className = 'institution-badge';
      institutionBadge.textContent = course.institution;
      card.appendChild(institutionBadge);

      // Thumbnail (left side)
      const thumb = document.createElement('div');
      thumb.className = 'course-thumb';
      thumb.setAttribute('data-discipline', course.discipline || '');
      if (course.image) {
        thumb.style.background = `url(${course.image}) center/cover`;
        thumb.textContent = '';
      } else {
        const initials = course.number 
          ? course.number.replace(/[^A-Z0-9]/g, '').slice(0, 4)
          : (course.title || 'COUR').trim().slice(0, 4).toUpperCase();
        thumb.textContent = initials;
      }

      // Meta information (right side)
      const meta = document.createElement('div');
      meta.className = 'course-meta';

      const header = document.createElement('div');
      header.className = 'course-header';

      if (course.number) {
        const number = document.createElement('span');
        number.className = 'course-number';
        number.textContent = course.number;
        header.appendChild(number);
      }

      const title = document.createElement('h3');
      title.className = 'course-title';
      title.textContent = course.title;
      header.appendChild(title);

      meta.appendChild(header);

      // Description
      if (course.description) {
        const desc = document.createElement('p');
        desc.className = 'course-description';
        desc.textContent = course.description;
        meta.appendChild(desc);
      }

      // Tags (discipline + semester + any additional tags)
      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'course-tags';

      if (course.discipline) {
        const disciplineTag = document.createElement('span');
        disciplineTag.className = 'course-tag';
        disciplineTag.textContent = course.discipline;
        tagsContainer.appendChild(disciplineTag);
      }

      if (course.semester) {
        const semesterTag = document.createElement('span');
        semesterTag.className = 'course-tag';
        semesterTag.textContent = course.semester;
        tagsContainer.appendChild(semesterTag);
      }

      // Additional tags if provided
      if (course.tags && Array.isArray(course.tags)) {
        course.tags.forEach(tagText => {
          const tag = document.createElement('span');
          tag.className = 'course-tag';
          tag.textContent = tagText;
          tagsContainer.appendChild(tag);
        });
      }

      if (tagsContainer.children.length > 0) {
        meta.appendChild(tagsContainer);
      }

      card.appendChild(thumb);
      card.appendChild(meta);
      contentEl.appendChild(card);
    });
  }

  function extractCourseLevel(courseNumber) {
    if (!courseNumber) return 0;
    // Extract first number from course number (e.g., "PHYS 313" -> 300, "CS 4" -> 400)
    const match = courseNumber.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1]);
      // Return the hundred level (313 -> 300, 4 -> 0)
      if (num >= 100) {
        return Math.floor(num / 100) * 100;
      }
      return 0;
    }
    return 0;
  }

  function extractDepartment(courseNumber) {
    if (!courseNumber) return '';
    // Extract department letters (e.g., "PHYS 313" -> "PHYS", "CS101" -> "CS")
    const match = courseNumber.match(/^([A-Za-z]+)/);
    return match ? match[1].toUpperCase() : '';
  }

  function extractCourseNumber(courseNumber) {
    if (!courseNumber) return 0;
    // Extract numeric portion only (e.g., "PHYS 313" -> 313, "CS101" -> 101, "MATH 420" -> 420)
    const match = courseNumber.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  function parseSemester(semester) {
    if (!semester) return { year: 0, season: 0, type: 'none' };
    
    const semesterLower = semester.toLowerCase().trim();
    
    // Check for school year format (e.g., "2021-2022")
    const schoolYearMatch = semesterLower.match(/(\d{4})\s*-\s*(\d{4})/);
    if (schoolYearMatch) {
      return {
        year: parseInt(schoolYearMatch[1]),
        season: 2, // Fall
        type: 'school-year'
      };
    }
    
    // Check for season + year format (e.g., "Fall 2021", "Spring 2021")
    const seasonYearMatch = semesterLower.match(/(spring|summer|fall)\s+(\d{4})/);
    if (seasonYearMatch) {
      const season = seasonYearMatch[1];
      const year = parseInt(seasonYearMatch[2]);
      
      const seasonOrder = {
        'spring': 0,
        'summer': 1,
        'fall': 2
      };
      
      return {
        year: year,
        season: seasonOrder[season] || 0,
        type: 'season-year'
      };
    }
    
    return { year: 0, season: 0, type: 'none' };
  }

  function compareSemesters(semA, semB) {
    const a = parseSemester(semA);
    const b = parseSemester(semB);
    
    // Sort by year first
    if (a.year !== b.year) {
      return a.year - b.year;
    }
    
    // Then by season (Spring < Summer < Fall)
    return a.season - b.season;
  }

  function filterCourses() {
    const query = (qEl.value || '').trim().toLowerCase();
    
    const items = viewMode === 'list' 
      ? contentEl.querySelectorAll('.course-list-item')
      : contentEl.querySelectorAll('.course-card');
    
    let visibleCount = 0;
    
    items.forEach(item => {
      const title = item.getAttribute('data-title');
      const number = item.getAttribute('data-number');
      const discipline = item.getAttribute('data-discipline');
      const institution = item.getAttribute('data-institution');
      
      const matchesQuery = !query || 
        title.includes(query) || 
        number.includes(query) || 
        discipline.toLowerCase().includes(query) ||
        institution.toLowerCase().includes(query);
      
      const matchesOrgFilter = selectedFilters.organizations.size === 0 ||
        selectedFilters.organizations.has(institution);
      
      const matchesDiscFilter = selectedFilters.disciplines.size === 0 ||
        selectedFilters.disciplines.has(discipline);
      
      if (matchesQuery && matchesOrgFilter && matchesDiscFilter) {
        item.style.display = '';
        visibleCount++;
      } else {
        item.style.display = 'none';
      }
    });
    
    if (visibleCount === 0 && allCourses.length > 0) {
      showStatus('No courses found matching your filters.', 'empty', false);
    } else if (allCourses.length > 0) {
      clearStatus();
    }
  }

  function updateDisplay() {
    renderEducation();
    filterCourses();
  }

  // Event listeners
  const reverseSortBtn = document.getElementById('reverse-sort');
  
  reverseSortBtn.addEventListener('click', () => {
    reverseSort = !reverseSort;
    reverseSortBtn.classList.toggle('active', reverseSort);
    updateDisplay();
  });

  viewToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    viewDropdown.hidden = !viewDropdown.hidden;
    // Close other dropdowns when opening view
    if (!viewDropdown.hidden) {
      sortDropdown.hidden = true;
      filterDropdown.hidden = true;
    }
  });

  // Handle view mode changes
  document.querySelectorAll('input[name="view-mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      viewMode = e.target.value;
      viewDropdown.hidden = true;
      updateDisplay();
    });
  });

  sortToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    sortDropdown.hidden = !sortDropdown.hidden;
    // Close filter dropdown when opening sort
    if (!sortDropdown.hidden) {
      viewDropdown.hidden = true;
      filterDropdown.hidden = true;
    }
  });

  filterToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    filterDropdown.hidden = !filterDropdown.hidden;
    // Close sort dropdown when opening filter
    if (!filterDropdown.hidden) {
      viewDropdown.hidden = true;
      sortDropdown.hidden = true;
    }
  });

  document.addEventListener('click', (e) => {
    if (!sortToggle.contains(e.target) && !sortDropdown.contains(e.target)) {
      sortDropdown.hidden = true;
    }
    if (!viewToggle.contains(e.target) && !viewDropdown.contains(e.target)) {
      viewDropdown.hidden = true;
    }
    if (!filterToggle.contains(e.target) && !filterDropdown.contains(e.target)) {
      filterDropdown.hidden = true;
    }
  });

  clearFiltersBtn.addEventListener('click', () => {
    selectedFilters.organizations.clear();
    selectedFilters.disciplines.clear();
    document.querySelectorAll('.filter-option input[type="checkbox"]').forEach(cb => {
      cb.checked = false;
    });
    updateDisplay();
  });

  applyFiltersBtn.addEventListener('click', () => {
    selectedFilters.organizations.clear();
    selectedFilters.disciplines.clear();
    
    document.querySelectorAll('.filter-option input[type="checkbox"]:checked').forEach(cb => {
      if (cb.dataset.type === 'org') {
        selectedFilters.organizations.add(cb.value);
      } else if (cb.dataset.type === 'disc') {
        selectedFilters.disciplines.add(cb.value);
      }
    });
    
    filterDropdown.hidden = true;
    updateDisplay();
  });

  qEl.addEventListener('input', filterCourses);

  fetchEducation();
}
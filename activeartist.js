// activeartist.js - Active Artist course (Option C)
// Loads activeartist.json, renders tabs, sections, and level cards.
// Clicking a level opens the right-side detail panel.
// Completed states are saved in localStorage under key 'aa_completed' (array of level ids).

const DATA_URL = 'activeartist.json';
let data = null;
let currentTabId = null;
const STORAGE_KEY = 'aa_completed';

const tabsEl = document.querySelector('.tabs');
const sectionsEl = document.getElementById('sections');
const detailPanel = document.getElementById('detailPanel');
const detailContent = document.getElementById('detailContent');
const closeBtn = document.getElementById('closeDetail');
const globalProgressFill = document.getElementById('globalProgressFill');
const progressPercent = document.getElementById('progressPercent');

async function init(){
  try {
    const res = await fetch(DATA_URL);
    data = await res.json();
  } catch (err) {
    sectionsEl.innerHTML = '<p style="color:#b44">Failed to load course data.</p>';
    console.error(err);
    return;
  }

  buildTabs();
  // set first tab active
  if (data.tabs && data.tabs.length>0) {
    setActiveTab(data.tabs[0].id);
  }

  closeBtn.addEventListener('click', closeDetail);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDetail();
  });
}

function buildTabs(){
  tabsEl.innerHTML = '';
  (data.tabs || []).forEach(tab => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.textContent = tab.label;
    btn.dataset.tab = tab.id;
    btn.addEventListener('click', () => setActiveTab(tab.id));
    tabsEl.appendChild(btn);
  });
}

function setActiveTab(tabId){
  currentTabId = tabId;
  // toggle active class
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tabId);
  });
  renderSectionsForTab(tabId);
  updateTabProgressUI(tabId);
}

function renderSectionsForTab(tabId){
  sectionsEl.innerHTML = '';
  const tab = (data.tabs || []).find(t => t.id === tabId);
  if (!tab) return;

  // Special rendering for the Challenge tab (contains a 'prompts' array)
  if (Array.isArray(tab.prompts) && tab.prompts.length > 0) {
    renderChallengeTab(tab);
    return;
  }

  tab.sections.forEach(section => {
    const sectCard = document.createElement('div');
    sectCard.className = 'section-card';
    sectCard.innerHTML = `<div class="section-title">${escapeHtml(section.label)}</div>
      <div class="level-grid"></div>`;
    const grid = sectCard.querySelector('.level-grid');

    (section.levels || []).forEach(level => {
      const card = document.createElement('div');
      card.className = 'level-card';
      card.dataset.level = level.id;
      // thumbnail (if provided) or placeholder
      const thumbHtml = level.image ?
        `<div class="level-thumb-wrap"><img src="${level.image}" alt="${escapeHtml(level.title)}" class="level-thumb"></div>` :
        `<div class="level-thumb-wrap"><div class="level-thumb-placeholder">${escapeHtml(level.id)}</div></div>`;

      card.innerHTML = `
        ${thumbHtml}
        <div>
          <div class="level-title">${escapeHtml(level.title)}</div>
          <div class="level-sub">${escapeHtml(truncate(level.description,80))}</div>
        </div>
        <div class="level-meta">
          <div class="badge">${escapeHtml(level.id)}</div>
          <div class="badge status-badge ${isCompleted(level.id) ? 'done' : ''}" data-level="${level.id}">${isCompleted(level.id) ? 'Completed' : 'Unfinished'}</div>
        </div>
      `;
      card.addEventListener('click', () => openDetail(level, tabId));
      grid.appendChild(card);
    });

    sectionsEl.appendChild(sectCard);
  });
}

// Render the Challenge tab: shows a random prompt and a refresh button
function renderChallengeTab(tab){
  sectionsEl.innerHTML = '';
  const sectCard = document.createElement('div');
  sectCard.className = 'section-card';
  sectCard.innerHTML = `
    <div class="section-title">${escapeHtml(tab.label || 'Challenge')}</div>
    <div class="level-grid">
      <div class="level-card" style="min-height:140px;">
        <div id="challengePrompt" class="prompt-box"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
          <button id="newPromptBtn" class="complete-btn not">New Prompt</button>
        </div>
        <div style="font-size:12px;color:var(--muted);margin-top:10px">Have fun! Explore and get creative.</div>
      </div>
    </div>
  `;
  sectionsEl.appendChild(sectCard);

  const prompts = tab.prompts || [];
  const promptEl = document.getElementById('challengePrompt');
  const btn = document.getElementById('newPromptBtn');

  function pickPrompt(){
    if (!prompts.length) return 'No prompts available.';
    return prompts[Math.floor(Math.random() * prompts.length)];
  }

  function setPrompt(p){
    promptEl.innerHTML = `<div style="font-weight:700">${escapeHtml(p)}</div>`;
  }

  setPrompt(pickPrompt());
  btn.addEventListener('click', () => setPrompt(pickPrompt()));
}

// open right-hand detail panel for a level
function openDetail(level, tabId){
  detailPanel.setAttribute('aria-hidden','false');
  // image placeholder or provided image
  const imageHtml = level.image ? `<img src="${level.image}" alt="${escapeHtml(level.title)}" class="detail-image">`
    : `<div class="detail-image">${escapeHtml(level.id)}</div>`;

  const done = isCompleted(level.id);

  detailContent.innerHTML = `
    ${imageHtml}
    <h3 class="detail-title">${escapeHtml(level.title)}</h3>
    <p class="detail-desc">${escapeHtml(level.description)}</p>
    <div class="prompt-box"><strong>Prompt:</strong><div style="margin-top:8px">${escapeHtml(level.prompt)}</div></div>
    <div class="complete-toggle">
      <div style="font-size:13px;color:${done? 'green': '#666'}">${done ? 'This level is marked COMPLETE' : 'This level is not complete'}</div>
      <button id="toggleComplete" class="complete-btn ${done ? 'done' : 'not'}">${done ? 'MARK UNCOMPLETED' : 'MARK COMPLETED'}</button>
    </div>
  `;

  document.getElementById('toggleComplete').addEventListener('click', () => {
    toggleComplete(level.id);
    // refresh badges & progress
    renderSectionsForTab(tabId);
    updateTabProgressUI(tabId);
    // update detail panel text/button
    openDetail(level, tabId);
  });

  // scroll detail into view on small screens
  detailPanel.scrollIntoView({behavior:'smooth', block:'center'});
}

function closeDetail(){
  detailPanel.setAttribute('aria-hidden','true');
  detailContent.innerHTML = '';
}

// localStorage helpers
function getCompleted(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}
function saveCompleted(arr){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}
function isCompleted(levelId){
  const arr = getCompleted();
  return arr.includes(levelId);
}
function toggleComplete(levelId){
  let arr = getCompleted();
  if (arr.includes(levelId)){
    arr = arr.filter(x => x !== levelId);
  } else {
    arr.push(levelId);
  }
  saveCompleted(arr);
}

// Calculates and updates tab progress UI
function updateTabProgressUI(tabId){
  const tab = (data.tabs || []).find(t => t.id === tabId);
  if (!tab) return;
  // collect all level ids in this tab
  const levelIds = [];
  tab.sections.forEach(s => (s.levels || []).forEach(l => levelIds.push(l.id)));
  const completed = getCompleted();
  const count = levelIds.filter(id => completed.includes(id)).length;
  const total = levelIds.length || 1;
  const percent = Math.round((count / total) * 100);
  globalProgressFill.style.width = percent + '%';
  progressPercent.textContent = percent + '%';
}

// small utilities
function escapeHtml(str){
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, function(m){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
  });
}
function truncate(s, n){
  if (!s) return '';
  return s.length > n ? s.slice(0,n-1) + '…' : s;
}

init();

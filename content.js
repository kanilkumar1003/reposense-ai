/**
 * content.js — Injected into GitHub pages.
 * Builds the floating button and sidebar UI, orchestrates data flow.
 */

(() => {
  // Prevent double-injection
  if (document.getElementById('reposense-fab')) return;

  // ── State ──
  let sidebarOpen = false;
  let analysisData = null;
  let isLoading = false;
  let currentRepo = null;

  // ── Check if we're on a repo page ──
  function getRepoInfo() {
    const match = window.location.pathname.match(/^\/([^/]+)\/([^/]+)/);
    if (!match) return null;
    const owner = match[1];
    const repo = match[2];
    // Exclude GitHub's own pages
    const reserved = [
      'settings', 'notifications', 'explore', 'topics',
      'trending', 'collections', 'events', 'sponsors',
      'login', 'signup', 'organizations', 'marketplace',
      'features', 'codespaces', 'issues', 'pulls',
      'discussions', 'copilot', 'new'
    ];
    if (reserved.includes(owner)) return null;
    return { owner, repo };
  }

  const repoInfo = getRepoInfo();
  if (!repoInfo) return;
  currentRepo = `${repoInfo.owner}/${repoInfo.repo}`;

  // ── Create the floating button ──
  const fab = document.createElement('button');
  fab.id = 'reposense-fab';
  fab.innerHTML = '🔍';
  fab.title = 'Explain this repository with AI';
  fab.addEventListener('click', toggleSidebar);
  document.body.appendChild(fab);

  // ── Create the overlay ──
  const overlay = document.createElement('div');
  overlay.id = 'reposense-overlay';
  overlay.addEventListener('click', closeSidebar);
  document.body.appendChild(overlay);

  // ── Create the sidebar ──
  const sidebar = document.createElement('div');
  sidebar.id = 'reposense-sidebar';
  sidebar.innerHTML = buildSidebarShell();
  document.body.appendChild(sidebar);

  // Wire up close button
  sidebar.querySelector('.reposense-close-btn').addEventListener('click', closeSidebar);

  // Wire up action buttons
  sidebar.querySelector('#reposense-copy-btn').addEventListener('click', copySummary);
  sidebar.querySelector('#reposense-regen-btn').addEventListener('click', regenerate);

  // ── Listen for messages from background / popup ──
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'TOGGLE_SIDEBAR') {
      toggleSidebar();
    }
  });

  // ── Auto-open check ──
  chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
    if (response && response.autoOpen) {
      toggleSidebar();
    }
  });

  // ── Core Functions ──

  function toggleSidebar() {
    if (sidebarOpen) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  function openSidebar() {
    sidebarOpen = true;
    sidebar.classList.add('reposense-open');
    overlay.classList.add('reposense-visible');
    fab.classList.add('reposense-hidden');

    // If we haven't analyzed yet, start analysis
    if (!analysisData && !isLoading) {
      startAnalysis();
    }
  }

  function closeSidebar() {
    sidebarOpen = false;
    sidebar.classList.remove('reposense-open');
    overlay.classList.remove('reposense-visible');
    fab.classList.remove('reposense-hidden');
  }

  async function startAnalysis() {
    isLoading = true;
    renderLoading();

    try {
      // Step 1: Check for API key
      const settings = await sendMessage({ type: 'GET_SETTINGS' });
      if (!settings.apiKey) {
        renderError(
          '🔑',
          'API Key Required',
          'Please add your Groq API key in the extension settings (click the extension icon in the toolbar). It\'s free!'
        );
        isLoading = false;
        return;
      }

      // Step 2: Fetch repo data from GitHub
      const repoData = await GitHubFetcher.fetchAllRepoData(
        window.location.href,
        settings.githubToken
      );

      // Step 3: Send to background for AI analysis
      const result = await sendMessage({
        type: 'ANALYZE_REPO',
        repoData
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // Step 4: Render the results
      analysisData = result.data;
      renderResults(analysisData);
    } catch (error) {
      handleError(error);
    } finally {
      isLoading = false;
    }
  }

  function regenerate() {
    analysisData = null;
    startAnalysis();
  }

  function copySummary() {
    if (!analysisData) return;
    const text = formatSummaryText(analysisData);
    navigator.clipboard.writeText(text).then(() => {
      const btn = sidebar.querySelector('#reposense-copy-btn');
      btn.classList.add('reposense-copied');
      btn.innerHTML = '✓ Copied!';
      setTimeout(() => {
        btn.classList.remove('reposense-copied');
        btn.innerHTML = '📋 Copy Summary';
      }, 2000);
    });
  }

  function formatSummaryText(data) {
    let text = `# ${currentRepo}\n\n`;
    text += `## Summary\n${data.summary}\n\n`;
    text += `## Tech Stack\n${data.techStack.join(', ')}\n\n`;
    text += `## Folder Structure\n`;
    data.folderStructure.forEach(f => { text += `- ${f.name}: ${f.purpose}\n`; });
    text += `\n## Key Files\n`;
    data.keyFiles.forEach(f => { text += `- ${f.file}: ${f.reason}\n`; });
    text += `\n## Getting Started\n`;
    data.gettingStarted.forEach((s, i) => { text += `${i + 1}. ${s}\n`; });
    text += `\n## Complexity: ${data.complexityScore}\n${data.complexityReason}\n`;
    return text;
  }

  // ── Rendering Functions ──

  function buildSidebarShell() {
    return `
      <div id="reposense-header">
        <div id="reposense-header-title">
          <span class="reposense-logo-icon">🧠</span>
          <h1>
            RepoSense AI
            <span class="reposense-repo-name">${escapeHtml(currentRepo)}</span>
          </h1>
        </div>
        <button class="reposense-close-btn" title="Close sidebar">✕</button>
      </div>
      <div id="reposense-actions">
        <button id="reposense-copy-btn" class="reposense-action-btn">📋 Copy Summary</button>
        <button id="reposense-regen-btn" class="reposense-action-btn">🔄 Regenerate</button>
      </div>
      <div id="reposense-content"></div>
      <div id="reposense-footer">
        Powered by <a href="https://groq.com" target="_blank">Groq AI</a> · RepoSense v1.0
      </div>
    `;
  }

  function renderLoading() {
    const content = sidebar.querySelector('#reposense-content');
    content.innerHTML = `
      <div class="reposense-skeleton">
        <div class="reposense-skeleton-block">
          <div class="reposense-skeleton-block-title"></div>
          <div class="reposense-skeleton-line reposense-w100"></div>
          <div class="reposense-skeleton-line reposense-w80"></div>
          <div class="reposense-skeleton-line reposense-w60"></div>
        </div>
        <div class="reposense-skeleton-block">
          <div class="reposense-skeleton-block-title"></div>
          <div class="reposense-skeleton-pills">
            <div class="reposense-skeleton-pill"></div>
            <div class="reposense-skeleton-pill"></div>
            <div class="reposense-skeleton-pill"></div>
            <div class="reposense-skeleton-pill"></div>
          </div>
        </div>
        <div class="reposense-skeleton-block">
          <div class="reposense-skeleton-block-title"></div>
          <div class="reposense-skeleton-line reposense-w100"></div>
          <div class="reposense-skeleton-line reposense-w70"></div>
          <div class="reposense-skeleton-line reposense-w80"></div>
          <div class="reposense-skeleton-line reposense-w60"></div>
        </div>
        <div class="reposense-skeleton-block">
          <div class="reposense-skeleton-block-title"></div>
          <div class="reposense-skeleton-line reposense-w80"></div>
          <div class="reposense-skeleton-line reposense-w100"></div>
          <div class="reposense-skeleton-line reposense-w70"></div>
        </div>
        <div class="reposense-loading-status">
          <span class="reposense-spinner"></span>
          Analyzing repository...
        </div>
      </div>
    `;
  }

  function renderResults(data) {
    const content = sidebar.querySelector('#reposense-content');

    const complexityClass = data.complexityScore.toLowerCase().includes('beginner')
      ? 'reposense-beginner'
      : data.complexityScore.toLowerCase().includes('advanced')
        ? 'reposense-advanced'
        : 'reposense-intermediate';

    content.innerHTML = `
      ${buildSection('📋', 'What This Does', `
        <p class="reposense-summary-text">${escapeHtml(data.summary)}</p>
      `)}

      ${buildSection('⚙️', 'Tech Stack', `
        <div class="reposense-pills">
          ${data.techStack.map(t => `<span class="reposense-pill">${escapeHtml(t)}</span>`).join('')}
        </div>
      `)}

      ${buildSection('📁', 'Folder Structure', `
        <table class="reposense-folder-table">
          ${data.folderStructure.map(f => `
            <tr>
              <td class="reposense-folder-name">📁 ${escapeHtml(f.name)}</td>
              <td class="reposense-folder-purpose">${escapeHtml(f.purpose)}</td>
            </tr>
          `).join('')}
        </table>
      `)}

      ${buildSection('📌', 'Key Files to Read', `
        <ul class="reposense-key-files">
          ${data.keyFiles.map(f => `
            <li class="reposense-key-file">
              <div class="reposense-key-file-name">${escapeHtml(f.file)}</div>
              <div class="reposense-key-file-reason">${escapeHtml(f.reason)}</div>
            </li>
          `).join('')}
        </ul>
      `)}

      ${buildSection('🚀', 'Getting Started', `
        <ol class="reposense-steps">
          ${data.gettingStarted.map((step, i) => `
            <li class="reposense-step">
              <span class="reposense-step-number">${i + 1}</span>
              <span class="reposense-step-text">${formatStepText(step)}</span>
            </li>
          `).join('')}
        </ol>
      `)}

      ${buildSection('📊', 'Complexity', `
        <div class="reposense-complexity">
          <span class="reposense-complexity-badge ${complexityClass}">
            ${escapeHtml(data.complexityScore)}
          </span>
          <span class="reposense-complexity-reason">${escapeHtml(data.complexityReason)}</span>
        </div>
      `)}
    `;

    // Wire up section toggle
    content.querySelectorAll('.reposense-section-header').forEach(header => {
      header.addEventListener('click', () => {
        header.closest('.reposense-section').classList.toggle('reposense-collapsed');
      });
    });

    // Slide-in animation for each card
    const sections = content.querySelectorAll('.reposense-section');
    sections.forEach((section, i) => {
      section.style.opacity = '0';
      section.style.transform = 'translateY(12px)';
      section.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
      setTimeout(() => {
        section.style.opacity = '1';
        section.style.transform = 'translateY(0)';
      }, 80 * i);
    });
  }

  function buildSection(icon, title, bodyHTML) {
    return `
      <div class="reposense-section">
        <div class="reposense-section-header">
          <div class="reposense-section-header-left">
            <span class="reposense-section-icon">${icon}</span>
            <span class="reposense-section-title">${title}</span>
          </div>
          <span class="reposense-section-chevron">▼</span>
        </div>
        <div class="reposense-section-body">
          ${bodyHTML}
        </div>
      </div>
    `;
  }

  function renderError(icon, title, message, showRetry = false) {
    const content = sidebar.querySelector('#reposense-content');
    content.innerHTML = `
      <div class="reposense-error">
        <div class="reposense-error-icon">${icon}</div>
        <div class="reposense-error-title">${escapeHtml(title)}</div>
        <div class="reposense-error-message">${escapeHtml(message)}</div>
        ${showRetry ? '<button class="reposense-retry-btn">Try Again</button>' : ''}
      </div>
    `;
    if (showRetry) {
      content.querySelector('.reposense-retry-btn').addEventListener('click', regenerate);
    }
  }

  function handleError(error) {
    const msg = error.message || String(error);

    if (msg.includes('Extension context invalidated') || msg.includes('context invalidated')) {
      renderError(
        '🔄',
        'Please Refresh the Page',
        'The extension was updated. Refresh this page (F5) and try again.'
      );
    } else if (msg === 'RATE_LIMITED') {
      renderError(
        '⏱️',
        'Rate Limited',
        'GitHub API rate limit reached (60 requests/hour for unauthenticated users). Add a GitHub token in settings for 5,000 requests/hour.',
        true
      );
    } else if (msg === 'NOT_FOUND') {
      renderError(
        '🔒',
        'Repo Not Found',
        'This repository is private or doesn\'t exist. Private repos require a GitHub token in settings.'
      );
    } else if (msg === 'NO_API_KEY') {
      renderError(
        '🔑',
        'API Key Required',
        'Please add your Groq API key in the extension settings (click the extension icon in the toolbar). It\'s free!'
      );
    } else if (msg === 'INVALID_API_KEY') {
      renderError(
        '🔑',
        'Invalid API Key',
        'Your Groq API key appears to be invalid. Please check it in the extension settings.',
        true
      );
    } else if (msg === 'INVALID_URL') {
      renderError(
        '❓',
        'Not a Repository',
        'This doesn\'t appear to be a GitHub repository page.'
      );
    } else {
      renderError(
        '⚠️',
        'Something Went Wrong',
        msg.length > 300 ? msg.substring(0, 300) + '...' : msg,
        true
      );
    }
  }

  // ── Utility Helpers ──

  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatStepText(text) {
    // Strip leading "Step N:" if present
    let cleaned = text.replace(/^Step\s*\d+\s*:\s*/i, '');
    // Wrap backtick-delimited text in <code> tags
    cleaned = escapeHtml(cleaned).replace(
      /`([^`]+)`/g,
      '<code>$1</code>'
    );
    return cleaned;
  }
})();

/**
 * popup.js — Handles settings logic for the extension popup.
 */

document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('groq-api-key');
  const githubTokenInput = document.getElementById('github-token');
  const autoOpenToggle = document.getElementById('auto-open');
  const saveBtn = document.getElementById('save-btn');
  const saveStatus = document.getElementById('save-status');
  const toggleKeyBtn = document.getElementById('toggle-key-visibility');
  const toggleTokenBtn = document.getElementById('toggle-token-visibility');

  // ── Load saved settings ──
  chrome.storage.local.get(['groqApiKey', 'githubToken', 'autoOpen'], (result) => {
    if (result.groqApiKey) {
      apiKeyInput.value = result.groqApiKey;
    }
    if (result.githubToken) {
      githubTokenInput.value = result.githubToken;
    }
    autoOpenToggle.checked = result.autoOpen || false;
  });

  // ── Toggle visibility for API key ──
  toggleKeyBtn.addEventListener('click', () => {
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
    toggleKeyBtn.textContent = isPassword ? '🙈' : '👁️';
  });

  // ── Toggle visibility for GitHub token ──
  toggleTokenBtn.addEventListener('click', () => {
    const isPassword = githubTokenInput.type === 'password';
    githubTokenInput.type = isPassword ? 'text' : 'password';
    toggleTokenBtn.textContent = isPassword ? '🙈' : '👁️';
  });

  // ── Save settings ──
  saveBtn.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    const githubToken = githubTokenInput.value.trim();
    const autoOpen = autoOpenToggle.checked;

    // Validate Groq API key format if provided
    if (apiKey && !apiKey.startsWith('gsk_')) {
      showStatus('API key should start with "gsk_"', 'error');
      return;
    }

    chrome.storage.local.set({
      groqApiKey: apiKey,
      githubToken: githubToken,
      autoOpen: autoOpen
    }, () => {
      showStatus('✓ Settings saved successfully!', 'success');
    });
  });

  // ── Status message helper ──
  function showStatus(message, type) {
    saveStatus.textContent = message;
    saveStatus.className = `popup-save-status ${type}`;
    setTimeout(() => {
      saveStatus.textContent = '';
      saveStatus.className = 'popup-save-status';
    }, 3000);
  }
});

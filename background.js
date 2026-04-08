/**
 * background.js — Service worker for RepoSense AI.
 * Handles Groq API calls from the content script via message passing.
 * Uses Groq's free tier (30 RPM, 14,400 RPD) with Llama/Gemma models.
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `You are an expert developer and technical writer. Your job is to analyze GitHub repository data and explain it clearly to another developer who is seeing this codebase for the first time. Be concise, practical, and direct. Avoid fluff. Always respond with valid JSON only, no markdown fencing.`;

/**
 * Build the user prompt from repo data.
 */
function buildUserPrompt(data) {
  const rootListing = data.rootContents
    .map(item => `  ${item.type === 'dir' ? '📁' : '📄'} ${item.name} (${item.type})`)
    .join('\n');

  const languageBreakdown = Object.entries(data.languages)
    .map(([lang, bytes]) => `  ${lang}: ${bytes} bytes`)
    .join('\n');

  const configSection = Object.entries(data.configFiles)
    .map(([filename, content]) => `--- ${filename} ---\n${content.substring(0, 1000)}`)
    .join('\n\n');

  return `Here is the data for the GitHub repo: ${data.owner}/${data.repo}

Repo Description: ${data.description}
Primary Language: ${data.language}
Stars: ${data.stars} | Forks: ${data.forks}
Topics: ${data.topics.join(', ') || 'None'}

Languages Breakdown:
${languageBreakdown}

Root Directory Contents:
${rootListing}

README Content (truncated):
${data.readme}

Key Config Files Found:
${configSection || 'None detected'}

Respond ONLY in the following JSON format with no extra text:
{
  "summary": "2-3 sentence plain English explanation of what this project does",
  "techStack": ["item1", "item2"],
  "folderStructure": [
    { "name": "src", "purpose": "Contains all source code" }
  ],
  "keyFiles": [
    { "file": "src/index.js", "reason": "Entry point of the app" }
  ],
  "gettingStarted": [
    "Step 1: Clone the repo",
    "Step 2: Run npm install"
  ],
  "complexityScore": "Beginner | Intermediate | Advanced",
  "complexityReason": "Brief reason for the complexity rating"
}`;
}

/**
 * Call Groq API with the repo data.
 */
async function callGroqAPI(apiKey, repoData) {
  const userPrompt = buildUserPrompt(repoData);

  let response;
  try {
    response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.4,
        max_tokens: 2048,
        response_format: { type: 'json_object' }
      })
    });
  } catch (fetchError) {
    throw new Error(`Network error: ${fetchError.message}. Check your internet connection.`);
  }

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errorData = await response.json();
      errorDetail = errorData?.error?.message || JSON.stringify(errorData);
    } catch {
      try {
        errorDetail = await response.text();
      } catch {
        errorDetail = 'Unknown error';
      }
    }

    if (response.status === 401) {
      throw new Error('INVALID_API_KEY');
    }
    if (response.status === 429) {
      throw new Error('Rate limited — Groq free tier allows 30 requests/minute. Wait a moment and try again.');
    }
    throw new Error(`[${response.status}] ${errorDetail}`);
  }

  const result = await response.json();

  // Extract text from OpenAI-compatible response format
  const text = result.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('Empty response from Groq API');
  }

  // Extract JSON from response (handle potential markdown fencing)
  let jsonString = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonString = jsonMatch[1];
  }

  try {
    return JSON.parse(jsonString.trim());
  } catch (e) {
    throw new Error('Failed to parse AI response as JSON. Raw: ' + text.substring(0, 200));
  }
}

/**
 * Listen for messages from content script.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYZE_REPO') {
    handleAnalyzeRepo(message.repoData)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  if (message.type === 'GET_API_KEY') {
    chrome.storage.local.get(['groqApiKey'], (result) => {
      sendResponse({ apiKey: result.groqApiKey || null });
    });
    return true;
  }

  if (message.type === 'GET_SETTINGS') {
    chrome.storage.local.get(['groqApiKey', 'autoOpen', 'githubToken'], (result) => {
      sendResponse({
        apiKey: result.groqApiKey || null,
        autoOpen: result.autoOpen || false,
        githubToken: result.githubToken || null
      });
    });
    return true;
  }

  if (message.type === 'OPEN_SIDEBAR') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_SIDEBAR' });
      }
    });
    sendResponse({ success: true });
    return true;
  }
});

/**
 * Handle repo analysis request.
 */
async function handleAnalyzeRepo(repoData) {
  const settings = await chrome.storage.local.get(['groqApiKey']);
  const apiKey = settings.groqApiKey;

  if (!apiKey) {
    throw new Error('NO_API_KEY');
  }

  return callGroqAPI(apiKey, repoData);
}

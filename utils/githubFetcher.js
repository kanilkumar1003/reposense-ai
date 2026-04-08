/**
 * githubFetcher.js — Fetches repository data from GitHub's public REST API.
 * No authentication required for public repos (60 req/hr rate limit).
 */

const GitHubFetcher = (() => {
  const API_BASE = 'https://api.github.com';

  const CONFIG_FILES = [
    'package.json',
    'requirements.txt',
    'Gemfile',
    'go.mod',
    'pom.xml',
    'Dockerfile',
    'Makefile',
    '.env.example',
    'Cargo.toml',
    'composer.json',
    'build.gradle',
    'tsconfig.json',
    'pyproject.toml',
    'setup.py',
    'CMakeLists.txt'
  ];

  /**
   * Parse the current GitHub URL to extract owner and repo name.
   */
  function parseRepoURL(url) {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return null;
    return {
      owner: match[1],
      repo: match[2].replace(/\.git$/, '').split('#')[0].split('?')[0]
    };
  }

  /**
   * Make an API request with error handling.
   */
  async function apiFetch(endpoint, token = null) {
    const headers = {
      'Accept': 'application/vnd.github.v3+json'
    };
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, { headers });

    if (response.status === 403) {
      const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
      if (rateLimitRemaining === '0') {
        throw new Error('RATE_LIMITED');
      }
    }

    if (response.status === 404) {
      throw new Error('NOT_FOUND');
    }

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Fetch basic repo information.
   */
  async function fetchRepoInfo(owner, repo, token) {
    return apiFetch(`/repos/${owner}/${repo}`, token);
  }

  /**
   * Fetch root directory contents.
   */
  async function fetchContents(owner, repo, token) {
    return apiFetch(`/repos/${owner}/${repo}/contents/`, token);
  }

  /**
   * Fetch and decode the README.
   */
  async function fetchReadme(owner, repo, token) {
    try {
      const data = await apiFetch(`/repos/${owner}/${repo}/readme`, token);
      if (data.content) {
        return atob(data.content.replace(/\n/g, ''));
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch language breakdown.
   */
  async function fetchLanguages(owner, repo, token) {
    return apiFetch(`/repos/${owner}/${repo}/languages`, token);
  }

  /**
   * Fetch a specific file's raw content.
   */
  async function fetchFileContent(owner, repo, path, token) {
    try {
      const data = await apiFetch(`/repos/${owner}/${repo}/contents/${path}`, token);
      if (data.content) {
        return atob(data.content.replace(/\n/g, ''));
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch all config files that exist in the repo.
   */
  async function fetchConfigFiles(owner, repo, rootContents, token) {
    const rootFileNames = rootContents
      .filter(item => item.type === 'file')
      .map(item => item.name);

    const existingConfigs = CONFIG_FILES.filter(f => rootFileNames.includes(f));
    const configData = {};

    // Fetch up to 5 config files to stay within rate limits
    const toFetch = existingConfigs.slice(0, 5);

    await Promise.all(
      toFetch.map(async (filename) => {
        const content = await fetchFileContent(owner, repo, filename, token);
        if (content) {
          configData[filename] = content.substring(0, 1500);
        }
      })
    );

    return configData;
  }

  /**
   * Fetch all repo data needed for AI analysis.
   */
  async function fetchAllRepoData(url, token = null) {
    const parsed = parseRepoURL(url);
    if (!parsed) throw new Error('INVALID_URL');

    const { owner, repo } = parsed;

    // Parallel fetch of all data
    const [repoInfo, contents, readme, languages] = await Promise.all([
      fetchRepoInfo(owner, repo, token),
      fetchContents(owner, repo, token),
      fetchReadme(owner, repo, token),
      fetchLanguages(owner, repo, token)
    ]);

    // Fetch config files based on what's in root
    const configFiles = await fetchConfigFiles(owner, repo, contents, token);

    // Format the data
    const rootContents = contents.map(item => ({
      name: item.name,
      type: item.type,
      size: item.size
    }));

    return {
      owner,
      repo,
      description: repoInfo.description || 'No description provided',
      language: repoInfo.language || 'Unknown',
      stars: repoInfo.stargazers_count,
      forks: repoInfo.forks_count,
      topics: repoInfo.topics || [],
      rootContents,
      readme: readme ? readme.substring(0, 3000) : 'No README found',
      languages,
      configFiles
    };
  }

  // Public API
  return {
    parseRepoURL,
    fetchAllRepoData
  };
})();

// Make available globally for content script
if (typeof window !== 'undefined') {
  window.GitHubFetcher = GitHubFetcher;
}

# 🧠 RepoSense AI

**Instantly understand any GitHub repository with AI-powered analysis.**

RepoSense AI is a Chrome Extension that adds an intelligent sidebar to any GitHub repository page. Click a button, and get a complete breakdown of what the project does, its tech stack, folder structure, key files, and how to get started — all powered by AI.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-34A853?style=for-the-badge)
![Groq AI](https://img.shields.io/badge/Powered_by-Groq_AI-F55036?style=for-the-badge)
![License MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📋 **Project Summary** | Plain English explanation of what the project does |
| ⚙️ **Tech Stack Detection** | Languages, frameworks, and tools auto-detected |
| 📁 **Folder Structure** | Top-level folders with one-line purpose explanations |
| 📌 **Key Files to Read** | AI picks 3-5 most important files with reasons |
| 🚀 **Getting Started Guide** | Step-by-step instructions to run locally |
| 📊 **Complexity Score** | Beginner / Intermediate / Advanced rating |

### Additional Features
- 🌙 **Dark theme** matching GitHub's aesthetic
- ⚡ **Skeleton loading** animation while analyzing
- 📋 **Copy Summary** as formatted Markdown
- 🔄 **Regenerate** analysis with one click
- 📱 **Responsive** — works on all screen sizes
- 🔒 **Privacy-first** — your API keys stay in your browser

---

## 🚀 Quick Start

### 1. Get a Free API Key

Get a **free** Groq API key (no credit card required):
1. Go to [console.groq.com/keys](https://console.groq.com/keys)
2. Sign up with Google or GitHub
3. Click **Create API Key** → copy it

> **Groq Free Tier:** 30 requests/min, 14,400 requests/day — more than enough!

### 2. Install the Extension

#### From Source (Developer Mode)
1. Clone this repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/reposense-ai.git
   ```
2. Open Chrome → navigate to `chrome://extensions/`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** → select the `reposense-ai` folder

### 3. Configure

1. Click the RepoSense AI extension icon in the toolbar
2. Paste your **Groq API key**
3. *(Optional)* Add a GitHub token for higher API rate limits
4. Click **Save Settings**

### 4. Use It!

1. Navigate to any public GitHub repository
2. Click the **🔍** floating button (bottom-right corner)
3. The AI sidebar slides in with a complete repo analysis!

---

## 🏗️ Architecture

```
reposense-ai/
├── manifest.json            # Chrome Extension Manifest V3
├── background.js            # Service worker — handles Groq API calls
├── content.js               # Injected into GitHub — builds sidebar UI
├── content.css              # Sidebar styles (dark theme)
├── popup.html               # Extension popup (settings)
├── popup.js                 # Settings logic (save/load API keys)
├── popup.css                # Popup styles
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   ├── icon128.png
│   └── icon.svg             # Source SVG
└── utils/
    └── githubFetcher.js     # GitHub REST API wrapper
```

### How It Works

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────┐
│  GitHub Page  │────▶│  content.js       │────▶│ background.js│
│  (User visits │     │  (Sidebar UI +    │     │ (Service     │
│   a repo)     │     │   GitHub Fetcher) │     │  Worker)     │
└──────────────┘     └──────────────────┘     └──────┬──────┘
                                                       │
                                                       ▼
                                               ┌─────────────┐
                                               │  Groq API    │
                                               │  (Llama 3.3  │
                                               │   70B)       │
                                               └─────────────┘
```

1. **Detect** — `content.js` checks if URL matches `github.com/:owner/:repo`
2. **Fetch** — `githubFetcher.js` gathers repo info, README, languages, and config files via GitHub REST API
3. **Analyze** — Data is sent to `background.js` which calls Groq's API with Llama 3.3 70B
4. **Render** — The structured JSON response is rendered as a beautiful sidebar

---

## ⚙️ Configuration

### Extension Settings

| Setting | Description | Required |
|---------|-------------|----------|
| **Groq API Key** | Powers the AI analysis ([Get free key](https://console.groq.com/keys)) | ✅ Yes |
| **GitHub Token** | Increases GitHub API rate limit from 60 to 5,000 req/hr ([Create token](https://github.com/settings/tokens)) | ❌ Optional |
| **Auto-open** | Automatically open sidebar when visiting repo pages | ❌ Optional |

### GitHub Token (Optional)

Without a token, GitHub allows 60 API requests/hour. For heavy usage:
1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Generate a new **classic token** — no scopes needed
3. Paste it in the extension settings

---

## 🛡️ Privacy & Security

- **API keys** are stored locally in your browser via `chrome.storage.local`
- **No data is collected** — everything stays between your browser, GitHub's API, and Groq's API
- **No tracking, no analytics** — zero telemetry
- Works with **public repositories only** (unless you add a GitHub token)

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. Fork this repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Ideas for Contributions
- [ ] Support for more AI providers (OpenAI, Anthropic, etc.)
- [ ] Cache analysis results to avoid re-fetching
- [ ] Support for private repos with auth
- [ ] Export analysis as PDF
- [ ] Light theme option
- [ ] Keyboard shortcut to toggle sidebar

---

## 📝 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Groq](https://groq.com) — Lightning-fast free AI inference
- [Meta Llama 3.3](https://llama.meta.com) — Powerful open-source language model
- [GitHub REST API](https://docs.github.com/en/rest) — Repository data access

---

<p align="center">
  <b>⭐ Star this repo if you find it useful!</b>
</p>

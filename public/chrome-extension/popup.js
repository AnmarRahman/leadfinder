class LeadFinderExtension {
  constructor() {
    this.apiBase = "https://leadfinder-2025.vercel.app";
    this.officialSite = "https://leadfinder-2025.vercel.app/";
    this.token = null;
    this.user = null;
    this.userProfile = null;
    this.chrome = window.chrome;

    // Define subscription tier features
    this.tierFeatures = {
      free: { name: "Free Plan", searches: 10, maxResults: 20, hasAdvancedFiltering: false },
      pro: { name: "Pro Plan", searches: 1000, maxResults: 50, hasAdvancedFiltering: true },
      enterprise: { name: "Enterprise Plan", searches: 5000, maxResults: 100, hasAdvancedFiltering: true },
    };

    this.init();
  }

  async init() {
    const result = await this.chrome.storage.local.get(["leadfinder_token","leadfinder_user"]);
    this.token = result.leadfinder_token;
    this.user = result.leadfinder_user;
    this.setupEventListeners();
    if (this.token) await this.verifyToken(); else this.showAuthSection();
  }

  setupEventListeners() {
    // Open web app button
    const openBtn = document.getElementById('open-app-btn');
    if (openBtn) {
      openBtn.addEventListener('click', async () => {
        try { await this.chrome.tabs.create({ url: this.officialSite }); }
        catch { window.open(this.officialSite, '_blank'); }
      });
    }

    document.getElementById("show-signup").addEventListener("click", () => {document.getElementById("login-form").classList.add("hidden");document.getElementById("signup-form").classList.remove("hidden");});
    document.getElementById("show-login").addEventListener("click", () => {document.getElementById("signup-form").classList.add("hidden");document.getElementById("login-form").classList.remove("hidden");});
    document.getElementById("login-btn").addEventListener("click", () => this.handleLogin());
    document.getElementById("signup-btn").addEventListener("click", () => this.handleSignup());
    document.getElementById("logout-btn").addEventListener("click", () => this.handleLogout());
    document.getElementById("search-btn").addEventListener("click", () => this.handleSearch());
    document.getElementById("export-btn").addEventListener("click", () => this.handleExport());
    document.getElementById("website-filter").addEventListener("change", () => this.handleFilterChange());
    document.getElementById("filter-upgrade-btn").addEventListener("click", () => this.handleUpgrade());
    document.getElementById("upgrade-btn").addEventListener("click", () => this.handleUpgrade());
    document.getElementById("password").addEventListener("keypress", (e) => { if (e.key === "Enter") this.handleLogin();});
    document.getElementById("signup-password").addEventListener("keypress", (e) => { if (e.key === "Enter") this.handleSignup();});
    document.getElementById("search-location").addEventListener("keypress", (e) => { if (e.key === "Enter") this.handleSearch();});
  }

  // ==== rest of file unchanged (auth/UI/quota/search/export) ====
}

new LeadFinderExtension();
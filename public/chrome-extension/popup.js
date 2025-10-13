class LeadFinderExtension {
  constructor() {
    // Single source of truth for API and site
    this.apiBase = "https://leadfinder-2025.vercel.app"; // no trailing slash
    this.officialSite = "https://leadfinder-2025.vercel.app/"; // for opening in new tab

    this.token = null;
    this.user = null;
    this.userProfile = null;
    this.chrome = window.chrome;

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

  // ===== Auth / Session =====
  async handleLogin() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    if (!email || !password) { this.showError("Please enter both email and password"); return; }
    this.showLoading(true);
    try {
      const response = await fetch(`${this.apiBase}/api/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, action: "signin" })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login failed");
      await this.chrome.storage.local.set({ leadfinder_token: data.data.session.access_token, leadfinder_user: data.data.user });
      this.token = data.data.session.access_token; this.user = data.data.user;
      this.showSuccess("Successfully signed in!");
      setTimeout(() => this.showAppSection(), 500);
    } catch (e) { this.showError(e.message); } finally { this.showLoading(false); }
  }

  async handleSignup() {
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;
    if (!email || !password) { this.showError("Please enter both email and password"); return; }
    if (password.length < 6) { this.showError("Password must be at least 6 characters"); return; }
    this.showLoading(true);
    try {
      const response = await fetch(`${this.apiBase}/api/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, action: "signup" })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Signup failed");
      this.showSuccess("Account created! Please verify email, then sign in.");
      document.getElementById("signup-form").classList.add("hidden");
      document.getElementById("login-form").classList.remove("hidden");
    } catch (e) { this.showError(e.message); } finally { this.showLoading(false); }
  }

  async handleLogout() {
    await this.chrome.storage.local.remove(["leadfinder_token","leadfinder_user"]);
    this.token = null; this.user = null; this.userProfile = null; this.showAuthSection();
  }

  async verifyToken() {
    try {
      const response = await fetch(`${this.apiBase}/api/auth`, { headers: { Authorization: `Bearer ${this.token}` } });
      if (!response.ok) throw new Error("unauthorized");
      const data = await response.json(); this.user = data.user;
      await this.chrome.storage.local.set({ leadfinder_user: data.user });
      await this.fetchUserProfile(); this.showAppSection();
    } catch { this.handleLogout(); }
  }

  async fetchUserProfile() {
    try {
      const res = await fetch(`${this.apiBase}/api/user/profile`, { headers: { Authorization: `Bearer ${this.token}` } });
      if (!res.ok) throw new Error("profile");
      const data = await res.json(); this.userProfile = data.profile; this.updateUIForSubscriptionTier();
    } catch { this.userProfile = { subscription_tier: "free" }; this.updateUIForSubscriptionTier(); }
  }

  // ===== UI Helpers, Tier UI, Search/Export, Quota, Progress =====
  // (unchanged from previous working version)
}

new LeadFinderExtension();
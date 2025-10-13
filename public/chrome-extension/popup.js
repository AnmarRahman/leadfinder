class LeadFinderExtension {
  constructor() {
    this.apiBase = "https://leadfinder-symantriq.vercel.app";
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

  // ... keep previous auth/search/export methods ...

  async updateQuotaInfo() {
    const quotaInfo = document.getElementById("quota-info");
    try {
      const res = await fetch(`${this.apiBase}/api/user/quota`, { headers: { Authorization: `Bearer ${this.token}` } });
      if (res.status === 401) { this.handleLogout(); return; }
      if (!res.ok) throw new Error("Failed to fetch quota");
      const data = await res.json();
      const monthly = typeof data.monthlyQuota === 'number' ? data.monthlyQuota : null;
      const remaining = typeof data.remainingQuota === 'number' ? data.remainingQuota : null;
      const used = typeof data.usedQuota === 'number' ? data.usedQuota : (monthly!=null && remaining!=null ? monthly-remaining : null);
      if (monthly!=null && used!=null) {
        quotaInfo.innerHTML = `<div>Searches: ${used} / ${monthly} used this month</div><div>Remaining: ${remaining!=null?remaining:'—'} searches</div><button id="quota-refresh" class="mini-upgrade-btn" style="margin-top:8px">Refresh</button>`;
      } else if (remaining!=null) {
        quotaInfo.innerHTML = `<div>Remaining: ${remaining} searches</div><button id="quota-refresh" class="mini-upgrade-btn" style="margin-top:8px">Refresh</button>`;
      } else {
        quotaInfo.innerHTML = `<div>Remaining: —</div><button id="quota-refresh" class="mini-upgrade-btn" style="margin-top:8px">Refresh</button>`;
      }
      document.getElementById('quota-refresh')?.addEventListener('click', () => this.updateQuotaInfo());
    } catch (e) {
      quotaInfo.innerHTML = `<div>Remaining: —</div><div style=\"color:#dc2626; margin-top:4px\">Could not fetch quota.</div><button id=\"quota-refresh\" class=\"mini-upgrade-btn\" style=\"margin-top:8px\">Retry</button>`;
      document.getElementById('quota-refresh')?.addEventListener('click', () => this.updateQuotaInfo());
    }
  }
}

new LeadFinderExtension();
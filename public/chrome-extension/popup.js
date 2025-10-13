class LeadFinderExtension {
  constructor() {
    this.apiBase = "https://leadfinder-2025.vercel.app";
    this.token = null;
    this.user = null;
    this.userProfile = null;
    this.chrome = window.chrome;

    // Define subscription tier features
    this.tierFeatures = {
      free: {
        name: "Free Plan",
        searches: 10,
        maxResults: 20,
        hasAdvancedFiltering: false,
        hasAPIAccess: false,
        supportLevel: "Standard",
      },
      pro: {
        name: "Pro Plan",
        searches: 1000,
        maxResults: 50,
        hasAdvancedFiltering: true,
        hasAPIAccess: false,
        supportLevel: "Priority",
      },
      enterprise: {
        name: "Enterprise Plan",
        searches: 5000,
        maxResults: 100,
        hasAdvancedFiltering: true,
        hasAPIAccess: true,
        supportLevel: "Dedicated",
      },
    };

    this.init();
  }

  async init() {
    // Load saved token
    const result = await this.chrome.storage.local.get([
      "leadfinder_token",
      "leadfinder_user",
    ]);
    this.token = result.leadfinder_token;
    this.user = result.leadfinder_user;

    this.setupEventListeners();

    if (this.token) {
      await this.verifyToken();
    } else {
      this.showAuthSection();
    }
  }

  setupEventListeners() {
    // Auth form toggles
    document.getElementById("show-signup").addEventListener("click", () => {
      document.getElementById("login-form").classList.add("hidden");
      document.getElementById("signup-form").classList.remove("hidden");
    });

    document.getElementById("show-login").addEventListener("click", () => {
      document.getElementById("signup-form").classList.add("hidden");
      document.getElementById("login-form").classList.remove("hidden");
    });

    // Auth buttons
    document
      .getElementById("login-btn")
      .addEventListener("click", () => this.handleLogin());
    document
      .getElementById("signup-btn")
      .addEventListener("click", () => this.handleSignup());
    document
      .getElementById("logout-btn")
      .addEventListener("click", () => this.handleLogout());

    // Search functionality
    document
      .getElementById("search-btn")
      .addEventListener("click", () => this.handleSearch());
    document
      .getElementById("export-btn")
      .addEventListener("click", () => this.handleExport());

    // Website filter functionality
    document
      .getElementById("website-filter")
      .addEventListener("change", () => this.handleFilterChange());
    document
      .getElementById("filter-upgrade-btn")
      .addEventListener("click", () => this.handleUpgrade());

    // Upgrade button
    document
      .getElementById("upgrade-btn")
      .addEventListener("click", () => this.handleUpgrade());

    // Enter key support
    document.getElementById("password").addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.handleLogin();
    });
    document
      .getElementById("signup-password")
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.handleSignup();
      });
    document
      .getElementById("search-location")
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.handleSearch();
      });
  }

  async handleLogin() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (!email || !password) {
      this.showError("Please enter both email and password");
      return;
    }

    this.showLoading(true);

    try {
      const response = await fetch(`${this.apiBase}/api/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, action: "signin" }),
      });

      let data;
      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { error: text || "Server error occurred" };
      }

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Store token and user data
      await this.chrome.storage.local.set({
        leadfinder_token: data.data.session.access_token,
        leadfinder_user: data.data.user,
      });

      this.token = data.data.session.access_token;
      this.user = data.data.user;

      this.showSuccess("Successfully signed in!");
      setTimeout(() => this.showAppSection(), 1000);
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.showLoading(false);
    }
  }

  async handleSignup() {
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;

    if (!email || !password) {
      this.showError("Please enter both email and password");
      return;
    }

    if (password.length < 6) {
      this.showError("Password must be at least 6 characters");
      return;
    }

    this.showLoading(true);

    try {
      const response = await fetch(`${this.apiBase}/api/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, action: "signup" }),
      });

      let data;
      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { error: text || "Server error occurred" };
      }

      if (!response.ok) {
        throw new Error(data.error || "Signup failed");
      }

      this.showSuccess(
        "Account created! Please check your email to verify your account, then sign in."
      );

      // Switch back to login form
      document.getElementById("signup-form").classList.add("hidden");
      document.getElementById("login-form").classList.remove("hidden");
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.showLoading(false);
    }
  }

  async handleLogout() {
    await this.chrome.storage.local.remove([
      "leadfinder_token",
      "leadfinder_user",
    ]);
    this.token = null;
    this.user = null;
    this.userProfile = null;
    this.showAuthSection();
  }

  async verifyToken() {
    try {
      const response = await fetch(`${this.apiBase}/api/auth`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });

      if (response.ok) {
        const data = await response.json();
        this.user = data.user;
        await this.chrome.storage.local.set({
          leadfinder_user: data.user,
        });
        await this.fetchUserProfile();
        this.showAppSection();
      } else {
        this.handleLogout();
      }
    } catch (error) {
      this.handleLogout();
    }
  }

  async fetchUserProfile() {
    try {
      const response = await fetch(`${this.apiBase}/api/user/profile`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });

      if (response.ok) {
        const data = await response.json();
        this.userProfile = data.profile;
        this.updateUIForSubscriptionTier();
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      // Fallback to free tier if profile fetch fails
      this.userProfile = { subscription_tier: "free" };
      this.updateUIForSubscriptionTier();
    }
  }

  updateUIForSubscriptionTier() {
    const currentTier = this.userProfile?.subscription_tier || "free";
    const tierConfig = this.tierFeatures[currentTier];

    this.updateSubscriptionDisplay(tierConfig, currentTier);
    this.updateMaxResultsLimit(tierConfig);
    this.updateFilterAccess(tierConfig);
    this.updateExportFeatures(tierConfig);
  }

  updateSubscriptionDisplay(tierConfig, currentTier) {
    const currentTierEl = document.getElementById("current-tier");
    const upgradeBtn = document.getElementById("upgrade-btn");

    currentTierEl.textContent = tierConfig.name;

    // Show upgrade button based on tier
    if (currentTier === "enterprise") {
      upgradeBtn.style.display = "none";
    } else {
      upgradeBtn.style.display = "block";
      upgradeBtn.textContent =
        currentTier === "free" ? "Upgrade to Pro" : "Upgrade to Enterprise";
    }
  }

  updateMaxResultsLimit(tierConfig) {
    const maxResultsInput = document.getElementById("max-results");
    const label = document.querySelector('label[for="max-results"]');

    maxResultsInput.max = tierConfig.maxResults;
    maxResultsInput.value = Math.min(
      maxResultsInput.value || tierConfig.maxResults,
      tierConfig.maxResults
    );
    label.textContent = `Number of Results (1-${tierConfig.maxResults})`;

    // Add tier-specific styling
    const container = maxResultsInput.parentElement;
    container.setAttribute(
      "data-tier",
      this.userProfile?.subscription_tier || "free"
    );
  }

  updateFilterAccess(tierConfig) {
    const websiteFilter = document.getElementById("website-filter");
    const proBadge = document.getElementById("filter-pro-badge");
    const filterGroup = document.getElementById("website-filter-group");

    if (tierConfig.hasAdvancedFiltering) {
      websiteFilter.disabled = false;
      proBadge.classList.add("hidden");
      filterGroup.classList.remove("disabled-feature");
    } else {
      websiteFilter.disabled = true;
      websiteFilter.value = "all";
      proBadge.classList.remove("hidden");
      filterGroup.classList.add("disabled-feature");

      // Update badge text based on current tier
      const proText = proBadge.querySelector(".pro-text");
      proText.textContent = "Pro/Enterprise Feature";
    }
  }

  updateExportFeatures(tierConfig) {
    const exportBtn = document.getElementById("export-btn");
    const currentTier = this.userProfile?.subscription_tier || "free";

    // All tiers have basic CSV export, but we can add tier-specific text
    if (currentTier === "enterprise") {
      exportBtn.textContent = "Export All Leads to CSV (Enhanced)";
    } else if (currentTier === "pro") {
      exportBtn.textContent = "Export All Leads to CSV (Advanced)";
    } else {
      exportBtn.textContent = "Export All Leads to CSV";
    }
  }

  async handleUpgrade() {
    const currentTier = this.userProfile?.subscription_tier || "free";
    const targetTier = currentTier === "free" ? "pro" : "enterprise";

    // Open the main app's pricing page in a new tab with tier-specific targeting
    await this.chrome.tabs.create({
      url: `${this.apiBase}/pricing?utm_source=extension&current_tier=${currentTier}&target_tier=${targetTier}`,
    });
  }

  async handleSearch() {
    const query = document.getElementById("search-query").value;
    const location = document.getElementById("search-location").value;
    const maxResults =
      Number.parseInt(document.getElementById("max-results").value) || 20;
    const websiteFilter = document.getElementById("website-filter").value;
    const currentTier = this.userProfile?.subscription_tier || "free";
    const tierConfig = this.tierFeatures[currentTier];

    if (!query || !location) {
      this.showError("Please enter both business type and location");
      return;
    }

    // Validate max results against tier limit
    if (maxResults < 1 || maxResults > tierConfig.maxResults) {
      this.showError(
        `Number of results must be between 1 and ${tierConfig.maxResults} for your ${tierConfig.name}`
      );
      return;
    }

    // Check if user is trying to use advanced filtering without proper tier
    if (websiteFilter !== "all" && !tierConfig.hasAdvancedFiltering) {
      this.showError(
        "Advanced filtering requires Pro or Enterprise plan. Please upgrade to use this feature."
      );
      return;
    }

    this.showSearchProgress(true);

    try {
      const response = await fetch(`${this.apiBase}/api/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          query,
          location,
          maxResults,
          websiteFilter: tierConfig.hasAdvancedFiltering
            ? websiteFilter
            : "all",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.includes("quota") || data.error?.includes("limit")) {
          this.showQuotaExceededMessage(currentTier);
        } else {
          throw new Error(data.error || "Search failed");
        }
        return;
      }

      this.displayResults(data.results, websiteFilter, currentTier);
      this.updateQuotaInfo(data.remainingQuota, currentTier);
      this.showSuccess(
        `Found ${data.results.length} leads using ${tierConfig.name}!`
      );
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.showSearchProgress(false);
    }
  }

  showQuotaExceededMessage(currentTier) {
    const tierConfig = this.tierFeatures[currentTier];
    const nextTier = currentTier === "free" ? "Pro" : "Enterprise";

    this.showError(
      `You've reached your ${tierConfig.name} limit of ${tierConfig.searches} searches. Upgrade to ${nextTier} for more searches!`
    );
  }

  async handleExport() {
    const currentTier = this.userProfile?.subscription_tier || "free";

    this.showLoading(true);

    try {
      // Use advanced export for Pro/Enterprise users
      const endpoint = this.tierFeatures[currentTier].hasAdvancedFiltering
        ? "/api/leads/export/advanced"
        : "/api/leads/export";

      const response = await fetch(`${this.apiBase}${endpoint}`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const tierSuffix = currentTier !== "free" ? `-${currentTier}` : "";
      a.download = `leads${tierSuffix}-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      const exportType = this.tierFeatures[currentTier].hasAdvancedFiltering
        ? "Advanced"
        : "Basic";
      this.showSuccess(`${exportType} leads export completed!`);
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.showLoading(false);
    }
  }

  displayResults(results, websiteFilter = "all", currentTier = "free") {
    const container = document.getElementById("results-container");
    const section = document.getElementById("results-section");
    const tierConfig = this.tierFeatures[currentTier];

    if (results.length === 0) {
      container.innerHTML =
        "<p>No results found. Try a different search or upgrade for access to more data sources.</p>";
    } else {
      // Add tier-specific filter information
      let filterInfo = "";
      if (websiteFilter === "no-website" && tierConfig.hasAdvancedFiltering) {
        const noWebsiteCount = results.filter((r) => !r.website).length;
        filterInfo = `<div class="filter-count">🔍 Advanced Filter: Showing ${noWebsiteCount} businesses without websites</div>`;
      } else if (
        websiteFilter === "has-website" &&
        tierConfig.hasAdvancedFiltering
      ) {
        const hasWebsiteCount = results.filter((r) => r.website).length;
        filterInfo = `<div class="filter-count">🔍 Advanced Filter: Showing ${hasWebsiteCount} businesses with websites</div>`;
      }

      // Add tier badge to results
      const tierBadge = `<div class="tier-badge tier-${currentTier}">Results powered by ${tierConfig.name}</div>`;

      container.innerHTML =
        tierBadge +
        filterInfo +
        results
          .map(
            (result) => `
        <div class="result-item tier-${currentTier}">
          <div class="result-name">
            ${result.name}
            ${
              !result.website
                ? '<span class="no-website-badge">No Website</span>'
                : ""
            }
          </div>
          <div class="result-details">
            ${result.formatted_address}<br>
            ${
              result.formatted_phone_number
                ? `📞 ${result.formatted_phone_number}<br>`
                : ""
            }
            ${
              result.website
                ? `🌐 <a href="${result.website}" target="_blank">${result.website}</a><br>`
                : ""
            }
            ${
              result.rating
                ? `⭐ ${result.rating} (${
                    result.user_ratings_total || 0
                  } reviews)`
                : ""
            }
          </div>
        </div>
      `
          )
          .join("");
    }

    section.classList.remove("hidden");
  }

  async updateQuotaInfo(remainingQuota = null, currentTier = "free") {
    if (remainingQuota === null) {
      try {
        const response = await fetch(`${this.apiBase}/api/user/quota`, {
          headers: { Authorization: `Bearer ${this.token}` },
        });

        if (response.ok) {
          const data = await response.json();
          remainingQuota = data.remainingQuota;
        }
      } catch (error) {
        console.error("Failed to fetch quota:", error);
        return;
      }
    }

    const quotaInfo = document.getElementById("quota-info");
    const tierConfig = this.tierFeatures[currentTier];
    const usedQuota = tierConfig.searches - remainingQuota;

    quotaInfo.innerHTML = `
      <div>Searches: ${usedQuota}/${tierConfig.searches} used this month</div>
      <div>Remaining: ${remainingQuota} searches</div>
    `;

    // Add warning if quota is low
    if (remainingQuota <= 2 && currentTier === "free") {
      quotaInfo.innerHTML += `<div style="color: #dc2626; font-weight: 500; margin-top: 4px;">⚠️ Almost out of searches! Consider upgrading.</div>`;
    }
  }

  showAuthSection() {
    document.getElementById("auth-section").classList.remove("hidden");
    document.getElementById("app-section").classList.add("hidden");
    this.clearMessages();
  }

  showAppSection() {
    document.getElementById("auth-section").classList.add("hidden");
    document.getElementById("app-section").classList.remove("hidden");
    this.updateQuotaInfo();
    this.clearMessages();
  }

  showError(message) {
    const errorEl = document.getElementById("error-message");
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
    setTimeout(() => errorEl.classList.add("hidden"), 7000);
  }

  showSuccess(message) {
    const successEl = document.getElementById("success-message");
    successEl.textContent = message;
    successEl.classList.remove("hidden");
    setTimeout(() => successEl.classList.add("hidden"), 4000);
  }

  showLoading(show) {
    const loadingEl = document.getElementById("loading");
    if (show) {
      loadingEl.classList.remove("hidden");
    } else {
      loadingEl.classList.add("hidden");
    }
  }

  showSearchProgress(show) {
    const progressContainer = document.getElementById("search-progress");
    const searchBtn = document.getElementById("search-btn");

    if (show) {
      progressContainer.classList.remove("hidden");
      searchBtn.disabled = true;
      searchBtn.textContent = "Searching...";
      this.animateProgress();
    } else {
      progressContainer.classList.add("hidden");
      searchBtn.disabled = false;
      searchBtn.textContent = "Find Leads";
      this.stopProgressAnimation();
    }
  }

  animateProgress() {
    const progressFill = document.getElementById("progress-fill");
    const progressText = document.getElementById("progress-text");
    const currentTier = this.userProfile?.subscription_tier || "free";

    let progress = 0;
    const messages = {
      free: [
        "Searching for leads...",
        "Analyzing business data...",
        "Finalizing results...",
      ],
      pro: [
        "Searching for leads...",
        "Applying advanced filters...",
        "Analyzing business data...",
        "Gathering enhanced contact info...",
        "Finalizing results...",
      ],
      enterprise: [
        "Searching for leads...",
        "Applying advanced filters...",
        "Analyzing business data...",
        "Accessing premium data sources...",
        "Gathering enhanced contact info...",
        "Processing additional insights...",
        "Finalizing results...",
      ],
    };

    const tierMessages = messages[currentTier];

    this.progressInterval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      if (progress > 90) progress = 90;

      progressFill.style.width = `${progress}%`;

      const messageIndex = Math.floor((progress / 100) * tierMessages.length);
      if (tierMessages[messageIndex]) {
        progressText.textContent = tierMessages[messageIndex];
      }
    }, 800);
  }

  stopProgressAnimation() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }

    const progressFill = document.getElementById("progress-fill");
    progressFill.style.width = "100%";

    setTimeout(() => {
      progressFill.style.width = "0%";
    }, 500);
  }

  clearMessages() {
    document.getElementById("error-message").classList.add("hidden");
    document.getElementById("success-message").classList.add("hidden");
    document.getElementById("loading").classList.add("hidden");
  }

  handleFilterChange() {
    const currentTier = this.userProfile?.subscription_tier || "free";
    const tierConfig = this.tierFeatures[currentTier];

    if (!tierConfig.hasAdvancedFiltering) {
      document.getElementById("website-filter").value = "all";
      this.showError(
        `Website filtering requires Pro or Enterprise plan. Upgrade from your current ${tierConfig.name} to access advanced filters.`
      );
    }
  }
}

// Initialize the extension
new LeadFinderExtension();

class LeadFinderExtension {
  constructor() {
    this.apiBase = "https://leadfinder-symantriq.vercel.app";
    this.token = null;
    this.user = null;
    this.userProfile = null; // Added to store user profile with subscription tier
    this.chrome = window.chrome; // Declare the chrome variable
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

      const data = await response.json();

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

      const data = await response.json();

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
    this.userProfile = null; // Clear user profile on logout
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
        await this.fetchUserProfile(); // Fetch user profile to get subscription tier
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
        this.updateMaxResultsLimit();
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    }
  }

  updateMaxResultsLimit() {
    const tierLimits = {
      free: 20,
      pro: 50,
      enterprise: 100,
    };

    const maxAllowed = tierLimits[this.userProfile?.subscription_tier] || 20;
    const maxResultsInput = document.getElementById("max-results");
    const label = document.querySelector('label[for="max-results"]');

    maxResultsInput.max = maxAllowed;
    maxResultsInput.value = Math.min(maxResultsInput.value || 20, maxAllowed);
    label.textContent = `Number of Results (1-${maxAllowed})`;
  }

  async handleSearch() {
    const query = document.getElementById("search-query").value;
    const location = document.getElementById("search-location").value;
    const maxResults =
      Number.parseInt(document.getElementById("max-results").value) || 20;

    if (!query || !location) {
      this.showError("Please enter both business type and location");
      return;
    }

    const tierLimits = {
      free: 20,
      pro: 50,
      enterprise: 100,
    };
    const maxAllowed = tierLimits[this.userProfile?.subscription_tier] || 20;

    if (maxResults < 1 || maxResults > maxAllowed) {
      this.showError(
        `Number of results must be between 1 and ${maxAllowed} for your ${
          this.userProfile?.subscription_tier || "free"
        } plan`
      );
      return;
    }

    this.showLoading(true);

    try {
      const response = await fetch(`${this.apiBase}/api/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ query, location, maxResults }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Search failed");
      }

      this.displayResults(data.results);
      this.updateQuotaInfo(data.remainingQuota);
      this.showSuccess(`Found ${data.results.length} leads!`);
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.showLoading(false);
    }
  }

  async handleExport() {
    this.showLoading(true);

    try {
      const response = await fetch(`${this.apiBase}/api/leads/export`, {
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
      a.download = `leads-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      this.showSuccess("Leads exported successfully!");
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.showLoading(false);
    }
  }

  displayResults(results) {
    const container = document.getElementById("results-container");
    const section = document.getElementById("results-section");

    if (results.length === 0) {
      container.innerHTML = "<p>No results found. Try a different search.</p>";
    } else {
      container.innerHTML = results
        .map(
          (result) => `
        <div class="result-item">
          <div class="result-name">${result.name}</div>
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

  async updateQuotaInfo(remainingQuota = null) {
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
    quotaInfo.textContent = `Remaining searches this month: ${remainingQuota}`;
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
    this.updateMaxResultsLimit(); // Update limits when showing app section
    this.clearMessages();
  }

  showError(message) {
    const errorEl = document.getElementById("error-message");
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
    setTimeout(() => errorEl.classList.add("hidden"), 5000);
  }

  showSuccess(message) {
    const successEl = document.getElementById("success-message");
    successEl.textContent = message;
    successEl.classList.remove("hidden");
    setTimeout(() => successEl.classList.add("hidden"), 3000);
  }

  showLoading(show) {
    const loadingEl = document.getElementById("loading");
    if (show) {
      loadingEl.classList.remove("hidden");
    } else {
      loadingEl.classList.add("hidden");
    }
  }

  clearMessages() {
    document.getElementById("error-message").classList.add("hidden");
    document.getElementById("success-message").classList.add("hidden");
    document.getElementById("loading").classList.add("hidden");
  }
}

// Initialize the extension
new LeadFinderExtension();

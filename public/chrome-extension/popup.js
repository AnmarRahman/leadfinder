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

  // ===== Auth / Session =====
  async handleLogin() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    if (!email || !password) { this.showError("Please enter both email and password"); return; }
    this.showLoading(true);
    try {
      const response = await fetch(`${this.apiBase}/api/auth`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, action: "signin" }) });
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
      const response = await fetch(`${this.apiBase}/api/auth`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, action: "signup" }) });
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
      const data = await response.json();
      this.user = data.user; await this.chrome.storage.local.set({ leadfinder_user: data.user });
      await this.fetchUserProfile(); this.showAppSection();
    } catch { this.handleLogout(); }
  }

  async fetchUserProfile() {
    try {
      const res = await fetch(`${this.apiBase}/api/user/profile`, { headers: { Authorization: `Bearer ${this.token}` } });
      if (!res.ok) throw new Error("profile");
      const data = await res.json(); this.userProfile = data.profile; this.updateUIForSubscriptionTier();
    } catch {
      this.userProfile = { subscription_tier: "free" }; this.updateUIForSubscriptionTier();
    }
  }

  // ===== UI Helpers =====
  showAuthSection() {
    document.getElementById("auth-section").classList.remove("hidden");
    document.getElementById("app-section").classList.add("hidden");
    this.clearMessages();
  }
  showAppSection() {
    document.getElementById("auth-section").classList.add("hidden");
    document.getElementById("app-section").classList.remove("hidden");
    this.updateQuotaInfo(); this.clearMessages();
  }
  showError(msg) { const el = document.getElementById("error-message"); el.textContent = msg; el.classList.remove("hidden"); setTimeout(()=>el.classList.add("hidden"),7000); }
  showSuccess(msg){ const el = document.getElementById("success-message"); el.textContent = msg; el.classList.remove("hidden"); setTimeout(()=>el.classList.add("hidden"),4000); }
  showLoading(show){ const el = document.getElementById("loading"); if(show) el.classList.remove("hidden"); else el.classList.add("hidden"); }
  clearMessages(){ document.getElementById("error-message").classList.add("hidden"); document.getElementById("success-message").classList.add("hidden"); document.getElementById("loading").classList.add("hidden"); }

  // ===== Tier-driven UI =====
  updateUIForSubscriptionTier(){ const tier = this.userProfile?.subscription_tier || "free"; const cfg = this.tierFeatures[tier]; this.updateSubscriptionDisplay(cfg,tier); this.updateMaxResultsLimit(cfg); this.updateFilterAccess(cfg); this.updateExportFeatures(cfg); }
  updateSubscriptionDisplay(cfg,tier){ const el=document.getElementById("current-tier"); const up=document.getElementById("upgrade-btn"); el.textContent=cfg.name; if(tier==="enterprise") up.style.display="none"; else { up.style.display="block"; up.textContent= tier==="free"?"Upgrade to Pro":"Upgrade to Enterprise"; } }
  updateMaxResultsLimit(cfg){ const input=document.getElementById("max-results"); const label=document.querySelector('label[for="max-results"]'); input.max=cfg.maxResults; input.value=Math.min(input.value||cfg.maxResults,cfg.maxResults); label.textContent=`Number of Results (1-${cfg.maxResults})`; input.parentElement.setAttribute('data-tier', this.userProfile?.subscription_tier||'free'); }
  updateFilterAccess(cfg){ const sel=document.getElementById("website-filter"); const badge=document.getElementById("filter-pro-badge"); const group=document.getElementById("website-filter-group"); if(cfg.hasAdvancedFiltering){ sel.disabled=false; badge.classList.add("hidden"); group.classList.remove('disabled-feature'); } else { sel.disabled=true; sel.value="all"; badge.classList.remove("hidden"); group.classList.add('disabled-feature'); } }
  updateExportFeatures(){ const btn=document.getElementById("export-btn"); const tier=this.userProfile?.subscription_tier||"free"; btn.textContent = tier==="enterprise"?"Export All Leads to CSV (Enhanced)": tier==="pro"?"Export All Leads to CSV (Advanced)":"Export All Leads to CSV"; }

  // ===== Upgrade =====
  async handleUpgrade(){ const tier=this.userProfile?.subscription_tier||"free"; const target=tier==="free"?"pro":"enterprise"; await this.chrome.tabs.create({ url: `${this.apiBase}/pricing?utm_source=extension&current_tier=${tier}&target_tier=${target}` }); }

  // ===== Search & Export =====
  async handleSearch(){ const q=document.getElementById("search-query").value; const loc=document.getElementById("search-location").value; const max=Number.parseInt(document.getElementById("max-results").value)||20; const wf=document.getElementById("website-filter").value; const tier=this.userProfile?.subscription_tier||"free"; const cfg=this.tierFeatures[tier]; if(!q||!loc){ this.showError("Please enter both business type and location"); return; } if(max<1||max>cfg.maxResults){ this.showError(`Number of results must be between 1 and ${cfg.maxResults} for your ${cfg.name}`); return; } if(wf!=="all"&&!cfg.hasAdvancedFiltering){ this.showError("Advanced filtering requires Pro or Enterprise plan. Please upgrade to use this feature."); return; } this.showSearchProgress(true); try{ const res=await fetch(`${this.apiBase}/api/search`,{ method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${this.token}`}, body:JSON.stringify({ query:q, location:loc, maxResults:max, websiteFilter: cfg.hasAdvancedFiltering?wf:"all" })}); const data=await res.json(); if(!res.ok){ if(data.error?.includes('quota')||data.error?.includes('limit')){ this.showQuotaExceededMessage(tier);} else { throw new Error(data.error||"Search failed"); } return; } this.displayResults(data.results,wf,tier); this.updateQuotaInfo(); this.showSuccess(`Found ${data.results.length} leads using ${cfg.name}!`);} catch(e){ this.showError(e.message);} finally{ this.showSearchProgress(false);} }
  showQuotaExceededMessage(tier){ const cfg=this.tierFeatures[tier]; const next=tier==="free"?"Pro":"Enterprise"; this.showError(`You've reached your ${cfg.name} limit of ${cfg.searches} searches. Upgrade to ${next} for more searches!`); }
  async handleExport(){ const tier=this.userProfile?.subscription_tier||"free"; this.showLoading(true); try{ const endpoint=this.tierFeatures[tier].hasAdvancedFiltering?'/api/leads/export/advanced':'/api/leads/export'; const res=await fetch(`${this.apiBase}${endpoint}`,{ headers:{ Authorization:`Bearer ${this.token}` }}); if(!res.ok){ const data=await res.json(); throw new Error(data.error||"Export failed"); } const blob=await res.blob(); const url=window.URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; const suffix=tier!=='free'?`-${tier}`:''; a.download=`leads${suffix}-${new Date().toISOString().split('T')[0]}.csv`; a.click(); window.URL.revokeObjectURL(url); this.showSuccess(`${this.tierFeatures[tier].hasAdvancedFiltering?"Advanced":"Basic"} leads export completed!`);} catch(e){ this.showError(e.message);} finally{ this.showLoading(false);} }

  displayResults(results,wf="all",tier="free"){ const container=document.getElementById("results-container"); const section=document.getElementById("results-section"); const cfg=this.tierFeatures[tier]; if(results.length===0){ container.innerHTML = "<p>No results found. Try a different search or upgrade for access to more data sources.</p>"; } else { let filterInfo=""; if(wf==="no-website"&&cfg.hasAdvancedFiltering){ const n=results.filter(r=>!r.website).length; filterInfo=`<div class="filter-count">🔍 Advanced Filter: Showing ${n} businesses without websites</div>`; } else if(wf==="has-website"&&cfg.hasAdvancedFiltering){ const n=results.filter(r=>r.website).length; filterInfo=`<div class="filter-count">🔍 Advanced Filter: Showing ${n} businesses with websites</div>`; } const tierBadge=`<div class="tier-badge tier-${tier}">Results powered by ${cfg.name}</div>`; container.innerHTML = tierBadge + filterInfo + results.map(r=>`<div class="result-item tier-${tier}"><div class="result-name">${r.name}${!r.website?'<span class="no-website-badge">No Website</span>':''}</div><div class="result-details">${r.formatted_address}<br>${r.formatted_phone_number?`📞 ${r.formatted_phone_number}<br>`:''}${r.website?`🌐 <a href="${r.website}" target="_blank">${r.website}</a><br>`:''}${r.rating?`⭐ ${r.rating} (${r.user_ratings_total||0} reviews)`:''}</div></div>`).join(''); }
    section.classList.remove('hidden'); }

  // ===== Quota (API-trusted) =====
  async updateQuotaInfo(){ const quotaInfo=document.getElementById('quota-info'); try{ const res=await fetch(`${this.apiBase}/api/user/quota`,{ headers:{ Authorization:`Bearer ${this.token}` }}); if(res.status===401){ this.handleLogout(); return; } if(!res.ok) throw new Error('Failed to fetch quota'); const data=await res.json(); const monthly=typeof data.monthlyQuota==='number'?data.monthlyQuota:null; const remaining=typeof data.remainingQuota==='number'?data.remainingQuota:null; const used=typeof data.usedQuota==='number'?data.usedQuota:(monthly!=null&&remaining!=null?monthly-remaining:null); if(monthly!=null && used!=null){ quotaInfo.innerHTML = `<div>Searches: ${used} / ${monthly} used this month</div><div>Remaining: ${remaining!=null?remaining:'—'} searches</div><button id="quota-refresh" class="mini-upgrade-btn" style="margin-top:8px">Refresh</button>`; } else if(remaining!=null){ quotaInfo.innerHTML = `<div>Remaining: ${remaining} searches</div><button id="quota-refresh" class="mini-upgrade-btn" style="margin-top:8px">Refresh</button>`; } else { quotaInfo.innerHTML = `<div>Remaining: —</div><button id="quota-refresh" class="mini-upgrade-btn" style="margin-top:8px">Refresh</button>`; } document.getElementById('quota-refresh')?.addEventListener('click',()=>this.updateQuotaInfo()); } catch(e){ quotaInfo.innerHTML = `<div>Remaining: —</div><div style="color:#dc2626; margin-top:4px">Could not fetch quota.</div><button id="quota-refresh" class="mini-upgrade-btn" style="margin-top:8px">Retry</button>`; document.getElementById('quota-refresh')?.addEventListener('click',()=>this.updateQuotaInfo()); } }

  // ===== Progress UI =====
  showSearchProgress(show){ const cont=document.getElementById('search-progress'); const btn=document.getElementById('search-btn'); if(show){ cont.classList.remove('hidden'); btn.disabled=true; btn.textContent='Searching...'; this.animateProgress(); } else { cont.classList.add('hidden'); btn.disabled=false; btn.textContent='Find Leads'; this.stopProgressAnimation(); } }
  animateProgress(){ const fill=document.getElementById('progress-fill'); const text=document.getElementById('progress-text'); const tier=this.userProfile?.subscription_tier||'free'; let p=0; const messages={ free:["Searching for leads...","Analyzing business data...","Finalizing results..."], pro:["Searching for leads...","Applying advanced filters...","Analyzing business data...","Gathering enhanced contact info...","Finalizing results..."], enterprise:["Searching for leads...","Applying advanced filters...","Analyzing business data...","Accessing premium data sources...","Gathering enhanced contact info...","Processing additional insights...","Finalizing results..."]}; const msgs=messages[tier]; this.progressInterval=setInterval(()=>{ p+=Math.random()*15+5; if(p>90) p=90; fill.style.width=`${p}%`; const idx=Math.floor((p/100)*msgs.length); if(msgs[idx]) text.textContent=msgs[idx]; },800); }
  stopProgressAnimation(){ if(this.progressInterval){ clearInterval(this.progressInterval); this.progressInterval=null; } const fill=document.getElementById('progress-fill'); fill.style.width='100%'; setTimeout(()=>{ fill.style.width='0%'; },500); }
}

new LeadFinderExtension();
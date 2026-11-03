// API Configuration
const API_ID = "8453e8df";
const API_KEY = "783414bfa81d1eb9af1ee6a355d";
const COUNTRY = "za";
const SEARCH_COUNTRIES = [COUNTRY, "za", "gb", "us"];

const STORAGE_KEYS = {
    auth: "jobTrackerAuth",
    applications: "jobTrackerApplications",
    resumes: "jobTrackerResumes"
};

const DEFAULT_APPLICATIONS = [
    { id: 1, company: "Google", role: "Product Designer", location: "Remote", status: "Applied", date: "2026-10-10" },
    { id: 2, company: "Microsoft", role: "Frontend Engineer", location: "Seattle, US", status: "Interview", date: "2026-10-15" },
    { id: 3, company: "Stripe", role: "UX Researcher", location: "London, UK", status: "Rejected", date: "2026-10-12" }
];

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const resultsContainer = document.getElementById("results-container");
const trackerBody = document.getElementById("tracker-body");
const filterButtons = document.querySelectorAll(".tab");
const countrySelect = document.getElementById("country-select");
const totalApplicationsValue = document.getElementById("total-applications-value");
const interviewsValue = document.getElementById("interviews-value");
const offersValue = document.getElementById("offers-value");
const responseRateValue = document.getElementById("response-rate-value");
const loginButton = document.getElementById("login-button");
const logoutButton = document.getElementById("logout-button");
const addApplicationButton = document.getElementById("add-application-button");
const authModal = document.getElementById("auth-modal");
const applicationModal = document.getElementById("application-modal");
const loginForm = document.getElementById("login-form");
const applicationForm = document.getElementById("application-form");
const trackerSummary = document.getElementById("tracker-summary");
const appShell = document.querySelector(".dashboard-container");
const navTabs = document.querySelectorAll(".nav-tab");
const panels = document.querySelectorAll(".panel");

const resumeForm = document.getElementById("resumeForm");
const resumeLabel = document.getElementById("resumeLabel");
const resumeFile = document.getElementById("resumeFile");
const fileFeedback = document.getElementById("fileFeedback");
const resumeList = document.getElementById("resumeList");
const resumeEmpty = document.getElementById("resumeEmpty");
const activeList = document.getElementById("activeList");
const activeEmpty = document.getElementById("activeEmpty");
const followupList = document.getElementById("followupList");
const followupEmpty = document.getElementById("followupEmpty");
const followupCount = document.getElementById("followupCount");

const statusOrder = ["Applied", "Interview", "Offer", "Rejected"];
const statusStyles = {
    Applied: "applied",
    Interview: "interview",
    Offer: "offer",
    Rejected: "rejected"
};

window.addEventListener("DOMContentLoaded", async () => {
    seedApplications();
    bindStaticEvents();
    syncAuthState();
    renderStats();
    renderTracker();
    renderResumes();

    const themeToggle = document.getElementById("theme-toggle");
    if (localStorage.getItem("theme") === "light") {
        document.body.classList.remove("darkmode");
    } else {
        document.body.classList.add("darkmode");
    }

    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            const isDark = document.body.classList.toggle("darkmode");
            localStorage.setItem("theme", isDark ? "dark" : "light");
        });
    }

    if (!isLoggedIn()) {
        openModal(authModal);
    }

    const defaultQuery = searchInput ? (searchInput.value.trim() || "frontend developer") : "frontend developer";

    if (searchInput) {
        searchInput.value = defaultQuery;
    }

    if (resultsContainer) {
        renderLoadingState();
        const jobs = await fetchLiveJobs(defaultQuery);
        renderJobResults(jobs);
    }
});

function toISO(date) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
}

function todayISO() {
    return toISO(new Date());
}

function addDays(iso, days) {
    const date = new Date(iso + "T00:00:00");
    date.setDate(date.getDate() + days);
    return toISO(date);
}

function formatDate(iso) {
    if (!iso) return "-";
    return new Date(iso + "T00:00:00").toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function isActiveApplication(item) {
    return item.status === "Applied" || item.status === "Interview";
}

function needsFollowUp(item) {
    return isActiveApplication(item) && item.followUp && item.followUp <= todayISO();
}

function bindStaticEvents() {
    navTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            const targetPanel = tab.dataset.panel;
            navTabs.forEach((button) => {
                const isActive = button === tab;
                button.classList.toggle("active", isActive);
                button.setAttribute("aria-selected", String(isActive));
            });

            panels.forEach((panel) => {
                const shouldShow = panel.id === targetPanel;
                panel.classList.toggle("active", shouldShow);
                panel.hidden = !shouldShow;
            });
        });
    });

    if (loginButton) {
        loginButton.addEventListener("click", () => openModal(authModal));
    }

    if (logoutButton) {
        logoutButton.addEventListener("click", handleLogout);
    }

    if (addApplicationButton) {
        addApplicationButton.addEventListener("click", () => {
            if (!isLoggedIn()) {
                openModal(authModal);
                return;
            }
            openModal(applicationModal);
        });
    }

    document.querySelectorAll(".modal-close").forEach((button) => {
        button.addEventListener("click", () => closeModal(button.closest(".modal")));
    });

    document.querySelectorAll(".modal").forEach((modal) => {
        modal.addEventListener("click", (event) => {
            if (event.target === modal) {
                closeModal(modal);
            }
        });
    });

    if (loginForm) {
        loginForm.addEventListener("submit", handleLoginSubmit);
    }

    if (applicationForm) {
        applicationForm.addEventListener("submit", handleAddApplicationSubmit);
    }

    if (searchForm) {
        searchForm.addEventListener("submit", handleSearchSubmit);
    }

    filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            filterButtons.forEach((tab) => tab.classList.toggle("tab-active", tab === button));
            renderTracker();
        });
    });

    if (countrySelect) {
        countrySelect.addEventListener("change", renderTracker);
    }

    if (resumeForm) {
        resumeForm.addEventListener("submit", handleResumeSubmit);
    }

    if (resumeList) {
        resumeList.addEventListener("click", (event) => {
            const deleteButton = event.target.closest(".btn-delete");
            if (!deleteButton) return;
            deleteResume(Number(deleteButton.dataset.id));
        });
    }

    document.addEventListener("click", (event) => {
        const statusButton = event.target.closest(".badge-status");
        if (statusButton) {
            updateStatus(Number(statusButton.dataset.id));
            return;
        }

        const doneButton = event.target.closest(".btn-done");
        if (doneButton) {
            markFollowedUp(Number(doneButton.dataset.id));
            return;
        }

        const removeButton = event.target.closest(".remove-application");
        if (!removeButton) return;

        const applicationId = Number(removeButton.dataset.id);
        removeApplication(applicationId);
    });
}

function seedApplications() {
    if (!localStorage.getItem(STORAGE_KEYS.applications)) {
        const seeded = DEFAULT_APPLICATIONS.map((item) => ({
            ...item,
            followUp: item.followUp || addDays(item.date || todayISO(), 7)
        }));
        localStorage.setItem(STORAGE_KEYS.applications, JSON.stringify(seeded));
    }
}

function getApplications() {
    const saved = localStorage.getItem(STORAGE_KEYS.applications);
    if (!saved) {
        seedApplications();
    }
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.applications) || JSON.stringify(DEFAULT_APPLICATIONS));
}

function saveApplications(applications) {
    localStorage.setItem(STORAGE_KEYS.applications, JSON.stringify(applications));
}

function isLoggedIn() {
    return localStorage.getItem(STORAGE_KEYS.auth) === "true";
}

function syncAuthState() {
    const loggedIn = isLoggedIn();

    document.body.classList.toggle("app-locked", !loggedIn);

    if (appShell) {
        appShell.classList.toggle("app-locked", !loggedIn);
        appShell.setAttribute("aria-disabled", String(!loggedIn));
    }

    if (loginButton) {
        loginButton.classList.toggle("hidden", loggedIn);
    }

    if (logoutButton) {
        logoutButton.classList.toggle("hidden", !loggedIn);
    }

    if (addApplicationButton) {
        addApplicationButton.disabled = !loggedIn;
    }

    const trackerMessage = loggedIn ? "Applications saved locally" : "Please log in to manage applications";
    if (trackerSummary) {
        trackerSummary.textContent = trackerMessage;
    }
}

function openModal(modal) {
    if (!modal) return;
    modal.classList.remove("hidden");
}

function closeModal(modal) {
    if (!modal) return;
    modal.classList.add("hidden");
}

function handleLoginSubmit(event) {
    event.preventDefault();

    const emailInput = document.getElementById("login-email");
    const passwordInput = document.getElementById("login-password");

    if (!emailInput || !passwordInput) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password || password.length < 4) {
        alert("Please enter a valid email and password to continue.");
        return;
    }

    localStorage.setItem(STORAGE_KEYS.auth, "true");
    loginForm.reset();
    closeModal(authModal);
    syncAuthState();
    renderTracker();
}

function handleLogout() {
    localStorage.setItem(STORAGE_KEYS.auth, "false");
    closeModal(applicationModal);
    openModal(authModal);
    syncAuthState();
    renderTracker();
}

function handleAddApplicationSubmit(event) {
    event.preventDefault();

    if (!isLoggedIn()) {
        openModal(authModal);
        return;
    }

    const company = document.getElementById("application-company").value.trim();
    const role = document.getElementById("application-role").value.trim();
    const location = document.getElementById("application-location").value.trim();
    const status = document.getElementById("application-status").value;
    const date = document.getElementById("application-date").value || new Date().toISOString().slice(0, 10);

    if (!company || !role || !location) {
        alert("Please complete the company, role, and location fields.");
        return;
    }

    const applications = getApplications();
    applications.unshift({
        id: Date.now(),
        company,
        role,
        location,
        status,
        date,
        followUp: addDays(date, 7)
    });

    saveApplications(applications);
    applicationForm.reset();
    closeModal(applicationModal);
    renderStats();
    renderTracker();
    syncAuthState();
}

function removeApplication(applicationId) {
    if (!isLoggedIn()) {
        openModal(authModal);
        return;
    }

    const applications = getApplications().filter((item) => item.id !== applicationId);
    saveApplications(applications);
    renderStats();
    renderTracker();
    syncAuthState();
}

function renderStats() {
    const applications = getApplications();
    const total = applications.length;
    const interviews = applications.filter((item) => item.status === "Interview").length;
    const offers = applications.filter((item) => item.status === "Offer").length;
    const responseRate = total ? Math.round(((interviews + offers) / total) * 100) : 0;

    if (totalApplicationsValue) totalApplicationsValue.textContent = total;
    if (interviewsValue) interviewsValue.textContent = interviews;
    if (offersValue) offersValue.textContent = offers;
    if (responseRateValue) responseRateValue.textContent = `${responseRate}%`;
}

function updateStatus(applicationId) {
    const applications = getApplications();
    const target = applications.find((item) => item.id === applicationId);

    if (!target) return;

    const currentIndex = statusOrder.indexOf(target.status);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    target.status = nextStatus;

    if (!target.followUp) {
        target.followUp = addDays(target.date || todayISO(), 7);
    }

    saveApplications(applications);
    renderStats();
    renderTracker();
}

function markFollowedUp(applicationId) {
    const applications = getApplications();
    const target = applications.find((item) => item.id === applicationId);

    if (!target) return;

    target.followUp = addDays(todayISO(), 7);
    saveApplications(applications);
    renderTracker();
}

function renderTracker() {
    const applications = getApplications();
    const activeFilter = document.querySelector(".tab.tab-active")?.dataset.status || "All";
    const selectedCountry = countrySelect ? countrySelect.value : "All countries";

    const filteredApplications = applications.filter((item) => {
        const matchesStatus = activeFilter === "All" || item.status === activeFilter;
        const locationText = (item.location || "").toLowerCase();
        const matchesCountry =
            selectedCountry === "All countries" ||
            locationText.includes(selectedCountry.toLowerCase().replace(/\s+/g, "")) ||
            locationText.includes(selectedCountry.toLowerCase()) ||
            (selectedCountry === "United States" && locationText.includes("us")) ||
            (selectedCountry === "Canada" && locationText.includes("ca")) ||
            (selectedCountry === "United Kingdom" && locationText.includes("uk")) ||
            (selectedCountry === "Remote" && locationText.includes("remote"));

        return matchesStatus && matchesCountry;
    });

    if (trackerBody) {
        trackerBody.innerHTML = filteredApplications.length
            ? filteredApplications.map((item) => `
                <tr>
                    <td class="company-name">${item.company}</td>
                    <td class="job-role">${item.role}</td>
                    <td>${item.location || "-"}</td>
                    <td><button class="badge-status ${statusStyles[item.status] || "applied"}" type="button" data-id="${item.id}">${item.status}</button></td>
                    <td>${formatDate(item.date || todayISO())}</td>
                    <td><button class="remove-application" type="button" data-id="${item.id}">Remove</button></td>
                </tr>
            `).join("")
            : `
                <tr>
                    <td colspan="6" class="empty-row">No applications match the current filter.</td>
                </tr>
            `;
    }

    const activeApplications = applications.filter(isActiveApplication);
    const followUpApplications = applications.filter(needsFollowUp);

    if (activeList) {
        activeList.innerHTML = activeApplications.length
            ? activeApplications.map((item) => `
                <tr>
                    <td class="company-name">${item.company}</td>
                    <td class="job-role">${item.role}</td>
                    <td>${item.location || "-"}</td>
                    <td><button class="badge-status ${statusStyles[item.status] || "applied"}" type="button" data-id="${item.id}">${item.status}</button></td>
                    <td>${formatDate(item.date || todayISO())}</td>
                    <td><button class="remove-application" type="button" data-id="${item.id}">Remove</button></td>
                </tr>
            `).join("")
            : "";
        activeEmpty?.classList.toggle("hidden", activeApplications.length > 0);
    }

    if (followupList) {
        followupList.innerHTML = followUpApplications.length
            ? followUpApplications.map((item) => `
                <tr>
                    <td class="company-name">${item.company}</td>
                    <td class="job-role">${item.role}</td>
                    <td>${item.location || "-"}</td>
                    <td><button class="badge-status ${statusStyles[item.status] || "applied"}" type="button" data-id="${item.id}">${item.status}</button></td>
                    <td>${formatDate(item.date || todayISO())}</td>
                    <td><button class="btn-done" type="button" data-id="${item.id}">Done</button> <button class="remove-application" type="button" data-id="${item.id}">Remove</button></td>
                </tr>
            `).join("")
            : "";
        followupEmpty?.classList.toggle("hidden", followUpApplications.length > 0);
    }

    if (followupCount) {
        followupCount.textContent = String(followUpApplications.length);
    }

    if (trackerSummary) {
        trackerSummary.textContent = `${filteredApplications.length} visible application${filteredApplications.length === 1 ? "" : "s"}`;
    }
}

function handleResumeSubmit(event) {
    event.preventDefault();

    const label = resumeLabel.value.trim();
    const file = resumeFile.files[0];
    let valid = true;

    if (!label) {
        resumeLabel.classList.add("is-invalid");
        valid = false;
    } else {
        resumeLabel.classList.remove("is-invalid");
    }

    if (!file) {
        fileFeedback.textContent = "Please choose a file.";
        resumeFile.classList.add("is-invalid");
        valid = false;
    } else if (file.size > 5 * 1024 * 1024) {
        fileFeedback.textContent = "File must be under 5MB.";
        resumeFile.classList.add("is-invalid");
        valid = false;
    } else {
        resumeFile.classList.remove("is-invalid");
        fileFeedback.textContent = "Please select a file.";
    }

    if (!valid) return;

    const resumes = getResumes();
    resumes.push({
        id: Date.now(),
        label,
        fileName: file.name,
        size: Math.round(file.size / 1024) + " KB",
        date: new Date().toLocaleDateString("en-ZA")
    });

    localStorage.setItem(STORAGE_KEYS.resumes, JSON.stringify(resumes));
    renderResumes();
    resumeForm.reset();
}

function getResumes() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.resumes) || "[]");
    } catch (error) {
        return [];
    }
}

function renderResumes() {
    if (!resumeList || !resumeEmpty) return;

    const resumes = getResumes();
    resumeList.innerHTML = "";

    if (resumes.length === 0) {
        resumeEmpty.classList.remove("hidden");
        return;
    }

    resumeEmpty.classList.add("hidden");

    resumes.forEach((resume) => {
        const item = document.createElement("li");
        item.className = "resume-item";

        const info = document.createElement("div");
        info.className = "resume-info";

        const title = document.createElement("span");
        title.className = "resume-name";
        title.textContent = resume.label;

        const meta = document.createElement("span");
        meta.className = "resume-meta";
        meta.textContent = `${resume.fileName} • ${resume.size} • ${resume.date}`;

        info.append(title, meta);

        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn-delete";
        button.dataset.id = resume.id;
        button.textContent = "Delete";

        item.append(info, button);
        resumeList.appendChild(item);
    });
}

function deleteResume(id) {
    const resumes = getResumes().filter((resume) => resume.id !== id);
    localStorage.setItem(STORAGE_KEYS.resumes, JSON.stringify(resumes));
    renderResumes();
}

async function handleSearchSubmit(event) {
    event.preventDefault();

    const query = searchInput ? searchInput.value.trim() : "";
    if (!query) {
        alert("Enter a job title or keyword to search.");
        return;
    }

    renderLoadingState();
    const jobs = await fetchLiveJobs(query);
    renderJobResults(jobs);
}

function buildSearchVariants(keyword) {
    const rawKeyword = (keyword || "").trim();
    if (!rawKeyword) {
        return ["frontend developer", "web developer", "software engineer", "full stack developer", "javascript developer"];
    }

    const cleanKeyword = rawKeyword.toLowerCase();
    const variants = new Set([rawKeyword]);
    variants.add(cleanKeyword);
    variants.add(cleanKeyword.replace(/\s+developer\b/g, ""));
    variants.add(`${cleanKeyword} developer`);
    variants.add(`${cleanKeyword} engineer`);
    variants.add(`${cleanKeyword} jobs`);

    const relatedFallbacks = {
        frontend: ["frontend developer", "web developer", "javascript developer", "ui developer", "software engineer"],
        developer: ["frontend developer", "web developer", "software engineer", "full stack developer"],
        engineer: ["software engineer", "frontend engineer", "full stack engineer", "javascript engineer"],
        designer: ["product designer", "ux designer", "ui designer", "design system designer"],
        analyst: ["data analyst", "business analyst", "operations analyst", "product analyst"]
    };

    const normalized = cleanKeyword.split(/\s+/).filter(Boolean).join(" ");
    for (const [key, list] of Object.entries(relatedFallbacks)) {
        if (normalized.includes(key)) {
            list.forEach((item) => variants.add(item));
        }
    }

    if (variants.size < 5) {
        ["frontend developer", "web developer", "software engineer", "full stack developer", "javascript developer", "product designer"].forEach((item) => variants.add(item));
    }

    return [...variants].filter(Boolean).slice(0, 8);
}

async function fetchLiveJobs(keyword) {
    const queryVariants = buildSearchVariants(keyword);

    for (const country of SEARCH_COUNTRIES) {
        for (const query of queryVariants) {
            const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${API_ID}&app_key=${API_KEY}&results_per_page=12&what=${encodeURIComponent(query)}`;

            try {
                const response = await fetch(url);
                if (!response.ok) continue;

                const data = await response.json();
                if (Array.isArray(data.results) && data.results.length > 0) {
                    return data.results;
                }
            } catch (error) {
                console.error(`Error fetching jobs for ${country} with query "${query}":`, error);
            }
        }
    }

    return [
        {
            title: "Frontend Developer",
            company: { display_name: "Galileo Labs" },
            location: { display_name: "Remote" },
            created: new Date().toISOString(),
            redirect_url: "#",
            salary_min: 60000,
            salary_max: 90000
        },
        {
            title: "Full Stack Engineer",
            company: { display_name: "Northstar Studio" },
            location: { display_name: "United States" },
            created: new Date(Date.now() - 86400000).toISOString(),
            redirect_url: "#",
            salary_min: 85000,
            salary_max: 130000
        },
        {
            title: "UI/UX Designer",
            company: { display_name: "Bright Path" },
            location: { display_name: "London, UK" },
            created: new Date(Date.now() - 172800000).toISOString(),
            redirect_url: "#",
            salary_min: 55000,
            salary_max: 85000
        }
    ];
}

function renderLoadingState() {
    if (!resultsContainer) return;
    resultsContainer.innerHTML = `
        <div class="loading-state">
            <p>Searching for live positions...</p>
        </div>
    `;
}

function renderJobResults(jobs) {
    if (!resultsContainer) return;

    if (jobs === null) {
        resultsContainer.innerHTML = `
            <div class="error-message">
                <p>Unable to load jobs at this moment. Please check your connection or try again later.</p>
            </div>
        `;
        return;
    }

    if (jobs.length === 0) {
        resultsContainer.innerHTML = `
            <div class="no-results">
                <p>No matching position found. Try widening your search parameters.</p>
            </div>
        `;
        return;
    }

    resultsContainer.innerHTML = jobs.map((job) => {
        const companyName = job.company?.display_name || "Company Unlisted";
        const locationName = job.location?.display_name || "Location Unlisted";
        const formattedDate = job.created ? new Date(job.created).toLocaleDateString("en-ZA", {
            day: "numeric",
            month: "short",
            year: "numeric"
        }) : "Date Unavailable";
        const salaryText = job.salary_min && job.salary_max
            ? `R${Math.round(job.salary_min).toLocaleString()} - R${Math.round(job.salary_max).toLocaleString()}`
            : "Salary Undisclosed";

        return `
            <article class="job-card">
                <div class="job-card-header">
                    <div>
                        <p class="job-company">${companyName}</p>
                        <h3>${job.title || "Job Title Unlisted"}</h3>
                    </div>
                    <span class="job-status">Live</span>
                </div>
                <div class="job-meta">
                    <span><i class="fa-solid fa-location-dot"></i> ${locationName}</span>
                    <span><i class="fa-solid fa-money-bill-wave"></i> ${salaryText}</span>
                    <span><i class="fa-regular fa-calendar"></i> ${formattedDate}</span>
                </div>
                <a class="job-link" href="${job.redirect_url || "#"}" target="_blank" rel="noopener noreferrer">View job</a>
            </article>
        `;
    }).join("");
}

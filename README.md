
# GALILEO Employment Tracker 📊

A job-application dashboard built with plain HTML, CSS and JavaScript. Search live job listings from the Adzuna API, then track every application from "Applied" through to "Offer", with follow-up reminders, a resumé library and a light/dark theme.

Live site: https://galileo-web-tracker.netlify.app/

Built by Kagisho and Paballo.

Contents
Features
Tech stack
Project structure
Getting started
How the app works
Using the Adzuna API
JavaScript concepts used
Data and storage
Theming and responsive design
Known issues and troubleshooting
Roadmap
Credits
Features
Area	What it does
Job search	Search live listings by keyword through the Adzuna API. Each result shows the company, title, location, salary, posted date and a "View job" link.
Application tracker	Add, view and delete applications (company, role, location, status, date applied).
Status tracking	Click a status badge to cycle it: Applied → Interview → Offer → Rejected → back to Applied.
Stats cards	Total applications, interviews, offers and an overall response rate.
Filters	Filter the table by status (All / Applied / Interview / Rejected / Offer) and by country.
Active tab	Applications that are still in play (Applied or Interview).
Needs Follow-up tab	Active applications whose follow-up date is today or earlier, with a live counter on the tab. The Done button pushes the reminder back 7 days.
Resumé library	Add resumés with a label and a file (PDF, DOC or DOCX, under 5 MB) and delete them later.
Login (demo)	A simple login pop-up that locks and unlocks the dashboard.
Dark / light mode	A toggle in the header. The choice is remembered.
Responsive layout	Works from large desktops down to small phones, including a nested dropdown menu in the footer.
Tech stack
HTML5: semantic sections, forms, <details> / <summary> for the footer menu
CSS3: custom properties (variables) for theming, Grid, Flexbox, media queries
JavaScript (ES6+): no frameworks or build tools
Adzuna Job Search API: live job listings, called with fetch()
Browser localStorage: saves applications, resumés, login state and theme
Font Awesome 6.5.2 (CDN): icons
Netlify: hosting
Project structure
.
├── index.html     # Page structure: header, tabs, tables, forms, pop-ups, footer
├── style.css      # All styling, the light and dark colour sets, responsive rules
├── app.js         # All behaviour: tracker, login, resumés, API search, theme
└── background-remover-1793320191887.png   # Galileo owl logo
There is no build step. The site is three files plus an image.

Getting started
1. Get the code
bash
git clone <your-repository-url>
cd <your-repository-folder>
2. Get Adzuna API credentials
Create a free account at developer.adzuna.com.
Copy your Application ID and Application Key from the dashboard.
Open app.js and put them at the top of the file:
js
// API Configuration
const API_ID = "YOUR_APP_ID";
const API_KEY = "YOUR_APP_KEY";
Do not commit real keys to a public repository. See Security.

3. Run it locally
Open the folder with a local server, for example the Live Server extension in VS Code (right-click index.html → Open with Live Server).

4. Deploy
Drag the folder into Netlify, or connect the repository. No build command is needed.

How the app works
Start-up
When the page loads (DOMContentLoaded in app.js), the script:

saves 3 sample applications the first time you visit (seedApplications)
connects every button, form and tab to its function (bindStaticEvents)
locks or unlocks the dashboard based on login state (syncAuthState)
draws the stat cards, tables and resumé list
applies the saved theme
runs a first job search for "frontend developer" so the results panel is not empty
Login (demo)
The login is a front-end demo. Any email plus a password of 4 or more characters unlocks the dashboard. It stores "true" in localStorage; there is no server and no real account. While logged out, the dashboard is blurred and cannot be clicked, and the login pop-up opens automatically.

Tracking applications
Each application is an object in an array:

js
{
  id: 1730000000000,          // Date.now() when created
  company: "Stripe",
  role: "UX Researcher",
  location: "London, UK",
  status: "Applied",          // Applied | Interview | Offer | Rejected
  date: "2026-10-12",         // date applied, stored as YYYY-MM-DD text
  followUp: "2026-10-19"      // date applied + 7 days
}
Add: the "Add Application" pop-up validates the fields, builds the object and adds it to the front of the array.
Update: clicking a status badge moves to the next status in statusOrder.
Delete: removes the object whose id matches.
Every change is saved to localStorage and the stats and tables are redrawn.
The three tables
One data array feeds three tables. Small helper functions decide who appears where:

js
function isActiveApplication(item) {
    return item.status === "Applied" || item.status === "Interview";
}

function needsFollowUp(item) {
    return isActiveApplication(item) && item.followUp && item.followUp <= todayISO();
}
Dates are kept as YYYY-MM-DD text, which compares and sorts correctly with plain <=.

Response rate
response rate = round( (interviews + offers) / total applications × 100 )
Using the Adzuna API
What is an API?
An API is a web address you ask for data. Adzuna's job-search API returns JSON, plain text that JavaScript turns into objects and arrays. Our code asks "show me jobs matching this keyword", gets a list back, and builds a card for each job.

The request
https://api.adzuna.com/v1/api/jobs/{country}/search/{page}
    ?app_id=YOUR_APP_ID
    &app_key=YOUR_APP_KEY
    &results_per_page=12
    &what=electrician
Part	Meaning
{country}	Which country's listings to search. We use za (South Africa), gb (UK) and us (USA).
{page}	Page of results. We always ask for page 1.
app_id, app_key	Your credentials, which identify who is calling.
results_per_page	How many jobs to return (12).
what	The search keywords, passed through encodeURIComponent() so spaces and symbols are safe in a URL.
The response (trimmed example with made-up values)
json
{
  "count": 134,
  "results": [
    {
      "title": "Electrician",
      "company":  { "display_name": "Example Contractors" },
      "location": { "display_name": "Johannesburg, Gauteng" },
      "created": "2026-10-28T09:14:00Z",
      "salary_min": 18000,
      "salary_max": 25000,
      "redirect_url": "https://www.adzuna.co.za/land/ad/..."
    }
  ]
}
The fields the app reads: title, company.display_name, location.display_name, created, salary_min, salary_max and redirect_url.

The code path
Search button (or page load)
        │
        ▼
handleSearchSubmit()   → reads the keyword, shows "Searching..."
        │
        ▼
fetchLiveJobs(keyword) → builds search phrases, asks Adzuna, returns a list of jobs
        │
        ▼
renderJobResults(jobs) → turns each job into a card on the page
fetchLiveJobs() step by step
js
async function fetchLiveJobs(keyword) {
    const queryVariants = buildSearchVariants(keyword);      // 1. similar phrases to try

    for (const country of SEARCH_COUNTRIES) {                // 2. za, then gb, then us
        for (const query of queryVariants) {                 //    each phrase in turn
            const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?...&what=${encodeURIComponent(query)}`;

            try {
                const response = await fetch(url);           // 3. ask Adzuna and wait
                if (!response.ok) continue;                  //    HTTP error: try the next one

                const data = await response.json();          // 4. read the JSON
                if (data.results.length > 0) return data.results;   // 5. first hit wins
            } catch (error) {
                console.error(error);                        //    network error: logged
            }
        }
    }
    return [ /* 3 hard-coded sample jobs */ ];               // 6. last resort
}
Key ideas for anyone new to APIs:

async / await: the request takes time, so await pauses this function until the answer arrives without freezing the page.
response.ok is true for HTTP status 200 to 299. A wrong key returns 401/403, and too many requests returns 429.
try / catch stops a network failure from crashing the app.
buildSearchVariants()
Adzuna matches all the words in what, so a very specific phrase can return nothing. This function builds up to 8 related phrases (for example "python developer", "python", "python developer jobs") and adds related roles for some keywords such as developer, engineer, designer and analyst.

Rendering results
renderJobResults() loops over the jobs with .map(), builds an HTML template string per job (using job.company?.display_name || "Company Unlisted" so missing fields do not crash it), joins them together and sets resultsContainer.innerHTML.

Attribution and limits
Adzuna's terms ask apps using their data to credit Adzuna, including a "Jobs by Adzuna" label. Read the API terms and check the current rules before publishing. The footer currently credits Adzuna in text, and adding the official label to each result card is on the roadmap.
Free accounts have usage limits. Check yours in the Adzuna dashboard.
JavaScript concepts used
This project is a working example of core JavaScript fundamentals. Everything below lives in app.js.

Concept	Where to see it
Variables and constants	API_ID, SEARCH_COUNTRIES, STORAGE_KEYS, statusOrder
Arrays	DEFAULT_APPLICATIONS, the saved applications and resumés, queryVariants
Objects	Each application and resumé; statusStyles maps a status to a CSS class
Functions	addDays, renderStats, updateStatus, buildSearchVariants, and many more
Conditionals	Form validation in handleLoginSubmit and handleAddApplicationSubmit; isActiveApplication; needsFollowUp; the status and country filters in renderTracker
Loops	for...of loops in fetchLiveJobs; forEach for tabs and buttons
Array methods	filter (stats, tables, delete), find (update one application), map (job cards), indexOf (next status)
Event listeners	click, submit and change listeners connected in bindStaticEvents
Event delegation	One document click listener handles the status, Done and Delete buttons, including ones created later
DOM manipulation	getElementById, querySelectorAll, classList.toggle, createElement, innerHTML, dataset
Async JavaScript	async / await, fetch, response.json(), try / catch in fetchLiveJobs
Web storage	localStorage.getItem / setItem with JSON.parse / JSON.stringify
Dates	toISO, todayISO, addDays, formatDate
Modern syntax	Template literals, arrow functions, destructuring, spread ([...variants]), Set, optional chaining (job.company?.display_name)
Data and storage
Nothing is sent to a server. Everything is saved in the visitor's own browser with localStorage, so each browser and device has its own data.

Key	Holds
jobTrackerApplications	The array of application objects
jobTrackerResumes	The array of resumé details
jobTrackerAuth	"true" or "false" (demo login state)
theme	"dark" or "light"
To reset the app, clear the site's data in your browser's developer tools (Application → Local Storage).

A saved resumé looks like this. Only the details are kept, not the file itself, because localStorage is too small for documents.

js
{ id: 1730000000000, label: "Retail CV", fileName: "cv.pdf", size: "212 KB", date: "30/10/2026" }
Theming and responsive design
Dark mode
All colours are CSS custom properties in style.css: light values in :root, dark values in .darkmode.
The header toggle adds or removes the class darkmode on <body> and saves the choice in localStorage.
Dark is the default unless the visitor has chosen light.
To change a colour, edit its variable in the matching block rather than editing individual rules.

Responsive layout
The layout adapts at several widths with media queries (roughly 820px, 640px and 540px).
Wider breakpoints must come before narrower ones in the file. When two media queries match, the one lower in the file wins.
On small screens the footer stacks into one column.
The footer's Project menu is a nested dropdown built from <details> / <summary>: it opens on click or tap, works with the keyboard and needs no JavaScript.
Known issues and troubleshooting
The search only shows "Frontend Developer" or the same three jobs
If you always see exactly three cards (Galileo Labs, Northstar Studio, Bright Path), the app is showing its hard-coded sample jobs, which means every API request failed. Those cards are labelled "Live", which is misleading.

To find out why:

Open the site, press F12 and go to the Network tab.
Type adzuna in the filter box, then run a search.
Click a request and read its Status:
Status	Likely cause
401 or 403	The app_id or app_key is wrong or incomplete. Copy the key again from the Adzuna dashboard (they are normally 32 characters).
429	Too many requests. One failing search makes up to 24 calls, which can use a free allowance quickly.
200 with no results	Adzuna found nothing for that phrase. The app then tries other phrases, and finally related ones such as "frontend developer".
Request in red, or a CORS message in the Console	The browser blocked the call. Calling Adzuna through a small server-side function avoids this.
You can also paste a request URL into a new browser tab to see Adzuna's error message as text.

Other limitations
Search results can drift. If your exact phrase finds nothing, the app moves on to related phrases such as "frontend developer", so results may not match what you typed.
A search can make many requests. Up to 24 per search (3 countries × 8 phrases), plus the automatic search on page load.
Salaries always show "R". The currency symbol is hard-coded as rand, even for UK and US results.
The dashboard is locked until you log in, so the search box cannot be used while logged out.
The country dropdown filters the tracker table, matching the location text. It does not change which country the API searches.
The login is a demo. There are no real accounts, and anyone with a 4-character password can enter.
Resumés store details only, not the files.
Data is per browser. Clearing browser data deletes it.
Security: the API key
app.js runs in the visitor's browser, so the Adzuna key is visible to anyone who opens the page source. That is acceptable for a demo or portfolio, but:

do not reuse the key for anything important, and regenerate it if it has been shared publicly
for a more secure version, move the API call into a Netlify Function and keep the key in an environment variable
Roadmap
 Show the real error when the API fails, instead of falling back silently to sample jobs
 Label sample data as "Sample", not "Live"
 Limit searches to one request for the chosen country, and cache results
 Add the official "Jobs by Adzuna" label to each result card
 Show the correct currency for each country
 "Track this job" button on each search result
 Move the API key into a Netlify Function
 Real authentication and cloud storage so data follows the user across devices
 Export applications to CSV
Credits
Job data: Adzuna
Icons: Font Awesome
Documentation used while building: MDN Web Docs and JavaScript.info
Designed and built by Kagisho and Paballo




































Claude finished the response


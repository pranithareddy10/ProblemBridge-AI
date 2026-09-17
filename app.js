const app = document.querySelector('#app');

const state = {
  view: 'register',
  authUser: null,
  authError: '',
  loading: false,
  submitted: false,
  problem: {
    title: 'Difficulty Finding Available Hospital Beds',
    description: 'People in my area face difficulty finding real-time information about available hospital beds. Patients and their families have to contact multiple hospitals, which wastes time during emergencies.',
    category: 'Healthcare',
    location: 'Hyderabad',
    evidenceUrl: '',
    contact: ''
  },
  currentProblemId: 'prb_hospital_01',
  routing: null,
  authorityStatus: 'Forwarded to Concerned Authority',
  citizenVerification: '',
  supportCount: 47,
  savedChallenges: [],
  toast: '',
  listening: false,
  recognition: null,
  speechText: '',
  speechLanguage: 'en-IN',
  challenges: [],
  currentChallenge: null,
  solution: {
    id: '',
    title: '',
    description: '',
    technology: '',
    team: '',
    impact: '',
    status: 'Proposed',
    progressPercent: 10,
    websiteUrl: '',
    sourceCodeUrl: '',
    demoUrl: '',
    evidenceFiles: []
  },
  stats: {
    problemsReported: 1250,
    problemsSolved: 420,
    innovationChallenges: 85,
    activeInnovators: 310,
    routingPercentages: { authority: 58, innovation: 25, dual: 12, duplicate: 5 }
  }
};

const categories = ['Healthcare', 'Agriculture', 'Education', 'Public Infrastructure', 'Technology', 'Environment', 'Transportation', 'Rural Development'];
const solutionProgress = { Proposed: 10, 'In Development': 30, Testing: 50, 'Ready for Review': 70, Implemented: 90, 'Problem Solved': 100 };
const innovatorStatuses = ['Proposed', 'In Development', 'Testing', 'Ready for Review'];

function icon(symbol) { return `<span aria-hidden="true">${symbol}</span>`; }
function validUrl(value) { return !value || /^https?:\/\/[^\s]+$/i.test(value); }

function setView(view) {
  const protectedViews = ['report', 'propose', 'solutionDetails', 'tracking', 'authorityTracking', 'analysis'];
  if (protectedViews.includes(view) && !state.authUser) {
    state.authError = 'Please sign in to continue.';
    state.view = 'login';
    render();
    return;
  }
  state.view = view;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function notify(message) {
  state.toast = message;
  render();
  setTimeout(() => {
    state.toast = '';
    render();
  }, 2600);
}

// Initial bootstrap
async function initApp() {
  try {
    // 1. Check current logged-in user
    if (window.API) {
      const user = await API.auth.me();
      if (user) {
        state.authUser = user;
        state.view = user.role === 'Citizen' ? 'home' : user.role === 'Authority / Organization' ? 'authorityTracking' : 'dashboard';
      } else {
        const cached = JSON.parse(localStorage.getItem('problemBridgeUser') || 'null');
        if (cached) {
          state.authUser = cached;
          state.view = cached.role === 'Citizen' ? 'home' : cached.role === 'Authority / Organization' ? 'authorityTracking' : 'dashboard';
        } else {
          state.view = 'register';
        }
      }

      // 2. Fetch live challenges
      await loadChallenges();

      // 3. Fetch live stats
      await loadStats();
    }
  } catch (err) {
    console.warn('Backend connection notice:', err.message);
  } finally {
    render();
  }
}

async function loadChallenges() {
  try {
    if (window.API) {
      const res = await API.challenges.list();
      if (res.challenges && res.challenges.length > 0) {
        state.challenges = res.challenges;
        if (!state.currentChallenge) {
          state.currentChallenge = res.challenges[0];
        }
      }
    }
  } catch (err) {
    console.error('Failed to load challenges:', err);
  }
}

async function loadStats() {
  try {
    if (window.API) {
      const res = await API.stats.get();
      if (res.stats) {
        state.stats = res.stats;
      }
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

// Speech Recognition
function startSpeech() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    notify('Speech recognition is not supported in this browser.');
    return;
  }
  state.recognition = new SpeechRecognition();
  state.recognition.lang = state.speechLanguage;
  state.recognition.interimResults = true;
  state.recognition.continuous = false;
  state.recognition.onstart = () => { state.listening = true; render(); };
  state.recognition.onresult = event => {
    state.speechText = Array.from(event.results).map(result => result[0].transcript).join(' ');
    const description = document.querySelector('#description');
    if (description) description.value = state.speechText;
  };
  state.recognition.onerror = event => { state.listening = false; notify(`Microphone error: ${event.error}`); };
  state.recognition.onend = () => { state.listening = false; render(); };
  state.recognition.start();
}

function stopSpeech() {
  if (state.recognition) state.recognition.stop();
  state.listening = false;
  render();
}

function useSpeechText() {
  const description = document.querySelector('#description');
  if (description && state.speechText) description.value = state.speechText;
  notify('Your spoken text was added. You can edit it before submitting.');
}

function updateSpeechLanguage(language) {
  state.speechLanguage = language;
}

function openProject(url, label) {
  if (!url) {
    notify(`Add a ${label} URL before opening it.`);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

// Registration and Login
function chooseRegistrationRole(role) {
  const roleInput = document.querySelector('#registrationRole');
  if (roleInput) roleInput.value = role;
  document.querySelectorAll('.role-card').forEach(card => card.classList.toggle('selected', card.dataset.role === role));
}

async function registerAccount(event) {
  event.preventDefault();
  const form = event.target;
  const fullName = form.querySelector('#fullName').value.trim();
  const email = form.querySelector('#registerEmail').value.trim();
  const mobileNumber = form.querySelector('#mobileNumber').value.trim();
  const password = form.querySelector('#registerPassword').value;
  const confirmPassword = form.querySelector('#confirmPassword').value;
  const role = form.querySelector('#registrationRole').value;

  if (password !== confirmPassword) {
    state.authError = 'Passwords do not match.';
    render();
    return;
  }

  state.loading = true;
  render();

  try {
    if (window.API) {
      const res = await API.auth.register({ fullName, email, password, role, mobileNumber });
      state.authUser = res.user;
      localStorage.setItem('problemBridgeUser', JSON.stringify(res.user));
      state.authError = '';
      notify('Account created successfully! Welcome to ProblemBridge AI.');
      setTimeout(() => {
        state.loading = false;
        setView(res.user.role === 'Citizen' ? 'home' : res.user.role === 'Authority / Organization' ? 'authorityTracking' : 'dashboard');
      }, 500);
    }
  } catch (err) {
    state.loading = false;
    state.authError = err.message || 'Registration failed. Please check your details.';
    render();
  }
}

async function loginAccount(event) {
  event.preventDefault();
  const form = event.target;
  const email = form.querySelector('#loginEmail').value.trim();
  const password = form.querySelector('#loginPassword').value;
  const role = form.querySelector('#loginRole').value;

  state.loading = true;
  render();

  try {
    if (window.API) {
      const res = await API.auth.login({ email, password, role });
      state.authUser = res.user;
      localStorage.setItem('problemBridgeUser', JSON.stringify(res.user));
      state.authError = '';
      notify(`Welcome back, ${res.user.fullName}!`);
      setTimeout(() => {
        state.loading = false;
        setView(role === 'Citizen' ? 'home' : role === 'Authority / Organization' ? 'authorityTracking' : 'dashboard');
      }, 400);
    }
  } catch (err) {
    state.loading = false;
    state.authError = err.message || 'Invalid email or password.';
    render();
  }
}

function logout() {
  if (window.API) API.auth.logout();
  localStorage.removeItem('problemBridgeUser');
  state.authUser = null;
  state.authError = '';
  notify('You have been logged out.');
  setView('login');
}

// Problem reporting
async function submitProblem(event) {
  event.preventDefault();
  const form = event.target;
  const title = form.querySelector('#title').value.trim();
  const description = form.querySelector('#description').value.trim();
  const category = form.querySelector('#category').value;
  const location = form.querySelector('#location').value.trim() || 'Not provided';
  const contact = form.querySelector('#contact').value.trim();
  const evidenceFile = form.querySelector('#problemEvidence').files[0];

  state.loading = true;
  render();

  try {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('location', location);
    formData.append('contact', contact);
    if (evidenceFile) {
      formData.append('evidence', evidenceFile);
    }

    if (window.API) {
      const res = await API.problems.create(formData);
      state.submitted = true;
      state.currentProblemId = res.problem.id;
      state.problem = res.problem;
      state.routing = res.analysis;
      state.supportCount = res.problem.supportCount;
      state.authorityStatus = res.problem.authorityStatus;

      await loadStats();
      await loadChallenges();

      notify('Problem submitted & AI analysis completed!');
      setView('analysis');
    }
  } catch (err) {
    notify(`Submission error: ${err.message}`);
  } finally {
    state.loading = false;
    render();
  }
}

async function submitSupport() {
  try {
    if (window.API && state.currentProblemId) {
      const res = await API.problems.support(state.currentProblemId);
      state.supportCount = res.supportCount;
      if (state.routing) {
        state.routing.duplicate = true;
        state.routing.route = 'duplicate';
        state.routing.recommendation = 'Your support has been added to this existing report. No duplicate entry created.';
      }
      notify(res.message || 'Support added successfully!');
      render();
    }
  } catch (err) {
    notify(`Support error: ${err.message}`);
  }
}

function submitDifferentProblem() {
  if (state.routing) {
    state.routing.duplicate = false;
    state.routing.route = 'authority';
    state.routing.recommendation = 'This report will be processed as a separate problem and routed to the concerned authority.';
  }
  render();
}

async function updateAuthorityStatus(status) {
  try {
    if (window.API && state.currentProblemId) {
      const res = await API.problems.updateAuthorityStatus(state.currentProblemId, status);
      state.authorityStatus = status;
      state.problem.authorityStatus = status;
      notify(res.message || `Authority status updated to ${status}.`);
      await loadStats();
      render();
    }
  } catch (err) {
    notify(`Update error: ${err.message}`);
  }
}

async function verifyResolution(answer) {
  try {
    if (window.API && state.currentProblemId) {
      const res = await API.problems.verify(state.currentProblemId, answer);
      state.citizenVerification = answer;
      state.problem.citizenVerification = answer;
      if (answer === 'no') {
        state.authorityStatus = 'Resolution in Progress';
      }
      notify(res.message || 'Citizen verification submitted.');
      await loadStats();
      render();
    }
  } catch (err) {
    notify(`Verification error: ${err.message}`);
  }
}

async function saveChallenge(id) {
  if (!state.authUser) {
    notify('Please log in as a Student / Innovator to save challenges.');
    return;
  }
  try {
    if (window.API) {
      const res = await API.challenges.watch(id);
      notify(res.message);
      await loadChallenges();
      render();
    }
  } catch (err) {
    notify(`Watch error: ${err.message}`);
  }
}

function selectChallenge(id) {
  const ch = state.challenges.find(c => c.id === id);
  if (ch) {
    state.currentChallenge = ch;
    setView('challengeDetails');
  }
}

async function startChallengeSolution(id) {
    if (!state.authUser) {
      setView('login');
      return;
    }
    if (state.authUser.role !== 'Student / Innovator' && state.authUser.role !== 'Admin / Reviewer') {
      notify('Only Student / Innovator accounts can create solutions.');
      return;
    }

    const ch = state.challenges.find(c => c.id === id) || state.currentChallenge;
    if (!ch) {
      notify('Challenge not found.');
      return;
    }
    state.currentChallenge = ch;
    state.loading = true;
    render();
    try {
      const res = await API.solutions.my({ challengeId: ch.id });
      const existing = res.solutions?.[0];
      if (existing) {
        state.solution = existing;
        setView('solutionDetails');
        return;
      }
      state.solution = {
        id: '',
        title: '',
        description: '',
        technology: '',
        team: '',
        impact: '',
        status: 'Proposed',
        progressPercent: 10,
        websiteUrl: '',
        sourceCodeUrl: '',
        demoUrl: '',
        evidenceFiles: []
      };
      setView('propose');
    } catch (err) {
      notify(`Unable to open this challenge: ${err.message}`);
    } finally {
      state.loading = false;
      render();
  }

  async function openTracking() {
    if (!state.authUser) {
      setView('login');
      return;
    }
    state.loading = true;
    render();
    try {
      const res = await API.solutions.my();
      state.solution = res.solutions?.[0] || {
        id: '',
        title: '',
        description: '',
        technology: '',
        team: '',
        impact: '',
        status: 'Proposed',
        progressPercent: 10,
        websiteUrl: '',
        sourceCodeUrl: '',
        demoUrl: '',
        evidenceFiles: []
      };
      setView('tracking');
    } catch (err) {
      notify(`Unable to load your progress: ${err.message}`);
    } finally {
      state.loading = false;
      render();
    }
  }
}

// Submit Solution
async function submitSolution(event) {
  event.preventDefault();
  const form = event.target;
  const submissionType = event.submitter?.value || 'proposal';
  const website = form.querySelector('[name="website"]').value.trim();
  const source = form.querySelector('[name="source"]').value.trim();
  const demo = form.querySelector('[name="demo"]').value.trim();

  if (!validUrl(website) || (source && !validUrl(source)) || (demo && !validUrl(demo))) {
    notify('Please enter a valid URL beginning with http:// or https://.');
    return;
  }

  if (submissionType === 'review' && !website) {
    notify('Please add the complete public Website URL before submitting this project for review.');
    return;
  }

  state.loading = true;
  render();

  try {
    if (!state.currentChallenge?.id) {
      notify('Select an innovation challenge before saving a solution.');
      return;
    }
    const formData = new FormData();
    formData.append('challengeId', state.currentChallenge.id);
    formData.append('problemId', state.currentProblemId || '');
    formData.append('solutionTitle', form.querySelector('[name="solutionTitle"]').value.trim());
    formData.append('solutionDescription', form.querySelector('[name="solutionDescription"]').value.trim());
    formData.append('technology', form.querySelector('[name="technology"]').value.trim());
    formData.append('team', form.querySelector('[name="team"]').value.trim());
    formData.append('impact', form.querySelector('[name="impact"]').value.trim());
    formData.append('status', form.querySelector('[name="status"]').value);
    formData.append('website', website);
    formData.append('source', source);
    formData.append('demo', demo);
    formData.append('submissionType', submissionType);

    const evidenceInput = form.querySelector('[name="evidence"]');
    if (evidenceInput && evidenceInput.files.length) {
      for (const file of evidenceInput.files) {
        formData.append('evidence', file);
      }
    }

    if (window.API) {
      const res = state.solution.id
        ? await API.solutions.update(state.solution.id, {
          solutionTitle: form.querySelector('[name="solutionTitle"]').value.trim(),
          solutionDescription: form.querySelector('[name="solutionDescription"]').value.trim(),
          technology: form.querySelector('[name="technology"]').value.trim(),
          team: form.querySelector('[name="team"]').value.trim(),
          impact: form.querySelector('[name="impact"]').value.trim(),
          website,
          source,
          demo
        })
        : await API.solutions.create(formData);
      state.solution = res.solution;
      notify(res.message || 'Solution submitted successfully!');
      setTimeout(() => setView('solutionDetails'), 500);
    }
  } catch (err) {
    notify(`Error: ${err.message}`);
  } finally {
    state.loading = false;
    render();
  }
}

async function updateStatus(status) {
  if (!innovatorStatuses.includes(status)) {
    notify('Only a reviewer or administrator can set this status.');
    return;
  }

  if (status === 'Ready for Review' && !validUrl(state.solution.websiteUrl)) {
    notify('Please add a valid complete public Website URL before marking this project as Ready for Review.');
    return;
  }

  try {
    if (window.API && state.solution.id) {
      const res = await API.solutions.updateStatus(state.solution.id, status, state.solution.websiteUrl);
      state.solution.status = status;
      state.solution.progressPercent = res.solution.progressPercent;
      notify(res.message || `Project status updated to ${status}.`);
      render();
    }
  } catch (err) {
    notify(`Status update error: ${err.message}`);
  }
}

function routeLabel(route) {
  return ({
    authority: 'Send to Authority',
    innovation: 'Create Innovation Challenge',
    dual: 'Authority + Innovation Opportunity',
    duplicate: 'Merge with Existing Problem'
  })[route] || 'AI Recommended Route';
}

function solutionTimeline() {
  const stages = ['Problem reported', 'AI analysis completed', 'Innovation challenge created', 'Student solution proposed', 'Solution development', 'Testing', 'Ready for review', 'Implementation', 'Problem solved'];
  const activeIndex = Math.max(4, ['Proposed', 'In Development', 'Testing', 'Ready for Review', 'Implemented', 'Problem Solved'].indexOf(state.solution.status) + 4);
  return stages.map((stage, index) => `
    <div class="timeline-item">
      <span class="timeline-dot ${index < activeIndex ? 'done' : index === activeIndex ? 'current' : ''}">
        ${index < activeIndex ? '✓' : index === activeIndex ? '•' : ''}
      </span>
      <div>
        <strong>${stage}</strong>
        ${index === activeIndex ? `<small>${state.solution.status}</small>` : ''}
      </div>
    </div>
  `).join('');
}

// Navigation Bar
function nav() {
  const userPill = state.authUser ? `
    <div class="user-menu">
      <div class="user-pill" title="${state.authUser.email}">
        <span class="user-avatar">${state.authUser.fullName.charAt(0).toUpperCase()}</span>
        <span>${state.authUser.fullName.split(' ')[0]}</span>
        <span class="role-tag">${state.authUser.role.split('/')[0]}</span>
      </div>
      <button class="logout-btn" onclick="logout()" title="Logout">Logout</button>
    </div>
  ` : `
    <button class="ghost-btn" onclick="setView('login')">Login</button>
  `;

  return `
    <header class="topbar">
      <button class="brand" onclick="setView('home')">
        <span class="brand-mark">P</span>
        <strong>Problem<span>Bridge</span> AI</strong>
      </button>
      <nav class="nav">
        <button class="${state.view === 'home' ? 'active' : ''}" onclick="setView('home')">Home</button>
        <button class="${state.view === 'dashboard' ? 'active' : ''}" onclick="setView('dashboard')">Challenges</button>
        <button class="${state.view === 'tracking' ? 'active' : ''}" onclick="openTracking()">My progress</button>
        <button class="nav-cta" onclick="setView('report')">+ Report a problem</button>
        ${userPill}
      </nav>
    </header>
  `;
}

function layout(content) {
  app.innerHTML = `
    <div class="app-shell">
      ${nav()}
      <main>${content}</main>
      ${state.toast ? `<div class="toast">${state.toast}</div>` : ''}
    </div>
  `;
}

// Views
function home() {
  const st = state.stats;
  return `
    <section class="view">
      <div class="hero">
        <div>
          <div class="eyebrow">A civic innovation platform</div>
          <h1>Real problems.<br><em>Real solutions.</em></h1>
          <p class="lead">ProblemBridge AI enables people to report real-world problems in simple language and connects those problems with the right authorities or innovators.</p>
          <div class="action-row">
            <button class="primary-btn" onclick="setView('report')">Report a problem ${icon('→')}</button>
            <button class="secondary-btn" onclick="setView('dashboard')">Explore challenges</button>
          </div>
        </div>
        <div class="hero-art">
          <div class="bridge-art">
            <div class="bridge-note">AI found an opportunity</div>
            <div class="bridge-arc"></div>
            <div class="bridge-line"></div>
            <div class="bridge-dot problem">${icon('!')}</div>
            <div class="bridge-dot solution">${icon('✦')}</div>
          </div>
        </div>
      </div>

      <div class="stats">
        <div class="stat">
          <div class="stat-number">${st.problemsReported.toLocaleString()}</div>
          <div class="stat-label">Problems reported</div>
        </div>
        <div class="stat">
          <div class="stat-number">${st.problemsSolved.toLocaleString()}</div>
          <div class="stat-label">Problems solved</div>
        </div>
        <div class="stat">
          <div class="stat-number">${st.innovationChallenges.toLocaleString()}</div>
          <div class="stat-label">Innovation challenges</div>
        </div>
        <div class="stat">
          <div class="stat-number">${st.activeInnovators.toLocaleString()}</div>
          <div class="stat-label">Active innovators</div>
        </div>
      </div>

      <section class="workflow">
        <div class="section-head">
          <div>
            <div class="overline">The bridge</div>
            <h2>From voice to impact</h2>
          </div>
          <p class="lead">One connected path from lived experience to measurable change.</p>
        </div>
        <div class="workflow-grid">
          <div class="step">
            <div class="step-no">01 / REPORT</div>
            <div class="step-icon">${icon('◌')}</div>
            <h3>Speak up</h3>
            <p>A citizen describes a real problem in everyday language via voice or text.</p>
          </div>
          <div class="step">
            <div class="step-no">02 / UNDERSTAND</div>
            <div class="step-icon">${icon('⌁')}</div>
            <h3>AI finds the signal</h3>
            <p>AI extracts root causes, checks duplicates, scores urgency, and determines smart routing.</p>
          </div>
          <div class="step">
            <div class="step-no">03 / CONNECT</div>
            <div class="step-icon">${icon('↗')}</div>
            <h3>Find the right hands</h3>
            <p>Authorities and innovators receive a clear, actionable brief to act on.</p>
          </div>
          <div class="step">
            <div class="step-no">04 / SOLVE</div>
            <div class="step-icon">${icon('✦')}</div>
            <h3>Build what matters</h3>
            <p>Innovators develop, host live projects, and test until citizen-verified resolution.</p>
          </div>
        </div>
      </section>

      <section>
        <div class="section-head">
          <div>
            <div class="overline">Explore the field</div>
            <h2>Problems have no single category</h2>
          </div>
        </div>
        <div class="category-grid">
          ${categories.map(c => `<button class="category" onclick="filterCategory('${c}'); setView('dashboard')">${c} <span>↗</span></button>`).join('')}
        </div>
      </section>

      <section class="compare">
        <div>
          <div class="overline">Why ProblemBridge AI?</div>
          <h2>A complaint can become a catalyst.</h2>
          <p>Not every problem needs an innovation. Not every innovation starts with a known problem. ProblemBridge AI uses AI to identify the right path.</p>
          <p>Local problems can be routed for immediate action. Recurring patterns become innovation opportunities.</p>
        </div>
        <div class="compare-list">
          <div class="compare-row">
            <strong>NORMAL COMPLAINT APP</strong>
            <p>Problem → Authority → Complaint status</p>
          </div>
          <div class="compare-row">
            <strong>NORMAL INNOVATION PLATFORM</strong>
            <p>Innovation idea → Students / innovators → Project</p>
          </div>
          <div class="compare-row">
            <strong>PROBLEMBRIDGE AI</strong>
            <p>Real problem → AI understands → Duplicate detection → Priority analysis → Smart routing → Authority action or innovation opportunity or both → Verified resolution</p>
          </div>
        </div>
      </section>
    </section>
  `;
}

function report() {
  return `
    <section class="view">
      <div class="page-header">
        <div>
          <div class="overline">Start a bridge</div>
          <h1>Report a problem</h1>
          <p>No technical words needed. Tell us what is happening in your own way.</p>
        </div>
        <button class="secondary-btn" onclick="setView('home')">← Back home</button>
      </div>

      <div class="form-layout">
        <div class="panel">
          <h2>What are you experiencing?</h2>
          <form onsubmit="submitProblem(event)">
            <div class="form-grid">
              <div class="field full">
                <label for="title">Problem title</label>
                <input id="title" value="Difficulty Finding Available Hospital Beds" required />
              </div>
              <div class="field full">
                <label for="description">Describe your problem</label>
                <textarea id="description" required rows="4">People in my area face difficulty finding real-time information about available hospital beds. Patients and their families have to contact multiple hospitals, which wastes time during emergencies.</textarea>
              </div>
              <div class="field">
                <label for="category">Category</label>
                <select id="category">
                  ${categories.map(c => `<option ${c === 'Healthcare' ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
              </div>
              <div class="field">
                <label for="location">Location</label>
                <input id="location" value="Hyderabad" />
              </div>
              <div class="field full">
                <label for="problemEvidence">Upload Photo or Video Evidence</label>
                <input id="problemEvidence" type="file" accept="image/*,video/*" />
                <small class="muted">Optional photo or video illustrating the problem.</small>
              </div>
              <div class="field full">
                <label for="contact">Contact information (optional)</label>
                <input id="contact" placeholder="Email or phone number" />
              </div>
            </div>
            <div class="form-actions">
              <span class="muted">Your report can be anonymous.</span>
              <button class="primary-btn" type="submit" ${state.loading ? 'disabled' : ''}>
                ${state.loading ? '<span class="spinner"></span> Analyzing with AI...' : 'Submit problem →'}
              </button>
            </div>
          </form>
        </div>

        <aside class="panel">
          <h2>Choose your easiest way</h2>
          <p class="lead">You can start with whatever feels natural. Our AI will structure and categorize it.</p>
          <div class="quick-actions">
            <button type="button" onclick="startSpeech()">${icon('🎤')} Speak your problem</button>
            <div class="speech-controls">
              <label for="speechLanguage">Language</label>
              <select id="speechLanguage" onchange="updateSpeechLanguage(this.value)">
                <option value="en-IN">English</option>
                <option value="te-IN">Telugu (తెలుగు)</option>
                <option value="hi-IN">Hindi (हिन्दी)</option>
              </select>
              <button type="button" onclick="startSpeech()">Start Speaking</button>
              <button type="button" onclick="stopSpeech()">Stop Speaking</button>
              <button type="button" onclick="useSpeechText()">Use Spoken Text</button>
              <div class="listening-status ${state.listening ? 'is-listening' : ''}">
                ${state.listening ? 'Listening... Speak your problem description now.' : 'Microphone ready for voice input.'}
              </div>
            </div>
            <button type="button" onclick="document.querySelector('#description').focus()">${icon('✎')} Type your problem</button>
            <button type="button" onclick="document.querySelector('#problemEvidence').click()">${icon('▧')} Upload photo or video</button>
          </div>
          <div class="callout" style="margin-top:24px">
            <strong>What happens next?</strong>
            <p>Our AI backend extracts root causes, detects duplicate community reports, calculates urgency, and selects the ideal routing path.</p>
          </div>
        </aside>
      </div>
    </section>
  `;
}

function analysis() {
  const r = state.routing || {
    route: 'innovation',
    urgency: 'HIGH',
    score: 88,
    duplicate: false,
    recurring: true,
    similarReports: 47,
    assignedAuthority: 'District Health & Medical Services Office',
    recommendation: 'The problem affects access to essential services and appears to need a new technology, system, or process rather than a single repair.',
    peopleAffected: 'Thousands across the region',
    innovationPotential: 'HIGH',
    rootCauses: ['Lack of centralized bed availability tracking', 'Fragmented communication during emergencies'],
    techSuggestions: ['Web Technologies', 'Real-time WebSockets', 'Mobile App', 'Cloud Database']
  };

  const isDuplicate = r.route === 'duplicate';
  const isAuthority = r.route === 'authority' || r.route === 'dual';

  const action = isDuplicate ? `
    <button class="primary-btn" onclick="submitSupport()">Support existing report (${state.supportCount})</button>
    <button class="secondary-btn" onclick="setView('dashboard')">View existing reports</button>
    <button class="secondary-btn" onclick="submitDifferentProblem()">Submit as different problem</button>
  ` : isAuthority ? `
    <button class="primary-btn" onclick="setView('authorityTracking')">View authority tracking →</button>
    ${r.route === 'dual' ? `<button class="secondary-btn" onclick="setView('challenge')">View innovation opportunity →</button>` : ''}
  ` : `
    <button class="primary-btn" onclick="setView('challenge')">Create innovation challenge →</button>
    <button class="secondary-btn" onclick="setView('dashboard')">View similar community reports</button>
  `;

  return `
    <section class="view">
      <div class="page-header">
        <div>
          <div class="overline">Step 02 / AI understanding</div>
          <h1>Analysis complete</h1>
          <p>We turned a personal experience into a structured, actionable brief.</p>
        </div>
        <span class="badge">AI analysis complete</span>
      </div>

      <div class="route-banner">
        <div>
          <small>AI RECOMMENDED ACTION</small>
          <h2>${routeLabel(r.route)}</h2>
          <p>${r.recommendation}</p>
        </div>
        <span class="route-icon">${r.route === 'authority' ? '↗' : r.route === 'duplicate' ? '≈' : r.route === 'dual' ? '↔' : '✦'}</span>
      </div>

      <div class="analysis-layout">
        <div class="panel">
          <h2>What our AI understood</h2>
          <div class="result-grid">
            <div class="result-item">
              <small>Problem summary</small>
              <strong>${state.problem.description}</strong>
            </div>
            <div class="result-item">
              <small>Detected category</small>
              <strong>${state.problem.category}</strong>
            </div>
            <div class="result-item">
              <small>Problem type</small>
              <strong>${r.route === 'authority' ? 'Routine service issue' : r.route === 'duplicate' ? 'Existing report match' : 'Recurring community problem'}</strong>
            </div>
            <div class="result-item">
              <small>Duplicate status</small>
              <strong>${r.duplicate ? 'Similar problem detected' : 'No close duplicate found'}</strong>
            </div>
            <div class="result-item">
              <small>Urgency / priority</small>
              <strong style="color:var(--coral)">${r.urgency || 'HIGH'} · ${r.score} / 100</strong>
            </div>
            <div class="result-item">
              <small>People potentially affected</small>
              <strong>${r.peopleAffected}</strong>
            </div>
            <div class="result-item">
              <small>Similar reports found</small>
              <strong>${state.supportCount} reports</strong>
            </div>
            <div class="result-item">
              <small>Location</small>
              <strong>${state.problem.location}</strong>
            </div>
          </div>

          ${r.rootCauses && r.rootCauses.length ? `
            <div style="margin-top:20px; border-top:1px solid var(--line); padding-top:16px;">
              <small style="color:var(--muted); font-weight:700; text-transform:uppercase; letter-spacing:.08em;">Root Causes Identified by AI</small>
              <ul class="root-cause-list">
                ${r.rootCauses.map(c => `<li>${c}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          ${r.techSuggestions && r.techSuggestions.length ? `
            <div style="margin-top:16px;">
              <small style="color:var(--muted); font-weight:700; text-transform:uppercase; letter-spacing:.08em;">Recommended Technology Stack</small>
              <div class="tech-tag-list">
                ${r.techSuggestions.map(t => `<span class="tech-tag">${t}</span>`).join('')}
              </div>
            </div>
          ` : ''}

          ${isDuplicate ? `
            <div class="duplicate-box" style="margin-top:20px;">
              <strong>SIMILAR PROBLEM DETECTED IN DATABASE</strong>
              <p>Existing Problem: ${state.problem.title}</p>
              <p><b>${state.supportCount}</b> citizens reporting · Status: ${state.authorityStatus || 'Under review'}</p>
            </div>
          ` : `
            <div class="opportunity" style="margin-top:20px;">
              <strong>Innovation potential: ${r.innovationPotential || 'HIGH'}</strong>
              <p>${r.route === 'dual'
                ? 'Multiple reports indicate a recurring systemic challenge. Emergency teams can act now while an innovation opportunity addresses long-term automation.'
                : r.route === 'authority'
                  ? 'This problem has a designated civic agency and can be handled via municipal inspection. It does not require building custom software.'
                  : 'The issue requires an innovative technology-based platform and has been converted into an Innovation Challenge.'}</p>
            </div>
          `}

          <div class="action-row" style="margin-top:24px;">
            ${action}
          </div>
        </div>

        <aside class="panel cta-panel">
          <div class="overline">Transparent decision</div>
          <h2>Why this path?</h2>
          <p>${r.recommendation}</p>
          <div class="meta-list">
            <div>
              <small>Assigned organization</small>
              <strong>${r.assignedAuthority || 'District Public Services'}</strong>
            </div>
            <div>
              <small>Priority score</small>
              <strong>${r.score} / 100 · ${r.urgency || 'HIGH'}</strong>
            </div>
            <div>
              <small>Pattern signal</small>
              <strong>${r.recurring ? 'Recurring systemic problem' : 'Individual report'}</strong>
            </div>
          </div>
        </aside>
      </div>

      ${r.route === 'dual' ? `
        <div class="dual-route">
          <div>
            <span>IMMEDIATE ACTION</span>
            <strong>Send report to authority</strong>
            <p>${r.assignedAuthority} receives this urgent report for immediate dispatch and desilting.</p>
          </div>
          <div>
            <span>LONG-TERM OPPORTUNITY</span>
            <strong>Smart infrastructure telemetry</strong>
            <p>How can IoT sensors, telemetry, and GIS predict choke points before overflows occur?</p>
          </div>
        </div>
      ` : ''}
    </section>
  `;
}

function challenge() {
  const ch = state.currentChallenge || state.challenges[0];
  if (!ch) {
    return '<section class="view"><div class="panel empty"><h2>No innovation challenges available</h2><p>New challenges will appear here when they are created from real community problems.</p></div></section>';
  }

  return `
    <section class="view">
      <div class="page-header">
        <div>
          <div class="overline">Step 03 / Connect</div>
          <h1>Innovation challenge</h1>
          <p>A structured brief that makes this problem accessible to innovators.</p>
        </div>
        <button class="secondary-btn" onclick="setView('dashboard')">Explore all challenges →</button>
      </div>

      <div class="challenge-layout">
        <div class="challenge-hero">
          <div class="overline">Open for innovators</div>
          <h2>${ch.title}</h2>
          <p>${ch.challengeQuestion || ch.problem}</p>
          <div class="action-row">
            <button class="primary-btn" onclick="startChallengeSolution('${ch.id}')">I want to solve this</button>
            <button class="secondary-btn" onclick="setView('dashboard')">View proposed solutions</button>
          </div>
        </div>

        <aside class="panel">
          <div class="meta-list" style="margin-top:0">
            <div>
              <small>Category</small>
              <strong>${ch.category}</strong>
            </div>
            <div>
              <small>Required skills</small>
              <div class="chip-row">
                ${ch.skills.map(s => `<span class="chip">${s}</span>`).join('')}
              </div>
            </div>
            <div>
              <small>Expected impact</small>
              <strong>${ch.expectedImpact || 'Reduced friction and measurable social impact.'}</strong>
            </div>
            <div>
              <small>Interested innovators</small>
              <strong>${ch.watchersCount || 24} people are watching this challenge</strong>
            </div>
          </div>
        </aside>
      </div>
    </section>
  `;
}

function dashboard() {
  const chList = state.challenges;

  const st = state.stats;

  return `
    <section class="view">
      <div class="page-header">
        <div>
          <div class="overline">For students and innovators</div>
          <h1>Find your next build</h1>
          <p>Real community challenges backed by verified citizen reports. Pick one that matches your skillset.</p>
        </div>
        <button class="primary-btn" onclick="setView('propose')">My proposed solution +</button>
      </div>

      <div class="analytics-grid">
        <div><strong>${st.problemsReported.toLocaleString()}</strong><span>Problems reported</span></div>
        <div><strong>${st.innovationChallenges}</strong><span>Innovation challenges</span></div>
        <div><strong>${Math.round(st.problemsReported * 0.08)}</strong><span>Duplicates merged</span></div>
        <div><strong>${Math.round(st.problemsReported * 0.18)}</strong><span>High priority</span></div>
        <div><strong>${st.problemsSolved}</strong><span>Problems solved</span></div>
      </div>

      <div class="routing-breakdown">
        <span>SMART ROUTING BREAKDOWN</span>
        <b>AUTHORITY ROUTED <i>${st.routingPercentages?.authority || 58}%</i></b>
        <b>INNOVATION ROUTED <i>${st.routingPercentages?.innovation || 25}%</i></b>
        <b>DUAL ROUTED <i>${st.routingPercentages?.dual || 12}%</i></b>
        <b>DUPLICATES MERGED <i>${st.routingPercentages?.duplicate || 5}%</i></b>
      </div>

      <div class="pattern-panel">
        <div>
          <span class="overline">AI pattern watch</span>
          <h2>Drainage problems</h2>
          <p>247 similar reports across Area A, Area B, and Area C indicate a recurring infrastructure management problem.</p>
        </div>
        <div>
          <strong>Immediate action</strong>
          <p>Send individual reports to the municipal authority for emergency desilting.</p>
          <strong>Long-term opportunity</strong>
          <p>Create a smart drainage monitoring challenge.</p>
          <button class="secondary-btn" onclick="setView('challenge')">View innovation opportunity →</button>
        </div>
      </div>

      <div class="dashboard-tools">
        <input class="search" placeholder="Search challenges by keyword..." oninput="filterChallenges(this.value)" />
        <select class="filter" onchange="filterCategory(this.value)">
          <option value="all">All categories</option>
          <option>Healthcare Technology</option>
          <option>Agriculture</option>
          <option>Public Safety</option>
          <option>Software</option>
          <option>Public Infrastructure</option>
        </select>
      </div>

      <div id="challenge-grid" class="challenge-grid">
        ${challengeCards(chList)}
      </div>
    </section>
  `;
}

function challengeCards(list) {
  if (!list.length) return '<div class="panel empty">No challenges match that filter yet.</div>';
  return list.map(c => `
    <article class="challenge-card ${c.featured ? 'featured' : ''}" data-category="${c.category}">
      <div class="card-top">
        <span class="badge">${c.category}</span>
        <button class="save-btn" aria-label="Save challenge" onclick="saveChallenge('${c.id}')">
          ${c.isWatched || state.savedChallenges.includes(c.id) ? '♥' : '♡'}
        </button>
      </div>
      <h3>${c.title}</h3>
      <p>${c.problem}</p>
      <div class="chip-row">
        ${(c.skills || []).map(s => `<span class="chip">${s}</span>`).join('')}
      </div>
      <div class="card-actions">
        <button class="primary-btn" onclick="startChallengeSolution('${c.id}')">I want to solve this</button>
        <button class="secondary-btn" onclick="selectChallenge('${c.id}')">View Details</button>
      </div>
    </article>
  `).join('');
}

function filterChallenges(query) {
  const filtered = state.challenges.filter(c => `${c.title} ${c.problem} ${c.category}`.toLowerCase().includes(query.toLowerCase()));
  document.querySelector('#challenge-grid').innerHTML = challengeCards(filtered);
}

function filterCategory(category) {
  const filtered = category === 'all' ? state.challenges : state.challenges.filter(c => c.category === category);
  document.querySelector('#challenge-grid').innerHTML = challengeCards(filtered);
}

function challengeDetails() {
  const ch = state.currentChallenge || state.challenges[0];
  if (!ch) return `<section class="view"><p>No challenge selected.</p></section>`;

  return `
    <section class="view">
      <div class="page-header">
        <div>
          <div class="overline">Complete challenge brief</div>
          <h1>Challenge details</h1>
          <p>Everything an innovator needs to understand the problem before building.</p>
        </div>
        <button class="secondary-btn" onclick="setView('dashboard')">← Back to challenges</button>
      </div>

      <div class="challenge-layout">
        <div class="panel">
          <span class="badge">Open for Innovators</span>
          <h2>${ch.title}</h2>
          <div class="detail-stack">
            <div>
              <small>Category</small>
              <strong>${ch.category}</strong>
            </div>
            <div>
              <small>Original problem</small>
              <p>${ch.problem}</p>
            </div>
            <div>
              <small>Innovation challenge question</small>
              <p>${ch.challengeQuestion || 'How can a technology-based solution address this recurring challenge?'}</p>
            </div>
            <div>
              <small>Expected impact</small>
              <p>${ch.expectedImpact || 'Faster access to services and reduced delays during emergencies.'}</p>
            </div>
          </div>
          <div class="action-row">
            <button class="primary-btn" onclick="startChallengeSolution('${ch.id}')">I Want to Solve This</button>
            <button class="secondary-btn" onclick="setView('solutionDetails')">View Proposed Solutions</button>
          </div>
        </div>

        <aside class="panel">
          <div class="meta-list" style="margin-top:0">
            <div>
              <small>Required skills</small>
              <div class="chip-row">
                ${(ch.skills || []).map(s => `<span class="chip">${s}</span>`).join('')}
              </div>
            </div>
            <div>
              <small>Status</small>
              <strong>Open for Innovators</strong>
            </div>
            <div>
              <small>Community watch</small>
              <strong>${ch.watchersCount || 24} innovators following</strong>
            </div>
          </div>
        </aside>
      </div>
    </section>
  `;
}

function propose() {
  const s = state.solution;
  return `
    <section class="view">
      <div class="page-header">
        <div>
          <div class="overline">Step 04 / Build</div>
          <h1>Propose a solution</h1>
          <p>Show the community what you would build and why it matters.</p>
        </div>
        <button class="secondary-btn" onclick="setView('challenge')">← Challenge brief</button>
      </div>

      <div class="form-layout">
        <div class="panel">
          <h2>Solution details</h2>
          <form onsubmit="submitSolution(event)">
            <div class="form-grid">
              <div class="field full">
                <label>Solution title</label>
                <input name="solutionTitle" value="${s.title}" required />
              </div>
              <div class="field full">
                <label>Solution description</label>
                <textarea name="solutionDescription" required rows="3">${s.description}</textarea>
              </div>
              <div class="field full">
                <label>Proposed technology</label>
                <input name="technology" value="${s.technology}" required placeholder="e.g. React, Node.js, MongoDB, WebSocket API" />
              </div>
              <div class="field">
                <label>Team members</label>
                <input name="team" value="${s.team}" placeholder="Names or team handle" />
              </div>
              <div class="field">
                <label>Project status</label>
                <select name="status">
                  <option ${s.status === 'Proposed' ? 'selected' : ''}>Proposed</option>
                  <option ${s.status === 'In Development' ? 'selected' : ''}>In Development</option>
                  <option ${s.status === 'Testing' ? 'selected' : ''}>Testing</option>
                  <option ${s.status === 'Ready for Review' ? 'selected' : ''}>Ready for Review</option>
                </select>
              </div>
              <div class="field full">
                <label>Expected impact</label>
                <textarea name="impact" rows="2">${s.impact}</textarea>
              </div>
            </div>

            <div class="project-upload">
              <h2>Upload or Link Your Complete Project</h2>
              <p>Build your project using any platform. When ready, deploy online and paste the complete public website URL below.</p>
              <div class="form-grid">
                <div class="field full">
                  <label>Live Project / Website URL</label>
                  <input name="website" type="url" value="${s.websiteUrl || ''}" placeholder="https://your-project-name.example" />
                  <small class="muted">Website URL is required before submitting your project for review.</small>
                </div>
                <div class="field">
                  <label>Source Code Repository URL</label>
                  <input name="source" type="url" value="${s.sourceCodeUrl || ''}" placeholder="https://github.com/your-username/repo" />
                  <small class="muted">Optional link to your source code repository.</small>
                </div>
                <div class="field">
                  <label>Demo Video URL</label>
                  <input name="demo" type="url" value="${s.demoUrl || ''}" placeholder="https://youtube.com/watch?v=..." />
                </div>
                <div class="field full">
                  <label>Upload Project Evidence / Documentation</label>
                  <input name="evidence" type="file" multiple accept="image/*,.pdf,.ppt,.pptx,.doc,.docx" />
                  <small class="muted">Optional: screenshots, presentation, or design docs.</small>
                </div>
              </div>
            </div>

            <div class="form-actions">
              <span class="muted">Proposal and review submission are separate steps.</span>
              <button class="secondary-btn" type="submit" name="submissionType" value="proposal">Save as Proposal</button>
              <button class="primary-btn" type="submit" name="submissionType" value="review" ${state.loading ? 'disabled' : ''}>
                ${state.loading ? '<span class="spinner"></span> Saving...' : 'Submit Complete Project for Review'}
              </button>
            </div>
          </form>
        </div>

        <aside class="panel">
          <div class="overline">Where do I upload my website?</div>
          <h2>Build it elsewhere. Bring the link here.</h2>
          <p class="lead">ProblemBridge AI is for discovering problems, connecting innovators, submitting solutions, and tracking progress.</p>
          <div class="build-steps">
            <strong>BUILD PROJECT</strong><span>↓</span>
            <strong>TEST PROJECT</strong><span>↓</span>
            <strong>DEPLOY / HOST PROJECT ONLINE</strong><span>↓</span>
            <strong>COPY COMPLETE WEBSITE URL</strong><span>↓</span>
            <strong>PASTE WEBSITE URL HERE</strong><span>↓</span>
            <strong>SUBMIT FOR REVIEW</strong>
          </div>
          <div class="callout" style="margin-top:24px">
            <strong>Example: HospitalConnect</strong>
            <p>Student builds the website, deploys it online, then pastes a complete link such as https://hospitalconnect.example so reviewers can test the working app.</p>
          </div>
        </aside>
      </div>
    </section>
  `;
}

function solutionDetails() {
  const s = state.solution;
  const progress = s.progressPercent || solutionProgress[s.status] || 10;
  const resource = (label, value, symbol) => `<button class="resource-btn" onclick="openProject('${value}', '${label}')">${symbol} ${label}</button>`;

  return `
    <section class="view">
      <div class="page-header">
        <div>
          <div class="overline">Submission received</div>
          <h1>Solution details</h1>
          <p>Review the project information and public resources shared with the community.</p>
        </div>
        <button class="primary-btn" onclick="openTracking()">Open solution progress →</button>
      </div>

      <div class="challenge-layout">
        <div class="panel">
          <div class="card-top">
            <div>
              <span class="badge">${s.status}</span>
              <h2 style="margin-top:14px">${s.title}</h2>
            </div>
            <span class="stat-number" style="font-size:24px">${progress}%</span>
          </div>

          <div class="detail-stack">
            <div>
              <small>Solution description</small>
              <p>${s.description}</p>
            </div>
            <div>
              <small>Technology used</small>
              <strong>${s.technology || 'Not specified'}</strong>
            </div>
            <div>
              <small>Team members</small>
              <strong>${s.team || 'Solo innovator'}</strong>
            </div>
            <div>
              <small>Project status</small>
              <strong>${s.status}</strong>
            </div>
            <div>
              <small>Progress</small>
              <strong>${progress}% Complete</strong>
            </div>
            <div>
              <small>Expected impact</small>
              <p>${s.impact || 'Community access enhancement'}</p>
            </div>
          </div>

          <div class="resource-grid">
            <h3>Project resources</h3>
            ${resource('View Complete Website', s.websiteUrl, '🌐')}
            ${resource('View Source Code', s.sourceCodeUrl, '💻')}
            ${resource('Watch Demo Video', s.demoUrl, '▶')}
            ${resource('View Screenshots', s.evidenceFiles?.length ? '#' : '', '📷')}
            ${resource('View Documentation', s.evidenceFiles?.length ? '#' : '', '📄')}
          </div>
        </div>

        <aside class="panel cta-panel">
          <div class="overline">${s.status === 'Ready for Review' ? 'Ready for review' : 'Proposal active'}</div>
          <h2>The project has a home.</h2>
          <p>Your complete website stays hosted on your chosen platform. ProblemBridge AI keeps the public link attached to your solution so reviewers can test it.</p>
          <button class="secondary-btn" onclick="openTracking()">Track solution progress</button>
        </aside>
      </div>
    </section>
  `;
}

function tracking() {
  const s = state.solution;
  if (!s.id) {
    return `
      <section class="view">
        <div class="panel empty">
          <h2>No solutions yet.</h2>
          <p>Start solving an innovation challenge to see your progress here.</p>
          <button class="primary-btn" onclick="setView('dashboard')">Explore Innovation Challenges</button>
        </div>
      </section>
    `;
  }
  const progress = s.progressPercent || solutionProgress[s.status] || 10;

  return `
    <section class="view">
      <div class="page-header">
        <div>
          <div class="overline">Your impact trail</div>
          <h1>Solution progress</h1>
          <p>Every stage makes the original problem more visible, more solvable, and closer to resolved.</p>
        </div>
        <button class="primary-btn" onclick="setView('dashboard')">Find another challenge</button>
      </div>

      <div class="challenge-layout">
        <div class="panel">
          <div class="overline">${s.title}</div>
          <h2>${state.currentChallenge?.title || 'Solution progress'}</h2>
          <p class="lead">${s.description || 'Track the progress of your submitted solution.'}</p>

          <div class="progress-wrap">
            <div class="progress-label">
              <span>Overall progress</span>
              <strong>${progress}% complete</strong>
            </div>
            <div class="progress-bar">
              <div class="progress-value" style="width:${progress}%"></div>
            </div>
          </div>

          <div class="progress-status">
            <label for="statusUpdate">Current status</label>
            <select id="statusUpdate" onchange="updateStatus(this.value)">
              ${innovatorStatuses.map(status => `<option ${s.status === status ? 'selected' : ''}>${status}</option>`).join('')}
              <option disabled>Implemented (reviewer only)</option>
              <option disabled>Problem Solved (reviewer only)</option>
            </select>
          </div>

          <div class="website-link">
            <small>Complete Website</small>
            <button class="secondary-btn" onclick="openProject('${s.websiteUrl}', 'website')">🌐 View Website</button>
            ${s.websiteUrl ? `<a href="${s.websiteUrl}" target="_blank" rel="noopener">${s.websiteUrl}</a>` : '<span class="muted">No public website URL added yet.</span>'}
          </div>

          <div class="timeline">
            ${solutionTimeline()}
          </div>
        </div>

        <aside class="panel cta-panel">
          <div class="overline">The bigger picture</div>
          <h2>One report. A growing ripple.</h2>
          <p>This solution is now visible to authorities, civic organizations, and active innovators who can test and review it.</p>
          <button class="secondary-btn" onclick="setView('solutionDetails')">View submitted solution</button>
        </aside>
      </div>
    </section>
  `;
}

function authorityTracking() {
  const statuses = [
    'Forwarded to Concerned Authority',
    'Authority Reviewing',
    'Work Assigned',
    'Resolution in Progress',
    'Resolved',
    'Citizen Verification'
  ];

  const currentIdx = statuses.indexOf(state.authorityStatus);
  const timeline = statuses.map((status, index) => `
    <div class="timeline-item">
      <span class="timeline-dot ${index < currentIdx ? 'done' : index === currentIdx ? 'current' : ''}">
        ${index < currentIdx ? '✓' : index === currentIdx ? '•' : ''}
      </span>
      <div>
        <strong>${status}</strong>
        ${index === currentIdx ? '<small>Current status</small>' : ''}
      </div>
    </div>
  `).join('');

  const verification = state.authorityStatus === 'Resolved' ? `
    <div class="verify-box">
      <strong>AUTHORITY MARKED THIS PROBLEM AS RESOLVED</strong>
      <p>Has your problem actually been resolved in your area?</p>
      ${state.citizenVerification ? `
        <span class="badge">${state.citizenVerification === 'yes' ? 'Citizen Verified Resolved' : 'Reopened for Authority'}</span>
      ` : `
        <div class="action-row">
          <button class="primary-btn" onclick="verifyResolution('yes')">Yes, problem solved</button>
          <button class="secondary-btn" onclick="verifyResolution('no')">No, still not resolved</button>
        </div>
      `}
    </div>
  ` : '';

  return `
    <section class="view">
      <div class="page-header">
        <div>
          <div class="overline">Authority resolution path</div>
          <h1>Problem tracking</h1>
          <p>Operational issues stay with the municipal agency equipped to inspect and resolve them.</p>
        </div>
        <button class="secondary-btn" onclick="setView('home')">← Back home</button>
      </div>

      <div class="challenge-layout">
        <div class="panel">
          <span class="badge">${state.authorityStatus}</span>
          <h2>${state.problem.title}</h2>
          <div class="meta-list">
            <div>
              <small>Priority</small>
              <strong>${state.routing?.score || 88} / 100 · ${state.routing?.urgency || 'HIGH'}</strong>
            </div>
            <div>
              <small>Location</small>
              <strong>${state.problem.location}</strong>
            </div>
            <div>
              <small>Community reports</small>
              <strong>${state.supportCount} citizen reports</strong>
            </div>
            <div>
              <small>Assigned organization</small>
              <strong>${state.routing?.assignedAuthority || 'Greater Hyderabad Municipal Corporation'}</strong>
            </div>
          </div>

          <div class="progress-status" style="margin-top:24px;">
            <label for="authorityStatus">Update workflow status</label>
            <select id="authorityStatus" onchange="updateAuthorityStatus(this.value)">
              ${['Authority Reviewing', 'Work Assigned', 'Resolution in Progress', 'Resolved'].map(status => `
                <option ${state.authorityStatus === status ? 'selected' : ''}>${status}</option>
              `).join('')}
            </select>
          </div>

          ${verification}
        </div>

        <aside class="panel">
          <h2>Resolution timeline</h2>
          <div class="timeline">${timeline}</div>
        </aside>
      </div>
    </section>
  `;
}

function register() {
  return `
    <div class="auth-shell">
      <div class="auth-brand">
        <span class="brand-mark">P</span>
        <strong>Problem<span>Bridge</span> AI</strong>
      </div>
      <div class="auth-layout">
        <div class="auth-intro">
          <div class="eyebrow">${icon('◌')} Community powered change</div>
          <h1>From Real Problems<br><em>to Real Solutions.</em></h1>
          <p class="lead">Join a connected community where lived experiences become action, innovation, and measurable impact.</p>
          <div class="auth-promise">
            <span>${icon('✦')}</span>
            <div>
              <strong>One bridge, many possibilities</strong>
              <small>Report, collaborate, and help move your community forward.</small>
            </div>
          </div>
        </div>

        <div class="auth-card">
          <div class="overline">Create your account</div>
          <h2>Create Your ProblemBridge Account</h2>
          <p class="auth-subheading">Join the full-stack community solving real-world problems.</p>
          <form onsubmit="registerAccount(event)">
            <div class="auth-fields">
              <div class="field">
                <label for="fullName">Full Name</label>
                <input id="fullName" autocomplete="name" required placeholder="e.g. Priya Sharma" />
              </div>
              <div class="field">
                <label for="registerEmail">Email Address</label>
                <input id="registerEmail" type="email" autocomplete="email" required placeholder="name@example.com" />
              </div>
              <div class="field">
                <label for="mobileNumber">Mobile Number <span class="optional">(optional)</span></label>
                <input id="mobileNumber" type="tel" autocomplete="tel" placeholder="+91 98765 43210" />
              </div>
              <div class="field">
                <label for="registerPassword">Password</label>
                <input id="registerPassword" type="password" minlength="6" autocomplete="new-password" required placeholder="Minimum 6 characters" />
              </div>
              <div class="field">
                <label for="confirmPassword">Confirm Password</label>
                <input id="confirmPassword" type="password" minlength="6" autocomplete="new-password" required />
              </div>
            </div>

            <div class="role-heading">
              <label>How will you use ProblemBridge AI?</label>
              <input id="registrationRole" type="hidden" value="Citizen" />
            </div>

            <div class="role-grid">
              <button type="button" class="role-card selected" data-role="Citizen" onclick="chooseRegistrationRole('Citizen')">
                <span class="role-icon">👤</span>
                <strong>Citizen</strong>
                <small>Report and track local problems</small>
              </button>
              <button type="button" class="role-card" data-role="Student / Innovator" onclick="chooseRegistrationRole('Student / Innovator')">
                <span class="role-icon">🎓</span>
                <strong>Student / Innovator</strong>
                <small>Build solutions for challenges</small>
              </button>
              <button type="button" class="role-card" data-role="Authority / Organization" onclick="chooseRegistrationRole('Authority / Organization')">
                <span class="role-icon">🏛️</span>
                <strong>Authority / Organization</strong>
                <small>Inspect & resolve complaints</small>
              </button>
              <button type="button" class="role-card" data-role="Admin / Reviewer" onclick="chooseRegistrationRole('Admin / Reviewer')">
                <span class="role-icon">🛡️</span>
                <strong>Admin / Reviewer</strong>
                <small>Review projects & verify</small>
              </button>
            </div>

            ${state.authError ? `<div class="auth-error">${state.authError}</div>` : ''}

            <button class="primary-btn auth-submit" type="submit" ${state.loading ? 'disabled' : ''}>
              ${state.loading ? '<span class="spinner"></span> Creating Account...' : `Create Account ${icon('→')}`}
            </button>
          </form>
          <p class="auth-switch">Already have an account? <button onclick="setView('login')">Login</button></p>
        </div>
      </div>
    </div>
  `;
}

function login() {
  return `
    <div class="auth-shell">
      <div class="auth-brand">
        <span class="brand-mark">P</span>
        <strong>Problem<span>Bridge</span> AI</strong>
      </div>
      <div class="auth-layout login-layout">
        <div class="auth-intro">
          <div class="eyebrow">${icon('↗')} Welcome back</div>
          <h1>Keep the bridge<br><em>moving forward.</em></h1>
          <p class="lead">Pick up where you left off and keep connecting real problems with real solutions.</p>
          <div class="auth-promise">
            <span>${icon('⌁')}</span>
            <div>
              <strong>Your impact trail is waiting</strong>
              <small>Access reports, challenges, progress, and community outcomes.</small>
            </div>
          </div>
        </div>

        <div class="auth-card">
          <div class="overline">Sign in to continue</div>
          <h2>Welcome Back</h2>
          <p class="auth-subheading">Continue connecting real problems with real solutions.</p>
          <form onsubmit="loginAccount(event)">
            <div class="auth-fields">
              <div class="field">
                <label for="loginEmail">Email Address</label>
                <input id="loginEmail" type="email" autocomplete="email" required placeholder="name@example.com" />
              </div>
              <div class="field">
                <label for="loginPassword">Password</label>
                <input id="loginPassword" type="password" autocomplete="current-password" required />
              </div>
            </div>

            <div class="login-role">
              <label for="loginRole">Login as</label>
              <select id="loginRole">
                <option>Citizen</option>
                <option>Student / Innovator</option>
                <option>Authority / Organization</option>
                <option>Admin / Reviewer</option>
              </select>
            </div>

            ${state.authError ? `<div class="auth-error">${state.authError}</div>` : ''}

            <button class="primary-btn auth-submit" type="submit" ${state.loading ? 'disabled' : ''}>
              ${state.loading ? '<span class="spinner"></span> Logging In...' : `Login ${icon('→')}`}
            </button>
            <button class="forgot-link" type="button" onclick="notify('Tip: Default accounts: citizen@problembridge.test / innovator@problembridge.test / password123')">Need demo credentials?</button>
          </form>
          <p class="auth-switch">Don't have an account? <button onclick="setView('register')">Register</button></p>
        </div>
      </div>
    </div>
  `;
}

function render() {
  if (!state.authUser && !['register', 'login'].includes(state.view)) {
    state.view = 'register';
  }

  const views = {
    register,
    login,
    home,
    report,
    analysis,
    challenge,
    challengeDetails,
    dashboard,
    propose,
    solutionDetails,
    tracking,
    authorityTracking
  };

  if (['register', 'login'].includes(state.view)) {
    app.innerHTML = views[state.view]();
  } else {
    layout(views[state.view]());
  }
}

// Start application
initApp();

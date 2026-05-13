// ─── Portfolio Tracker Auth Module ───────────────────────
// SHA-256 + salt hashing via SubtleCrypto, NO plain-text storage
const Auth = (() => {
    const K = {
        HASH:     'pt_pwd_hash',
        SALT:     'pt_pwd_salt',
        PROFILE:  'pt_profile',
        SECURITY: 'pt_security_state',
        LOG:      'pt_security_log',
        SESSION:  'pt_session'
    };
    const PEPPER       = 'ptk_9f2a_inv3stor_2024'; // extra secret mixed in hash
    const MAX_ATTEMPTS = 5;
    const BASE_LOCK_MS = 30_000;                    // 30s base, doubles each lockout

    // ── Crypto ──────────────────────────────────────────
    async function hashPassword(password, salt) {
        const raw  = salt + '::' + PEPPER + '::' + password;
        const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
        return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function generateSalt() {
        const arr = new Uint8Array(32);
        crypto.getRandomValues(arr);
        return [...arr].map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // ── Persistence helpers ──────────────────────────────
    function getSecState()  { try { return JSON.parse(localStorage.getItem(K.SECURITY) || '{}'); } catch { return {}; } }
    function saveSecState(s) { localStorage.setItem(K.SECURITY, JSON.stringify(s)); }
    function getProfile()   { try { return JSON.parse(localStorage.getItem(K.PROFILE)  || 'null'); } catch { return null; } }
    function getSession()   { try { return JSON.parse(sessionStorage.getItem(K.SESSION) || 'null'); } catch { return null; } }

    function logEvent(event, detail = '') {
        const log = (() => { try { return JSON.parse(localStorage.getItem(K.LOG) || '[]'); } catch { return []; } })();
        log.unshift({ event, detail, time: new Date().toISOString(), ua: navigator.userAgent.substring(0, 60) });
        if (log.length > 50) log.length = 50;
        localStorage.setItem(K.LOG, JSON.stringify(log));
    }

    function startSession() {
        const token = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).slice(2);
        sessionStorage.setItem(K.SESSION, JSON.stringify({ token, lastActivity: Date.now() }));
    }

    // ── Public API ───────────────────────────────────────
    return {
        hasAccount: () => !!localStorage.getItem(K.HASH),
        getProfile,
        getLog: () => { try { return JSON.parse(localStorage.getItem(K.LOG) || '[]'); } catch { return []; } },

        async setup(password, displayName, email) {
            const salt = generateSalt();
            const hash = await hashPassword(password, salt);
            localStorage.setItem(K.HASH, hash);
            localStorage.setItem(K.SALT, salt);
            const name = (displayName || 'Investor').trim();
            localStorage.setItem(K.PROFILE, JSON.stringify({
                displayName: name,
                email: (email || '').trim(),
                initials: name.split(' ').map(w => w[0].toUpperCase()).slice(0, 2).join('') || 'IN',
                createdAt: Date.now(),
                sessionTimeout: 30,
                lastLogin: null
            }));
            logEvent('account_created');
            startSession();
        },

        async login(password) {
            const sec = getSecState();
            // Lockout check
            if (sec.lockedUntil && Date.now() < sec.lockedUntil) {
                return { success: false, locked: true, remainingSec: Math.ceil((sec.lockedUntil - Date.now()) / 1000) };
            }
            const storedHash = localStorage.getItem(K.HASH);
            const salt       = localStorage.getItem(K.SALT);
            if (!storedHash || !salt) return { success: false, noAccount: true };

            const inputHash = await hashPassword(password, salt);
            if (inputHash === storedHash) {
                // Success
                const cleared = { attempts: 0, lockedUntil: null };
                saveSecState(cleared);
                // Update profile last login
                const p = getProfile();
                if (p) { p.lastLogin = Date.now(); localStorage.setItem(K.PROFILE, JSON.stringify(p)); }
                logEvent('login_success');
                startSession();
                return { success: true };
            } else {
                // Failure
                const attempts = (sec.attempts || 0) + 1;
                let lockedUntil = null;
                if (attempts >= MAX_ATTEMPTS) {
                    const multiplier = Math.pow(2, Math.floor(attempts / MAX_ATTEMPTS) - 1);
                    lockedUntil = Date.now() + BASE_LOCK_MS * multiplier;
                }
                saveSecState({ attempts, lockedUntil });
                logEvent('login_failed', `attempt ${attempts}`);
                return { success: false, locked: !!lockedUntil, attemptsLeft: MAX_ATTEMPTS - attempts, lockedUntil };
            }
        },

        logout() {
            logEvent('logout');
            sessionStorage.removeItem(K.SESSION);
        },

        isAuthenticated() {
            const session = getSession();
            if (!session) return false;
            const p = getProfile();
            const timeoutMs = ((p?.sessionTimeout) || 30) * 60_000;
            if (Date.now() - session.lastActivity > timeoutMs) {
                logEvent('session_expired');
                sessionStorage.removeItem(K.SESSION);
                return false;
            }
            return true;
        },

        touchActivity() {
            const s = getSession();
            if (s) { s.lastActivity = Date.now(); sessionStorage.setItem(K.SESSION, JSON.stringify(s)); }
        },

        saveProfile(updates) {
            const p = { ...(getProfile() || {}), ...updates };
            // Recalculate initials if name changed
            if (updates.displayName) {
                p.initials = updates.displayName.trim().split(' ').map(w => w[0].toUpperCase()).slice(0, 2).join('') || 'IN';
            }
            localStorage.setItem(K.PROFILE, JSON.stringify(p));
        },

        async changePassword(currentPwd, newPwd) {
            // Re-verify current
            const storedHash = localStorage.getItem(K.HASH);
            const salt       = localStorage.getItem(K.SALT);
            const inputHash  = await hashPassword(currentPwd, salt);
            if (inputHash !== storedHash) return { success: false, error: 'Current password is incorrect.' };
            const newSalt = generateSalt();
            const newHash = await hashPassword(newPwd, newSalt);
            localStorage.setItem(K.HASH, newHash);
            localStorage.setItem(K.SALT, newSalt);
            logEvent('password_changed');
            return { success: true };
        },

        validatePasswordStrength(pwd) {
            const checks = {
                length:   pwd.length >= 8,
                upper:    /[A-Z]/.test(pwd),
                lower:    /[a-z]/.test(pwd),
                number:   /[0-9]/.test(pwd),
                special:  /[^A-Za-z0-9]/.test(pwd)
            };
            const score = Object.values(checks).filter(Boolean).length;
            return { checks, score, label: ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'][score] };
        }
    };
})();

// ─── Auth UI Controller ───────────────────────────────────
const AuthUI = (() => {
    let lockTimer = null;
    let activityTimer = null;

    function showOverlay(screen) {
        document.getElementById('auth-overlay').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
        document.getElementById('login-screen').style.display  = screen === 'login' ? 'flex' : 'none';
        document.getElementById('setup-screen').style.display  = screen === 'setup' ? 'flex' : 'none';
        // Populate login greeting from saved profile
        if (screen === 'login') {
            const p = Auth.getProfile();
            const greetEl = document.getElementById('login-greeting');
            if (p && greetEl) {
                greetEl.style.display = 'flex';
                const nameEl = document.getElementById('login-greeting-name');
                const emailEl = document.getElementById('login-greeting-email');
                const initEl = document.getElementById('login-avatar-initials');
                if (nameEl)  nameEl.textContent  = p.displayName || 'Investor';
                if (emailEl) emailEl.textContent = p.email || '';
                if (initEl)  initEl.textContent  = p.initials || 'IN';
            }
        }
    }

    function hideOverlay() {
        document.getElementById('auth-overlay').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        updateAvatarDisplay();
        startActivityWatcher();
    }

    function updateAvatarDisplay() {
        const p = Auth.getProfile();
        const avatarEl = document.getElementById('profile-avatar-btn');
        if (avatarEl && p?.initials) avatarEl.textContent = p.initials;
    }

    function startActivityWatcher() {
        clearTimeout(activityTimer);
        ['click', 'keydown', 'mousemove', 'touchstart'].forEach(evt =>
            document.addEventListener(evt, () => Auth.touchActivity(), { passive: true })
        );
        // Check every 60s for session expiry
        activityTimer = setInterval(() => {
            if (!Auth.isAuthenticated()) showOverlay('login');
        }, 60_000);

        // Lock on tab hidden
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) Auth.touchActivity(); // freeze timestamp before hide
        });
    }

    function startLockoutCountdown(remainingSec) {
        const btn    = document.getElementById('login-btn');
        const errEl  = document.getElementById('login-error');
        const pwdEl  = document.getElementById('login-pwd');
        if (btn)  btn.disabled = true;
        if (pwdEl) pwdEl.disabled = true;
        clearInterval(lockTimer);
        let s = remainingSec;
        const tick = () => {
            if (errEl) errEl.textContent = `🔒 Too many attempts. Try again in ${s}s`;
            if (s <= 0) {
                clearInterval(lockTimer);
                if (btn)  btn.disabled = false;
                if (pwdEl) { pwdEl.disabled = false; pwdEl.focus(); }
                if (errEl) errEl.textContent = '';
            }
            s--;
        };
        tick();
        lockTimer = setInterval(tick, 1_000);
    }

    function renderStrengthBar(pwd) {
        const bar  = document.getElementById('pwd-strength-bar');
        const lbl  = document.getElementById('pwd-strength-label');
        if (!bar || !lbl) return;
        const { score, label, checks } = Auth.validatePasswordStrength(pwd);
        const colors = ['', '#f43f5e', '#fb923c', '#fbbf24', '#a3e635', '#00e5a0'];
        bar.style.width   = `${score * 20}%`;
        bar.style.background = colors[score] || '#f43f5e';
        lbl.textContent   = pwd.length ? label : '';
        lbl.style.color   = colors[score] || '#f43f5e';
    }

    return {
        init() {
            if (Auth.hasAccount()) {
                if (Auth.isAuthenticated()) { hideOverlay(); }
                else showOverlay('login');
            } else {
                showOverlay('setup');
            }
        },

        // ── Setup ──
        async doSetup() {
            const name  = document.getElementById('setup-name').value.trim();
            const email = document.getElementById('setup-email')?.value.trim() || '';
            const pwd   = document.getElementById('setup-pwd').value;
            const pwd2  = document.getElementById('setup-pwd2').value;
            const errEl = document.getElementById('setup-error');
            if (!pwd || pwd.length < 8) { errEl.textContent = 'Password must be at least 8 characters.'; return; }
            const { score } = Auth.validatePasswordStrength(pwd);
            if (score < 3)  { errEl.textContent = 'Please choose a stronger password (Fair or above).'; return; }
            if (pwd !== pwd2) { errEl.textContent = 'Passwords do not match.'; return; }
            const btn = document.getElementById('setup-btn');
            btn.textContent = '⏳ Securing...'; btn.disabled = true;
            await Auth.setup(pwd, name || 'Investor', email);
            hideOverlay();
        },

        // ── Login ──
        async doLogin() {
            const pwd   = document.getElementById('login-pwd').value;
            const errEl = document.getElementById('login-error');
            const btn   = document.getElementById('login-btn');
            if (!pwd) { errEl.textContent = 'Enter your password.'; return; }
            btn.textContent = '⏳ Verifying...'; btn.disabled = true;
            const result = await Auth.login(pwd);
            btn.textContent = 'Unlock'; btn.disabled = false;
            if (result.success) {
                errEl.textContent = '';
                document.getElementById('login-pwd').value = '';
                hideOverlay();
            } else if (result.locked) {
                startLockoutCountdown(result.remainingSec || 30);
            } else {
                errEl.textContent = result.attemptsLeft > 0
                    ? `Incorrect password. ${result.attemptsLeft} attempt${result.attemptsLeft !== 1 ? 's' : ''} left.`
                    : 'Too many failed attempts. Locking temporarily.';
                document.getElementById('login-pwd').value = '';
                document.getElementById('login-pwd').focus();
            }
        },

        doLogout() {
            Auth.logout();
            clearInterval(activityTimer);
            clearInterval(lockTimer);
            ProfilePanel.close();
            document.getElementById('login-pwd').value = '';
            document.getElementById('login-error').textContent = '';
            showOverlay('login');
        },

        renderStrengthBar,
        startLockoutCountdown
    };
})();

// ─── Profile Panel Controller ─────────────────────────────
const ProfilePanel = (() => {
    function renderLog() {
        const log     = Auth.getLog();
        const logEl   = document.getElementById('security-log-list');
        if (!logEl) return;
        const icons   = { login_success: '✅', login_failed: '❌', logout: '🔓', account_created: '🆕', password_changed: '🔑', session_expired: '⏱' };
        logEl.innerHTML = log.slice(0, 10).map(e => `
            <div class="log-entry">
                <span class="log-icon">${icons[e.event] || '📝'}</span>
                <div class="log-body">
                    <span class="log-event">${e.event.replace(/_/g,' ')}</span>
                    <span class="log-time">${new Date(e.time).toLocaleString('en-IN', {dateStyle:'short', timeStyle:'short'})}</span>
                </div>
            </div>`).join('') || '<p style="color:var(--text-3);text-align:center;padding:1rem;">No events yet</p>';
    }

    function populateForm() {
        const p = Auth.getProfile();
        if (!p) return;
        const n = document.getElementById('profile-display-name');
        const e = document.getElementById('profile-email');
        const t = document.getElementById('profile-timeout');
        const w = document.getElementById('profile-watchlist');
        const b = document.getElementById('profile-default-broker');
        if (n) n.value = p.displayName || '';
        if (e) e.value = p.email || '';
        if (t) t.value = p.sessionTimeout || 30;
        if (w) w.value = localStorage.getItem('userWatchlist') || 'RELIANCE,TCS,HDFCBANK,INFY,ICICIBANK,BHARTIARTL,SBIN,ITC,LT,AXISBANK,HINDUNILVR,KOTAKBANK,BAJFINANCE,MARUTI,TITAN,ASIANPAINT,WIPRO,ADANIENT,ADANIPORTS,NTPC';
        if (b) {
            b.innerHTML = '<option value="">Select a default broker...</option>';
            if (typeof GLOBAL_DB !== 'undefined' && GLOBAL_DB.brokers) {
                GLOBAL_DB.brokers.forEach(br => {
                    const opt = document.createElement('option');
                    opt.value = br; opt.textContent = br;
                    b.appendChild(opt);
                });
            }
            b.value = localStorage.getItem('defaultBroker') || '';
        }
        const lastEl = document.getElementById('profile-last-login');
        if (lastEl) lastEl.textContent = p.lastLogin ? new Date(p.lastLogin).toLocaleString('en-IN') : 'First session';
    }

    return {
        open() {
            document.getElementById('profile-panel').classList.add('open');
            document.getElementById('profile-overlay').style.display = 'block';
            populateForm();
            renderLog();
        },
        close() {
            document.getElementById('profile-panel')?.classList.remove('open');
            const ov = document.getElementById('profile-overlay');
            if (ov) ov.style.display = 'none';
        },
        async saveProfile() {
            const name    = document.getElementById('profile-display-name')?.value.trim();
            const email   = document.getElementById('profile-email')?.value.trim() || '';
            const timeout = parseInt(document.getElementById('profile-timeout')?.value) || 30;
            const wl      = document.getElementById('profile-watchlist')?.value.trim();
            const db      = document.getElementById('profile-default-broker')?.value;
            if (wl) localStorage.setItem('userWatchlist', wl);
            if (db) localStorage.setItem('defaultBroker', db);
            
            Auth.saveProfile({ displayName: name, email, sessionTimeout: Math.min(Math.max(timeout, 1), 480) });
            const avatarEl = document.getElementById('profile-avatar-btn');
            const p = Auth.getProfile();
            if (avatarEl && p?.initials) avatarEl.textContent = p.initials;
            document.getElementById('profile-save-msg').textContent = '✓ Saved';
            
            // Trigger refresh of Insights if applicable
            if (typeof updateMarketMovers === 'function') updateMarketMovers();

            setTimeout(() => { const m = document.getElementById('profile-save-msg'); if (m) m.textContent = ''; }, 2000);
        },
        async changePassword() {
            const cur   = document.getElementById('prof-pwd-current')?.value;
            const neu   = document.getElementById('prof-pwd-new')?.value;
            const conf  = document.getElementById('prof-pwd-confirm')?.value;
            const errEl = document.getElementById('prof-pwd-error');
            if (!cur || !neu) { errEl.textContent = 'Fill in all fields.'; return; }
            if (neu !== conf) { errEl.textContent = 'New passwords do not match.'; return; }
            const { score } = Auth.validatePasswordStrength(neu);
            if (score < 3)  { errEl.textContent = 'Choose a stronger password.'; return; }
            const result = await Auth.changePassword(cur, neu);
            if (result.success) {
                errEl.style.color = 'var(--green)';
                errEl.textContent = '✓ Password changed successfully.';
                document.getElementById('prof-pwd-current').value = '';
                document.getElementById('prof-pwd-new').value = '';
                document.getElementById('prof-pwd-confirm').value = '';
            } else {
                errEl.style.color = '#f43f5e';
                errEl.textContent = result.error || 'Failed.';
            }
        }
    };
})();

// ─── Toggle password visibility ───────────────────────────
function togglePwdVisibility(inputId) {
    const el = document.getElementById(inputId);
    if (!el) return;
    el.type = el.type === 'password' ? 'text' : 'password';
}

// ─── Keyboard shortcuts ───────────────────────────────────
document.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        if (document.getElementById('login-screen')?.style.display !== 'none')  AuthUI.doLogin();
        if (document.getElementById('setup-screen')?.style.display  !== 'none') AuthUI.doSetup();
    }
    if (e.key === 'Escape') ProfilePanel.close();
});

/*
  Blood Donation Website - Core JavaScript
  - Storage using localStorage with in-memory fallbacks
  - Validation utilities
  - DOM helpers
  - Page initializers (donor, recipient, requests, appointments)
*/

// ----------------------- Storage Layer -----------------------
const Storage = (() => {
  const keys = {
    donors: 'bd_donors',
    recipients: 'bd_recipients',
    requests: 'bd_requests',
    appointments: 'bd_appointments',
  };

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn('Storage read failed', key, e);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage write failed', key, e);
    }
  }

  function getAll() {
    return {
      donors: read(keys.donors, []),
      recipients: read(keys.recipients, []),
      requests: read(keys.requests, []),
      appointments: read(keys.appointments, []),
    };
  }

  return {
    keys,
    read,
    write,
    getAll,
  };
})();

// ----------------------- Utilities -----------------------
const Utils = (() => {
  function uid(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  }

  function byId(id) { return document.getElementById(id); }
  function qs(sel, root = document) { return root.querySelector(sel); }
  function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  function setActiveNav() {
    const path = location.pathname.split('/').pop() || 'index.html';
    qsa('.nav-links a').forEach(a => {
      const href = a.getAttribute('href');
      if ((path === '' && href.endsWith('index.html')) || href.endsWith(path)) {
        a.classList.add('active');
      }
    });
  }

  function saveAndNotify(key, list) {
    Storage.write(key, list);
    toast('Saved successfully');
  }

  function toast(message) {
    let el = qs('#toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.style.position = 'fixed';
      el.style.right = '16px';
      el.style.bottom = '16px';
      el.style.background = '#111827';
      el.style.color = 'white';
      el.style.padding = '10px 14px';
      el.style.borderRadius = '10px';
      el.style.boxShadow = '0 10px 22px rgba(0,0,0,0.25)';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, 1800);
  }

  return { uid, byId, qs, qsa, setActiveNav, saveAndNotify, toast };
})();

// ----------------------- Validation -----------------------
const Validators = (() => {
  const emailPattern = /.+@.+\..+/;
  const phonePattern = /^[0-9+()\-\s]{6,}$/;

  function notEmpty(value, field) {
    if (!value || String(value).trim() === '') {
      return `${field} is required`;
    }
    return '';
  }

  function validEmail(value) {
    return emailPattern.test(value) ? '' : 'Invalid email address';
  }

  function validPhone(value) {
    return phonePattern.test(value) ? '' : 'Invalid contact number';
  }

  function futureDate(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    if (Number.isNaN(d.getTime())) return 'Invalid date';
    if (d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) return 'Date must be today or future';
    return '';
  }

  function timeRange(timeStr) {
    // Accepts 08:00 - 18:00 window
    if (!timeStr) return 'Time is required';
    const [h, m] = timeStr.split(':').map(Number);
    if (h < 8 || h > 18 || (h === 18 && m > 0)) return 'Time must be between 08:00 and 18:00';
    return '';
  }

  return { notEmpty, validEmail, validPhone, futureDate, timeRange };
})();

// ----------------------- Domain Logic -----------------------
const Domain = (() => {
  // Simple compatibility map
  const compatibleMap = {
    'O-': ['O-'],
    'O+': ['O+', 'O-'],
    'A-': ['A-', 'O-'],
    'A+': ['A+', 'A-', 'O+', 'O-'],
    'B-': ['B-', 'O-'],
    'B+': ['B+', 'B-', 'O+', 'O-'],
    'AB-': ['AB-', 'A-', 'B-', 'O-'],
    'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
  };

  function isCompatible(requestType, donorType) {
    const donorsAllowed = compatibleMap[requestType] || [];
    return donorsAllowed.includes(donorType);
  }

  return { isCompatible };
})();

// ----------------------- Render Helpers -----------------------
const Render = (() => {
  function renderOptions(select, options, placeholder = 'Select...') {
    select.innerHTML = '';
    const ph = document.createElement('option');
    ph.value = '';
    ph.textContent = placeholder;
    select.appendChild(ph);
    options.forEach(opt => {
      const o = document.createElement('option');
      if (typeof opt === 'string') { o.value = opt; o.textContent = opt; }
      else { o.value = opt.value; o.textContent = opt.label; }
      select.appendChild(o);
    });
  }

  function renderTableBody(tbody, rows, cols) {
    tbody.innerHTML = '';
    rows.forEach(row => {
      const tr = document.createElement('tr');
      cols.forEach(key => {
        const td = document.createElement('td');
        td.textContent = row[key] ?? '';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  return { renderOptions, renderTableBody };
})();

// ----------------------- Page Initializers -----------------------
function initCommon() {
  Utils.setActiveNav();
}

function initHome() { /* no-op for now */ }

function initDonor() {
  const form = Utils.byId('donor-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const errors = [];
    errors.push(Validators.notEmpty(data.name, 'Name'));
    errors.push(Validators.validPhone(data.contact));
    errors.push(Validators.validEmail(data.email));
    errors.push(Validators.notEmpty(data.location, 'Location'));
    errors.push(Validators.notEmpty(data.bloodType, 'Blood Type'));
    const errorText = errors.filter(Boolean).join('\n');
    const errEl = Utils.byId('donor-errors');
    errEl.textContent = errorText;
    if (errorText) return;

    const donors = Storage.read(Storage.keys.donors, []);
    donors.push({ id: Utils.uid('donor'), ...data, createdAt: new Date().toISOString() });
    Utils.saveAndNotify(Storage.keys.donors, donors);
    form.reset();
    listDonors();
  });

  function listDonors() {
    const donors = Storage.read(Storage.keys.donors, []);
    const tbody = Utils.byId('donor-tbody');
    if (!tbody) return;
    Render.renderTableBody(tbody, donors, ['name', 'bloodType', 'location', 'contact']);
  }

  listDonors();
}

function initRecipient() {
  const form = Utils.byId('recipient-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const errors = [];
    errors.push(Validators.notEmpty(data.name, 'Name'));
    errors.push(Validators.validPhone(data.contact));
    errors.push(Validators.notEmpty(data.location, 'Location'));
    errors.push(Validators.notEmpty(data.bloodType, 'Blood Type needed'));
    const errEl = Utils.byId('recipient-errors');
    errEl.textContent = errors.filter(Boolean).join('\n');
    if (errEl.textContent) return;

    const recipients = Storage.read(Storage.keys.recipients, []);
    recipients.push({ id: Utils.uid('recipient'), ...data, createdAt: new Date().toISOString() });
    Utils.saveAndNotify(Storage.keys.recipients, recipients);
    form.reset();
    listRecipients();
  });

  function listRecipients() {
    const recipients = Storage.read(Storage.keys.recipients, []);
    const tbody = Utils.byId('recipient-tbody');
    if (!tbody) return;
    Render.renderTableBody(tbody, recipients, ['name', 'bloodType', 'location', 'contact']);
  }

  listRecipients();
}

function initRequests() {
  const form = Utils.byId('request-form');
  const listWrap = Utils.byId('requests-list');
  const filterBlood = Utils.byId('filter-blood');
  const filterLocation = Utils.byId('filter-location');
  const showMatchesBtn = Utils.byId('btn-my-matches');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const errors = [];
      errors.push(Validators.notEmpty(data.bloodType, 'Blood type'));
      errors.push(Validators.notEmpty(data.urgency, 'Urgency'));
      errors.push(Validators.notEmpty(data.location, 'Location'));
      const errEl = Utils.byId('request-errors');
      errEl.textContent = errors.filter(Boolean).join('\n');
      if (errEl.textContent) return;

      const requests = Storage.read(Storage.keys.requests, []);
      requests.push({ id: Utils.uid('request'), ...data, createdAt: new Date().toISOString() });
      Utils.saveAndNotify(Storage.keys.requests, requests);
      form.reset();
      renderRequests();
    });
  }

  function renderRequests(filter = {}) {
    const all = Storage.read(Storage.keys.requests, []);
    const items = all.filter(r => {
      const okBlood = filter.bloodType ? r.bloodType === filter.bloodType : true;
      const okLocation = filter.location ? r.location.toLowerCase().includes(filter.location.toLowerCase()) : true;
      return okBlood && okLocation;
    });
    const html = items.map(r => `
      <div class="card stack-md">
        <div><span class="chip">${r.urgency}</span></div>
        <div><strong>Blood:</strong> ${r.bloodType}</div>
        <div><strong>Location:</strong> ${r.location}</div>
        <div class="muted">Posted ${new Date(r.createdAt).toLocaleString()}</div>
      </div>
    `).join('');
    if (listWrap) listWrap.innerHTML = html || '<div class="muted">No requests yet.</div>';
  }

  if (filterBlood) {
    filterBlood.addEventListener('change', () => renderRequests({ bloodType: filterBlood.value || undefined, location: filterLocation?.value || undefined }));
  }
  if (filterLocation) {
    filterLocation.addEventListener('input', () => renderRequests({ bloodType: filterBlood?.value || undefined, location: filterLocation.value || undefined }));
  }
  if (showMatchesBtn) {
    showMatchesBtn.addEventListener('click', () => {
      const donors = Storage.read(Storage.keys.donors, []);
      if (!donors.length) { Utils.toast('No donor profile found. Register as a donor first.'); return; }
      const donor = donors[donors.length - 1]; // simple heuristic: last registered
      const all = Storage.read(Storage.keys.requests, []);
      const matches = all.filter(r => Domain.isCompatible(r.bloodType, donor.bloodType) && r.location.toLowerCase().includes(donor.location.toLowerCase()));
      const html = matches.map(r => `
        <div class="card stack-md">
          <div><span class="chip">${r.urgency}</span></div>
          <div><strong>Blood:</strong> ${r.bloodType}</div>
          <div><strong>Location:</strong> ${r.location}</div>
          <div class="muted">Matches donor ${donor.name} (${donor.bloodType}, ${donor.location})</div>
        </div>
      `).join('');
      if (listWrap) listWrap.innerHTML = html || '<div class="muted">No matching requests found for your profile.</div>';
    });
  }

  renderRequests();
}

function initAppointments() {
  const form = Utils.byId('appointment-form');
  const tbody = Utils.byId('appointments-tbody');
  const donorSelect = Utils.byId('appointment-donor');

  if (!form) return;

  // Populate donors
  const donors = Storage.read(Storage.keys.donors, []);
  if (donorSelect) {
    Render.renderOptions(donorSelect, donors.map(d => ({ value: d.id, label: `${d.name} (${d.bloodType}) - ${d.location}` })), 'Select donor');
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const errors = [];
    errors.push(Validators.notEmpty(data.donorId, 'Donor'));
    errors.push(Validators.futureDate(data.date));
    errors.push(Validators.timeRange(data.time));
    const errEl = Utils.byId('appointment-errors');
    errEl.textContent = errors.filter(Boolean).join('\n');
    if (errEl.textContent) return;

    const appointments = Storage.read(Storage.keys.appointments, []);
    const donor = donors.find(d => d.id === data.donorId);
    appointments.push({ id: Utils.uid('apt'), donorName: donor?.name || '', donorBlood: donor?.bloodType || '', location: donor?.location || '', date: data.date, time: data.time, createdAt: new Date().toISOString() });
    Utils.saveAndNotify(Storage.keys.appointments, appointments);
    form.reset();
    renderAppointments();
  });

  function renderAppointments() {
    const appointments = Storage.read(Storage.keys.appointments, []);
    if (tbody) Render.renderTableBody(tbody, appointments, ['donorName', 'donorBlood', 'location', 'date', 'time']);
  }

  renderAppointments();
}

// ----------------------- Boot -----------------------
document.addEventListener('DOMContentLoaded', () => {
  initCommon();
  const page = document.body?.dataset?.page || '';
  switch (page) {
    case 'home': initHome(); break;
    case 'donor': initDonor(); break;
    case 'recipient': initRecipient(); break;
    case 'requests': initRequests(); break;
    case 'appointments': initAppointments(); break;
    default: break;
  }
});



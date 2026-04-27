const API = '/api';

// ===== NAVIGATION =====
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => {
    if (b.textContent.toLowerCase().includes(name.slice(0, 4))) b.classList.add('active');
  });
  if (name === 'analyse') loadStats();
  if (name === 'donnees') loadData();
}

// ===== FORMULAIRE =====
document.getElementById('mainForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('.btn-submit');
  const msg = document.getElementById('formMsg');
  btn.textContent = 'Envoi en cours...';
  btn.disabled = true;

  const formData = new FormData(e.target);
  const body = Object.fromEntries(formData.entries());

  try {
    const res = await fetch(API + '/reponses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (res.ok) {
      msg.className = 'form-msg ok';
      msg.textContent = '✓ Réponse enregistrée avec succès ! (ID #' + data.id + ')';
      e.target.reset();
      document.getElementById('satLabel').textContent = '3 / 5';
    } else {
      msg.className = 'form-msg err';
      msg.textContent = '✗ ' + (data.error || 'Erreur inconnue.');
    }
  } catch {
    msg.className = 'form-msg err';
    msg.textContent = '✗ Impossible de contacter le serveur.';
  }

  btn.textContent = 'Soumettre ma réponse →';
  btn.disabled = false;
  setTimeout(() => { msg.style.display = 'none'; msg.className = 'form-msg'; }, 5000);
});

// ===== STATS =====
async function loadStats() {
  try {
    const res = await fetch(API + '/stats');
    const s = await res.json();

    document.getElementById('statTotal').textContent = s.total;
    document.getElementById('statAge').textContent =
      s.ageMoyen?.moyenne ? s.ageMoyen.moyenne + ' ans' : '—';
    document.getElementById('statSat').textContent =
      s.satisfactionMoyenne ? s.satisfactionMoyenne + ' / 5' : '—';
    document.getElementById('statRevenu').textContent =
      s.revenuMoyen ? Number(s.revenuMoyen).toLocaleString('fr-FR') + ' FCFA' : '—';

    renderBarChart('chartGenre', s.parGenre, 'genre', s.total);
    renderBarChart('chartSecteur', s.parSecteur, 'secteur', s.total);
    renderSatChart('chartSat', s.distSatisfaction, s.total);
  } catch {
    console.error('Erreur chargement stats');
  }
}

function renderBarChart(containerId, data, key, total) {
  const el = document.getElementById(containerId);
  if (!data.length) { el.innerHTML = '<p style="color:#aaa;font-size:13px">Aucune donnée</p>'; return; }
  const colors = ['', 'alt', 'gray', '', 'alt', 'gray', ''];
  el.innerHTML = data.map((item, i) => {
    const pct = total ? Math.round((item.count / total) * 100) : 0;
    return `
      <div class="bar-item">
        <div class="bar-label">
          <span>${item[key]}</span>
          <span>${item.count} (${pct}%)</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill ${colors[i % colors.length]}" style="width:${pct}%"></div>
        </div>
      </div>`;
  }).join('');
}

function renderSatChart(containerId, data, total) {
  const el = document.getElementById(containerId);
  if (!data.length) { el.innerHTML = '<p style="color:#aaa;font-size:13px">Aucune donnée</p>'; return; }
  const labels = ['','★','★★','★★★','★★★★','★★★★★'];
  el.innerHTML = data.map(item => {
    const pct = total ? Math.round((item.count / total) * 100) : 0;
    const cls = item.satisfaction >= 4 ? '' : item.satisfaction === 3 ? 'alt' : 'gray';
    return `
      <div class="bar-item">
        <div class="bar-label">
          <span>${labels[item.satisfaction] || item.satisfaction}</span>
          <span>${item.count} (${pct}%)</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill ${cls}" style="width:${pct}%"></div>
        </div>
      </div>`;
  }).join('');
}

// ===== TABLEAU DONNÉES =====
async function loadData() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:#aaa">Chargement...</td></tr>';
  try {
    const res = await fetch(API + '/reponses');
    const rows = await res.json();
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:#aaa">Aucune donnée collectée pour l\'instant.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(r => {
      const sat = parseInt(r.satisfaction);
      const cls = sat >= 4 ? 'badge-high' : sat === 3 ? 'badge-mid' : 'badge-low';
      const date = new Date(r.created_at).toLocaleDateString('fr-FR');
      return `
        <tr>
          <td><strong>#${r.id}</strong></td>
          <td>${r.nom}</td>
          <td>${r.age}</td>
          <td>${r.genre}</td>
          <td>${r.niveau_etude}</td>
          <td>${r.secteur}</td>
          <td>${r.revenu_mensuel ? Number(r.revenu_mensuel).toLocaleString('fr-FR') : '—'}</td>
          <td><span class="badge ${cls}">${'★'.repeat(sat)}</span></td>
          <td>${date}</td>
        </tr>`;
    }).join('');
  } catch {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:red">Erreur de connexion au serveur.</td></tr>';
  }
}

const express = require('express');
const router = express.Router();
const { getDb, save } = require('../db/database');

router.post('/reponses', async (req, res) => {
  const { nom, age, genre, niveau_etude, secteur, revenu_mensuel, satisfaction, commentaire } = req.body;
  if (!nom || !age || !genre || !niveau_etude || !secteur || !satisfaction)
    return res.status(400).json({ error: 'Champs obligatoires manquants.' });
  try {
    const db = await getDb();
    db.run(
      `INSERT INTO reponses (nom, age, genre, niveau_etude, secteur, revenu_mensuel, satisfaction, commentaire)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nom, parseInt(age), genre, niveau_etude, secteur, revenu_mensuel || null, parseInt(satisfaction), commentaire || '']
    );
    save();
    const result = db.exec('SELECT last_insert_rowid() as id');
    const id = result[0].values[0][0];
    res.status(201).json({ message: 'Réponse enregistrée !', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reponses', async (req, res) => {
  const db = await getDb();
  const result = db.exec('SELECT * FROM reponses ORDER BY created_at DESC');
  if (!result.length) return res.json([]);
  const { columns, values } = result[0];
  res.json(values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]]))));
});

router.get('/stats', async (req, res) => {
  const db = await getDb();
  const q = sql => { const r = db.exec(sql); return r.length ? r[0].values : []; };
  const qOne = sql => { const r = db.exec(sql); return r.length ? Object.fromEntries(r[0].columns.map((c,i) => [c, r[0].values[0][i]])) : {}; };

  const total = qOne('SELECT COUNT(*) as total FROM reponses').total || 0;
  const parGenre = q('SELECT genre, COUNT(*) as count FROM reponses GROUP BY genre').map(r => ({ genre: r[0], count: r[1] }));
  const parNiveau = q('SELECT niveau_etude, COUNT(*) as count FROM reponses GROUP BY niveau_etude').map(r => ({ niveau_etude: r[0], count: r[1] }));
  const parSecteur = q('SELECT secteur, COUNT(*) as count FROM reponses GROUP BY secteur ORDER BY count DESC').map(r => ({ secteur: r[0], count: r[1] }));
  const ageMoyen = qOne('SELECT ROUND(AVG(age),1) as moyenne, MIN(age) as min, MAX(age) as max FROM reponses');
  const satisfactionMoyenne = qOne('SELECT ROUND(AVG(satisfaction),2) as moyenne FROM reponses').moyenne;
  const revenuMoyen = qOne('SELECT ROUND(AVG(revenu_mensuel),0) as moyenne FROM reponses WHERE revenu_mensuel IS NOT NULL').moyenne;
  const distSatisfaction = q('SELECT satisfaction, COUNT(*) as count FROM reponses GROUP BY satisfaction ORDER BY satisfaction').map(r => ({ satisfaction: r[0], count: r[1] }));

  res.json({ total, parGenre, parNiveau, parSecteur, ageMoyen, satisfactionMoyenne, revenuMoyen, distSatisfaction });
});

router.delete('/reponses/:id', async (req, res) => {
  const db = await getDb();
  db.run('DELETE FROM reponses WHERE id = ?', [req.params.id]);
  save();
  res.json({ message: 'Supprimé.' });
});

module.exports = router;

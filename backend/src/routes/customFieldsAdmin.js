const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// ============================================================================
// CUSTOM FIELD DEFINITIONS
// ============================================================================

// GET /api/custom-fields/definitions?table_name=X
router.get('/definitions', async (req, res) => {
  try {
    const { table_name } = req.query;
    const params = [];
    let where = '';
    if (table_name) {
      params.push(table_name);
      where = 'WHERE custom_field_table_name = $1';
    }
    const result = await pool.query(
      `SELECT
         custom_field_table_name,
         custom_field_key,
         custom_field_label,
         custom_field_type,
         custom_field_description,
         custom_field_position,
         custom_field_created_at,
         custom_field_updated_at
       FROM custom_field_definitions
       ${where}
       ORDER BY custom_field_table_name, custom_field_position, custom_field_key`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/custom-fields/definitions
router.post('/definitions', async (req, res) => {
  try {
    const { table_name, key, label, type, description, position } = req.body;
    if (!table_name?.trim()) return res.status(400).json({ error: 'table_name ist erforderlich' });
    if (!key?.trim()) return res.status(400).json({ error: 'key ist erforderlich' });
    if (!label?.trim()) return res.status(400).json({ error: 'label ist erforderlich' });

    const validTypes = ['text', 'textarea', 'number', 'date', 'dropdown'];
    const fieldType = type || 'text';
    if (!validTypes.includes(fieldType)) {
      return res.status(400).json({ error: `Ungültiger Typ. Erlaubt: ${validTypes.join(', ')}` });
    }

    const result = await pool.query(
      `INSERT INTO custom_field_definitions
         (custom_field_table_name, custom_field_key, custom_field_label, custom_field_type,
          custom_field_description, custom_field_position)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [table_name.trim(), key.trim(), label.trim(), fieldType, description || null, position ?? null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Felddefinition mit diesem Key existiert bereits für diese Tabelle' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/custom-fields/definitions/:table/:key
router.put('/definitions/:table/:key', async (req, res) => {
  try {
    const { table, key } = req.params;
    const { label, description, position } = req.body;
    const result = await pool.query(
      `UPDATE custom_field_definitions SET
         custom_field_label=COALESCE($1, custom_field_label),
         custom_field_description=COALESCE($2, custom_field_description),
         custom_field_position=COALESCE($3, custom_field_position),
         custom_field_updated_at=NOW()
       WHERE custom_field_table_name=$4 AND custom_field_key=$5
       RETURNING *`,
      [label || null, description || null, position ?? null, table, key]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Felddefinition nicht gefunden' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/custom-fields/definitions/:table/:key
router.delete('/definitions/:table/:key', async (req, res) => {
  try {
    const { table, key } = req.params;
    // ON DELETE CASCADE handles options and entity values
    const result = await pool.query(
      `DELETE FROM custom_field_definitions
       WHERE custom_field_table_name=$1 AND custom_field_key=$2
       RETURNING custom_field_key`,
      [table, key]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Felddefinition nicht gefunden' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// CUSTOM FIELD OPTIONS
// ============================================================================

// GET /api/custom-fields/options/:table/:key
router.get('/options/:table/:key', async (req, res) => {
  try {
    const { table, key } = req.params;
    const result = await pool.query(
      `SELECT
         custom_field_table_name,
         custom_field_key,
         custom_field_option_value,
         custom_field_option_label,
         custom_field_option_position
       FROM custom_field_options
       WHERE custom_field_table_name=$1 AND custom_field_key=$2
       ORDER BY custom_field_option_position, custom_field_option_value`,
      [table, key]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/custom-fields/options
router.post('/options', async (req, res) => {
  try {
    const { table_name, key, value, label, position } = req.body;
    if (!table_name?.trim()) return res.status(400).json({ error: 'table_name ist erforderlich' });
    if (!key?.trim()) return res.status(400).json({ error: 'key ist erforderlich' });
    if (!value?.trim()) return res.status(400).json({ error: 'value ist erforderlich' });

    const result = await pool.query(
      `INSERT INTO custom_field_options
         (custom_field_table_name, custom_field_key, custom_field_option_value,
          custom_field_option_label, custom_field_option_position)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [table_name.trim(), key.trim(), value.trim(), label || value.trim(), position ?? null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Option mit diesem Value existiert bereits' });
    if (err.code === '23503') return res.status(400).json({ error: 'Felddefinition nicht gefunden – zuerst Definition anlegen' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/custom-fields/options/:table/:key/:value
router.put('/options/:table/:key/:value', async (req, res) => {
  try {
    const { table, key, value } = req.params;
    const { label, position } = req.body;
    const result = await pool.query(
      `UPDATE custom_field_options SET
         custom_field_option_label=COALESCE($1, custom_field_option_label),
         custom_field_option_position=COALESCE($2, custom_field_option_position)
       WHERE custom_field_table_name=$3 AND custom_field_key=$4 AND custom_field_option_value=$5
       RETURNING *`,
      [label || null, position ?? null, table, key, value]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Option nicht gefunden' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/custom-fields/options/:table/:key/:value
router.delete('/options/:table/:key/:value', async (req, res) => {
  try {
    const { table, key, value } = req.params;
    const result = await pool.query(
      `DELETE FROM custom_field_options
       WHERE custom_field_table_name=$1 AND custom_field_key=$2 AND custom_field_option_value=$3
       RETURNING custom_field_option_value`,
      [table, key, value]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Option nicht gefunden' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const express = require('express');
const multer = require('multer');

const importService = require('../services/importService');
const { trackEvent } = require('../services/analyticsService');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: importService.IMPORT_FILE_SIZE_LIMIT_MB * 1024 * 1024 },
});

function getUserId(req) {
  return importService.safeUserId(req.user);
}

router.post('/preview', upload.single('file'), async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'auth_required', message: 'Authentification requise.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'validation_error', message: 'Fichier requis.' });
    }
    const filename = String(req.file.originalname || '').toLowerCase();
    if (!filename.match(/\.(csv|xlsx|xls)$/)) {
      return res.status(400).json({ error: 'validation_error', message: 'Format non supporté. Utilisez CSV, XLS ou XLSX.' });
    }

    const { headers, rows } = importService.parseWorkbookFromBuffer(req.file.buffer);
    const suggestedMapping = importService.suggestMapping(headers);
    const previewStats = importService.getPreviewStats({ headers, rows, mapping: suggestedMapping });

    const job = await importService.createImportJob({
      userId,
      filename: req.file.originalname || 'portfolio_import',
      headers,
      rows,
      mapping: suggestedMapping,
      summary: {
        ...previewStats,
        supported_formats: ['csv', 'xlsx'],
      },
    });

    return res.json({
      success: true,
      import_job_id: job.id,
      status: job.status,
      headers,
      suggested_mapping: suggestedMapping,
      preview: previewStats.preview_rows,
      stats: {
        total_rows: previewStats.total_rows,
        valid_rows_estimate: previewStats.valid_rows_estimate,
        error_rows_estimate: previewStats.error_rows_estimate,
        unknown_columns: previewStats.unknown_columns,
      },
      message: 'Prévisualisation générée. Validez le mapping avant commit.',
    });
  } catch (error) {
    if (error.message === 'import_too_many_rows') {
      return res.status(413).json({
        error: 'import_too_many_rows',
        message: `Fichier trop volumineux. Limite actuelle: ${importService.MAX_ROWS} lignes.`,
      });
    }
    if (['import_empty_sheet', 'import_empty_file', 'import_missing_headers'].includes(error.message)) {
      return res.status(400).json({ error: error.message, message: 'Le fichier importé est invalide ou incomplet.' });
    }
    return res.status(500).json({ error: 'import_preview_failed', message: 'Prévisualisation import indisponible pour le moment.' });
  }
});

router.post('/commit', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'auth_required', message: 'Authentification requise.' });
    }

    const importJobId = Number(req.body?.import_job_id || 0);
    const mapping = req.body?.mapping || null;
    if (!importJobId) {
      return res.status(400).json({ error: 'validation_error', message: 'import_job_id requis.' });
    }

    const result = await importService.commitImportJob({
      jobId: importJobId,
      userId,
      mapping,
    });

    await trackEvent({
      userId,
      event: 'import_completed',
      properties: {
        imported_clients: result.imported_clients,
        duplicate_rows: result.duplicate_rows,
        error_rows: result.error_rows,
      },
    }).catch(() => {});

    return res.json({
      success: true,
      import_job_id: importJobId,
      status: 'completed',
      summary: result,
      message: 'Import portefeuille terminé.',
    });
  } catch (error) {
    if (error.code === 'IMPORT_JOB_NOT_FOUND') {
      return res.status(404).json({ error: 'import_job_not_found', message: 'Import introuvable pour cet utilisateur.' });
    }
    return res.status(500).json({ error: 'import_commit_failed', message: 'Import final impossible pour le moment.' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'auth_required', message: 'Authentification requise.' });
    }
    const limit = Number(req.query.limit || 20);
    const history = await importService.getHistory(userId, Math.min(Math.max(limit, 1), 100));
    return res.json({ success: true, history });
  } catch (error) {
    return res.status(500).json({ error: 'import_history_failed', message: 'Historique import indisponible pour le moment.' });
  }
});

module.exports = router;

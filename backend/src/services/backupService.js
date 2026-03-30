const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '../../backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

const backupService = {
  async backupPostgreSQL() {
    const timestamp = new Date().toISOString().split('T')[0];
    const backupFile = path.join(BACKUP_DIR, `crm_assurance_${timestamp}.sql`);
    
    const cmd = `pg_dump ${process.env.DATABASE_URL || 'postgresql://user:pass@localhost/crm_assurance'} > ${backupFile}`;
    
    return new Promise((resolve, reject) => {
      exec(cmd, (error) => {
        if (error) {
          console.error('Backup error:', error);
          reject(error);
        } else {
          console.log(`✅ Backup created: ${backupFile}`);
          resolve(backupFile);
        }
      });
    });
  },

  scheduleNightlyBackup() {
    const cron = require('node-cron');
    // 3h du matin chaque jour
    cron.schedule('0 3 * * *', () => {
      this.backupPostgreSQL().catch(err => console.error('Scheduled backup failed:', err));
    });
  }
};

module.exports = backupService;

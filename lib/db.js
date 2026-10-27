import mysql from 'mysql2/promise';

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis;

export function getPool() {
  if (!globalForDb.__leadsPool) {
    globalForDb.__leadsPool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      charset: 'utf8mb4',
    });
  }
  return globalForDb.__leadsPool;
}

export async function insertLead(lead, meta = {}) {
  const [result] = await getPool().execute(
    `INSERT INTO leads
      (full_name, email, phone, interest, property_type, budget, preferred_contact,
       message, consent, source_page, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      lead.fullName,
      lead.email,
      lead.phone,
      lead.interest,
      lead.propertyType || null,
      lead.budget || null,
      lead.preferredContact,
      lead.message || null,
      lead.consent ? 1 : 0,
      meta.sourcePage?.slice(0, 255) || null,
      meta.ip?.slice(0, 45) || null,
      meta.userAgent?.slice(0, 255) || null,
    ]
  );
  return result.insertId;
}

export async function updateNotificationStatus(id, status, error = null) {
  await getPool().execute(
    'UPDATE leads SET notification_status = ?, notification_error = ? WHERE id = ?',
    [status, error ? String(error).slice(0, 500) : null, id]
  );
}

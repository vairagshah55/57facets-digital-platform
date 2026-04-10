const { query } = require("../config/db");

/**
 * Log an action to the activity_log table.
 *
 * @param {Object} opts
 * @param {"admin"|"retailer"|"system"} opts.actorType
 * @param {string}  opts.actorId
 * @param {string}  opts.action      e.g. "login", "order.placed", "wishlist.added"
 * @param {string}  [opts.entityType] e.g. "order", "product", "wishlist"
 * @param {string}  [opts.entityId]
 * @param {Object}  [opts.details]    free-form JSON
 */
async function auditLog({ actorType, actorId, action, entityType, entityId, details }) {
  try {
    await query(
      `INSERT INTO activity_log (actor_type, actor_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [actorType, actorId || null, action, entityType || null, entityId || null, details ? JSON.stringify(details) : null]
    );
  } catch (err) {
    // Never let audit logging break the main request
    console.error("Audit log error:", err.message);
  }
}

module.exports = auditLog;

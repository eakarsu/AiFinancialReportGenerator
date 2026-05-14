/**
 * Standard pagination helper for FRG raw-pg routes.
 *
 * Usage:
 *   const { page, limit, offset } = parsePagination(req);
 *   const totalQ = await pool.query('SELECT COUNT(*)::int AS c FROM ... WHERE ...', params);
 *   const dataQ = await pool.query(
 *     'SELECT * FROM ... WHERE ... ORDER BY id DESC LIMIT $X OFFSET $Y',
 *     [...params, limit, offset]
 *   );
 *   res.json(buildPaginatedResponse(dataQ.rows, totalQ.rows[0].c, page, limit));
 */

function parsePagination(req) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function buildPaginatedResponse(data, total, page, limit) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

module.exports = { parsePagination, buildPaginatedResponse };

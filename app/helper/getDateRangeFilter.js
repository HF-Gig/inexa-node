import { Op } from 'sequelize';

export const getDateRangeFilter = (fromParam, toParam) => {
  const from = fromParam ? new Date(String(fromParam)) : null;
  const to = toParam ? new Date(String(toParam)) : null;

  const hasValidFrom =
    from instanceof Date && !isNaN(from.getTime());
  const hasValidTo =
    to instanceof Date && !isNaN(to.getTime());

  if (!hasValidFrom && !hasValidTo) {
    return null;
  }

  const filter = {};

  if (hasValidFrom) {
    from.setHours(0, 0, 0, 0);
    filter[Op.gte] = from;
  }

  if (hasValidTo) {
    to.setHours(0, 0, 0, 0);
    to.setDate(to.getDate() + 1);
    filter[Op.lt] = to;
  }

  return filter;
}
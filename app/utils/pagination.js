/**
 * Common pagination helper function
 * @param {Object} options - Pagination options
 * @param {number} options.page - Current page number
 * @param {number} options.pageSize - Number of items per page
 * @param {number} options.totalItems - Total number of items
 * @returns {Object} Pagination metadata
 */
export function getPaginationMetadata({ page, pageSize, totalItems }) {
  const totalPages = Math.ceil(totalItems / pageSize);
  
  return {
    currentPage: page,
    pageSize: pageSize,
    totalItems: totalItems,
    totalPages: totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1
  };
}

/**
 * Common pagination response formatter
 * @param {Object} options - Response options
 * @param {Array} options.data - The data array
 * @param {Object} options.pagination - Pagination metadata
 * @param {boolean} options.status - Response status
 * @param {number} options.statusCode - HTTP status code
 * @returns {Object} Formatted response object
 */
export function formatPaginatedResponse({ data, pagination, status = true, statusCode = 200 }) {
  return {
    data,
    pagination,
    status,
    statusCode
  };
} 
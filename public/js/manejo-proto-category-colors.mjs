/** Acento sutil por categoría de infusión. */

export const PROTO_CATEGORY_COLOR_PREFIX = 'manejo-proto-category';

/** @param {string} categoryId */
export function protoCategoryCssClass(categoryId) {
  if (!categoryId || categoryId === 'all' || categoryId === 'favorites' || categoryId === 'recent') {
    return '';
  }
  return PROTO_CATEGORY_COLOR_PREFIX + '--' + categoryId;
}

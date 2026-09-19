export function makeOutbox(rows = []) {
  let list = rows.slice();
  return {
    list: () => list.slice(),
    remove(id) {
      list = list.filter((r) => r.clientMutationId !== id);
    },
  };
}

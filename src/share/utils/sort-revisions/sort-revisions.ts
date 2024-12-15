type RevisionType = { id: string; parentId?: string | null };

export const sortRevisions = (revisions: RevisionType[]) => {
  if (!revisions?.length) {
    return [];
  }

  const map = new Map(revisions.map((revision) => [revision.id, revision]));

  const headPredicate: (revision: RevisionType) => boolean = (revision) =>
    !revision.parentId || !map.get(revision.parentId);

  const countHeads = revisions.filter(headPredicate).length;

  if (countHeads > 1) {
    throw new Error('there are a few heads');
  }

  if (countHeads === 0) {
    throw new Error('there is no head');
  }

  const parentIds = revisions
    .filter((revision) => revision.parentId)
    .map((revision) => revision.parentId);

  if (parentIds.length !== new Set(parentIds).size) {
    throw new Error('parent must have only one child');
  }

  const parentMap = new Map(
    revisions
      .filter((revision) => revision.parentId && map.get(revision.parentId))
      .map((revision) => [revision.parentId, revision]),
  );

  const headRevision = revisions.find(headPredicate);

  const result: RevisionType[] = [];

  let nextRevision = headRevision;
  while (nextRevision) {
    result.push(nextRevision);
    nextRevision = parentMap.get(nextRevision.id);
  }

  return result;
};

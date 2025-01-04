import { sortRevisions } from 'src/features/share/utils/sort-revisions/sort-revisions';

type RevisionsType = { id: string; parentId?: string | null }[];

describe('sortRevisions', () => {
  it('empty', () => {
    expect(sortRevisions([])).toStrictEqual([]);
  });

  it('no parents', () => {
    const revisions: RevisionsType = [{ id: '1' }];

    expect(sortRevisions(revisions)).toStrictEqual(revisions);
  });

  it('valid', () => {
    const revisions: RevisionsType = [
      { id: '5', parentId: '4' },
      { id: '3', parentId: '2' },
      { id: '2', parentId: '1' },
      { id: '4', parentId: '3' },
      { id: '1' },
    ];

    const expectedRevisions: RevisionsType = [
      { id: '1' },
      { id: '2', parentId: '1' },
      { id: '3', parentId: '2' },
      { id: '4', parentId: '3' },
      { id: '5', parentId: '4' },
    ];

    expect(sortRevisions(revisions)).toStrictEqual(expectedRevisions);
  });

  it('no empty parent', () => {
    const revisions: RevisionsType = [
      { id: '3', parentId: '2' },
      { id: '5', parentId: '4' },
      { id: '2', parentId: '1' },
      { id: '4', parentId: '3' },
      { id: '1', parentId: 'some-parent' },
    ];

    const expectedRevisions: RevisionsType = [
      { id: '1', parentId: 'some-parent' },
      { id: '2', parentId: '1' },
      { id: '3', parentId: '2' },
      { id: '4', parentId: '3' },
      { id: '5', parentId: '4' },
    ];

    expect(sortRevisions(revisions)).toStrictEqual(expectedRevisions);
  });

  it('a few heads', () => {
    const revisions: RevisionsType = [
      { id: '4', parentId: 'some' },
      { id: '2', parentId: '1' },
      { id: '5', parentId: '4' },
      { id: '1' },
      { id: '3', parentId: '2' },
    ];

    expect(() => sortRevisions(revisions)).toThrow('there are a few heads');
  });

  it('death revisions', () => {
    const revisions: RevisionsType = [
      { id: '4', parentId: '5' },
      { id: '2', parentId: '1' },
      { id: '5', parentId: '4' },
      { id: '1' },
      { id: '3', parentId: '2' },
    ];

    const expectedRevisions: RevisionsType = [
      { id: '1' },
      { id: '2', parentId: '1' },
      { id: '3', parentId: '2' },
    ];

    expect(sortRevisions(revisions)).toStrictEqual(expectedRevisions);
  });

  it('no head', () => {
    const revisions: RevisionsType = [
      { id: '2', parentId: '3' },
      { id: '3', parentId: '2' },
    ];

    expect(() => sortRevisions(revisions)).toThrow('there is no head');
  });

  it('only one child', () => {
    const revisions: RevisionsType = [
      { id: '1' },
      { id: '2', parentId: '1' },
      { id: '3', parentId: '1' },
    ];

    expect(() => sortRevisions(revisions)).toThrow(
      'parent must have only one child',
    );
  });
});

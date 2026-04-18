import { gql } from 'src/testing/utils/gql';
import { operation, runAuthMatrix } from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

const updateTableViews = operation<{
  revisionId: string;
  tableId: string;
  viewsData: object;
}>({
  id: 'views.updateTableViews',
  gql: {
    query: gql`
      mutation updateTableViews($data: UpdateTableViewsInput!) {
        updateTableViews(data: $data) {
          version
          defaultViewId
        }
      }
    `,
    variables: (params) => ({ data: params }),
  },
});

describe('update table views auth', () => {
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: updateTableViews,
    cases: [{ name: 'owner', role: 'owner', expected: 'allowed' }],
    build: () => ({
      fixture: fresh.fixture,
      params: {
        revisionId: fresh.fixture.project.draftRevisionId,
        tableId: fresh.fixture.project.tableId,
        viewsData: {
          version: 1,
          defaultViewId: 'default',
          views: [
            {
              id: 'default',
              name: 'Default',
              columns: [],
              sorts: [],
            },
          ],
        },
      },
    }),
  });
});

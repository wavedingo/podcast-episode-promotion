export const FETCH_BOARD_ITEMS = `
  query GetBoardItems($boardId: ID!) {
    boards(ids: [$boardId]) {
      id
      name
      items_page(limit: 100) {
        cursor
        items {
          id
          name
          column_values {
            id
            type
            value
            text
          }
          assets {
            id
            name
            url
            file_extension
            file_size
            created_at
          }
        }
      }
    }
  }
`;

export const FETCH_BOARD_SCHEMA = `
  query GetBoardSchema($boardId: ID!) {
    boards(ids: [$boardId]) {
      id
      name
      columns {
        id
        title
        type
      }
    }
  }
`;

export const FETCH_ITEM_BY_ID = `
  query GetItem($itemId: ID!) {
    items(ids: [$itemId]) {
      id
      name
      column_values {
        id
        type
        value
        text
      }
      assets {
        id
        name
        url
        file_extension
        file_size
        created_at
      }
    }
  }
`;

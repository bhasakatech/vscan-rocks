# filterable-library

Custom **custom** block. 

## Authoring (Document Authoring)

Model: `collection`

Repeating rows — one row per item. Each item: one row, one cell of content.

## Supported variations

| Variation | Option class |
| --- | --- |
| Featured Grid Pagination | `featured-grid-pagination` |

## Universal Editor fields

- Content fields derived from the block's decorate contract.
- `classes` select for options: Featured Grid Pagination.
- A separate `-item` model defines one repeated item.

## Content structure

Optional first row: filter title (e.g. "Care Area"). Then one row per item: [thumbnail image] [rich text: linked title, description] [tags, comma separated]. Tags build the checkbox filter sidebar.

## Usage

Tutorial and clinical image libraries in the education section.

## Reuse guidance

Use featured-grid-pagination for the clinical images library: first result spans the grid and results are paginated (7 per page, as on the source).

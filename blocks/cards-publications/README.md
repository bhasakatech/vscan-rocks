# cards-publications

Custom **cards** block. 

## Authoring (Document Authoring)

Model: `collection`

Repeating rows — one row per item. Each item: one row, one cell of content.

## Supported variations

| Variation | Option class |
| --- | --- |
| Alt | `alt` |

## Universal Editor fields

- Content fields derived from the block's decorate contract.
- `classes` select for options: Alt.
- A separate `-item` model defines one repeated item.

## Content structure

One row per publication: [rich text: authors, title, institution]. Text-only cards in a horizontal scroller; navigation appears only when cards overflow.

## Usage

Publication references on specialty pages.

## Reuse guidance

Use alt to wrap the cards into a grid instead of scrolling.

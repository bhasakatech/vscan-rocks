# cards-links

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

One row per tile: [image, optional] [rich text: link title]. Image tiles form a grid; tiles without an image render as link chips.

## Usage

Homepage teaser tiles to the education sections; with the alt option, the pill-shaped category chips on publication pages.

## Reuse guidance

Use alt for a compact row of category/filter links without images.

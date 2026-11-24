# cards-tiles

Custom **cards** block. 

## Authoring (Document Authoring)

Model: `collection`

Repeating rows — one row per item. Each item: one row, one cell of content.

## Supported variations

| Variation | Option class |
| --- | --- |
| Alt | `alt` |
| Image Top | `image-top` |

## Universal Editor fields

- Content fields derived from the block's decorate contract.
- `classes` select for options: Alt, Image Top.
- A separate `-item` model defines one repeated item.

## Content structure

One row per tile: [photo] [rich text: heading, copy, link]. By default the photo fills the tile behind the text.

## Usage

Product benefit tiles, probe tiles and product overview cards.

## Reuse guidance

Use image-top to place the photo above the text (product overview cards); alt for two-up heading + text tiles.

# cards-features

Custom **cards** block. 

## Authoring (Document Authoring)

Model: `collection`

Repeating rows — one row per item. Each item: one row, one cell of content.

## Supported variations

No variations.

## Universal Editor fields

- Content fields derived from the block's decorate contract.
- A separate `-item` model defines one repeated item.

## Content structure

One row per card: [thumbnail image] [rich text: title, optional description and link]. Cards sit in a horizontally scrolling row with prev/next buttons when they overflow.

## Usage

Scrolling rows of video/tutorial thumbnails with titles on specialty pages.

## Reuse guidance

Use for a scrolling row of image-topped cards. For a static grid use cards-tiles or cards-links.

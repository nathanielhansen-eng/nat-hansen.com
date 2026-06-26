---
title: Hydrosemantics
date: 2026-06-26
summary: A first post — and a note on why these old Goodreads reviews are migrating here.
tags: [meta, reading]
draft: true
book:
  title: As You Like It
  author: William Shakespeare
  rating: 5
---
Since grad school I have written reviews on Goodreads — some of them substantial. I’ll migrate some of them here alongside new material. 

## What I’ll be posting

- **Book reviews** These carry a
  `book:` block in their frontmatter, which is what produces the title and author. 
- **Notes and essays** — Stuff longer than I can/want to post on social media. 

## How the format works

Each post is just a Markdown file in `content/blog/`. Frontmatter sets the
title, date, summary, and tags; everything below the `---` is the body. That
means headings —

### like this one

— lists, *emphasis*, [links](https://nat-hansen.com), and block quotes all
render the way you'd hope:

> The poet's eye, in a fine frenzy rolling,
> Doth glance from heaven to earth, from earth to heaven.

## Images

Drop image files in `public/blog-images/` and reference them with a leading
slash (no `public/` in the path). The simple markdown form, with alt text in
the brackets:

![A sample placeholder image](/blog-images/sample.svg)

For a caption, use a `<figure>` block — Markdown passes the HTML through, and
the styling is already wired up:

<figure>
  <img src="/blog-images/sample.svg" alt="A sample placeholder image" />
  <figcaption>A caption sits centered and muted beneath the image.</figcaption>
</figure>

(Resize photos to roughly 1200px wide before adding them — blog images aren't
auto-optimized. Use `.jpg`/`.webp` for photographs; the `.svg` above is just a
stand-in.)

There are deliberately **no comments** here. If a post is worth arguing about,
that argument belongs out on social media, where the share buttons below point —
and where the conversation is already happening.

Back to the blogosphere. 
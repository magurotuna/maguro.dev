---
name: new-post
description: Scaffold a new blog post with a draft written in the author's style
argument-hint: [slug]
allowed-tools: Read, Glob, Write, AskUserQuestion
---

Create a new blog post file in `src/content/blog/`.

## Step 1: Ask for details

Use the AskUserQuestion tool to ask:

1. **Topic**: What should the article be about? What motivated writing it?
2. **Slug**: The filename without `.mdx` (use `$ARGUMENTS` if already provided, skip asking)
3. **Title**: The post title (suggest one based on the topic, or let the user provide their own)
4. **Tags**: Comma-separated list of tags
5. **Description**: A short SEO description (optional)

## Step 2: Read existing articles for reference

Read 2-3 existing articles from `src/content/blog/` that are most relevant to the topic being written about. This helps you match the depth and structure of similar content.

## Step 3: Write the draft

Create the file at `src/content/blog/<slug>.mdx` following the writing style guide below.

Frontmatter:

```yaml
---
title: "<title>"
date: <today's date in YYYY-MM-DD format>
tags: [<tags as quoted strings>]
description: "<description, or omit this field entirely if not provided>"
draft: true
---
```

### Writing style guide

Follow these conventions carefully — they are derived from the author's existing articles.

**Language & tone:**

- Write in Japanese
- Use 僕 (boku) as the first-person pronoun
- Semi-formal register: です/ます form for explanations and technical content; casual だ/だった form for personal reflections and asides
- Curious and exploratory tone — phrases like 「〜してみます」「掘り下げてみます」「確認してみます」
- Include honest personal reactions — e.g. 「正直、内心ぎょっとした」「感慨深い」
- Natural, conversational flow — write as if explaining to a knowledgeable friend

**Structure:**

- Open with context or a personal anecdote that triggered the article (e.g. an event, a question someone asked, something encountered at work)
- Use `##` headings to organize major sections
- End with a まとめ or おわりに section
- Keep paragraphs relatively short (2-4 sentences)

**Footnotes:**

- Use footnotes (`[^name]`) liberally for:
  - Personal asides and humor
  - Tangential but interesting details
  - Supplementary context that would break the main flow

**Links & references:**

- Link to official documentation, GitHub repos, RFCs, etc. using inline Markdown links with descriptive Japanese text
- When referencing your own past articles, link to them with their Japanese titles

**Code:**

- Include code examples with language annotations (`js, `ts, ```rust, etc.)
- Add inline comments in Japanese within code blocks where helpful

**Images:**

- Use `<figure>` + `<img>` + `<figcaption>` for images (not Markdown image syntax)

**Components:**

- If embedding tweets, add `import Tweet from "../../components/Tweet.astro";` after frontmatter
- If embedding YouTube videos, add `import YouTube from "../../components/YouTube.astro";` after frontmatter

## Step 4: Wrap up

Tell the user the file path and suggest running `npm run dev` to preview. Remind them the post is set to `draft: true`.

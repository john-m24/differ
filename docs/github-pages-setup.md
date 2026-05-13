# One-Click Interactive Reviews with GitHub Pages

For **public repositories**, you can host review visualizations on GitHub Pages so reviewers get a direct link to the interactive review — no download required.

## Setup (one-time)

1. Go to your repository **Settings > Pages**
2. Set Source to **Deploy from a branch**
3. Select the `gh-pages` branch, root directory (`/`)
4. Save

## Add the deploy step to your workflow

Add the following steps to your `.github/workflows/differ-review.yml`, after the "Generate review" step:

```yaml
permissions:
  pull-requests: write
  contents: write  # needed to push to gh-pages

# ... existing steps ...

- name: Deploy review to GitHub Pages
  if: hashFiles('review.html') != ''
  env:
    PR_NUMBER: ${{ github.event.pull_request.number }}
  run: |
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"

    REVIEW_DIR="reviews/pr-${PR_NUMBER}"

    # Clone gh-pages branch or create it
    git clone --single-branch --branch gh-pages \
      "https://x-access-token:${{ secrets.GITHUB_TOKEN }}@github.com/${{ github.repository }}.git" \
      /tmp/gh-pages 2>/dev/null || {
      mkdir -p /tmp/gh-pages && cd /tmp/gh-pages && git init
      git checkout --orphan gh-pages
      git remote add origin "https://x-access-token:${{ secrets.GITHUB_TOKEN }}@github.com/${{ github.repository }}.git"
      git commit --allow-empty -m "Initialize gh-pages"
    }

    # Deploy the review
    mkdir -p /tmp/gh-pages/${REVIEW_DIR}
    cp review.html /tmp/gh-pages/${REVIEW_DIR}/index.html

    # Commit and push
    cd /tmp/gh-pages
    git add .
    git diff --staged --quiet || {
      git commit -m "Deploy review for PR #${PR_NUMBER}"
      git push origin gh-pages
    }
```

## Update the PR comment with a direct link

In your "Comment on PR" step, add the Pages URL:

```javascript
const owner = context.repo.owner;
const repo = context.repo.repo;
const prNumber = context.issue.number;
const reviewUrl = `https://${owner}.github.io/${repo}/reviews/pr-${prNumber}/`;

// Add to the comment body:
body += `**[View Interactive Review](${reviewUrl})**\n\n`;
```

## Result

After setup, each PR comment will include a link like:

```
https://your-username.github.io/your-repo/reviews/pr-42/
```

Reviewers click it and immediately see the interactive topology visualization in their browser.

## Notes

- This only works for **public repositories** (GitHub Pages requires public visibility on Free/Pro plans)
- For private repositories, use the artifact download or consider [Differ Cloud](https://differ.dev) (coming soon) for hosted one-click reviews
- Reviews persist on the `gh-pages` branch indefinitely
- Each review is ~25KB — storage is negligible even with thousands of PRs

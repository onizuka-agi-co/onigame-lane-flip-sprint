<div align="center">
  <h1>onigame-lane-flip-sprint</h1>
  <p>Three-lane micro dodge game for 45-second thumb sessions.</p>
  <img src="./assets/repo-mark.svg" alt="lane flip sprint mark" width="220">
  <p>
    <img src="https://img.shields.io/badge/Type-Static%20Web%20Game-2878ff" alt="Static Web Game">
    <img src="https://img.shields.io/badge/Runtime-Vanilla%20JS-F7DF1E?logo=javascript&logoColor=222" alt="Vanilla JavaScript">
    <img src="https://img.shields.io/badge/Deploy-GitHub%20Pages-222?logo=githubpages&logoColor=white" alt="GitHub Pages">
  </p>
  <p>
    <a href="./README.md"><img src="https://img.shields.io/badge/Language-English-blue.svg" alt="English"></a>
    <a href="./README.ja.md"><img src="https://img.shields.io/badge/Language-Japanese-lightgrey.svg" alt="Japanese"></a>
  </p>
</div>

## Live URL

- https://onizuka-agi-co.github.io/onigame-lane-flip-sprint/

## Concept

Lane Flip Sprint is a one-screen survival loop:

- 3 fixed lanes
- left/right lane swap controls
- 45-second run target
- one fail state: hazard hit

## Local Play

```bash
# no build required
# just open index.html in a browser
```

## Files

```text
onigame-lane-flip-sprint/
|- assets/repo-mark.svg
|- index.html
|- styles.css
`- app.js
```

## Controls

- `Left button`, `ArrowLeft`, or `A`: move left lane
- `Right button`, `ArrowRight`, or `D`: move right lane
- `Retry` or `Space` after game over: restart

## Deployment

This repository is fully static and GitHub Pages ready from repo root on `main`.

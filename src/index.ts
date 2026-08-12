import './styles.css';
import { cases } from './registry';
import { startRouter } from './router';

const app = document.getElementById('app')!;

app.innerHTML = `
  <header class="header">
    <h1>Perf Antipatterns</h1>
    <p class="subtitle">Interactive frontend performance antipatterns &mdash; one case at a time.</p>
    <nav class="nav" id="case-list">
      ${cases
        .map((c) => `<a href="#/${c.id}" data-id="${c.id}">${c.title}</a>`)
        .join('')}
    </nav>
  </header>
  <hr />
  <main id="content"></main>
`;

const content = document.getElementById('content')!;
const links = Array.from(app.querySelectorAll<HTMLAnchorElement>('#case-list a'));

startRouter(content, (active) => {
  for (const link of links) {
    link.classList.toggle('active', link.dataset.id === active.id);
  }
});

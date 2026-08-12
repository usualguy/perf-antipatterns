import './styles.css';
import { cases } from './registry';
import { startRouter } from './router';

const app = document.getElementById('app')!;

app.innerHTML = `
  <aside class="sidebar">
    <h1 class="brand">Perf Antipatterns</h1>
    <nav>
      <ul id="case-list">
        ${cases
          .map((c) => `<li><a href="#/${c.id}" data-id="${c.id}">${c.title}</a></li>`)
          .join('')}
      </ul>
    </nav>
  </aside>
  <main class="content" id="content"></main>
`;

const content = document.getElementById('content')!;
const links = Array.from(app.querySelectorAll<HTMLAnchorElement>('#case-list a'));

startRouter(content, (active) => {
  for (const link of links) {
    link.classList.toggle('active', link.dataset.id === active.id);
  }
});

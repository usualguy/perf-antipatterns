import './styles.css';
import { cases } from './registry';
import { startRouter } from './router';

const app = document.getElementById('app')!;

app.innerHTML = `
  <table class="header">
    <tbody>
      <tr>
        <td class="width-auto" rowspan="3">
          <h1 class="title">Perf Antipatterns</h1>
          <span class="subtitle">Interactive frontend performance antipatterns.</span>
        </td>
        <th class="width-min">Version</th>
        <td class="width-min">v0.1.0</td>
      </tr>
      <tr>
        <th class="width-min">Updated</th>
        <td class="width-min">2026-08-12</td>
      </tr>
      <tr>
        <th class="width-min">License</th>
        <td class="width-min">MIT</td>
      </tr>
    </tbody>
  </table>
  <nav class="nav" id="case-list">
    ${cases
      .map((c) => `<a href="#/${c.id}" data-id="${c.id}">${c.title}</a>`)
      .join('')}
  </nav>
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

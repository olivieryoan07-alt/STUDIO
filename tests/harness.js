// Micro-harnais de test. Aucune dependance : le Mac du projet n'a ni Node ni npm,
// les tests tournent dans Chrome via une page statique.

const cases = [];

export function assert(cond, message) {
  if (!cond) throw new Error(message || 'assertion echouee');
}

export function test(name, fn) {
  cases.push({ name, fn });
}

export async function runTests(container) {
  let passed = 0;
  let failed = 0;

  for (const c of cases) {
    let error = null;
    try {
      await c.fn();
    } catch (e) {
      error = e;
    }

    if (error) failed++; else passed++;

    if (container) {
      const line = document.createElement('div');
      line.className = 'case ' + (error ? 'fail' : 'pass');
      line.textContent = c.name;
      container.appendChild(line);
      if (error) {
        const why = document.createElement('div');
        why.className = 'why';
        why.textContent = error.message;
        container.appendChild(why);
      }
    }
  }

  return { passed, failed };
}

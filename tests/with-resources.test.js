import { test, assert } from './harness.js';
import { withResources } from '../src/core/with-resources.js';

// Review Focus 4 : un decodeur non referme apres un echec fuit, et sur
// 5 clips fait planter la memoire. L'invariant teste ici est celui-la :
// tout ce qui a ete cree est ferme, quoi qu'il arrive ensuite.

function spyResource(log, name, closeThrows = false) {
  return () => ({
    name,
    close() {
      log.push(name);
      if (closeThrows) throw new Error('fermeture cassee: ' + name);
    }
  });
}

test('ferme toutes les ressources quand le corps réussit', async () => {
  const log = [];
  const out = await withResources(
    [spyResource(log, 'decoder'), spyResource(log, 'encoder')],
    async (d, e) => d.name + '+' + e.name
  );
  assert(out === 'decoder+encoder', 'le resultat du corps doit etre rendu');
  assert(log.includes('decoder') && log.includes('encoder'),
         'les deux doivent etre fermes — fermes: ' + log.join(','));
});

test('ferme toutes les ressources quand le corps échoue, et relance', async () => {
  const log = [];
  let raised = null;
  try {
    await withResources(
      [spyResource(log, 'decoder'), spyResource(log, 'encoder')],
      async () => { throw new Error('decodage casse'); }
    );
  } catch (e) { raised = e; }

  assert(raised !== null, "l'erreur du corps doit etre relancee");
  assert(raised.message === 'decodage casse', 'erreur relancee telle quelle');
  assert(log.includes('decoder') && log.includes('encoder'),
         'les deux doivent etre fermes dans le finally — fermes: ' + log.join(','));
});

test('une fermeture qui échoue n’empêche pas les autres', async () => {
  const log = [];
  await withResources(
    [spyResource(log, 'decoder', true), spyResource(log, 'encoder')],
    async () => 'ok'
  );
  assert(log.includes('decoder') && log.includes('encoder'),
         'encoder doit etre ferme malgre l echec de decoder — fermes: ' + log.join(','));
});

test('une fabrique qui échoue ferme ce qui était déjà créé', async () => {
  const log = [];
  let raised = null;
  try {
    await withResources(
      [spyResource(log, 'decoder'), () => { throw new Error('encodeur refuse'); }],
      async () => 'jamais atteint'
    );
  } catch (e) { raised = e; }

  assert(raised !== null, "l'echec de fabrique doit remonter");
  assert(log.includes('decoder'),
         'le decodeur deja cree doit etre ferme — fermes: ' + log.join(','));
});

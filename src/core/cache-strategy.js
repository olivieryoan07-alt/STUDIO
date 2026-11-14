// Logique pure : quelle stratégie de cache pour une requête donnée.
//
// Ce module existe à cause d'un bug reel du 2026-11-14 : l'app restait
// bloquee en v0.5.0 sur l'iPhone. Le service worker servait TOUT depuis le
// cache en priorite — y compris sw.js — donc il ne pouvait plus jamais se
// remplacer par une version plus recente. L'utilisateur devait rafraichir la
// page a la main avant chaque mise a jour.
//
// Trois stratégies :
//   bypass        : on ne touche pas (sw.js, tout ce qui est hors du site)
//   network-first : le code de l'app — toujours la derniere version si le
//                   reseau repond, le cache sinon (donc hors ligne OK)
//   cache-first   : les ressources figees (icones, bibliotheques deposees)

const CODE = /\.(?:html|js|mjs|css|webmanifest|json)$/i;

export function cacheStrategy(url, origin, mode) {
  if (url.origin !== origin) return 'bypass';

  // Le service worker ne doit JAMAIS passer par son propre cache.
  if (/(?:^|\/)sw\.js$/.test(url.pathname)) return 'bypass';

  // Les bibliotheques deposees sont figees et lourdes : on les garde.
  if (url.pathname.includes('/vendor/')) return 'cache-first';

  if (mode === 'navigate') return 'network-first';
  if (url.pathname.endsWith('/')) return 'network-first';
  if (CODE.test(url.pathname)) return 'network-first';

  return 'cache-first';
}

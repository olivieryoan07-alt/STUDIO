// Logique pure : cree des ressources, les ferme toutes, quoi qu'il arrive.
//
// Raison d'etre : un VideoDecoder ou un VideoEncoder laisse ouvert apres un
// echec fuit. Sur 5 clips, la memoire de l'iPhone 12 mini lache. Cet invariant
// est trop important pour etre confie a un `finally` recopie a la main dans
// chaque fonction qui touche aux codecs.

export async function withResources(factories, body) {
  const made = [];
  try {
    for (const factory of factories) {
      made.push(await factory());
    }
    return await body(...made);
  } finally {
    // dans l'ordre inverse de creation, et l'echec d'une fermeture
    // n'empeche jamais les suivantes
    for (let i = made.length - 1; i >= 0; i--) {
      const res = made[i];
      try {
        if (res && typeof res.close === 'function') await res.close();
      } catch (_) {
        // une ressource deja morte reste fermee : rien a signaler
      }
    }
  }
}

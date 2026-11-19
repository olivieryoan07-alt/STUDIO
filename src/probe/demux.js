// Demuxage mp4 : du fichier aux paquets video bruts, avec la configuration
// du decodeur.
//
// EXTRAIT DE roundtrip.js le 2026-11-19, sans aucun changement de
// comportement. Deux consommateurs en ont besoin : l'aller-retour d'export
// (phase 0) et l'analyse image par image (phase 1B). La phase 0 a trouve deux
// bizarreries de Safari dans cette zone — la duree de paquet absente et un
// esds de 39 octets — et deux copies de ce code feraient deux endroits a
// corriger a la troisieme.

const CHUNK = 1 << 20;

// mp4box.all.min.js n'expose que MP4Box.createFile ; DataStream est un global
// distinct. Chercher MP4Box.DataStream plantait toute la chaine.
export function descriptionFor(mp4, trackId) {
  const DataStream = globalThis.DataStream;
  if (!DataStream) throw new Error('DataStream (mp4box) introuvable');
  const trak = mp4.getTrackById(trackId);
  for (const entry of trak.mdia.minf.stbl.stsd.entries) {
    const box = entry.avcC || entry.hvcC || entry.vpcC || entry.av1C;
    if (box) {
      const stream = new DataStream(undefined, 0, DataStream.BIG_ENDIAN);
      box.write(stream);
      return new Uint8Array(stream.buffer, 8); // on retire l'en-tete de boite
    }
  }
  throw new Error(
    'configuration du décodeur introuvable (pas de boîte avcC/hvcC) : ' +
    'sans elle le décodeur lit du vide sans jamais le signaler'
  );
}

export function demuxVideo(file, maxSeconds) {
  return new Promise((resolve, reject) => {
    const MP4Box = globalThis.MP4Box;
    if (!MP4Box) { reject(new Error('mp4box.js n’est pas chargé')); return; }

    const mp4 = MP4Box.createFile();
    const samples = [];
    let track = null;
    let description;
    let enough = false;

    mp4.onError = (e) => reject(new Error(file.name + ' : ' + e));

    mp4.onReady = (info) => {
      track = (info.videoTracks || [])[0];
      if (!track) { reject(new Error(file.name + ' : aucune piste vidéo')); return; }
      description = descriptionFor(mp4, track.id);
      mp4.setExtractionOptions(track.id, null, { nbSamples: 100 });
      mp4.start();
    };

    mp4.onSamples = (_id, _user, list) => {
      for (const s of list) {
        if (s.cts / s.timescale > maxSeconds) { enough = true; return; }
        // on garde les donnees brutes : un EncodedVideoChunk ne sert qu'une
        // fois, or on peut avoir a rejouer la passe avec une autre strategie
        samples.push({
          type: s.is_sync ? 'key' : 'delta',
          timestamp: (s.cts / s.timescale) * 1e6,
          duration: (s.duration / s.timescale) * 1e6,
          data: s.data.slice(0)
        });
      }
    };

    (async () => {
      let offset = 0;
      while (offset < file.size && !enough) {
        const buf = await file.slice(offset, offset + CHUNK).arrayBuffer();
        buf.fileStart = offset;
        mp4.appendBuffer(buf);
        offset += CHUNK;
      }
      try { mp4.flush(); } catch (_) { /* conteneur tronque */ }
      // on garde nos propres copies : mp4box peut liberer les siennes
      try { if (track) mp4.releaseUsedSamples(track.id, track.nb_samples); } catch (_) {}
      if (!track) { reject(new Error(file.name + ' : conteneur illisible')); return; }
      if (!samples.length) { reject(new Error(file.name + ' : aucune image extraite')); return; }
      resolve({ samples, description, track });
    })().catch(reject);
  });
}


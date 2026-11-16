// Logique pure : retrouver l'AudioSpecificConfig dans ce que l'encodeur rend.
//
// Mesure du 2026-11-16, iPhone 12 mini / iOS 27.2 : Safari remet 39 octets
// dans `decoderConfig.description`. Un AudioSpecificConfig en fait 2 (5 avec
// SBR) : ces 39 octets sont un esds complet. Or mp4-muxer fait
//     new Uint8Array(track.info.decoderConfig.description)
// et l'insere tel quel comme DecoderSpecificInfo dans l'esds qu'il construit.
// Resultat : un esds imbrique dans un esds. Le fichier reste valide et reste
// muet — c'est exactement ce qui a ete constate.
//
// Les descripteurs MPEG-4 sont des triplets tag / longueur / contenu, la
// longueur etant codee sur 1 a 4 octets dont le bit 0x80 marque la suite.

const TAG_ES_DESCRIPTOR = 0x03;
const TAG_DECODER_CONFIG = 0x04;
const TAG_DECODER_SPECIFIC_INFO = 0x05;
const MAX_ASC = 64;

function readLength(bytes, i) {
  let len = 0;
  let n = 0;
  let byte;
  do {
    if (i + n >= bytes.length) return null;
    byte = bytes[i + n];
    len = (len << 7) | (byte & 0x7f);
    n++;
  } while ((byte & 0x80) && n < 4);
  return { len, next: i + n };
}

export function extractAudioSpecificConfig(description) {
  if (!description) return null;
  const bytes = description instanceof Uint8Array
    ? description
    : new Uint8Array(description);
  if (!bytes.length) return null;

  // Deja un AudioSpecificConfig nu : rien a extraire. On ne se contente pas
  // de la taille — du bruit de 3 octets passerait. Les 5 bits de poids fort
  // portent l'objectType : 1 a 5 couvrent AAC Main, LC, SSR, LTP et SBR.
  if (bytes.length >= 2 && bytes.length <= 5 && bytes[0] !== TAG_DECODER_SPECIFIC_INFO) {
    const objectType = bytes[0] >> 3;
    if (objectType >= 1 && objectType <= 5) return bytes;
  }

  // On MARCHE les descripteurs au lieu de chercher l'octet 0x05 au hasard :
  // un maxBitrate valant 0x00050200 contient « 05 02 » et serait pris pour la
  // config, rendant une piste muette avec un relevé d'apparence correcte.
  // Revue du 2026-11-16.
  let i = 0;

  if (bytes[i] === TAG_ES_DESCRIPTOR) {
    const head = readLength(bytes, i + 1);
    if (!head) return null;
    i = head.next + 2;                         // ES_ID sur 2 octets
    const flags = bytes[i];
    if (flags === undefined) return null;
    i += 1;
    if (flags & 0x80) i += 2;                  // streamDependenceFlag
    if (flags & 0x40) i += 1 + (bytes[i] || 0); // URL_Flag : longueur + URL
    if (flags & 0x20) i += 2;                  // OCRstreamFlag
  }

  if (bytes[i] === TAG_DECODER_CONFIG) {
    const head = readLength(bytes, i + 1);
    if (!head) return null;
    // objectType(1) streamType(1) bufferSizeDB(3) maxBitrate(4) avgBitrate(4)
    i = head.next + 13;
  }

  if (bytes[i] !== TAG_DECODER_SPECIFIC_INFO) return null;
  const read = readLength(bytes, i + 1);
  if (!read) return null;
  const { len, next } = read;
  if (len < 1 || len > MAX_ASC || next + len > bytes.length) return null;
  return bytes.subarray(next, next + len);
}

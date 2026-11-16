import { test, assert } from './harness.js';
import { extractAudioSpecificConfig } from '../src/core/asc.js';

const hex = (u8) => Array.from(u8).map((b) => b.toString(16).padStart(2, '0')).join(' ');

// Mesure du 2026-11-16, iPhone 12 mini : Safari remet 39 octets dans
// decoderConfig.description. Un AudioSpecificConfig fait 2 octets. Les 39
// octets sont un esds complet, que mp4-muxer reemballait dans un second esds.

test('un AudioSpecificConfig nu est rendu tel quel', () => {
  const asc = new Uint8Array([0x11, 0x90]); // AAC-LC, 48 kHz, stéréo
  const out = extractAudioSpecificConfig(asc);
  assert(hex(out) === '11 90', 'obtenu ' + hex(out));
});

test('l’AudioSpecificConfig est extrait d’un esds complet', () => {
  // 03 len | ES_ID(2) flags(1) | 04 len | objType streamType bufSize(3) max(4) avg(4) | 05 len ASC
  const esds = new Uint8Array([
    0x03, 0x19,
    0x00, 0x01, 0x00,
    0x04, 0x11,
    0x40, 0x15, 0x00, 0x00, 0x00, 0x00, 0x01, 0xf4, 0x00, 0x00, 0x01, 0xf4, 0x00,
    0x05, 0x02, 0x11, 0x90,
    0x06, 0x01, 0x02
  ]);
  const out = extractAudioSpecificConfig(esds);
  assert(out !== null, 'extraction échouée');
  assert(hex(out) === '11 90', 'obtenu ' + hex(out));
});

test('une longueur sur plusieurs octets est lue correctement', () => {
  // longueur 0x80 0x02 = 2, forme etendue des descripteurs MPEG-4
  const esds = new Uint8Array([0x05, 0x80, 0x02, 0x12, 0x10]);
  const out = extractAudioSpecificConfig(esds);
  assert(out !== null && hex(out) === '12 10', 'obtenu ' + (out && hex(out)));
});

test('des octets inexploitables ne rendent rien plutôt qu’un faux', () => {
  assert(extractAudioSpecificConfig(new Uint8Array([0x99, 0x99, 0x99])) === null);
  assert(extractAudioSpecificConfig(new Uint8Array(0)) === null);
  assert(extractAudioSpecificConfig(null) === null);
});

test('un descripteur annonçant plus que sa taille est refusé', () => {
  // tag 05 annonce 200 octets alors qu'il n'en reste que 2
  assert(extractAudioSpecificConfig(new Uint8Array([0x05, 0xc8, 0x11, 0x90])) === null);
});

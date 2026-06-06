import { calcHan } from './han'; // Ajustez le chemin vers votre fichier principal si nécessaire
import { Hand, Tile } from './tiles';

// --- Utilitaires de test ---

// Raccourci pour créer une tuile
function t(suit: 'man' | 'pin' | 'sou' | 'wind' | 'dragon', value: number): Tile {
  return { suit, value };
}

// Raccourci pour créer une main complète
function createHand(tiles: Tile[], winTile: Tile, overrides: Partial<Hand> = {}): Hand {
  return {
    tiles,
    winTile,
    isRiichi: false,
    isTsumo: false,
    isOpen: false,
    ...overrides
  };
}

// --- Suites de Tests ---

describe('Calculateur de Yaku - Riichi Mahjong', () => {

  describe('Mains Spéciales', () => {
    test('Kokushi Musou (Thirteen Orphans)', () => {
      const tiles = [
        t('man', 1), t('man', 9),
        t('pin', 1), t('pin', 9),
        t('sou', 1), t('sou', 9),
        t('wind', 1), t('wind', 2), t('wind', 3), t('wind', 4),
        t('dragon', 1), t('dragon', 2), t('dragon', 3)
      ];
      const winTile = t('man', 1); // La 14ème tuile qui complète la paire
      const hand = createHand(tiles, winTile);

      const result = calcHan(hand);
      expect(result).toContainEqual({ name: 'Kokushi Musou (treize orphelins)', han: 13 });
    });

    test('Chiitoitsu (Sept Paires)', () => {
      const tiles = [
        t('man', 2), t('man', 2),
        t('man', 5), t('man', 5),
        t('pin', 1), t('pin', 1),
        t('pin', 9), t('pin', 9),
        t('sou', 3), t('sou', 3),
        t('wind', 4), t('wind', 4),
        t('dragon', 2)
      ];
      const winTile = t('dragon', 2);
      const hand = createHand(tiles, winTile);

      const result = calcHan(hand);
      expect(result).toContainEqual({ name: 'Chiitoitsu (sept paires)', han: 2 });
    });
  });

  describe('Yaku Standard Basiques', () => {
    test('Tanyao (Toutes Simples)', () => {
      // Main composée uniquement de tuiles entre 2 et 8
      const tiles = [
        t('man', 2), t('man', 3), t('man', 4), // Séquence
        t('pin', 5), t('pin', 5), t('pin', 5), // Triplet
        t('sou', 7), t('sou', 8), t('sou', 9), // Séquence (attente sur le 9) -> Oups attention le 9 casse tanyao ! On met 6-7-8
        t('sou', 2), t('sou', 2)               // Paire
      ];
      // Correction pour n'avoir que du simple :
      const tanyaoTiles = [
        t('man', 2), t('man', 3), t('man', 4),
        t('pin', 5), t('pin', 5), t('pin', 5),
        t('sou', 6), t('sou', 7), 
        t('sou', 2), t('sou', 2),
        t('man', 7), t('man', 7), t('man', 7)
      ];
      const winTile = t('sou', 8); // Complète la séquence sou 6-7-8
      const hand = createHand(tanyaoTiles, winTile);

      const result = calcHan(hand);
      expect(result.some(y => y.name.includes('Tanyao'))).toBe(true);
    });

    test('Pinfu (Main courante)', () => {
      const tiles = [
        t('man', 2), t('man', 3), // en attente de man 1 ou 4 (attente bilatérale)
        t('pin', 4), t('pin', 5), t('pin', 6),
        t('sou', 7), t('sou', 8), t('sou', 9),
        t('man', 7), t('man', 8), t('man', 9),
        t('pin', 2), t('pin', 2)  // Paire de simples (pas d'honneur)
      ];
      const winTile = t('man', 4);
      const hand = createHand(tiles, winTile, { isOpen: false });

      const result = calcHan(hand);
      expect(result).toContainEqual({ name: 'Pinfu', han: 1 });
    });
  });

  describe('Yaku de Suites et Triplets', () => {
    test('Iipeiko (Deux séquences identiques)', () => {
      const tiles = [
        t('man', 2), t('man', 3), t('man', 4), // Séquence 1
        t('man', 2), t('man', 3),              // Séquence 2 en cours
        t('pin', 5), t('pin', 6), t('pin', 7),
        t('sou', 2), t('sou', 3), t('sou', 4),
        t('wind', 1), t('wind', 1)             // Paire
      ];
      const winTile = t('man', 4); // Complète la deuxième séquence 2-3-4
      const hand = createHand(tiles, winTile, { isOpen: false });

      const result = calcHan(hand);
      expect(result).toContainEqual({ name: 'Iipeiko (double suite)', han: 1 });
    });

    test('Toitoi (Tout triplets)', () => {
      const tiles = [
        t('man', 2), t('man', 2), t('man', 2),
        t('pin', 3), t('pin', 3), t('pin', 3),
        t('sou', 4), t('sou', 4), t('sou', 4),
        t('wind', 1), t('wind', 1),
        t('dragon', 3), t('dragon', 3)
      ];
      const winTile = t('dragon', 3);
      const hand = createHand(tiles, winTile, { isOpen: true }); // Fonctionne aussi ouvert

      const result = calcHan(hand);
      expect(result).toContainEqual({ name: 'Toitoi (tout triplets)', han: 2 });
    });
  });

  describe('Yaku de Couleurs (Honitsu / Chinitsu)', () => {
    test('Honitsu (Demi-couleur) - Fermé', () => {
      // Uniquement des tuiles de "man" et des honneurs (winds/dragons)
      const tiles = [
        t('man', 1), t('man', 2), t('man', 3),
        t('man', 4), t('man', 5), t('man', 6),
        t('wind', 1), t('wind', 1), t('wind', 1),
        t('dragon', 2), t('dragon', 2), t('dragon', 2),
        t('man', 9)
      ];
      const winTile = t('man', 9);
      const hand = createHand(tiles, winTile, { isOpen: false });

      const result = calcHan(hand);
      expect(result).toContainEqual({ name: 'Honitsu (demi-couleur)', han: 3 });
    });

    test('Chinitsu (Couleur pure) - Ouvert', () => {
      // Uniquement des tuiles de "pin"
      const tiles = [
        t('pin', 1), t('pin', 2), t('pin', 3),
        t('pin', 2), t('pin', 3), t('pin', 4),
        t('pin', 5), t('pin', 6), t('pin', 7),
        t('pin', 8), t('pin', 8), t('pin', 8),
        t('pin', 9)
      ];
      const winTile = t('pin', 9);
      const hand = createHand(tiles, winTile, { isOpen: true });

      const result = calcHan(hand);
      expect(result).toContainEqual({ name: 'Chinitsu (couleur pure)', han: 5 });
    });
  });

  describe('Yakuhai (Honneurs)', () => {
    test('Triplet de Dragon', () => {
      const tiles = [
        t('dragon', 1), t('dragon', 1), // Dragon Blanc
        t('man', 2), t('man', 3), t('man', 4),
        t('pin', 5), t('pin', 6), t('pin', 7),
        t('sou', 2), t('sou', 3), t('sou', 4),
        t('sou', 7), t('sou', 7)
      ];
      const winTile = t('dragon', 1); // Complète le triplet
      const hand = createHand(tiles, winTile);

      const result = calcHan(hand);
      expect(result).toContainEqual({ name: 'Yakuhai dragon (1)', han: 1 });
    });

    test('Vent de place et Vent du tour', () => {
      const tiles = [
        t('wind', 1), t('wind', 1), // Supposons 1 = Est
        t('man', 2), t('man', 3), t('man', 4),
        t('pin', 5), t('pin', 6), t('pin', 7),
        t('sou', 2), t('sou', 3), t('sou', 4),
        t('sou', 7), t('sou', 7)
      ];
      const winTile = t('wind', 1);
      // Joueur Est (1) pendant le tour Est (1) -> Double Vent bénéfique
      const hand = createHand(tiles, winTile);

      const result = calcHan(hand, 1, 1);
      expect(result).toContainEqual({ name: 'Yakuhai vent de place', han: 1 });
      expect(result).toContainEqual({ name: 'Yakuhai vent du tour', han: 1 });
    });
  });
});
import { calcFu, Decomposition } from './fu';
import { Hand, Tile } from './tiles';

// --- Utilitaires de test ---

function t(suit: 'man' | 'pin' | 'sou' | 'wind' | 'dragon', value: number): Tile {
  return { suit, value };
}

function createHand(winTile: Tile, overrides: Partial<Hand> = {}): Hand {
  return {
    tiles: [], // Les tuiles brutes ne sont pas utilisées par calcFu directement
    winTile,
    isRiichi: false,
    isTsumo: false,
    isOpen: false,
    ...overrides
  };
}

// --- Suites de Tests ---

describe('Calculateur de Fu (Minipoints) - Règles EMA 2025', () => {

  describe('Règles de base et exceptions', () => {
    test('Chiitoitsu (Sept Paires) vaut toujours exactement 25 Fu', () => {
      const hand = createHand(t('pin', 2));
      // Les décompositions importent peu pour les 7 paires
      const result = calcFu(hand, null, true);
      
      expect(result.total).toBe(25);
      expect(result.details.some(d => d.includes('25 Fu'))).toBe(true);
    });

    test('Pinfu Tsumo (Fermé) vaut exactement 20 Fu', () => {
      const winTile = t('man', 4);
      const hand = createHand(winTile, { isTsumo: true, isOpen: false });
      
      const decomp: Decomposition = {
        sequences: [
          [t('man', 2), t('man', 3), t('man', 4)], // Attente bilatérale (Ryanmen) sur le 1-4
          [t('pin', 2), t('pin', 3), t('pin', 4)],
          [t('sou', 5), t('sou', 6), t('sou', 7)],
          [t('sou', 7), t('sou', 8), t('sou', 9)]
        ],
        triplets: [],
        pair: [t('wind', 2), t('wind', 2)] // Vent sans valeur (Seat=1, Round=1)
      };

      const result = calcFu(hand, decomp, false, 1, 1);
      
      expect(result.total).toBe(20);
      expect(result.details.some(d => d.includes('-2 Fu'))).toBe(true);
    });

    test('Open Pinfu (Ouvert) reçoit +2 Fu de correction (EMA 2025 4.1.1) -> 30 Fu', () => {
      const winTile = t('man', 4);
      // Ron sur une main ouverte
      const hand = createHand(winTile, { isTsumo: false, isOpen: true });
      
      const decomp: Decomposition = {
        sequences: [
          [t('man', 2), t('man', 3), t('man', 4)], 
          [t('pin', 2), t('pin', 3), t('pin', 4)],
          [t('sou', 5), t('sou', 6), t('sou', 7)],
          [t('sou', 7), t('sou', 8), t('sou', 9)]
        ],
        triplets: [],
        pair: [t('wind', 2), t('wind', 2)]
      };

      const result = calcFu(hand, decomp, false, 1, 1);
      
      // Base 20 + 0 (Ron ouvert) + 0 (Sets) + 0 (Paire) + 0 (Attente) = 20
      // Correction Open Pinfu = +2 -> 22 -> Arrondi à 30
      expect(result.total).toBe(30);
      expect(result.details.some(d => d.includes('Open Pinfu'))).toBe(true);
    });
  });

  describe('Valeurs de la Paire', () => {
    test('Paire de Dragons donne +2 Fu', () => {
      const winTile = t('pin', 5);
      const hand = createHand(winTile, { isOpen: true, isTsumo: false });
      
      const decomp: Decomposition = {
        sequences: [[t('pin', 3), t('pin', 4), t('pin', 5)]],
        triplets: [[t('sou', 2), t('sou', 2), t('sou', 2)]], // Brelan simple ouvert: +2
        pair: [t('dragon', 1), t('dragon', 1)] // +2
      };

      const result = calcFu(hand, decomp, false);
      
      // Base 20 + 0 (Ron ouvert) + 2 (Brelan) + 2 (Dragons) = 24 -> 30
      expect(result.total).toBe(30);
    });

    test('Paire de Double Vent (Seat et Round) donne SEULEMENT +2 Fu (EMA 2025)', () => {
      const winTile = t('pin', 5);
      const hand = createHand(winTile, { isOpen: true, isTsumo: false });
      
      const decomp: Decomposition = {
        sequences: [[t('pin', 3), t('pin', 4), t('pin', 5)]],
        triplets: [],
        pair: [t('wind', 1), t('wind', 1)] // Vent Est
      };

      // Le joueur est Est (1) et le tour est Est (1)
      const result = calcFu(hand, decomp, false, 1, 1);
      
      // Si on comptait +4, le total serait 20 + 4 = 24 -> Arrondi 30
      // Mais avec +2, le total est 20 + 2 = 22 -> Arrondi 30 quand même !
      // On vérifie donc dans les détails que ça n'a ajouté que 2.
      const pairDetail = result.details.find(d => d.includes('Vent'));
      expect(pairDetail).toContain('+2 Fu');
    });
  });

  describe('Valeurs des Brelans et Carrés', () => {
    test('Carré fermé terminal (32 Fu) et Brelan ouvert simple (2 Fu)', () => {
      const winTile = t('man', 5);
      // Main ouverte mais on a un carré fermé déclaré
      const hand = createHand(winTile, { isOpen: true, isTsumo: false });
      
      const decomp: Decomposition = {
        sequences: [[t('man', 3), t('man', 4), t('man', 5)]],
        triplets: [[t('pin', 2), t('pin', 2), t('pin', 2)]], // Brelan simple ouvert = +2
        quads: [[t('dragon', 2), t('dragon', 2), t('dragon', 2), t('dragon', 2)]], // Carré terminal fermé = +32
        pair: [t('wind', 3), t('wind', 3)]
      };

      const result = calcFu(hand, decomp, false);
      
      // Base 20 + 0 (Ron ouvert) + 2 (Brelan simple) + 32 (Carré Honneur) = 54 -> 60
      expect(result.total).toBe(60);
    });
  });

  describe('Formes d\'attente', () => {
    test('Attente fermée (Kanchan) donne +2 Fu', () => {
      const winTile = t('man', 2);
      const hand = createHand(winTile, { isOpen: true, isTsumo: false });
      
      const decomp: Decomposition = {
        sequences: [[t('man', 1), t('man', 2), t('man', 3)]], // Attente sur le 2 (milieu)
        triplets: [],
        pair: [t('wind', 3), t('wind', 3)]
      };

      const result = calcFu(hand, decomp, false);
      
      // Base 20 + 0 (Ron ouvert) + 2 (Attente) = 22 -> 30
      expect(result.total).toBe(30);
      expect(result.details.some(d => d.includes('Attente fermée/bord/paire : +2 Fu'))).toBe(true);
    });

    test('Attente sur la paire (Tanki) donne +2 Fu', () => {
      const winTile = t('sou', 8);
      const hand = createHand(winTile, { isOpen: true, isTsumo: false });
      
      const decomp: Decomposition = {
        sequences: [[t('man', 1), t('man', 2), t('man', 3)]],
        triplets: [],
        pair: [t('sou', 8), t('sou', 8)] // La tuile gagnante est la paire
      };

      const result = calcFu(hand, decomp, false);
      
      // Base 20 + 0 (Ron ouvert) + 2 (Attente Paire) = 22 -> 30
      expect(result.total).toBe(30);
    });
  });

});
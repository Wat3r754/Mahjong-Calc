// Les 4 familles
export type Suit = 'man' | 'pin' | 'sou' | 'wind' | 'dragon';

// Une tuile
export type Tile = {
  suit: Suit;
  value: number; // 1-9 pour man/pin/sou, 1-4 vents, 1-3 dragons
};

// Une main = 13 ou 14 tuiles
export type Hand = {
  tiles: Tile[];
  winTile: Tile;      // la tuile gagnante
  isTsumo: boolean;   // tsumo = pioché soi-même
  isOpen: boolean;    // ouvert = avec des sets exposés
  isRiichi: boolean;  // riichi déclaré
};
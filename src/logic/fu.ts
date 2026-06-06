import { Hand, Tile, Suit } from './tiles';

// --- Types étendus pour le calcul ---

// Nous étendons légèrement votre Decomposition pour inclure les carrés (quads)
// qui rapportent beaucoup de Fu.
export type Set3 = [Tile, Tile, Tile];
export type Set4 = [Tile, Tile, Tile, Tile];

export type Decomposition = {
  sequences: Set3[];
  triplets: Set3[];
  quads?: Set4[]; // Ajout des carrés optionnels
  pair: [Tile, Tile];
} | null;

export type FuResult = {
  total: number;
  details: string[];
};

// --- Utilitaires ---

function tilesEqual(a: Tile, b: Tile): boolean {
  return a.suit === b.suit && a.value === b.value;
}

function isTerminalOrHonour(t: Tile): boolean {
  return (
    (t.suit === 'man' || t.suit === 'pin' || t.suit === 'sou') && (t.value === 1 || t.value === 9) ||
    t.suit === 'wind' || t.suit === 'dragon'
  );
}

function sortTiles(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) =>
    a.suit === b.suit ? a.value - b.value : a.suit.localeCompare(b.suit)
  );
}

// --- Calcul des attentes (Waits) ---

// Vérifie si la tuile gagnante donne des Fu d'attente (+2) dans un set donné
function getWaitFu(set: Tile[], winTile: Tile): number {
  if (set.length === 2) {
    // Attente sur la paire (Tanki)
    if (tilesEqual(set[0], winTile)) return 2;
  }
  
  if (set.length === 3) {
    // Si c'est un brelan, c'est une attente double paire (Shanpon) -> 0 Fu
    if (tilesEqual(set[0], set[1])) return 0;

    // Si c'est une séquence
    const sorted = sortTiles(set);
    const winIndex = sorted.findIndex(t => tilesEqual(t, winTile));
    
    if (winIndex === -1) return 0;

    // Attente fermée / au milieu (Kanchan)
    if (winIndex === 1) return 2;

    // Attente sur le bord (Penchan) : 3 pour finir 1-2, ou 7 pour finir 8-9
    if (winIndex === 2 && sorted[0].value === 1) return 2;
    if (winIndex === 0 && sorted[2].value === 9) return 2;
  }
  
  return 0; // Attente bilatérale (Ryanmen) ou autre -> 0 Fu
}

// --- Calcul Principal des Fu ---

export function calcFu(
  hand: Hand,
  decomp: Decomposition,
  isSevenPairs: boolean,
  seatWind: number = 1,
  roundWind: number = 1
): FuResult {
  const details: string[] = [];

  // 1. Cas particulier : Les 7 paires (toujours 25 Fu, pas d'arrondi)
  if (isSevenPairs) {
    return { total: 25, details: ['Chiitoitsu (Sept paires) : 25 Fu'] };
  }

  // Si pas de décomposition valide, on ne peut pas calculer
  if (!decomp) return { total: 0, details: [] };

  let totalFu = 20;
  details.push('Base : 20 Fu');

  // 2. Conditions de victoire (Tsumo / Ron)
  if (!hand.isOpen && !hand.isTsumo) {
    totalFu += 10;
    details.push('Ron main fermée : +10 Fu');
  } else if (hand.isTsumo) {
    // Attention: Pinfu Tsumo ne prend pas les 2 Fu du Tsumo (règle standard japonaise)
    // On l'ajoute temporairement, et on le retirera si c'est un Pinfu.
    totalFu += 2;
    details.push('Tsumo : +2 Fu');
  }

  // 3. Valeur de la Paire (Yakuhai)
  const pairTile = decomp.pair[0];
  if (pairTile.suit === 'dragon') {
    totalFu += 2;
    details.push('Paire de Dragons : +2 Fu');
  } else if (pairTile.suit === 'wind') {
    const isSeatWind = pairTile.value === seatWind;
    const isRoundWind = pairTile.value === roundWind;
    
    // RÈGLE EMA 2025 (4.1.1) : Une paire qui est à la fois vent du tour et vent de place
    // ne vaut que 2 Fu (et non 4 comme dans certaines règles japonaises).
    if (isSeatWind || isRoundWind) {
      totalFu += 2;
      details.push('Paire de vent de valeur (Place/Tour) : +2 Fu');
    }
  }

  // 4. Brelans et Carrés (Triplets & Quads)
  const calculateSetFu = (set: Tile[], isQuad: boolean) => {
    const isTerminal = isTerminalOrHonour(set[0]);
    // LIMITATION : Sans info sur chaque set, on suppose qu'un brelan est fermé
    // SAUF si la main est ouverte (on simplifie ici en disant que si hand.isOpen, les brelans sont considérés ouverts).
    // Une implémentation parfaite nécessiterait de savoir exactement quels sets ont été volés.
    // De plus, si c'est un Ron et que la tuile gagnante finit ce brelan, il est compté comme ouvert.
    const winTileCompletesThis = !hand.isTsumo && set.some(t => tilesEqual(t, hand.winTile));
    const isConcealed = !hand.isOpen && !winTileCompletesThis;

    let base = isTerminal ? 4 : 2;
    if (isConcealed) base *= 2;
    if (isQuad) base *= 4;

    if (base > 0) {
      totalFu += base;
      const setName = isQuad ? 'Carré' : 'Brelan';
      const visibility = isConcealed ? 'fermé' : 'ouvert';
      const type = isTerminal ? 'honneur/extrémité' : 'simple';
      details.push(`${setName} ${visibility} (${type}) : +${base} Fu`);
    }
  };

  decomp.triplets.forEach(t => calculateSetFu(t, false));
  if (decomp.quads) {
    decomp.quads.forEach(q => calculateSetFu(q, true));
  }

  // 5. Forme de l'attente (Wait)
  // On cherche la meilleure attente parmi tous les sets contenant la tuile gagnante
  let maxWaitFu = 0;
  const allSets: Tile[][] = [...decomp.sequences, ...decomp.triplets, decomp.pair];
  if (decomp.quads) allSets.push(...decomp.quads);

  for (const set of allSets) {
    if (set.some(t => tilesEqual(t, hand.winTile))) {
      const waitFu = getWaitFu(set, hand.winTile);
      if (waitFu > maxWaitFu) {
        maxWaitFu = waitFu;
      }
    }
  }
  
  if (maxWaitFu > 0) {
    totalFu += maxWaitFu;
    details.push(`Attente fermée/bord/paire : +${maxWaitFu} Fu`);
  }

  // 6. Exceptions Pinfu
  // Si on n'a marqué aucun Fu additionnel lié aux sets, paire ou attente, c'est la structure d'un Pinfu.
  const hasNoSetOrWaitFu = totalFu === (20 + (hand.isTsumo ? 2 : (!hand.isOpen ? 10 : 0)));
  
  if (hasNoSetOrWaitFu) {
    if (!hand.isOpen && hand.isTsumo) {
      // Pinfu Tsumo : On retire les 2 Fu du Tsumo pour rester à 20 fixes.
      totalFu -= 2;
      details.push('Correction Pinfu Tsumo : -2 Fu (reste à 20)');
    } else if (hand.isOpen && totalFu === 20) {
      // RÈGLE EMA 2025 (4.1.1) : "Open Pinfu"
      // 2 minipoints sont accordés pour une main ouverte qui vaut exactement 20 minipoints.
      totalFu += 2;
      details.push('Correction Open Pinfu : +2 Fu');
    }
  }

  // 7. Arrondi à la dizaine supérieure
  const roundedFu = Math.ceil(totalFu / 10) * 10;
  if (roundedFu !== totalFu) {
    details.push(`Arrondi : ${totalFu} -> ${roundedFu} Fu`);
  }

  return {
    total: roundedFu,
    details
  };
}
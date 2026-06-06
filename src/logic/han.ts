import { Hand, Tile, Suit } from './tiles';

export type YakuResult = {
  name: string;
  han: number;
};

// --- Utilitaires ---

function tilesEqual(a: Tile, b: Tile): boolean {
  return a.suit === b.suit && a.value === b.value;
}

function isTerminal(t: Tile): boolean {
  return (t.suit === 'man' || t.suit === 'pin' || t.suit === 'sou') && (t.value === 1 || t.value === 9);
}

function isHonour(t: Tile): boolean {
  return t.suit === 'wind' || t.suit === 'dragon';
}

function isTerminalOrHonour(t: Tile): boolean {
  return isTerminal(t) || isHonour(t);
}

function isSimple(t: Tile): boolean {
  return !isTerminalOrHonour(t);
}

function sortTiles(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) =>
    a.suit === b.suit ? a.value - b.value : a.suit.localeCompare(b.suit)
  );
}

// --- Décomposition en sets ---

type Set3 = [Tile, Tile, Tile];
type Decomposition = { sequences: Set3[]; triplets: Set3[]; pair: [Tile, Tile] } | null;

function findDecompositions(tiles: Tile[]): Decomposition[] {
  const results: Decomposition[] = [];
  const sorted = sortTiles(tiles);

  function tryPair(remaining: Tile[], seqs: Set3[], trips: Set3[]): void {
    for (let i = 0; i < remaining.length - 1; i++) {
      if (tilesEqual(remaining[i], remaining[i + 1])) {
        const pair: [Tile, Tile] = [remaining[i], remaining[i + 1]];
        const rest = [...remaining.slice(0, i), ...remaining.slice(i + 2)];
        trySets(rest, seqs, trips, pair);
        i++; // évite doublons
      }
    }
  }

  function trySets(remaining: Tile[], seqs: Set3[], trips: Set3[], pair: [Tile, Tile]): void {
    if (remaining.length === 0) {
      results.push({ sequences: [...seqs], triplets: [...trips], pair });
      return;
    }
    const first = remaining[0];

    // Essai triplet
    if (
      remaining.length >= 3 &&
      tilesEqual(remaining[1], first) &&
      tilesEqual(remaining[2], first)
    ) {
      const trip: Set3 = [first, remaining[1], remaining[2]];
      trySets(remaining.slice(3), seqs, [...trips, trip], pair);
    }

    // Essai séquence
    if (first.suit !== 'wind' && first.suit !== 'dragon') {
      const second = remaining.find(t => t.suit === first.suit && t.value === first.value + 1);
      const third = remaining.find(t => t.suit === first.suit && t.value === first.value + 2);
      if (second && third) {
        const seq: Set3 = [first, second, third];
        const rest = remaining.filter(t => t !== first && t !== second && t !== third);
        // retire exactement une occurrence
        let removedFirst = false, removedSecond = false, removedThird = false;
        const cleanRest = remaining.slice(1).filter(t => {
          if (!removedSecond && tilesEqual(t, second)) { removedSecond = true; return false; }
          if (!removedThird && tilesEqual(t, third)) { removedThird = true; return false; }
          return true;
        });
        trySets(cleanRest, [...seqs, seq], trips, pair);
      }
    }
  }

  tryPair(sorted, [], []);
  return results;
}

// --- Sept paires ---

function isSevenPairs(tiles: Tile[]): boolean {
  if (tiles.length !== 14) return false;
  const sorted = sortTiles(tiles);
  for (let i = 0; i < 14; i += 2) {
    if (!tilesEqual(sorted[i], sorted[i + 1])) return false;
    // deux paires identiques interdites
    if (i > 0 && tilesEqual(sorted[i], sorted[i - 2])) return false;
  }
  return true;
}

// --- Treize orphelins ---

function isThirteenOrphans(tiles: Tile[]): boolean {
  const orphans: Tile[] = [
    { suit: 'man', value: 1 }, { suit: 'man', value: 9 },
    { suit: 'pin', value: 1 }, { suit: 'pin', value: 9 },
    { suit: 'sou', value: 1 }, { suit: 'sou', value: 9 },
    { suit: 'wind', value: 1 }, { suit: 'wind', value: 2 },
    { suit: 'wind', value: 3 }, { suit: 'wind', value: 4 },
    { suit: 'dragon', value: 1 }, { suit: 'dragon', value: 2 },
    { suit: 'dragon', value: 3 },
  ];
  const remaining = [...tiles];
  for (const orphan of orphans) {
    const idx = remaining.findIndex(t => tilesEqual(t, orphan));
    if (idx === -1) return false;
    remaining.splice(idx, 1);
  }
  return true;
}

// --- Yaku individuels ---

function checkTanyao(decomp: Decomposition): boolean {
  if (!decomp) return false;
  const allTiles = [
    ...decomp.sequences.flat(),
    ...decomp.triplets.flat(),
    ...decomp.pair,
  ];
  return allTiles.every(isSimple);
}

function checkPinfu(decomp: Decomposition, winTile: Tile, isOpen: boolean): boolean {
  if (!decomp || isOpen) return false;
  if (decomp.triplets.length > 0) return false;
  // paire sans valeur (pas dragon, pas vent de place/round — simplifié : pas honneur)
  if (isHonour(decomp.pair[0])) return false;
  // tuile gagnante finit une séquence en attente des deux côtés
  for (const seq of decomp.sequences) {
    const sorted = sortTiles(seq);
    const isEdge =
      (tilesEqual(winTile, sorted[2]) && sorted[0].value === 7) ||
      (tilesEqual(winTile, sorted[0]) && sorted[2].value === 3);
    const isClosed =
      tilesEqual(winTile, sorted[1]);
    if (tilesEqual(winTile, sorted[0]) || tilesEqual(winTile, sorted[2])) {
      if (!isEdge && !isClosed) return true;
    }
  }
  return false;
}

function checkIipeiko(decomp: Decomposition, isOpen: boolean): boolean {
  if (!decomp || isOpen) return false;
  const seqs = decomp.sequences;
  for (let i = 0; i < seqs.length; i++) {
    for (let j = i + 1; j < seqs.length; j++) {
      if (
        sortTiles(seqs[i]).every((t, k) => tilesEqual(t, sortTiles(seqs[j])[k]))
      ) return true;
    }
  }
  return false;
}

function checkSanshokuDojun(decomp: Decomposition, isOpen: boolean): YakuResult | null {
  if (!decomp) return null;
  const suits: Suit[] = ['man', 'pin', 'sou'];
  for (const seq of decomp.sequences) {
    const sorted = sortTiles(seq);
    const v = sorted[0].value;
    const hasAll = suits.every(s =>
      decomp.sequences.some(s2 => {
        const ss = sortTiles(s2);
        return ss[0].suit === s && ss[0].value === v;
      })
    );
    if (hasAll) return { name: 'Sanshoku Dojun (suite triple mixte)', han: isOpen ? 1 : 2 };
  }
  return null;
}

function checkIttsuu(decomp: Decomposition, isOpen: boolean): YakuResult | null {
  if (!decomp) return null;
  const suits: Suit[] = ['man', 'pin', 'sou'];
  for (const suit of suits) {
    const has123 = decomp.sequences.some(s => {
      const ss = sortTiles(s); return ss[0].suit === suit && ss[0].value === 1;
    });
    const has456 = decomp.sequences.some(s => {
      const ss = sortTiles(s); return ss[0].suit === suit && ss[0].value === 4;
    });
    const has789 = decomp.sequences.some(s => {
      const ss = sortTiles(s); return ss[0].suit === suit && ss[0].value === 7;
    });
    if (has123 && has456 && has789) {
      return { name: 'Ittsu (suite pure)', han: isOpen ? 1 : 2 };
    }
  }
  return null;
}

function checkToitoi(decomp: Decomposition): boolean {
  return !!decomp && decomp.sequences.length === 0 && decomp.triplets.length === 4;
}

function checkSananko(decomp: Decomposition, isTsumo: boolean, winTile: Tile): boolean {
  if (!decomp) return false;
  let concealed = 0;
  for (const trip of decomp.triplets) {
    // si gagné par ron et la tuile gagnante finit ce triplet, il est considéré ouvert
    const finishesThisTriplet = trip.some(t => tilesEqual(t, winTile));
    if (isTsumo || !finishesThisTriplet) concealed++;
  }
  return concealed >= 3;
}

function checkChanta(decomp: Decomposition, isOpen: boolean): YakuResult | null {
  if (!decomp) return null;
  const allSets: Tile[][] = [...decomp.sequences, ...decomp.triplets, decomp.pair];
  const allHaveTermOrHonour = allSets.every(set => set.some(isTerminalOrHonour));
  const hasHonour = [...decomp.sequences.flat(), ...decomp.triplets.flat(), ...decomp.pair].some(isHonour);
  const hasSequence = decomp.sequences.length > 0;
  if (allHaveTermOrHonour && hasHonour && hasSequence) {
    return { name: 'Chanta (mi-terminal)', han: isOpen ? 1 : 2 };
  }
  return null;
}

function checkHonitsu(tiles: Tile[], isOpen: boolean): YakuResult | null {
  const suits = new Set(tiles.filter(t => !isHonour(t)).map(t => t.suit));
  const hasHonour = tiles.some(isHonour);
  if (suits.size === 1 && hasHonour) {
    return { name: 'Honitsu (demi-couleur)', han: isOpen ? 2 : 3 };
  }
  return null;
}

function checkChinitsu(tiles: Tile[], isOpen: boolean): YakuResult | null {
  const hasHonour = tiles.some(isHonour);
  const suits = new Set(tiles.map(t => t.suit));
  if (!hasHonour && suits.size === 1) {
    return { name: 'Chinitsu (couleur pure)', han: isOpen ? 5 : 6 };
  }
  return null;
}

function checkDragonTriplet(decomp: Decomposition): YakuResult[] {
  if (!decomp) return [];
  const results: YakuResult[] = [];
  for (const trip of decomp.triplets) {
    if (trip[0].suit === 'dragon') {
      results.push({ name: `Yakuhai dragon (${trip[0].value})`, han: 1 });
    }
  }
  return results;
}

function checkWindTriplets(decomp: Decomposition, seatWind: number, roundWind: number): YakuResult[] {
  if (!decomp) return [];
  const results: YakuResult[] = [];
  for (const trip of decomp.triplets) {
    if (trip[0].suit === 'wind') {
      if (trip[0].value === seatWind) results.push({ name: 'Yakuhai vent de place', han: 1 });
      if (trip[0].value === roundWind) results.push({ name: 'Yakuhai vent du tour', han: 1 });
    }
  }
  return results;
}

function checkHonroto(decomp: Decomposition): boolean {
  if (!decomp) return false;
  const all = [...decomp.sequences.flat(), ...decomp.triplets.flat(), ...decomp.pair];
  return all.every(isTerminalOrHonour);
}

function checkShosangen(decomp: Decomposition): boolean {
  if (!decomp) return false;
  const dragonTrips = decomp.triplets.filter(t => t[0].suit === 'dragon').length;
  const dragonPair = decomp.pair[0].suit === 'dragon';
  return dragonTrips === 2 && dragonPair;
}

function checkRyanpeiko(decomp: Decomposition, isOpen: boolean): boolean {
  if (!decomp || isOpen || decomp.sequences.length < 4) return false;
  const seqs = decomp.sequences.map(s => sortTiles(s));
  let pairs = 0;
  const used = new Set<number>();
  for (let i = 0; i < seqs.length; i++) {
    if (used.has(i)) continue;
    for (let j = i + 1; j < seqs.length; j++) {
      if (used.has(j)) continue;
      if (seqs[i].every((t, k) => tilesEqual(t, seqs[j][k]))) {
        pairs++;
        used.add(i);
        used.add(j);
        break;
      }
    }
  }
  return pairs === 2;
}

function checkJunchan(decomp: Decomposition, isOpen: boolean): YakuResult | null {
  if (!decomp) return null;
  const allSets: Tile[][] = [...decomp.sequences, ...decomp.triplets, decomp.pair];
  const allHaveTerminal = allSets.every(set => set.some(isTerminal));
  const hasSequence = decomp.sequences.length > 0;
  const noHonour = allSets.flat().every(t => !isHonour(t));
  if (allHaveTerminal && hasSequence && noHonour) {
    return { name: 'Junchan (terminal complet)', han: isOpen ? 2 : 3 };
  }
  return null;
}

// --- Calcul principal ---

export function calcHan(
  hand: Hand,
  seatWind: number = 1,
  roundWind: number = 1
): YakuResult[] {
  const allTiles = [...hand.tiles, hand.winTile];
  const yaku: YakuResult[] = [];

  // Mains spéciales
  if (isThirteenOrphans(allTiles)) {
    return [{ name: 'Kokushi Musou (treize orphelins)', han: 13 }];
  }
  if (isSevenPairs(allTiles)) {
    const results: YakuResult[] = [{ name: 'Chiitoitsu (sept paires)', han: 2 }];
    if (hand.isRiichi) results.push({ name: 'Riichi', han: 1 });
    if (hand.isTsumo) results.push({ name: 'Menzen Tsumo', han: 1 });
    return results;
  }

  // Riichi / Tsumo
  if (hand.isRiichi) yaku.push({ name: 'Riichi', han: 1 });
  if (hand.isTsumo && !hand.isOpen) yaku.push({ name: 'Menzen Tsumo', han: 1 });

  // Décompositions possibles
  const decomps = findDecompositions(allTiles);
  if (decomps.length === 0) return yaku;

  // Évalue chaque décomposition et garde la plus haute
  let bestYaku: YakuResult[] = [];
  let bestTotal = 0;

  for (const decomp of decomps) {
    const current: YakuResult[] = [];

    if (checkTanyao(decomp)) current.push({ name: 'Tanyao (toutes simples)', han: 1 });
    if (checkPinfu(decomp, hand.winTile, hand.isOpen)) current.push({ name: 'Pinfu', han: 1 });
    if (checkIipeiko(decomp, hand.isOpen)) current.push({ name: 'Iipeiko (double suite)', han: 1 });
    if (checkToitoi(decomp)) current.push({ name: 'Toitoi (tout triplets)', han: 2 });
    if (checkSananko(decomp, hand.isTsumo, hand.winTile)) current.push({ name: 'San\'anko (3 triplets cachés)', han: 2 });
    if (checkShosangen(decomp)) current.push({ name: 'Shosangen (petits 3 dragons)', han: 2 });

    const sanshoku = checkSanshokuDojun(decomp, hand.isOpen);
    if (sanshoku) current.push(sanshoku);

    const ittsuu = checkIttsuu(decomp, hand.isOpen);
    if (ittsuu) current.push(ittsuu);

    const chanta = checkChanta(decomp, hand.isOpen);
    if (chanta) current.push(chanta);

    const junchan = checkJunchan(decomp, hand.isOpen);
    if (junchan) current.push(junchan);

    current.push(...checkDragonTriplet(decomp));
    current.push(...checkWindTriplets(decomp, seatWind, roundWind));

    if (checkHonroto(decomp)) {
      current.push({ name: 'Honroto (terminaux/honneurs)', han: 2 });
    }

    if (checkRyanpeiko(decomp, hand.isOpen)) {
      current.push({ name: 'Ryanpeiko (double double suite)', han: 3 });
    }

    const total = current.reduce((s, y) => s + y.han, 0);
    if (total > bestTotal) {
      bestTotal = total;
      bestYaku = current;
    }
  }

  // Honitsu / Chinitsu (indépendant de la décomposition)
  const chinitsu = checkChinitsu(allTiles, hand.isOpen);
  const honitsu = checkHonitsu(allTiles, hand.isOpen);
  if (chinitsu) bestYaku.push(chinitsu);
  else if (honitsu) bestYaku.push(honitsu);

  yaku.push(...bestYaku);
  return yaku;
}
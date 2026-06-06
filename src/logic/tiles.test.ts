import { Tile, Hand } from './tiles';

test('une tuile est valide', () => {
  const tile: Tile = { suit: 'man', value: 1 };
  expect(tile.suit).toBe('man');
  expect(tile.value).toBe(1);
});

test('une main a 14 tuiles', () => {
  const hand: Hand = {
    tiles: Array(13).fill({ suit: 'pin', value: 2 }),
    winTile: { suit: 'pin', value: 2 },
    isTsumo: true,
    isOpen: false,
    isRiichi: false,
  };
  expect(hand.tiles.length + 1).toBe(14);
});
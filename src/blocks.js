// Block IDs
export const BLOCK = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, WOOD: 4, LEAVES: 5,
  SAND: 6, WATER: 7, BEDROCK: 8, COAL_ORE: 9, IRON_ORE: 10,
  GOLD_ORE: 11, DIAMOND_ORE: 12, PLANKS: 13, GLASS: 14,
  GRAVEL: 15, COBBLESTONE: 16, TORCH: 17, CRAFTING: 18, FURNACE: 19,
  CHEST: 20, SNOW: 21, ICE: 22, CLAY: 23, LOG2: 24, LEAVES2: 25,
  WOOL_WHITE: 26, WOOL_RED: 27, WOOL_BLUE: 28, WOOL_GREEN: 29,
};

// Tile position in 16x16 atlas [col, row]
const T = {
  grass_top:   [0, 0], dirt:        [1, 0], grass_side:  [2, 0],
  stone:       [3, 0], log_top:     [4, 0], log_side:    [5, 0],
  leaves:      [6, 0], sand:        [7, 0], water:       [8, 0],
  bedrock:     [9, 0], coal_ore:    [10,0], iron_ore:    [11,0],
  gold_ore:    [12,0], diamond_ore: [13,0], planks:      [14,0],
  glass:       [15,0],
  gravel:      [0, 1], cobble:      [1, 1], torch:       [2, 1],
  crafting_top:[3, 1], crafting_side:[4,1], furnace_front:[5,1],
  furnace_side:[6, 1], snow:        [7, 1], ice:         [8, 1],
  clay:        [9, 1], wool_white:  [10,1], wool_red:    [11,1],
  wool_blue:   [12,1], wool_green:  [13,1], leaves2:     [14,1],
  log2_side:   [15,1], log2_top:    [0, 2],
};

export const BLOCK_DATA = {
  [BLOCK.AIR]:       { name:'Air',      transparent:true,  solid:false },
  [BLOCK.GRASS]:     { name:'Grass',    transparent:false, solid:true,  top:T.grass_top, side:T.grass_side, bottom:T.dirt,     hardness:0.6, tool:'shovel', drop:BLOCK.DIRT },
  [BLOCK.DIRT]:      { name:'Dirt',     transparent:false, solid:true,  top:T.dirt,      side:T.dirt,       bottom:T.dirt,     hardness:0.5, tool:'shovel' },
  [BLOCK.STONE]:     { name:'Stone',    transparent:false, solid:true,  top:T.stone,     side:T.stone,      bottom:T.stone,    hardness:1.5, tool:'pickaxe', drop:BLOCK.COBBLESTONE },
  [BLOCK.WOOD]:      { name:'Oak Log',  transparent:false, solid:true,  top:T.log_top,   side:T.log_side,   bottom:T.log_top,  hardness:2.0, tool:'axe' },
  [BLOCK.LEAVES]:    { name:'Leaves',   transparent:true,  solid:true,  top:T.leaves,    side:T.leaves,     bottom:T.leaves,   hardness:0.2, tool:'shears', drop:null },
  [BLOCK.SAND]:      { name:'Sand',     transparent:false, solid:true,  top:T.sand,      side:T.sand,       bottom:T.sand,     hardness:0.5, tool:'shovel', gravity:true },
  [BLOCK.WATER]:     { name:'Water',    transparent:true,  solid:false, top:T.water,     side:T.water,      bottom:T.water,    hardness:-1, liquid:true },
  [BLOCK.BEDROCK]:   { name:'Bedrock',  transparent:false, solid:true,  top:T.bedrock,   side:T.bedrock,    bottom:T.bedrock,  hardness:-1 },
  [BLOCK.COAL_ORE]:  { name:'Coal Ore', transparent:false, solid:true,  top:T.coal_ore,  side:T.coal_ore,   bottom:T.coal_ore, hardness:3.0, tool:'pickaxe' },
  [BLOCK.IRON_ORE]:  { name:'Iron Ore', transparent:false, solid:true,  top:T.iron_ore,  side:T.iron_ore,   bottom:T.iron_ore, hardness:3.0, tool:'pickaxe' },
  [BLOCK.GOLD_ORE]:  { name:'Gold Ore', transparent:false, solid:true,  top:T.gold_ore,  side:T.gold_ore,   bottom:T.gold_ore, hardness:3.0, tool:'pickaxe' },
  [BLOCK.DIAMOND_ORE]:{ name:'Diamond', transparent:false, solid:true,  top:T.diamond_ore,side:T.diamond_ore,bottom:T.diamond_ore,hardness:3.0, tool:'pickaxe' },
  [BLOCK.PLANKS]:    { name:'Planks',   transparent:false, solid:true,  top:T.planks,    side:T.planks,     bottom:T.planks,   hardness:2.0, tool:'axe' },
  [BLOCK.GLASS]:     { name:'Glass',    transparent:true,  solid:true,  top:T.glass,     side:T.glass,      bottom:T.glass,    hardness:0.3 },
  [BLOCK.GRAVEL]:    { name:'Gravel',   transparent:false, solid:true,  top:T.gravel,    side:T.gravel,     bottom:T.gravel,   hardness:0.6, tool:'shovel', gravity:true },
  [BLOCK.COBBLESTONE]:{ name:'Cobblestone',transparent:false,solid:true,top:T.cobble,   side:T.cobble,     bottom:T.cobble,   hardness:2.0, tool:'pickaxe' },
  [BLOCK.TORCH]:     { name:'Torch',    transparent:true,  solid:false, top:T.torch,     side:T.torch,      bottom:T.torch,    hardness:0.0, light:14 },
  [BLOCK.CRAFTING]:  { name:'Crafting', transparent:false, solid:true,  top:T.crafting_top,side:T.crafting_side,bottom:T.planks,hardness:2.5,tool:'axe' },
  [BLOCK.FURNACE]:   { name:'Furnace',  transparent:false, solid:true,  top:T.stone,     side:T.furnace_side,bottom:T.stone,   hardness:3.5, tool:'pickaxe' },
  [BLOCK.CHEST]:     { name:'Chest',    transparent:false, solid:true,  top:T.planks,    side:T.planks,     bottom:T.planks,   hardness:2.5, tool:'axe' },
  [BLOCK.SNOW]:      { name:'Snow',     transparent:false, solid:true,  top:T.snow,      side:T.snow,       bottom:T.snow,     hardness:0.2, tool:'shovel' },
  [BLOCK.ICE]:       { name:'Ice',      transparent:true,  solid:true,  top:T.ice,       side:T.ice,        bottom:T.ice,      hardness:0.5, tool:'pickaxe' },
  [BLOCK.CLAY]:      { name:'Clay',     transparent:false, solid:true,  top:T.clay,      side:T.clay,       bottom:T.clay,     hardness:0.6, tool:'shovel' },
  [BLOCK.LOG2]:      { name:'Birch Log',transparent:false, solid:true,  top:T.log2_top,  side:T.log2_side,  bottom:T.log2_top, hardness:2.0, tool:'axe' },
  [BLOCK.LEAVES2]:   { name:'Birch Leaves',transparent:true,solid:true, top:T.leaves2,   side:T.leaves2,    bottom:T.leaves2,  hardness:0.2, tool:'shears', drop:null },
  [BLOCK.WOOL_WHITE]:{ name:'White Wool',transparent:false,solid:true,  top:T.wool_white,side:T.wool_white,  bottom:T.wool_white,hardness:0.8 },
  [BLOCK.WOOL_RED]:  { name:'Red Wool', transparent:false, solid:true,  top:T.wool_red,  side:T.wool_red,   bottom:T.wool_red,  hardness:0.8 },
  [BLOCK.WOOL_BLUE]: { name:'Blue Wool',transparent:false, solid:true,  top:T.wool_blue, side:T.wool_blue,  bottom:T.wool_blue, hardness:0.8 },
  [BLOCK.WOOL_GREEN]:{ name:'Green Wool',transparent:false,solid:true,  top:T.wool_green,side:T.wool_green,  bottom:T.wool_green,hardness:0.8 },
};

export function isTransparent(blockId) {
  const d = BLOCK_DATA[blockId];
  return !d || d.transparent;
}
export function isSolid(blockId) {
  const d = BLOCK_DATA[blockId];
  return d && d.solid;
}
export function isLiquid(blockId) {
  const d = BLOCK_DATA[blockId];
  return d && d.liquid;
}

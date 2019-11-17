import DungeonFactory from "dungeon-factory";

import Tile, { TileType } from "./Tile";
import Slime from "./Slime";
import Graphics from "../assets/Graphics";

interface DungeonFactoryOutput {
  tiles: { type: string }[][];
  rooms: { height: number; width: number; x: number; y: number }[];
}

export default class Map {
  public readonly tiles: Tile[][];
  public readonly width: number;
  public readonly height: number;
  public readonly tilemap: Phaser.Tilemaps.Tilemap;
  public readonly wallLayer: Phaser.Tilemaps.StaticTilemapLayer;

  public readonly startingX: number;
  public readonly startingY: number;

  public readonly slimes: Slime[];

  constructor(width: number, height: number, scene: Phaser.Scene) {
    const dungeon = DungeonFactory.generate({
      width: width,
      height: height
    }) as DungeonFactoryOutput;

    this.width = width;
    this.height = height;

    this.tiles = [];
    for (let y = 0; y < height; y++) {
      this.tiles.push([]);
      for (let x = 0; x < width; x++) {
        this.tiles[y][x] = new Tile(
          dungeon.tiles[x][y].type === "wall" ? TileType.Wall : TileType.None,
          x,
          y,
          this
        );
      }
    }

    const toReset = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = this.tiles[y][x];
        if (tile.type === TileType.Wall && tile.isEnclosed()) {
          toReset.push({ y: y, x: x });
        }
      }
    }

    toReset.forEach(d => {
      this.tiles[d.y][d.x] = new Tile(TileType.None, d.x, d.y, this);
    });

    const roomNumber = Math.floor(Math.random() * dungeon.rooms.length);

    const firstRoom = dungeon.rooms[roomNumber];
    this.startingX = Math.floor(firstRoom.x + firstRoom.width / 2);
    this.startingY = Math.floor(firstRoom.y + firstRoom.height / 2);

    this.tilemap = scene.make.tilemap({
      tileWidth: Graphics.environment.width,
      tileHeight: Graphics.environment.height,
      width: width,
      height: height
    });

    const dungeonTiles = this.tilemap.addTilesetImage(
      Graphics.environment.name
    );

    const groundLayer = this.tilemap
      .createBlankDynamicLayer("Ground", dungeonTiles, 0, 0)
      .randomize(
        0,
        0,
        this.width,
        this.height,
        Graphics.environment.indices.floor.outer
      );
    const wallLayer = this.tilemap.createBlankDynamicLayer(
      "Wall",
      dungeonTiles,
      0,
      0
    );

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const tile = this.tiles[y][x];
        if (tile.type === TileType.Wall) {
          wallLayer.putTileAt(tile.wallIndex(), x, y);
        }
      }
    }
    wallLayer.setCollisionBetween(0, 256);
    this.wallLayer = this.tilemap.convertLayerToStatic(wallLayer);

    this.slimes = [];

    for (let room of dungeon.rooms) {
      if (room.height < 4 || room.width < 4) {
        continue;
      }

      const roomTL = this.tilemap.tileToWorldXY(room.x + 1, room.y + 1);
      const roomBounds = this.tilemap.tileToWorldXY(
        room.x + room.width - 1,
        room.y + room.height - 1
      );
      const numSlimes = Phaser.Math.Between(1, 3);
      for (let i = 0; i < numSlimes; i++) {
        this.slimes.push(
          new Slime(
            Phaser.Math.Between(roomTL.x, roomBounds.x),
            Phaser.Math.Between(roomTL.y, roomBounds.y),
            scene
          )
        );
      }
    }

    // TODO
    // this.tilemap.convertLayerToStatic(groundLayer);
  }

  tileAt(x: number, y: number): Tile | null {
    if (y < 0 || y >= this.height || x < 0 || x >= this.width) {
      return null;
    }
    return this.tiles[y][x];
  }
}

import * as THREE from 'three'
import {Vec3} from './Vec3'
import {Point3d} from './Point3d'
import {Mesh} from './Mesh'
import {Cell} from './Cell'

// Matches the edge sets defined in Cell.Draw()
const EDGE_SETS = [[0,1,5,4], [2,3,7,6], [0,3], [1,2], [4,7], [5,6]];

export class Scaffold {

    Grid: Cell[] = [];
    Cells: Cell[] = [];
    U: number = 100;
    V: number = 100;
    W: number = 10;
    ControlPoints: Point3d[] = [];
    Address: number[][] = [];
    CellAttractors: Point3d[] = [];
    SpaceAttractors: Point3d[] = [];
    EdgeLines: THREE.Line[] = [];
    EdgeLinesByCell: THREE.Line[][] = [];
    CntrlSpheres: THREE.Mesh[] = [];
    Tiles: THREE.Mesh[] = [];

    constructor(cells: Cell[]){
        this.Grid = [];
        this.Cells = cells;
        this.ControlPoints = [];
        this.Address = [];
        this.CellAttractors= [];
        this.SpaceAttractors = [];
    }

    static createFromGrid(U: number, V: number, W: number, dimU: number, dimV: number, dimW: number, cells: Cell[]): Scaffold{

        let scaffold = new Scaffold(cells);
        let gridPts: Point3d[][][] = [];
        let address: number[][][] = [];

        for(let i = 0; i < U; i++){
            let cols: Point3d[][] = [];
            let colAddress: number[][] = [];
            let x = i * dimU / (U - 1);
            for(let j = 0; j < V; j++){
                let z = j * dimV / (V - 1);
                let row: Point3d[] = [];
                let rowAddress: number[] = [];
                for(let k = 0; k < W; k++){
                    let y = k * dimW / (W - 1);
                    const pt = new Point3d(x, y, z);
                    row.push(pt);
                    rowAddress.push(scaffold.ControlPoints.length);
                    scaffold.ControlPoints.push(pt);  // same instance as gridPts
                }
                cols.push(row);
                colAddress.push(rowAddress);
            }
            gridPts.push(cols);
            address.push(colAddress);
        }

        for(let i = 0; i < U - 1; i++){
            for(let j = 0; j < V - 1; j++){
                for(let k = 0; k < W - 1; k++){
                    scaffold.Address.push([
                        address[i][j][k],
                        address[i][j+1][k],
                        address[i+1][j+1][k],
                        address[i+1][j][k],
                        address[i][j][k+1],
                        address[i][j+1][k+1],
                        address[i+1][j+1][k+1],
                        address[i+1][j][k+1],
                    ]);

                    // CCW ordering: [C0,C1,C2,C3,C4,C5,C6,C7]
                    // i→X, j→Z, k→Y in the Point3d constructor
                    scaffold.Grid.push(new Cell([
                        gridPts[i][j][k],       // C0: minX minY minZ
                        gridPts[i][j+1][k],     // C1: minX minY maxZ
                        gridPts[i+1][j+1][k],   // C2: maxX minY maxZ
                        gridPts[i+1][j][k],     // C3: maxX minY minZ
                        gridPts[i][j][k+1],     // C4: minX maxY minZ
                        gridPts[i][j+1][k+1],   // C5: minX maxY maxZ
                        gridPts[i+1][j+1][k+1], // C6: maxX maxY maxZ
                        gridPts[i+1][j][k+1],   // C7: maxX maxY minZ
                    ]));
                }
            }
        }

        return scaffold;
    }

    AssignBase(cell: Cell){
        if(this.Cells.length == 0) this.Cells.push(cell);
        this.Cells[0] = cell;
        for(let i = 0; i < this.Grid.length; i++){
            this.Grid[i].AssignByCell(cell);
        }
    }

    DrawScaffold(radius: number = 2){
        const edges: THREE.Line[] = [];
        const controlMeshes: THREE.Mesh[] = [];

        for(let i = 0; i < this.ControlPoints.length; i++){
            controlMeshes.push(this.ControlPoints[i].Draw(radius));
        }

        for(let i = 0; i < this.Grid.length; i++){
            const cellEdges = this.Grid[i].Draw(false, true)[0];
            this.EdgeLinesByCell.push(cellEdges);
            edges.push(...cellEdges);
        }

        this.EdgeLines = edges;
        this.CntrlSpheres = controlMeshes;
    }

    Draw(){
        this.Grid.forEach(c => {
            this.Tiles.push(Mesh.BuildThreeMesh(c.Vertices, c.Faces));
        });
    }

    OnControlPointMoved(pt: Point3d): void {
        const ptIdx = this.ControlPoints.indexOf(pt);
        if (ptIdx < 0) return;

        for (let ci = 0; ci < this.Address.length; ci++) {
            if (!this.Address[ci].includes(ptIdx)) continue;

            this.Grid[ci].RefreshVertices();

            // Update tile geometry in-place
            const tile = this.Tiles[ci];
            if (tile) {
                const pos = tile.geometry.attributes.position as THREE.BufferAttribute;
                const verts = this.Grid[ci].Vertices;
                for (let v = 0; v < verts.length; v++) {
                    pos.setXYZ(v, verts[v].x, verts[v].y, verts[v].z);
                }
                pos.needsUpdate = true;
                tile.geometry.computeVertexNormals();
            }

            // Update edge line geometries in-place
            const cellEdges = this.EdgeLinesByCell[ci];
            if (cellEdges) {
                const corners = this.Grid[ci].Corners;
                EDGE_SETS.forEach((edgeSet, li) => {
                    const linePos = cellEdges[li].geometry.attributes.position as THREE.BufferAttribute;
                    edgeSet.forEach((cornerIdx, pi) => {
                        const c = corners[cornerIdx];
                        linePos.setXYZ(pi, c.x, c.y, c.z);
                    });
                    linePos.needsUpdate = true;
                });
            }
        }
    }

}

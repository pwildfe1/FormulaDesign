import * as THREE from 'three'
import {Vec3} from './Vec3'
import {Point3d} from './Point3d'
import {Mesh} from './Mesh'


export class Cell{

    Corners: Point3d[] = [];
    Vertices: Vec3[] = [];
    Faces: number[][] = [];
    UVW: Vec3[] = [];

    constructor(corners: Point3d[]){
        this.Corners = corners;
    }

    static CreateUnitCellXY(): Cell{

        let crns = [];
        crns.push(new Point3d(0, 0, 0));
        crns.push(new Point3d(1, 0, 0));
        crns.push(new Point3d(1, 1, 0));
        crns.push(new Point3d(0, 1, 0));
        crns.push(new Point3d(0, 0, 1));
        crns.push(new Point3d(1, 0, 1));
        crns.push(new Point3d(1, 1, 1));
        crns.push(new Point3d(0, 1, 1));

        return new Cell(crns);
    }

    static CreateUnitCellXZ(): Cell{

        let crns = [];
        crns.push(new Point3d(0, 0, 0));
        crns.push(new Point3d(1, 0, 0));
        crns.push(new Point3d(1, 0, 1));
        crns.push(new Point3d(0, 0, 1));
        crns.push(new Point3d(0, 1, 0));
        crns.push(new Point3d(1, 1, 0));
        crns.push(new Point3d(1, 1, 1));
        crns.push(new Point3d(0, 1, 1));

        return new Cell(crns);
    }

    static CreateWithMesh(mesh: Mesh): Cell{

        let bbox = mesh.GetBoundingBox();
        bbox.Faces = mesh.Faces;
        bbox.Vertices = [];
        bbox.UVW = [];

        mesh.Vertices.forEach(v => {
            let pos = Vec3.SetFromTwoPoints(bbox.Corners[0], v);
            bbox.Vertices.push(pos);
            bbox.UVW.push(bbox.NormalizePoint(pos));
        })

        return bbox;
    }

    AssignMesh(mesh: Mesh, bbox: Cell){
        
        this.Vertices = [];
        this.UVW = [];
        this.Faces = mesh.Faces;
        this.Corners = bbox.Corners;

        mesh.Vertices.forEach(v => {
            let pos = Vec3.SetFromTwoPoints(bbox.Corners[0], v);
            this.Vertices.push(pos);
            this.UVW.push(this.NormalizePoint(pos));
        })

    }

    AssignByCell(cell: Cell){
        this.Faces = cell.Faces;
        cell.Vertices.forEach(v => {
            let uvw = cell.NormalizePoint(v);
            this.UVW.push(uvw);
            this.Vertices.push(this.PlacePoint(uvw));
        })
    }

    PlacePoint(uvw: Vec3): Vec3{

        let u = uvw.x;
        let v = uvw.y;
        let w = uvw.z;

        let xStBot = this.Corners[0].Add(Vec3.SetFromTwoPoints(this.Corners[0], this.Corners[3]).Scale(u));
        let xEnBot = this.Corners[1].Add(Vec3.SetFromTwoPoints(this.Corners[1], this.Corners[2]).Scale(u));

        let xStTop = this.Corners[4].Add(Vec3.SetFromTwoPoints(this.Corners[4], this.Corners[7]).Scale(u));
        let xEnTop = this.Corners[5].Add(Vec3.SetFromTwoPoints(this.Corners[5], this.Corners[6]).Scale(u));

        let ySt = xStBot.Add(Vec3.SetFromTwoPoints(xStBot, xEnBot).Scale(v));
        let yEn = xStTop.Add(Vec3.SetFromTwoPoints(xStTop, xEnTop).Scale(v));

        return ySt.Add(Vec3.SetFromTwoPoints(ySt, yEn).Scale(w));

    }


    NormalizePoint(point: Vec3): Vec3 {
        const rel   = Vec3.SetFromTwoPoints(this.Corners[0], point);

        const edgeU = Vec3.SetFromTwoPoints(this.Corners[0], this.Corners[3]); // C0 → C3 (X)
        const edgeV = Vec3.SetFromTwoPoints(this.Corners[0], this.Corners[1]); // C0 → C1 (Z)
        const edgeW = Vec3.SetFromTwoPoints(this.Corners[0], this.Corners[4]); // C0 → C4 (Y)

        const u = rel.Dot(edgeU) / edgeU.Dot(edgeU);
        const v = rel.Dot(edgeV) / edgeV.Dot(edgeV);
        const w = rel.Dot(edgeW) / edgeW.Dot(edgeW);

        return new Vec3(u, v, w);
    }

    ComputeNormalSpace(){
        
        this.UVW = [];
        this.Vertices.forEach(v => {
            this.UVW.push(this.NormalizePoint(v));
        })

        return this.UVW;

    }

    RefreshVertices(): void {
        for (let i = 0; i < this.UVW.length; i++) {
            this.Vertices[i] = this.PlacePoint(this.UVW[i]);
        }
    }

    Blend(src: Vec3, target: Cell, power: number, threshold: number){
        for(let i = 0; i < this.UVW.length; i++){
            let distance = this.Vertices[i].DistanceTo(src);
            let factor = Math.pow(1 - distance/threshold, power);
            factor = Math.max(0.0, Math.min(1.0, factor));
            let blend = Vec3.SetFromTwoPoints(this.UVW[i], target.UVW[i]).Scale(factor);
            this.UVW[i] = this.UVW[i].Add(blend);
            this.Vertices[i] = this.PlacePoint(this.UVW[i]);
        }
    }

    Draw(points: boolean = true, edges: boolean = true):[THREE.Line[], THREE.Mesh[]]{

        let cntrlPoints: THREE.Mesh[] = []
        
        if (points){
            for(let i = 0; i < this.Corners.length; i++){
                cntrlPoints.push(this.Corners[i].Draw());
            }
        }
        
        let set01 = [0, 1, 5, 4];
        let set02 = [2, 3, 7, 6];
        let set03 = [0, 3];
        let set04 = [1, 2];
        let set05 = [4, 7];
        let set06 = [5, 6];

        let edgeSets = [set01, set02, set03, set04, set05, set06];
        let polylines: THREE.Line[] = []

        if(edges){
            edgeSets.forEach(e => {
                let pointSet: Vec3[] = []
                e.forEach(index => {
                    pointSet.push(this.Corners[index]);
                })
                polylines.push(Vec3.DrawLines(pointSet));
            })
        }

        return [polylines, cntrlPoints];

    }

}
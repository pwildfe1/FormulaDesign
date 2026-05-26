import * as THREE from 'three'
import { Vec3 } from './Vec3.ts'
import { Point3d } from './Point3d.ts';
import { Cell } from './Cell.ts'

export class Mesh{

    ThreeMesh: THREE.Mesh = new THREE.Mesh();
    Vertices: Vec3[] = [];
    Faces: number[][] = [];
    Normals: Vec3[] = [];

    constructor(mesh: THREE.Mesh){

        this.ThreeMesh = mesh;
        let vertices = this.ThreeMesh.geometry.attributes.position.array;
        let normals = this.ThreeMesh.geometry.attributes.normal.array;
        let faces = this.ThreeMesh.geometry.index?.array!;

        const worldPos = new THREE.Vector3();
        const worldNormal = new THREE.Vector3();
        for(let i = 0; i < vertices.length - 2; i++){
            if (i % 3 == 0){
                worldPos.set(vertices[i], vertices[i+1], vertices[i+2]);
                worldPos.applyMatrix4(mesh.matrixWorld);
                this.Vertices.push(new Vec3(worldPos.x, worldPos.y, worldPos.z));

                worldNormal.set(normals[i], normals[i+1], normals[i+2]);
                worldNormal.applyMatrix4(mesh.matrixWorld);
                this.Normals.push(new Vec3(worldNormal.x, worldNormal.y, worldNormal.z));
            }
        }

        for(let i = 0; i < faces.length - 2; i++){
            if (i % 3 == 0){
                this.Faces.push([faces[i], faces[i+1], faces[i+2]]);
            }
        }
    }

    static BuildThreeMesh(vertices: Vec3[], faces: number[][]): THREE.Mesh {
        const posArray = new Float32Array(vertices.length * 3);
        for (let i = 0; i < vertices.length; i++) {
            posArray[i * 3]     = vertices[i].x;
            posArray[i * 3 + 1] = vertices[i].y;
            posArray[i * 3 + 2] = vertices[i].z;
        }

        const indexArray = new Uint32Array(faces.length * 3);
        for (let i = 0; i < faces.length; i++) {
            indexArray[i * 3]     = faces[i][0];
            indexArray[i * 3 + 1] = faces[i][1];
            indexArray[i * 3 + 2] = faces[i][2];
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        geometry.setIndex(new THREE.BufferAttribute(indexArray, 1));
        geometry.computeVertexNormals();

        return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide }));
    }

    GetBoundingBox(): Cell{
        let minX = Infinity,  minY = Infinity,  minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        for (const v of this.Vertices) {
            if (v.x < minX) minX = v.x;
            if (v.y < minY) minY = v.y;
            if (v.z < minZ) minZ = v.z;
            if (v.x > maxX) maxX = v.x;
            if (v.y > maxY) maxY = v.y;
            if (v.z > maxZ) maxZ = v.z;
        }

        // Bottom face (minY), CCW from bottom-left: corners 0–3
        // Top face (maxY), same XZ layout:          corners 4–7
        return new Cell([
            new Point3d(minX, minY, minZ), // 0: bottom-left-front
            new Point3d(minX, minY, maxZ), // 1: bottom-left-back
            new Point3d(maxX, minY, maxZ), // 2: bottom-right-back
            new Point3d(maxX, minY, minZ), // 3: bottom-right-front
            new Point3d(minX, maxY, minZ), // 4: top-left-front
            new Point3d(minX, maxY, maxZ), // 5: top-left-back
            new Point3d(maxX, maxY, maxZ), // 6: top-right-back
            new Point3d(maxX, maxY, minZ), // 7: top-right-front
        ]);
    }

    FormCell(): Cell {
        let bbox = this.GetBoundingBox();
        bbox.Vertices = [...this.Vertices];
        bbox.Faces    = [...this.Faces];
        return bbox;
    }

}
import * as THREE from 'three'
import {Vec3} from './Vec3'

export class Plane {

    normal : Vec3;
    origin : Vec3;
    xAxis: Vec3;
    yAxis: Vec3;

    private constructor(Origin: Vec3, Normal: Vec3){
        this.origin = Origin;
        this.normal = Normal;

        let test = new Vec3(0.0, 1.0, 0.0);
        if(Math.abs(this.normal.Dot(test)) > 0.95){
            test = new Vec3(1.0, 0.0, 0.0);
        }

        this.xAxis = this.normal.Cross(test).Unitize();
        this.yAxis = this.xAxis.Cross(this.normal).Unitize();
    }

    static fromAllAxi(Origin: Vec3, Normal: Vec3, XAxis: Vec3, YAxis: Vec3){
        let pl = new Plane(Origin, Normal);
        pl.xAxis = XAxis;
        pl.yAxis = YAxis;
        return pl;
    }

    static fromNormal(Origin: Vec3, Normal: Vec3){
        return new Plane(Origin, Normal);
    }

    static fromEquation(A: number, B: number, C: number, D: number){
        let n = new Vec3(A, B, C);
        let o = n.Scale(D);
        return new Plane(o, n);
    }

    static fromXY(O: Vec3, X: Vec3, Y: Vec3){
        let n = X.Cross(Y).Unitize();
        let pl = new Plane(O, n);
        pl.xAxis = X.Unitize();
        pl.yAxis = Y.Unitize();
        return pl;
    }

    static fromThreePoints(o: Vec3, p02: Vec3, p03: Vec3){

        let x = Vec3.SetFromTwoPoints(o, p02);
        let y = Vec3.SetFromTwoPoints(o, p03);
        let n = x.Cross(y);

        let pl = new Plane(o, n);
        pl.xAxis = x;

        return pl;
    }

    static FitFromPoints(points: Vec3[], seed_count: number = 50, max_iter: number = 1000, decay: number = 0.001, step: number = 0.2){

        let center = new Vec3(0.0, 0.0, 0.0);
        points.forEach(p => {
            center = center.Add(p);
        })
        center = center.Scale(1 / points.length);
        let seeds : Vec3[] = [];

        for(let i = 0; i < seed_count ; i++){
            let seed = new Vec3(Math.random(), Math.random(), Math.random());
            seed = seed.Unitize();
            seeds.push(seed);
        }

        let best_index = 0;
        let best = seeds[best_index];
        let continuity = 0;

        for(let n = 0; n < max_iter; n++){

            let scores = [];
            let order = [];

            for(let i = 0; i < seeds.length; i++){

                let plane = Plane.fromNormal(center, seeds[i]);
                let score = 0;
                for(let j = 0; j < points.length; j++){
                    score += Math.abs(plane.ClosestPoint(points[j]).DistanceTo(points[j]));
                }
                scores.push(score);
                order.push(i);
                
            }

            // Sort values by the order of keys when keys are sorted
            const sorted = scores
                .map((score, i) => ({ score, value: order[i] }))
                .sort((a, b) => (a.score - b.score))
                .map(pair => pair.value);
            
            let new_seeds: Vec3[] = []

            for (let i = 0; i < sorted.length; i++) {
                let idx = sorted[i]; // not order[i]
                if (i == 0){
                    new_seeds.push(seeds[idx]);
                }
                if (i > 0 && i < Math.floor(seed_count / 2)){
                    let mut_x = seeds[idx].x + 2 * (0.5 - Math.random()) * step;
                    let mut_y = seeds[idx].y + 2 * (0.5 - Math.random()) * step;
                    let mut_z = seeds[idx].z + 2 * (0.5 - Math.random()) * step;
                    let seed = new Vec3(mut_x, mut_y, mut_z);
                    seed = seed.Unitize();
                    new_seeds.push(seed);
                }
                if (i > Math.floor(seed_count / 2)){
                    let seed = new Vec3(Math.random(), Math.random(), Math.random());
                    seed = seed.Unitize();
                    new_seeds.push(seed);
                }
            }

            if (best_index === order[0]){
                continuity++;
            }

            if (continuity > 100){
                break;
            }

            best_index = sorted[0];
            best = new_seeds[0];
            seeds = new_seeds;
            step = step * (1 - decay)

        }
        
        return new Plane(center, best);

    }

    VisualizePlane(scene: THREE.Scene, size: number): THREE.Mesh{

        const normal = new THREE.Vector3(this.normal.x, this.normal.y, this.normal.z).normalize();
        const planeMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size),
        new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
        );
        planeMesh.position.set(this.origin.x, this.origin.y, this.origin.z);
        planeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
        scene.add(planeMesh);

        return planeMesh;
    } 

    ClosestPoint(p: Vec3): Vec3{
        let vector = Vec3.SetFromTwoPoints(this.origin, p);
        let output = p.Add(this.normal.Scale(-vector.Dot(this.normal)));
        return output;
    }

    /**
     * Transforms a mesh's geometry from one coordinate frame to another by baking
     * the transformation directly into the position and normal buffer attributes.
     *
     * The "from" frame is defined by an origin and three axes (need not be
     * pre-normalised).  The "to" frame defaults to World XYZ (origin at 0,0,0).
     *
     * Works on any THREE.Mesh — Scan meshes, landmark spheres, plane visualisations, etc.
     */
    static PlaneToPlaneTransform(
        mesh: THREE.Mesh,
        fromOrigin: Vec3,
        fromX: Vec3,
        fromY: Vec3,
        fromZ: Vec3,
        toOrigin: Vec3 = new Vec3(0, 0, 0),
        toX: Vec3     = new Vec3(1, 0, 0),
        toY: Vec3     = new Vec3(0, 1, 0),
        toZ: Vec3     = new Vec3(0, 0, 1)
    ): void {

        // Build the "from" frame matrix  (local → world)
        const fromXn = new THREE.Vector3(fromX.x, fromX.y, fromX.z).normalize();
        const fromYn = new THREE.Vector3(fromY.x, fromY.y, fromY.z).normalize();
        const fromZn = new THREE.Vector3(fromZ.x, fromZ.y, fromZ.z).normalize();

        const fromMatrix = new THREE.Matrix4();
        fromMatrix.makeBasis(fromXn, fromYn, fromZn);
        fromMatrix.setPosition(fromOrigin.x, fromOrigin.y, fromOrigin.z);

        // Build the "to" frame matrix  (local → world)
        const toXn = new THREE.Vector3(toX.x, toX.y, toX.z).normalize();
        const toYn = new THREE.Vector3(toY.x, toY.y, toY.z).normalize();
        const toZn = new THREE.Vector3(toZ.x, toZ.y, toZ.z).normalize();

        const toMatrix = new THREE.Matrix4();
        toMatrix.makeBasis(toXn, toYn, toZn);
        toMatrix.setPosition(toOrigin.x, toOrigin.y, toOrigin.z);

        // Combined: fromFrame → world → toFrame
        // = toMatrix * fromMatrix^(-1)
        const transform = toMatrix.clone().multiply(fromMatrix.clone().invert());

        // Transform positions
        const posAttr = mesh.geometry.attributes.position;
        const v = new THREE.Vector3();
        for (let i = 0; i < posAttr.count; i++) {
            v.fromBufferAttribute(posAttr, i);
            v.applyMatrix4(transform);
            posAttr.setXYZ(i, v.x, v.y, v.z);
        }
        posAttr.needsUpdate = true;

        // Transform normals using the normal matrix (inverse-transpose of rotation)
        const normalAttr = mesh.geometry.attributes.normal;
        if (normalAttr) {
            const normalMatrix = new THREE.Matrix3().getNormalMatrix(transform);
            const n = new THREE.Vector3();
            for (let i = 0; i < normalAttr.count; i++) {
                n.fromBufferAttribute(normalAttr, i);
                n.applyMatrix3(normalMatrix).normalize();
                normalAttr.setXYZ(i, n.x, n.y, n.z);
            }
            normalAttr.needsUpdate = true;
        }

        mesh.geometry.computeBoundingBox();
        mesh.geometry.computeBoundingSphere();
    }


    RelativeCoordinates(point: Vec3){
        let pos = Vec3.SetFromTwoPoints(this.origin, point);
        return new Vec3(pos.Dot(this.xAxis), pos.Dot(this.yAxis), pos.Dot(this.normal));
    }

}
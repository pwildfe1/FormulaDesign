import * as THREE from 'three';


export class Vec3{

    x: number;
    y: number;
    z: number;


    private length: number;

    constructor(X: number, Y: number, Z: number){
        this.x = X;
        this.y = Y;
        this.z = Z;
        this.length = Math.pow(Math.pow(X, 2) + Math.pow(Y, 2) + Math.pow(Z, 2), 0.5); 
    }

    static SetFromTwoPoints(st: Vec3, en: Vec3): Vec3{
        return new Vec3(en.x - st.x, en.y - st.y, en.z - st.z);
    }

    GetLength(): number{
        this.length = Math.pow(Math.pow(this.x, 2) + Math.pow(this.y, 2) + Math.pow(this.z, 2), 0.5);
        return this.length;
    }

    Unitize(): Vec3{
        let length = this.GetLength();
        let x = this.x/length;
        let y = this.y/length;
        let z = this.z/length;

        return new Vec3(x, y, z);
    }

    Dot(vec: Vec3): number{

        return vec.x * this.x + vec.y * this.y + vec.z * this.z;

    }

    Cross(vec: Vec3): Vec3 {
        
        let x = this.y * vec.z - this.z * vec.y;
        let y = this.z * vec.x - this.x * vec.z;
        let z = this.x * vec.y - this.y * vec.x;

        return new Vec3(x, y, z);
    }

    Add(vec: Vec3): Vec3{
        return new Vec3(vec.x + this.x, vec.y + this.y, vec.z + this.z);
    }

    Scale(f: number): Vec3{
        return new Vec3(this.x * f, this.y * f, this.z * f);
    }

    DistanceTo(vec: Vec3): number{
        let result = Vec3.SetFromTwoPoints(this, vec);
        return result.GetLength();
    }

    Align(vec: Vec3): void{
        let dot = this.Dot(vec);
        if(dot < 0){
            this.x = -this.x;
            this.y = -this.y;
            this.z = -this.z;
        }
    }

    static DrawLines(points: Vec3[], color: THREE.ColorRepresentation | null = null): THREE.Line{

        let pts: THREE.Vector3[] = [];

        points.forEach(p => {
            pts.push(new THREE.Vector3(p.x, p.y, p.z));
        })

        // 2. Create geometry and set points
        const geometry = new THREE.BufferGeometry().setFromPoints(pts);

        if (!color) color = 0x00ff00

        // 3. Create material (LineBasicMaterial is standard for 1px lines)
        const material = new THREE.LineBasicMaterial({ color: color });

        // 4. Create the line object and add to your scene
        const polyline = new THREE.Line(geometry, material);

        return polyline;

    }

}
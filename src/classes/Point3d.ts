import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import {Vec3} from './Vec3';


export class Point3d extends Vec3 {

    private static _tc: TransformControls | null = null;
    private static _active: Point3d | null = null;

    Mesh: THREE.Mesh = new THREE.Mesh();
    movable: boolean = false;
    private _onMove: ((pt: Point3d) => void) | null = null;

    // Call once after the scene is ready. Returns the TC object to add to the scene.
    static InitInteraction(
        camera: THREE.Camera,
        domElement: HTMLElement,
        orbitControls: { enabled: boolean }
    ): THREE.Object3D {
        const tc = new TransformControls(camera, domElement);

        tc.addEventListener('objectChange', () => {
            const active = Point3d._active;
            if (!active) return;
            active.x = active.Mesh.position.x;
            active.y = active.Mesh.position.y;
            active.z = active.Mesh.position.z;
            active._onMove?.(active);
        });

        tc.addEventListener('dragging-changed', (e: any) => {
            orbitControls.enabled = !e.value;
        });

        Point3d._tc = tc;
        // r168+: TC is no longer an Object3D itself — add its gizmo helper to the scene
        return (tc as any).getHelper() as THREE.Object3D;
    }

    static Attach(pt: Point3d | null): void {
        Point3d._active = pt;
        if (pt) {
            Point3d._tc?.attach(pt.Mesh);
        } else {
            Point3d._tc?.detach();
        }
    }

    MakeMovable(onMove: (pt: Point3d) => void): this {
        this.movable = true;
        this._onMove = onMove;
        return this;
    }

    Draw(radius: number = 2): THREE.Mesh {
        let sphere = new THREE.SphereGeometry(radius, 10, 10);
        this.Mesh = new THREE.Mesh(sphere, new THREE.MeshBasicMaterial({ color: 0xffffff }));
        this.Mesh.position.set(this.x, this.y, this.z);
        this.Mesh.userData['point3d'] = this;
        return this.Mesh;
    }

    SetHover(active: boolean): void {
        (this.Mesh.material as THREE.MeshBasicMaterial).color.set(active ? 0xff6600 : 0xffffff);
    }

}

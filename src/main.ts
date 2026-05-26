import './style.css'
import * as THREE from 'three'
import {OrbitControls} from 'three/addons/controls/OrbitControls.js'
import {Point3d} from './classes/Point3d.ts'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js'
import {Mesh} from './classes/Mesh.ts'
import {Plane} from './classes/Plane.ts'
import {Vec3} from './classes/Vec3.ts'
import {Cell} from './classes/Cell.ts'
import { floor } from 'three/src/nodes/math/MathNode.js'
import { Scaffold } from './classes/Scaffold.ts'
import structureBaseUrl from './resources/structure_base.ply?url'
import structureThickenUrl from './resources/structure_thicken.ply?url'

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 10000)
camera.position.x = 1000;
camera.position.y = 1000;
camera.position.z = 500;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const size = 100;
const divisions = 10;
const gridHelperXZ = new THREE.GridHelper( size, divisions, new THREE.Color(0, 100, 0));
const gridHelperXY = new THREE.GridHelper( size, divisions, new THREE.Color(0, 100, 0));
const gridHelperZY = new THREE.GridHelper( size, divisions, new THREE.Color(0, 100, 0));

gridHelperXY.rotateZ(Math.PI/2);
gridHelperZY.rotateZ(Math.PI/2);

scene.add( gridHelperXY );
scene.add( gridHelperXZ );
scene.add( gridHelperZY );

const orbitControls = new OrbitControls(camera, renderer.domElement);
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
let cntrlSpheres: THREE.Mesh[] = [];
let hoveredSphere: THREE.Mesh | null = null;

// Lighting (needed for MeshStandardMaterial)
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(1, 2, 3);
scene.add(dirLight);

const loader = new PLYLoader();

function loadPLY(url: string): Promise<THREE.BufferGeometry> {
  return new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

window.addEventListener('mousemove', (e) => {
  mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('mousedown', () => {
  if (hoveredSphere) {
    const pt = hoveredSphere.userData['point3d'] as Point3d;
    if (pt?.movable) Point3d.Attach(pt);
  }
  // No detach on empty-space clicks — TC arrow clicks also land here with hoveredSphere=null
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') Point3d.Attach(null);
})


const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });



async function init() {
  const [geo1, geo2] = await Promise.all([
    loadPLY(structureBaseUrl),
    loadPLY(structureThickenUrl),
  ]);

  let m01 = new Mesh(new THREE.Mesh(geo1, material));
  let m02 = new Mesh(new THREE.Mesh(geo2, material));

  let cell01 = Cell.CreateUnitCellXY();
  let cell02 = Cell.CreateUnitCellXY();

  cell01.AssignMesh(m01, cell01);
  cell02.AssignMesh(m02, cell02);

  let U = 20;
  let V = 20;
  let W = 2;

  let dimU = 200;
  let dimV = 200;
  let dimW = 10;

  let spacetime = Scaffold.createFromGrid(U, V, W, dimU, dimV, dimW, [cell01, cell02]);

  spacetime.DrawScaffold(1);

  let src = new Vec3(0, 0, 0);

  spacetime.AssignBase(cell01);

  for (let i = 0; i < spacetime.Grid.length; i++) {
    spacetime.Grid[i].Blend(src, cell02, 2, 40);
  }

  spacetime.Draw();

  cntrlSpheres = spacetime.CntrlSpheres;
  spacetime.ControlPoints.forEach(pt => pt.MakeMovable(p => spacetime.OnControlPointMoved(p)));

  const tc = Point3d.InitInteraction(camera, renderer.domElement, orbitControls);
  scene.add(tc);

  scene.add(...spacetime.EdgeLines);
  scene.add(...spacetime.CntrlSpheres);
  scene.add(...spacetime.Tiles);
}

init();

function animate() {
  requestAnimationFrame(animate);

  // Hover detection against control point spheres
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(cntrlSpheres);
  const hit = hits.length > 0 ? hits[0].object as THREE.Mesh : null;

  if (hoveredSphere !== hit) {
    hoveredSphere?.userData['point3d']?.SetHover(false);
    hit?.userData['point3d']?.SetHover(true);
    hoveredSphere = hit;
    document.body.style.cursor = hit ? 'pointer' : 'default';
  }

  renderer.render(scene, camera);
}

animate()
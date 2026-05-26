import * as THREE from "three";

const apiKey = import.meta.env.VITE_API_KEY;
const apiUrl = import.meta.env.VITE_API_URL;


// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MeshData {
  vertices: number[]; // flat [x0,y0,z0, x1,y1,z1, ...]
  faces: number[];    // flat [a0,b0,c0, a1,b1,c1, ...]
}

interface Plane {
  normal: [number, number, number]; // unit vector pointing to the "positive" side
  origin: [number, number, number]; // any point on the plane
}

interface MeshPiece {
  vertices: number[];
  faces: number[];
  normals: number[];
}

interface SplitResponse {
  pieces: MeshPiece[];
  piece_count: number;
}

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

async function splitMeshByPlanes(
  target: MeshData,
  planes: Plane[],
  cap = false
): Promise<SplitResponse> {
    const res = await fetch(`{apiUrl}/api/mesh/split-by-planes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, planes, cap }),
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
    }

    return res.json() as Promise<SplitResponse>;
}
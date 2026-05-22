"use client"

import { useRef, useState, useEffect, useCallback, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Html } from "@react-three/drei"
import * as THREE from "three"
import { API_BASE_URL, getHeaders } from "@/lib/api"

// ── types ──────────────────────────────────────────────────────────────────────
interface Memory {
    id: string
    content: string
    primary_sector: string
    salience: number
    tags: string[]
    created_at: number
    last_seen_at?: number
}

interface Node3D extends Memory {
    position: [number, number, number]
}

// ── constants ─────────────────────────────────────────────────────────────────
const SECTOR_COLORS: Record<string, string> = {
    semantic:   "#38bdf8",
    episodic:   "#fbbf24",
    procedural: "#34d399",
    emotional:  "#fb7185",
    reflective: "#c084fc",
}

const SECTOR_CENTERS: Record<string, [number, number, number]> = {
    semantic:   [0,    6,   -4],
    episodic:   [-7,   2,    2],
    procedural: [7,    2,    2],
    emotional:  [-5,  -5,   -2],
    reflective: [5,   -5,   -2],
}

// ── seeded deterministic jitter ────────────────────────────────────────────────
function seededRandom(seed: number) {
    let s = seed
    return () => {
        s = (s * 1664525 + 1013904223) & 0xffffffff
        return (s >>> 0) / 0xffffffff
    }
}

function computePositions(memories: Memory[]): Node3D[] {
    const sectorIndex: Record<string, number> = {}
    return memories.map((m, i) => {
        const center = SECTOR_CENTERS[m.primary_sector] || [0, 0, 0]
        const si = sectorIndex[m.primary_sector] || 0
        sectorIndex[m.primary_sector] = si + 1
        const rng = seededRandom(i * 7919 + si * 131)
        const total = Math.max(memories.filter(x => x.primary_sector === m.primary_sector).length, 1)
        const phi = Math.acos(1 - 2 * (si + 0.5) / total)
        const theta = Math.PI * (1 + Math.sqrt(5)) * si
        const r = 2.8 + rng() * 0.8
        const x = center[0] + r * Math.sin(phi) * Math.cos(theta)
        const y = center[1] + r * Math.cos(phi)
        const z = center[2] + r * Math.sin(phi) * Math.sin(theta)
        return { ...m, position: [x, y, z] }
    })
}

// ── single memory node ─────────────────────────────────────────────────────────
function MemNode({
    node,
    selected,
    dimmed,
    onClick,
    onHover,
}: {
    node: Node3D
    selected: boolean
    dimmed: boolean
    onClick: () => void
    onHover: (n: Node3D | null) => void
}) {
    const mesh = useRef<THREE.Mesh>(null!)
    const color = SECTOR_COLORS[node.primary_sector] || "#888"
    const baseSize = 0.12 + node.salience * 0.22
    const targetScale = selected ? 1.6 : dimmed ? 0.6 : 1.0

    useFrame((_, delta) => {
        if (!mesh.current) return
        const s = mesh.current.scale.x
        mesh.current.scale.setScalar(s + (targetScale - s) * Math.min(delta * 8, 1))
        if (selected) mesh.current.rotation.y += delta * 1.2
    })

    return (
        <mesh
            ref={mesh}
            position={node.position}
            onClick={(e) => { e.stopPropagation(); onClick() }}
            onPointerOver={(e) => { e.stopPropagation(); onHover(node) }}
            onPointerOut={() => onHover(null)}
        >
            <sphereGeometry args={[baseSize, 16, 16]} />
            <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={selected ? 0.9 : dimmed ? 0.05 : 0.35}
                transparent
                opacity={dimmed ? 0.25 : 1}
                roughness={0.3}
                metalness={0.4}
            />
        </mesh>
    )
}

// ── cluster labels via Html ────────────────────────────────────────────────────
function ClusterLabel({ sector, visible }: { sector: string; visible: boolean }) {
    const center = SECTOR_CENTERS[sector] || [0, 0, 0]
    const color = SECTOR_COLORS[sector] || "#888"
    if (!visible) return null
    return (
        <Html
            position={[center[0], center[1] + 4.4, center[2]]}
            center
            style={{ pointerEvents: "none" }}
        >
            <div style={{
                color,
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "3px",
                whiteSpace: "nowrap",
                textShadow: `0 0 12px ${color}88`,
                userSelect: "none",
            }}>
                {sector.toUpperCase()}
            </div>
        </Html>
    )
}

// ── connections via lineSegments ───────────────────────────────────────────────
function Connections({ nodes, selectedId }: { nodes: Node3D[]; selectedId: string | null }) {
    const pairs = useMemo(() => {
        const result: Array<[Node3D, Node3D]> = []
        const bySector: Record<string, Node3D[]> = {}
        for (const n of nodes) {
            if (!bySector[n.primary_sector]) bySector[n.primary_sector] = []
            bySector[n.primary_sector].push(n)
        }
        for (const sector of Object.keys(bySector)) {
            const sn = bySector[sector]
            for (let i = 0; i + 1 < sn.length && result.length < 60; i++) {
                result.push([sn[i], sn[i + 1]])
            }
        }
        return result
    }, [nodes])

    const { dimPositions, hlPositions, hlColor } = useMemo(() => {
        const dim: number[] = []
        const hl: number[] = []
        let hlCol = "#38bdf8"
        for (const [a, b] of pairs) {
            const highlighted = selectedId && (a.id === selectedId || b.id === selectedId)
            const arr = [...a.position, ...b.position]
            if (highlighted) {
                hl.push(...arr)
                hlCol = SECTOR_COLORS[a.primary_sector] || "#38bdf8"
            } else {
                dim.push(...arr)
            }
        }
        return {
            dimPositions: new Float32Array(dim),
            hlPositions: new Float32Array(hl),
            hlColor: hlCol,
        }
    }, [pairs, selectedId])

    return (
        <>
            {dimPositions.length > 0 && (
                // @ts-ignore
                <lineSegments>
                    <bufferGeometry>
                        {/* @ts-ignore */}
                        <bufferAttribute attach="attributes-position" args={[dimPositions, 3]} />
                    </bufferGeometry>
                    <lineBasicMaterial color="#ffffff" transparent opacity={0.55} />
                {/* @ts-ignore */}
                </lineSegments>
            )}
            {hlPositions.length > 0 && (
                // @ts-ignore
                <lineSegments>
                    <bufferGeometry>
                        {/* @ts-ignore */}
                        <bufferAttribute attach="attributes-position" args={[hlPositions, 3]} />
                    </bufferGeometry>
                    <lineBasicMaterial color={hlColor} transparent opacity={0.8} />
                {/* @ts-ignore */}
                </lineSegments>
            )}
        </>
    )
}

// ── auto-rotate on idle ────────────────────────────────────────────────────────
function AutoRotate({ enabled }: { enabled: boolean }) {
    useFrame((state, delta) => {
        if (!enabled) return
        state.camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), delta * 0.08)
        state.camera.lookAt(0, 0, 0)
    })
    return null
}

// ── scene ──────────────────────────────────────────────────────────────────────
function Scene({
    nodes,
    selectedId,
    setSelected,
    search,
    visibleSectors,
    onHover,
}: {
    nodes: Node3D[]
    selectedId: string | null
    setSelected: (n: Node3D | null) => void
    search: string
    visibleSectors: Set<string>
    onHover: (n: Node3D | null) => void
}) {
    const [interacting, setInteracting] = useState(false)

    const filtered = useMemo(
        () => nodes.filter(n => visibleSectors.has(n.primary_sector)),
        [nodes, visibleSectors]
    )

    const searchLower = search.toLowerCase().trim()
    const matchedIds = useMemo(() => {
        if (!searchLower) return null
        const s = new Set<string>()
        for (const n of filtered) {
            if (n.content.toLowerCase().includes(searchLower) ||
                n.primary_sector.includes(searchLower) ||
                n.tags?.some(t => t.toLowerCase().includes(searchLower))) {
                s.add(n.id)
            }
        }
        return s
    }, [filtered, searchLower])

    return (
        <>
            <ambientLight intensity={0.4} />
            <pointLight position={[10, 20, 10]} intensity={1.5} color="#ffffff" />
            <pointLight position={[-10, -10, -10]} intensity={0.6} color="#8888ff" />
            <pointLight position={[0, -15, 8]} intensity={0.4} color="#ff8844" />

            <AutoRotate enabled={!interacting && !selectedId && !searchLower} />

            <OrbitControls
                enableDamping
                dampingFactor={0.08}
                onStart={() => setInteracting(true)}
                onEnd={() => setInteracting(false)}
                minDistance={5}
                maxDistance={60}
            />

            {Object.keys(SECTOR_COLORS).map(s => (
                <ClusterLabel key={s} sector={s} visible={visibleSectors.has(s)} />
            ))}

            <Connections nodes={filtered} selectedId={selectedId} />

            {filtered.map(node => {
                const isSelected = node.id === selectedId
                const isDimmed =
                    (matchedIds !== null && !matchedIds.has(node.id)) ||
                    (selectedId !== null && !isSelected)
                return (
                    <MemNode
                        key={node.id}
                        node={node}
                        selected={isSelected}
                        dimmed={isDimmed}
                        onClick={() => setSelected(isSelected ? null : node)}
                        onHover={onHover}
                    />
                )
            })}
        </>
    )
}

// ── info panel ─────────────────────────────────────────────────────────────────
function InfoPanel({ node, onClose }: { node: Node3D; onClose: () => void }) {
    const color = SECTOR_COLORS[node.primary_sector] || "#888"
    const age = Math.floor((Date.now() - node.created_at) / 86400000)

    return (
        <div className="absolute top-4 right-4 w-80 bg-stone-950/95 border border-stone-800 rounded-2xl shadow-2xl backdrop-blur overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between">
                <span className="text-xs font-semibold tracking-widest uppercase" style={{ color }}>
                    {node.primary_sector}
                </span>
                <button onClick={onClose} className="text-stone-500 hover:text-stone-200 transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div className="px-5 py-4 space-y-4">
                <p className="text-stone-200 text-sm leading-relaxed">{node.content}</p>
                <div className="flex items-center gap-3">
                    <div className="flex-1">
                        <div className="text-xs text-stone-500 mb-1">Salience</div>
                        <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.round(node.salience * 100)}%`, backgroundColor: color }}
                            />
                        </div>
                        <div className="text-xs text-stone-400 mt-1">{(node.salience * 100).toFixed(1)}%</div>
                    </div>
                </div>
                {node.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {node.tags.map(t => (
                            <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-stone-900 text-stone-400 border border-stone-800">
                                {t}
                            </span>
                        ))}
                    </div>
                )}
                <div className="text-xs text-stone-600">
                    {age === 0 ? "Added today" : `Added ${age} day${age === 1 ? "" : "s"} ago`}
                    {" · "}ID: {node.id.slice(0, 8)}…
                </div>
            </div>
        </div>
    )
}

// ── tooltip ────────────────────────────────────────────────────────────────────
function Tooltip({ node }: { node: Node3D }) {
    const color = SECTOR_COLORS[node.primary_sector] || "#888"
    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none z-50">
            <div className="bg-stone-900/90 border border-stone-700 rounded-xl px-4 py-2 text-xs text-stone-200 max-w-xs text-center backdrop-blur">
                <span className="font-semibold" style={{ color }}>{node.primary_sector}</span>
                {" · "}
                {node.content.slice(0, 80)}{node.content.length > 80 ? "…" : ""}
            </div>
        </div>
    )
}

// ── sector filter buttons ──────────────────────────────────────────────────────
function SectorFilters({
    visible,
    counts,
    onToggle,
}: {
    visible: Set<string>
    counts: Record<string, number>
    onToggle: (s: string) => void
}) {
    return (
        <div className="absolute top-4 left-4 flex flex-col gap-2">
            {Object.entries(SECTOR_COLORS).map(([sector, color]) => {
                const active = visible.has(sector)
                return (
                    <button
                        key={sector}
                        onClick={() => onToggle(sector)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200"
                        style={{
                            background: active ? `${color}18` : "rgba(28,25,23,0.8)",
                            border: `1px solid ${active ? color + "60" : "#292524"}`,
                            color: active ? color : "#78716c",
                        }}
                    >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: active ? color : "#57534e" }} />
                        <span className="capitalize">{sector}</span>
                        <span className="ml-auto opacity-60">{counts[sector] || 0}</span>
                    </button>
                )
            })}
        </div>
    )
}

// ── main ───────────────────────────────────────────────────────────────────────
export default function MemoryGraphScene() {
    const [memories, setMemories] = useState<Memory[]>([])
    const [nodes, setNodes] = useState<Node3D[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selected, setSelected] = useState<Node3D | null>(null)
    const [hovered, setHovered] = useState<Node3D | null>(null)
    const [search, setSearch] = useState("")
    const [visibleSectors, setVisibleSectors] = useState<Set<string>>(
        new Set(Object.keys(SECTOR_COLORS))
    )

    useEffect(() => {
        async function load() {
            try {
                const r = await fetch(`${API_BASE_URL}/memory/all?l=500`, { headers: getHeaders() })
                if (!r.ok) throw new Error(`${r.status}`)
                const data = await r.json()
                const mems: Memory[] = data.items || []
                setMemories(mems)
                setNodes(computePositions(mems))
            } catch (e: any) {
                setError(e.message)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const sectorCounts = useMemo(() => {
        const c: Record<string, number> = {}
        for (const m of memories) c[m.primary_sector] = (c[m.primary_sector] || 0) + 1
        return c
    }, [memories])

    const toggleSector = useCallback((s: string) => {
        setVisibleSectors(prev => {
            const next = new Set(prev)
            if (next.has(s)) { if (next.size > 1) next.delete(s) }
            else next.add(s)
            return next
        })
    }, [])

    if (loading) return (
        <div className="flex items-center justify-center h-full text-stone-400 text-sm">
            Loading memory graph…
        </div>
    )

    if (error) return (
        <div className="flex items-center justify-center h-full text-rose-400 text-sm">
            Failed to load: {error}. Is the backend running?
        </div>
    )

    if (nodes.length === 0) return (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-stone-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 opacity-30">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V19.5m0 2.25l-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-9 5.25-9-5.25v-2.25l9-5.25 9 5.25Z" />
            </svg>
            <p className="text-sm">No memories yet. Add some via the Memories page or seed script.</p>
        </div>
    )

    return (
        <div className="relative w-full h-full" style={{ cursor: "crosshair" }}>
            {/* search */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-72">
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search memories…"
                    className="w-full bg-stone-950/90 border border-stone-800 rounded-2xl px-4 py-2 text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-stone-600 backdrop-blur"
                />
                {search && (
                    <button
                        onClick={() => setSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                    >
                        ×
                    </button>
                )}
            </div>

            <SectorFilters visible={visibleSectors} counts={sectorCounts} onToggle={toggleSector} />

            <div className="absolute bottom-4 left-4 text-xs text-stone-600 bg-stone-950/70 rounded-xl px-3 py-1.5 border border-stone-900">
                {memories.length} memories · drag to rotate · scroll to zoom · click to inspect
            </div>

            <Canvas
                camera={{ position: [0, 4, 22], fov: 55 }}
                gl={{ antialias: true, alpha: true }}
                style={{ background: "transparent" }}
                onPointerMissed={() => setSelected(null)}
            >
                <Scene
                    nodes={nodes}
                    selectedId={selected?.id ?? null}
                    setSelected={setSelected}
                    search={search}
                    visibleSectors={visibleSectors}
                    onHover={setHovered}
                />
            </Canvas>

            {hovered && !selected && <Tooltip node={hovered} />}
            {selected && <InfoPanel node={selected} onClose={() => setSelected(null)} />}
        </div>
    )
}

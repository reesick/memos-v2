"use client"

import dynamic from "next/dynamic"

const MemoryGraphScene = dynamic(
    () => import("@/components/memory-graph-scene"),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center h-full text-stone-500 text-sm">
                Initialising 3D renderer…
            </div>
        ),
    }
)

export default function GraphPage() {
    return (
        <div className="fixed inset-0 ml-20 mt-0 bg-black">
            <MemoryGraphScene />
        </div>
    )
}

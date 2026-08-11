#!/bin/bash
awk '
/import \{/ {
    if (!has_cpu_globe) {
        if ($0 ~ /LayoutDashboard/) {
            sub("LayoutDashboard,", "LayoutDashboard, Cpu, Globe,")
            has_cpu_globe = 1
        }
    }
}
/id: "dashboard"/ {
    print $0
    if (!seen_twin) {
        print "    { id: \"twin\", label: \"Digital Twin\", icon: <Cpu size={18} /> },"
        print "    { id: \"benchmark\", label: \"Global Benchmark\", icon: <Globe size={18} /> },"
        seen_twin = 1
    }
    next
}
{ print $0 }
' src/layouts/OSLayout.tsx > src/layouts/OSLayout.tsx.tmp && mv src/layouts/OSLayout.tsx.tmp src/layouts/OSLayout.tsx

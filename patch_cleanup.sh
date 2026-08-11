#!/bin/bash
awk '
/import \{ GlobalBenchmarkView \}/ {
    if (!seen_import) {
        print $0
        seen_import = 1
    }
    next
}
/import \{ LayoutDashboard/ {
    print "import { LayoutDashboard, Cpu, Globe } from \"lucide-react\";"
    next
}
/<GlobalBenchmarkView/ {
    if (!seen_comp) {
        print "              {activeOsModule === \"benchmark\" && ("
        print "                <GlobalBenchmarkView"
        print "                  digitalTwin={digitalTwin!}"
        print "                />"
        print "              )}"
        seen_comp = 1
    }
    skip = 1
    next
}
skip && /\)\}/ {
    skip = 0
    next
}
skip { next }
/\{activeOsModule === "benchmark" && \(/ {
    next
}
{ print $0 }
' src/App.tsx > src/App.tsx.tmp && mv src/App.tsx.tmp src/App.tsx

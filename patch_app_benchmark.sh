#!/bin/bash
awk '
/import \{ DigitalTwinView \}/ {
    print $0
    print "import { GlobalBenchmarkView } from \"./modules/benchmark/GlobalBenchmarkView\";"
    next
}
/import \{/ {
    if (!has_globe) {
        if ($0 ~ /Cpu,/) {
            sub("Cpu,", "Cpu, Globe,")
            has_globe = 1
        }
    }
}
/id: "twin"/ {
    print $0
    print "  { id: \"benchmark\", label: \"Global Benchmark\", icon: Globe },"
    next
}
/activeOsModule === "twin"/ {
    print "              {activeOsModule === \"benchmark\" && ("
    print "                <GlobalBenchmarkView"
    print "                  digitalTwin={digitalTwin!}"
    print "                />"
    print "              )}"
    print $0
    next
}
{ print $0 }
' src/App.tsx > src/App.tsx.tmp && mv src/App.tsx.tmp src/App.tsx

#!/bin/bash
awk '
/import \{ MentorView \}/ {
    print $0
    if (!has_gbv) {
        print "import { GlobalBenchmarkView } from \"./modules/benchmark/GlobalBenchmarkView\";"
        has_gbv = 1
    }
    next
}
/export default function App\(\) \{/ {
    print $0
    next
}
/activeOsModule === "growth"/ {
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

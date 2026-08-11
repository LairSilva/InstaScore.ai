#!/bin/bash
awk '
/import \{ MentorView \}/ {
    print $0
    print "import { DigitalTwinView } from \"./modules/twin/DigitalTwinView\";"
    next
}
/import \{ Cpu \}/ {
    has_cpu = 1
}
/import \{/ && !has_cpu {
    if ($0 ~ /LayoutDashboard/) {
        sub("LayoutDashboard,", "LayoutDashboard, Cpu,")
        has_cpu = 1
    }
}
/id: "dashboard"/ {
    print $0
    print "  { id: \"twin\", label: \"Digital Twin\", icon: Cpu },"
    next
}
/<SimulatorView/ {
    print "              {activeOsModule === \"twin\" && ("
    print "                <DigitalTwinView"
    print "                  digitalTwin={digitalTwin!}"
    print "                />"
    print "              )}"
    print $0
    next
}
{ print $0 }
' src/App.tsx > src/App.tsx.tmp && mv src/App.tsx.tmp src/App.tsx

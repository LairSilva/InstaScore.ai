#!/bin/bash
awk '
/\{activeOsModule === "simulator" && \(/ {
    print $0
    skip = 1
    next
}
skip && /<DigitalTwinView/ {
    next
}
skip && /digitalTwin=\{digitalTwin!\}/ {
    next
}
skip && /\/>/ {
    next
}
skip && /\)\}/ {
    skip = 0
    next
}
{ print $0 }
' src/App.tsx > src/App.tsx.tmp && mv src/App.tsx.tmp src/App.tsx

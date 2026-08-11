#!/bin/bash
awk '
/<GrowthCenterView/ {
    sub("/>", "digitalTwin={digitalTwin!} />")
    print $0
    next
}
/<SimulatorView/ {
    print $0
    print "                  digitalTwin={digitalTwin!}"
    next
}
/<MentorView/ {
    print $0
    print "                  digitalTwin={digitalTwin!}"
    next
}
/<TimelineView/ {
    print $0
    print "                  digitalTwin={digitalTwin!}"
    next
}
{ print $0 }
' src/App.tsx > src/App.tsx.tmp && mv src/App.tsx.tmp src/App.tsx

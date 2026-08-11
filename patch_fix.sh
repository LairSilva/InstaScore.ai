#!/bin/bash
awk '
/\{activeOsModule === "simulator" && \(/ {
    skip = 1
    next
}
skip && /\{activeOsModule === "twin" && \(/ {
    print "              {activeOsModule === \"twin\" && ("
    print "                <DigitalTwinView"
    print "                  digitalTwin={digitalTwin!}"
    print "                />"
    print "              )}"
    print "              {activeOsModule === \"simulator\" && ("
    skip = 0
    next
}
{ print $0 }
' src/App.tsx > src/App.tsx.tmp && mv src/App.tsx.tmp src/App.tsx

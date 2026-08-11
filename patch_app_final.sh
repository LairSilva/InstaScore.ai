#!/bin/bash
awk '
/import \{ SimulatorView \}/ {
    print $0
    print "import { MentorView } from \"./modules/mentor/MentorView\";"
    print "import { TimelineView } from \"./modules/history/TimelineView\";"
    next
}
/\{activeOsModule === \"mentor\" && \(/ {
    print "              {activeOsModule === \"mentor\" && ("
    print "                <MentorView "
    print "                  diagnosisResult={diagnosisResult}"
    print "                  userName={userName}"
    print "                />"
    print "              )}"
    skip = 1
    next
}
/\{activeOsModule === \"history\" && \(/ {
    if (skip) { skip = 0 }
    print "              {activeOsModule === \"history\" && ("
    print "                <TimelineView "
    print "                  diagnosisResult={diagnosisResult}"
    print "                  currentScore={diagnosisResult.scoring.score || 0}"
    print "                />"
    print "              )}"
    skip2 = 1
    next
}
/<\/OSLayout>/ {
    if (skip2) { skip2 = 0 }
    print "            </OSLayout>"
    next
}
{
    if (!skip && !skip2) {
        print $0
    }
}
' src/App.tsx > src/App.tsx.tmp && mv src/App.tsx.tmp src/App.tsx

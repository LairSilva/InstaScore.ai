#!/bin/bash
awk '
/import \{ OSLayout \}/ {
    print $0
    print "import { GrowthCenterView } from \"./modules/growth/GrowthCenterView\";"
    print "import { SimulatorView } from \"./modules/simulator/SimulatorView\";"
    next
}
/\{activeOsModule === \"simulator\" && \(/ {
    print "              {activeOsModule === \"simulator\" && ("
    print "                <SimulatorView "
    print "                  diagnosisResult={diagnosisResult}"
    print "                  currentScore={diagnosisResult.scoring.score || 0}"
    print "                />"
    print "              )}"
    skip = 1
    next
}
/\{activeOsModule === \"growth\" && \(/ {
    if (skip) { skip = 0 }
    print "              {activeOsModule === \"growth\" && ("
    print "                <GrowthCenterView diagnosisResult={diagnosisResult} />"
    print "              )}"
    skip2 = 1
    next
}
/\{activeOsModule === \"mentor\" && \(/ {
    if (skip2) { skip2 = 0 }
}
{
    if (!skip && !skip2) {
        print $0
    }
    if (skip && /<\/div>/) {
        # Only skip the specific div block of simulator
        # Actually, counting braces is hard in awk. Since we know the block size is about 8 lines:
    }
}
' src/App.tsx > src/App.tsx.tmp

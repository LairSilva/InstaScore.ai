#!/bin/bash
awk '
/import \{ AnalysisResponse \}/ {
    print $0
    print "import { DigitalTwin } from \"../core/DigitalTwin\";"
    next
}
/interface ResultViewProps \{/ {
    print $0
    print "  digitalTwin: DigitalTwin;"
    next
}
/export function ResultView\(\{/ {
    print $0
    next
}
/  diagnosisResult,/ {
    print $0
    print "  digitalTwin,"
    next
}
/const cageScore =/ {
    print "  const executionScore = digitalTwin.metrics.executionScore;"
    print "  const consistencyScore = digitalTwin.metrics.consistencyScore;"
    print "  const momentumScore = digitalTwin.metrics.momentumScore;"
    print "  const cageScore = digitalTwin.metrics.overallScore;"
    skip = 1
    next
}
/const momentumScore =/ {
    if (skip) { skip = 0 }
    next
}
{
    if (!skip) {
        print $0
    }
}
' src/components/ResultView.tsx > src/components/ResultView.tsx.tmp && mv src/components/ResultView.tsx.tmp src/components/ResultView.tsx

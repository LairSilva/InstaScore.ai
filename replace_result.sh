#!/bin/bash
awk '
/\{view === "result" && diagnosisResult && \(/ {
    print "        {view === \"result\" && diagnosisResult && ("
    print "          <ResultView"
    print "            diagnosisResult={diagnosisResult}"
    print "            isDemoMode={isDemoMode}"
    print "            userName={userName}"
    print "            niche={niche}"
    print "            handle={handle}"
    print "            onReset={handleReset}"
    print "            onShare={() => setIsShareModalOpen(true)}"
    print "          />"
    print "        )}"
    skip = 1
}
/<\/main>/ {
    if (skip) {
        print "      </main>"
        skip = 0
        next
    }
}
{
    if (!skip) {
        print $0
    }
}
' src/App.tsx > src/App.tsx.tmp && mv src/App.tsx.tmp src/App.tsx

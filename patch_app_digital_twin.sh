#!/bin/bash
awk '
/import \{ OSLayout \}/ {
    print $0
    print "import { DigitalTwin, GrowthScores } from \"./core/DigitalTwin\";"
    print "import { GrowthEngine } from \"./core/GrowthEngine\";"
    next
}
/const \[diagnosisResult, setDiagnosisResult\]/ {
    print $0
    print "  const [digitalTwin, setDigitalTwin] = useState<DigitalTwin | null>(null);"
    next
}
/setDiagnosisResult\(demoData\);/ {
    print $0
    print "      setDigitalTwin({"
    print "        id: \"demo_user\","
    print "        handle: \"@demo\","
    print "        identity: {"
    print "          niche: \"Moda\","
    print "          objectives: [\"vendas\"],"
    print "          targetAudience: \"\","
    print "          toneOfVoice: \"\","
    print "          visualStyle: \"\""
    print "        },"
    print "        content: {"
    print "          currentBio: \"\","
    print "          currentCta: \"\","
    print "          bestPostingTimes: [],"
    print "          postingFrequency: \"\","
    print "          feedStrategyPatterns: [],"
    print "          reelsStrategyPatterns: []"
    print "        },"
    print "        metrics: GrowthEngine.bootstrapScores(demoData.scoring.score || 0),"
    print "        memoryGraphIds: []"
    print "      });"
    next
}
/setDiagnosisResult\(result\);/ {
    print $0
    print "        setDigitalTwin({"
    print "          id: \"real_user\","
    print "          handle: onboardingData.handle || \"\","
    print "          identity: {"
    print "            niche: onboardingData.niche,"
    print "            objectives: [onboardingData.objective],"
    print "            targetAudience: onboardingData.targetAudience,"
    print "            toneOfVoice: \"\","
    print "            visualStyle: \"\""
    print "          },"
    print "          content: {"
    print "            currentBio: \"\","
    print "            currentCta: \"\","
    print "            bestPostingTimes: [],"
    print "            postingFrequency: \"\","
    print "            feedStrategyPatterns: [],"
    print "            reelsStrategyPatterns: []"
    print "          },"
    print "          metrics: GrowthEngine.bootstrapScores(result.scoring.score || 0),"
    print "          memoryGraphIds: []"
    print "        });"
    next
}
/<ResultView / {
    print $0
    print "                  digitalTwin={digitalTwin!}"
    next
}
{ print $0 }
' src/App.tsx > src/App.tsx.tmp && mv src/App.tsx.tmp src/App.tsx

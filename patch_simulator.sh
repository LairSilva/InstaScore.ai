#!/bin/bash
awk '
/import \{ PredictionEngine/ {
    has_pe = 1
}
/import \{ DigitalTwin \}/ {
    print $0
    if (!has_pe) {
        print "import { PredictionEngine, PredictionResult } from \"../../engine/prediction/PredictionEngine\";"
    }
    next
}
/const \[prediction, setPrediction\] = useState<\{/ {
    skip = 1
    print "  const [prediction, setPrediction] = useState<PredictionResult | null>(null);"
    next
}
skip && /\} \| null>\(null\);/ {
    skip = 0
    next
}
skip { next }
/const scoreDelta = Math.floor/ {
    skip_sim = 1
    print "      // Integrando Módulo 3: Prediction Engine Real"
    print "      const predicted = PredictionEngine.predictImpact(digitalTwin, \"Bio\");"
    print "      setPrediction(predicted);"
    next
}
skip_sim && /setPrediction\(\{/ {
    skip_sim_obj = 1
    next
}
skip_sim_obj && /\}\);/ {
    skip_sim = 0
    skip_sim_obj = 0
    next
}
skip_sim || skip_sim_obj { next }
{ print $0 }
' src/modules/simulator/SimulatorView.tsx > src/modules/simulator/SimulatorView.tsx.tmp && mv src/modules/simulator/SimulatorView.tsx.tmp src/modules/simulator/SimulatorView.tsx

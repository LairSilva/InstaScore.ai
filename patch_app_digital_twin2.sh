#!/bin/bash
awk '
/setDigitalTwin\(\{/ {
    in_dt = 1
    print $0
    next
}
in_dt && /metrics: GrowthEngine\.bootstrapScores/ {
    print "        identity: {"
    print "          niche: onboardingData?.niche || \"Moda\","
    print "          objectives: [onboardingData?.objective || \"Vendas\"],"
    print "          targetAudience: onboardingData?.targetAudience || \"Mulheres 25-45\","
    print "          toneOfVoice: \"Especialista e Inspirador\","
    print "          visualStyle: \"Minimalista e Elegante\","
    print "          brandIdentity: \"Autoridade Premium\""
    print "        },"
    print "        content: {"
    print "          currentBio: \"Especialista em X ajudando Y a alcançar Z.\","
    print "          currentCta: \"Clique no link abaixo\","
    print "          bestPostingTimes: [\"09:00\", \"18:00\"],"
    print "          postingFrequency: \"5x por semana\","
    print "          feedStrategyPatterns: [\"Carrossel Educativo\", \"Prova Social\"],"
    print "          reelsStrategyPatterns: [\"Tutorial Rápido\", \"Bastidores\"],"
    print "          contentThemes: [\"Dicas Práticas\", \"Estilo de Vida\"],"
    print "          discoveredPatterns: [\"Vídeos curtos convertem 3x mais\"]"
    print "        },"
    print "        historyData: {"
    print "          events: [],"
    print "          evolutionLog: [],"
    print "          conversionRate: 2.4"
    print "        },"
    print $0
    next
}
in_dt && /memoryGraphIds: \[\]/ {
    print $0
    in_dt = 0
    next
}
in_dt && /identity: \{/ {
    skip_block = 1
    next
}
in_dt && skip_block && /\},/ {
    skip_block = 0
    next
}
in_dt && skip_block {
    next
}
in_dt && /content: \{/ {
    skip_block = 1
    next
}
{ print $0 }
' src/App.tsx > src/App.tsx.tmp && mv src/App.tsx.tmp src/App.tsx

#!/bin/bash
awk '
/\{\/\* 3\. The Real Problems/ {
    print "      {/* 2.5 The 5 Strategic Pillars */}"
    print "      <div className=\"space-y-6 pt-4\">"
    print "        <div className=\"space-y-2\">"
    print "          <h2 className=\"text-xl font-bold text-white\">Os 5 Pilares do seu Perfil</h2>"
    print "          <p className=\"text-slate-400 text-sm\">Avaliamos sua estrutura em cinco dimensões cruciais para o algoritmo.</p>"
    print "        </div>"
    print "        <div className=\"grid grid-cols-1 md:grid-cols-5 gap-3\">"
    print "          {(Object.values(scoring.categories) as CategoryResult[]).map((cat, idx) => ("
    print "            <motion.div "
    print "              key={cat.categoryId}"
    print "              initial={{ opacity: 0, scale: 0.9 }}"
    print "              whileInView={{ opacity: 1, scale: 1 }}"
    print "              viewport={{ once: true }}"
    print "              transition={{ delay: idx * 0.1 }}"
    print "              className=\"bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between h-full\""
    print "            >"
    print "              <div className=\"space-y-1 mb-4\">"
    print "                <h4 className=\"font-bold text-slate-200 text-sm leading-tight\">{cat.name}</h4>"
    print "                <p className=\"text-xs font-mono text-violet-400\">{cat.percentage}% Otimizado</p>"
    print "              </div>"
    print "              <div className=\"w-full bg-slate-950 h-1.5 rounded-full overflow-hidden\">"
    print "                <motion.div "
    print "                  initial={{ width: 0 }} "
    print "                  whileInView={{ width: `${cat.percentage}%` }} "
    print "                  viewport={{ once: true }}"
    print "                  transition={{ duration: 1, delay: 0.5 + (idx * 0.1) }} "
    print "                  className={`h-full ${cat.percentage >= 80 ? \"bg-emerald-500\" : cat.percentage >= 50 ? \"bg-amber-500\" : \"bg-rose-500\"}`}"
    print "                ></motion.div>"
    print "              </div>"
    print "            </motion.div>"
    print "          ))}"
    print "        </div>"
    print "      </div>"
    print ""
    print $0
    next
}
{ print $0 }
' src/components/ResultView.tsx > src/components/ResultView.tsx.tmp && mv src/components/ResultView.tsx.tmp src/components/ResultView.tsx

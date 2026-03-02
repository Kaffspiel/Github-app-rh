# Guia Avançado: Histórico 360 e Rankings de RH no n8n

Para que seu agente responda com precisão sobre **faltas, atestados, gamificação e ponto**, adicione as duas ferramentas (Tools) abaixo ao seu nó de `AI Agent` no n8n.

---

## 1. Tool de Histórico Individual (360 do Colaborador)

**Nome da Tool:** `consultar_historico_360`
**Descrição:** "Busca o histórico completo de um funcionário: registros de ponto, ocorrências (faltas/atestados), tarefas e pontos de gamificação. Precisa do context.employee_id."

### SQL Query:
```sql
(SELECT 'Ponto' as categoria, record_date::text as data, status as acao, 'Entrada: ' || COALESCE(entry_1, '--') || ' Saída: ' || COALESCE(exit_1, '--') as detalhes
 FROM public.time_tracking_records WHERE employee_id = '{{ $json.body.context.employee_id }}')
UNION ALL
(SELECT 'Ocorrência' as categoria, created_at::text, type, description
 FROM public.occurrences WHERE employee_id = '{{ $json.body.context.employee_id }}')
UNION ALL
(SELECT 'Tarefa' as categoria, created_at::text, title, status
 FROM public.tasks WHERE employee_id = '{{ $json.body.context.employee_id }}')
UNION ALL
(SELECT 'Gamificação' as categoria, updated_at::text, 'Pontuação Atual', points::text
 FROM public.employees WHERE id = '{{ $json.body.context.employee_id }}')
ORDER BY data DESC LIMIT 30;
```

---

## 2. Tool de Análise Global (Rankings e Estatísticas)

**Nome da Tool:** `analisar_estatisticas_globais`
**Descrição:** "Utilize para responder perguntas sobre o ranking da empresa: quem tem mais faltas, quem aplica mais atestados, quem são os líderes de pontos (gamificação) e absenteísmo geral."

### SQL Query:
```sql
SELECT 
    e.name as colaborador, 
    COUNT(CASE WHEN o.type = 'falta' THEN 1 END) as qtd_faltas,
    COUNT(CASE WHEN o.type = 'atestado' THEN 1 END) as qtd_atestados,
    MAX(e.points) as pontos_totais,
    e.department as departamento
FROM public.employees e
LEFT JOIN public.occurrences o ON e.id = o.employee_id
WHERE e.is_active = true
GROUP BY e.name, e.department
ORDER BY qtd_faltas DESC, qtd_atestados DESC, pontos_totais DESC;
```

---

## 3. Instruções de "Personalidade" do Agente (System Message)

Adicione este parágrafo ao seu **System Message** no nó do `AI Agent`:

```markdown
🧠 ESTRATÉGIA DE ANÁLISE DE RH 🧠
Você é um consultor de RH de alto nível. 
1. Ao perguntarem sobre UM funcionário (ex: "Como está o Guto?"), use a tool `consultar_historico_360`.
2. Ao perguntarem sobre RANKING ou COMPARAÇÕES (ex: "Quem falta mais?", "Quem tem mais atestados?", "Quem é o melhor do mês?"), use a tool `analisar_estatisticas_globais`.
3. Analise cruzando os dados: Se alguém tem muitas tarefas mas também muitas faltas, aponte esse desequilíbrio de forma consultiva.
```

## Preparação de Dados
O sistema (Frontend) já está enviando os dados de contexto para o seu Webhook:
- `employee_id`: ID do colaborador selecionado.
- `user_name`: Seu nome (quem está logado).
- `company_id`: ID da empresa.
